# EM CONFORMIDADE COM AS REGRAS DE OURO DO E-SIGMA
"""
Controlador de Rotas RESTful para Musicas, Acervo Global e Sugestoes.
"""
import uuid
import json
import shutil
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File, Form, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from loguru import logger

from backend.nucleo.banco import obter_banco_de_dados
from backend.nucleo.configuracoes import configuracoes
from backend.nucleo.auth_esigma import UsuarioEsigma, obter_usuario_esigma
from backend.nucleo.dependencias import verificar_assinatura_ativa
from backend.modelos.musica import Musica, MusicaEventoSugerido
from backend.modelos.evento import Evento
from backend.api.musicas.schemas import (
    MusicaUpload,
    MusicaAtualizacao,
    MusicaResposta,
    MusicaDownloadYouTube,
    MusicaLinkStreaming
)
from backend.api.musicas.servicos import (
    registrar_upload_musica,
    buscar_musicas_sugeridas_para_evento,
    listar_arquivos_orfaos
)
from backend.api.musicas.extrator_metadados import extrair_metadados_arquivo_audio
from backend.api.musicas.conversor import converter_youtube_para_mp3_async

roteador_musicas = APIRouter(
    prefix="/musicas",
    tags=["Acervo Global e Músicas"],
    dependencies=[Depends(verificar_assinatura_ativa)]
)


@roteador_musicas.get(
    "",
    summary="Listar Acervo",
    description="Retorna as músicas do acervo com filtro opcional por evento ritualístico (incluindo equivalência canônica)."
)
async def listar_musicas(
    evento_id: Optional[uuid.UUID] = Query(None, description="Filtrar músicas sugeridas para um evento ritualístico"),
    db: AsyncSession = Depends(obter_banco_de_dados)
):
    ids_eventos_filtro = None
    if evento_id:
        res_ev = await db.execute(select(Evento).where(Evento.id == evento_id))
        ev_alvo = res_ev.scalar_one_or_none()
        if ev_alvo and ev_alvo.canonico_id:
            res_eq = await db.execute(select(Evento.id).where(Evento.canonico_id == ev_alvo.canonico_id))
            ids_eventos_filtro = set(res_eq.scalars().all())
        else:
            ids_eventos_filtro = {evento_id}

    stmt = (
        select(Musica)
        .options(
            selectinload(Musica.eventos_sugeridos)
            .selectinload(MusicaEventoSugerido.evento)
            .selectinload(Evento.rito),
            selectinload(Musica.eventos_sugeridos)
            .selectinload(MusicaEventoSugerido.evento)
            .selectinload(Evento.canonico),
        )
        .order_by(Musica.titulo)
    )
    res = await db.execute(stmt)
    musicas = res.scalars().all()

    resultados = []
    for m in musicas:
        if ids_eventos_filtro is not None:
            possui_vinculo = any(es.evento_id in ids_eventos_filtro for es in m.eventos_sugeridos)
            if not possui_vinculo:
                continue

        eventos_unicos = {}
        for es in m.eventos_sugeridos:
            if not es.evento:
                continue
            chave_ev = str(es.evento.canonico_id) if es.evento.canonico_id else es.evento.nome.strip().lower()
            if chave_ev not in eventos_unicos:
                eventos_unicos[chave_ev] = {
                    "evento_id": es.evento_id,
                    "evento_nome": es.evento.canonico.nome if es.evento.canonico else es.evento.nome,
                }

        m_dict = {
            "id": m.id,
            "titulo": m.titulo,
            "autor_artista": m.autor_artista,
            "upload_por_loja_id": m.upload_por_loja_id,
            "arquivo_url": m.arquivo_url,
            "caminho_arquivo": m.arquivo_url,
            "tipo_midia": "ARQUIVO_LOCAL",
            "sinalizada_erro": m.sinalizada_erro,
            "status_uso": m.status_uso,
            "ativo": m.ativo,
            "criado_em": m.criado_em,
            "atualizado_em": m.atualizado_em,
            "metadados": m.metadados,
            "eventos": list(eventos_unicos.values()),
        }
        resultados.append(m_dict)

    return resultados


@roteador_musicas.get(
    "/sugeridas/{evento_id}",
    response_model=List[MusicaResposta],
    summary="Auto-Fill: Buscar Músicas Sugeridas para Evento",
    description="Retorna as músicas do acervo global que foram marcadas como sugeridas para um evento ritualístico específico."
)
async def listar_sugeridas(
    evento_id: uuid.UUID,
    limit: int = Query(10, description="Limite de resultados"),
    db: AsyncSession = Depends(obter_banco_de_dados)
):
    return await buscar_musicas_sugeridas_para_evento(db=db, evento_id=evento_id, limit=limit)


@roteador_musicas.post(
    "/upload",
    response_model=MusicaResposta,
    status_code=status.HTTP_201_CREATED,
    summary="Upload de Arquivo para Acervo Global",
    description="Faz upload de áudio, exigindo checklist de eventos sugeridos."
)
async def upload_musica(
    titulo: str = Form(..., description="Título da música"),
    autor_artista: Optional[str] = Form(None, description="Compositor ou intérprete"),
    upload_por_loja_id: Optional[uuid.UUID] = Form(None, description="UUID da Loja (Null se SuperAdmin)"),
    eventos_sugeridos_ids: str = Form(..., description="Lista JSON de UUIDs de eventos (ex: ['uuid1', 'uuid2'])"),
    arquivo: UploadFile = File(..., description="Arquivo de áudio (MP3, WAV, OGG)"),
    db: AsyncSession = Depends(obter_banco_de_dados)
):
    logger.info(f"Upload de música iniciado: {titulo} - Loja: {upload_por_loja_id}")
    try:
        ids_parsed = json.loads(eventos_sugeridos_ids)
        lista_eventos = [uuid.UUID(str(i)) for i in ids_parsed]
    except Exception:
        lista_eventos = []

    diretorio_destino = configuracoes.DIRETORIO_INSTANCIAS_PUBLIC / "musicas"
    diretorio_destino.mkdir(parents=True, exist_ok=True)

    nome_arquivo_seguro = f"{uuid.uuid4().hex}_{arquivo.filename}"
    caminho_completo = diretorio_destino / nome_arquivo_seguro

    with open(caminho_completo, "wb") as buffer:
        shutil.copyfileobj(arquivo.file, buffer)

    # Extração automática de metadados das tags de áudio caso não tenham sido informados
    tag_titulo, tag_artista, duracao_seg = extrair_metadados_arquivo_audio(
        str(caminho_completo),
        nome_arquivo_original=arquivo.filename
    )

    # Se o título enviado for apenas o nome bruto do arquivo ou se tiver tags melhores, prioriza as tags
    nome_sem_ext = arquivo.filename.rsplit(".", 1)[0].strip() if arquivo.filename else ""
    titulo_final = titulo.strip() if titulo else ""
    if (not titulo_final or titulo_final == arquivo.filename or titulo_final == nome_sem_ext) and tag_titulo:
        titulo_final = tag_titulo
    elif not titulo_final:
        titulo_final = nome_sem_ext or "Música Sem Título"

    autor_final = autor_artista.strip() if autor_artista and autor_artista.strip() else tag_artista

    caminho_salvo = f"/storage/instancias/public/musicas/{nome_arquivo_seguro}"

    metadados_dict = {}
    if duracao_seg:
        metadados_dict["duracao_segundos"] = duracao_seg

    dados_upload = MusicaUpload(
        titulo=titulo_final,
        autor_artista=autor_final,
        upload_por_loja_id=upload_por_loja_id,
        eventos_sugeridos_ids=lista_eventos,
        metadados=metadados_dict
    )
    return await registrar_upload_musica(db=db, dados=dados_upload, arquivo_url=caminho_salvo)


@roteador_musicas.post(
    "/converter-youtube",
    response_model=MusicaResposta,
    status_code=status.HTTP_201_CREATED,
    summary="Baixar e Converter Áudio do YouTube para MP3 320kbps",
    description="Baixa o áudio de uma URL do YouTube, converte com FFmpeg em MP3 de alta fidelidade e registra no acervo."
)
async def converter_youtube(
    dados: MusicaDownloadYouTube,
    db: AsyncSession = Depends(obter_banco_de_dados)
):
    logger.info(f"Iniciando conversão YouTube -> MP3: {dados.link_youtube} (Loja: {dados.organizacao_id})")
    diretorio_destino = configuracoes.DIRETORIO_INSTANCIAS_PUBLIC / "musicas"
    diretorio_destino.mkdir(parents=True, exist_ok=True)

    try:
        resultado = await converter_youtube_para_mp3_async(
            url=dados.link_youtube,
            pasta_destino=str(diretorio_destino),
            titulo_sugerido=dados.titulo,
            bitrate_kbps=dados.bitrate_kbps or 320
        )
    except Exception as exc:
        logger.error(f"Erro na conversão YouTube: {exc}")
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Não foi possível converter o vídeo do YouTube: {str(exc)}"
        )

    nome_arquivo = resultado["nome_arquivo"]
    caminho_salvo = f"/storage/instancias/public/musicas/{nome_arquivo}"

    titulo_final = dados.titulo.strip() if dados.titulo and dados.titulo.strip() else resultado.get("titulo_original", "Música do YouTube")
    autor_final = dados.autor_artista.strip() if dados.autor_artista and dados.autor_artista.strip() else resultado.get("autor_original")

    metadados_dict = {
        "duracao_segundos": resultado.get("duracao_segundos"),
        "tamanho_bytes": resultado.get("tamanho_bytes"),
        "bitrate_kbps": resultado.get("bitrate_kbps"),
        "link_youtube": dados.link_youtube,
        "tipo_midia": "ARQUIVO_LOCAL"
    }

    dados_upload = MusicaUpload(
        titulo=titulo_final,
        autor_artista=autor_final,
        upload_por_loja_id=dados.organizacao_id,
        eventos_sugeridos_ids=dados.eventos_sugeridos_ids,
        metadados=metadados_dict
    )
    return await registrar_upload_musica(db=db, dados=dados_upload, arquivo_url=caminho_salvo)


@roteador_musicas.post(
    "/streaming",
    response_model=MusicaResposta,
    status_code=status.HTTP_201_CREATED,
    summary="Cadastrar Link Externo de Streaming (YouTube)",
    description="Registra uma música a partir de URL do YouTube para execução direta no Player."
)
async def cadastrar_link_streaming(
    dados: MusicaLinkStreaming,
    db: AsyncSession = Depends(obter_banco_de_dados)
):
    logger.info(f"Cadastrando streaming YouTube: {dados.titulo} ({dados.link_externo})")
    metadados_dict = {
        "tipo_midia": dados.tipo_midia or "YOUTUBE",
        "link_externo": dados.link_externo
    }

    dados_upload = MusicaUpload(
        titulo=dados.titulo.strip(),
        autor_artista=dados.autor_artista.strip() if dados.autor_artista else None,
        upload_por_loja_id=dados.organizacao_id,
        eventos_sugeridos_ids=dados.eventos_sugeridos_ids,
        metadados=metadados_dict
    )
    return await registrar_upload_musica(db=db, dados=dados_upload, arquivo_url=dados.link_externo)


@roteador_musicas.get(
    "/orfaos",
    response_model=List[MusicaResposta],
    summary="Dashboard SuperAdmin: Músicas Órfãs",
    description="Lista músicas marcadas sem uso (ORFA)."
)
async def obter_orfaos(
    db: AsyncSession = Depends(obter_banco_de_dados)
):
    return await listar_arquivos_orfaos(db=db)


@roteador_musicas.put("/{musica_id}", response_model=MusicaResposta)
async def atualizar_musica(
    musica_id: uuid.UUID,
    dados: MusicaAtualizacao,
    db: AsyncSession = Depends(obter_banco_de_dados)
):
    stmt = (
        select(Musica)
        .options(selectinload(Musica.eventos_sugeridos))
        .where(Musica.id == musica_id)
    )
    res = await db.execute(stmt)
    musica = res.scalars().first()
    if not musica:
        raise HTTPException(status_code=404, detail="Música não encontrada")

    if dados.titulo is not None:
        musica.titulo = dados.titulo
    if dados.autor_artista is not None:
        musica.autor_artista = dados.autor_artista

    # Atualiza vínculos com momentos litúrgicos caso informado
    if dados.eventos_sugeridos_ids is not None:
        # Remove vínculos antigos
        for es in list(musica.eventos_sugeridos):
            await db.delete(es)
        await db.flush()

        # Adiciona novos vínculos
        for ev_id in dados.eventos_sugeridos_ids:
            # Obtém o evento para verificar se possui equivalência canônica
            ev_db = await db.get(Evento, ev_id)
            if not ev_db:
                continue
            
            # Se possui canonico_id, vincula a todos os eventos equivalentes entre os ritos
            if ev_db.canonico_id:
                res_eq = await db.execute(
                    select(Evento).where(Evento.canonico_id == ev_db.canonico_id)
                )
                eventos_vincular = res_eq.scalars().all()
            else:
                eventos_vincular = [ev_db]

            for ev_v in eventos_vincular:
                db.add(MusicaEventoSugerido(musica_id=musica.id, evento_id=ev_v.id))

    await db.commit()
    await db.refresh(musica)
    return musica


@roteador_musicas.post(
    "/{musica_id}/promover-global",
    response_model=MusicaResposta,
    summary="SuperAdmin: Promover Associação de Música para o Acervo Global",
    description="Permite exclusivamente ao SuperAdmin transformar uma associação local de música em sugestão global para todas as Lojas."
)
async def promover_musica_global(
    musica_id: uuid.UUID,
    eventos_ids: Optional[List[uuid.UUID]] = Query(None, description="Eventos aos quais associar globalmente (opcional)"),
    usuario: UsuarioEsigma = Depends(obter_usuario_esigma),
    db: AsyncSession = Depends(obter_banco_de_dados)
):
    if not usuario.is_super_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Apenas o SuperAdmin pode promover músicas para o Acervo Global."
        )

    stmt = (
        select(Musica)
        .options(selectinload(Musica.eventos_sugeridos))
        .where(Musica.id == musica_id)
    )
    res = await db.execute(stmt)
    musica = res.scalars().first()
    if not musica:
        raise HTTPException(status_code=404, detail="Música não encontrada")

    # Torna a música global desvinculando de uma loja específica
    musica.upload_por_loja_id = None

    if eventos_ids:
        ids_existentes = {es.evento_id for es in musica.eventos_sugeridos}
        for ev_id in eventos_ids:
            ev_db = await db.get(Evento, ev_id)
            if not ev_db:
                continue
            if ev_db.canonico_id:
                res_eq = await db.execute(select(Evento.id).where(Evento.canonico_id == ev_db.canonico_id))
                evs_vinc = res_eq.scalars().all()
            else:
                evs_vinc = [ev_db.id]

            for eq_id in evs_vinc:
                if eq_id not in ids_existentes:
                    db.add(MusicaEventoSugerido(musica_id=musica.id, evento_id=eq_id))
                    ids_existentes.add(eq_id)

    await db.commit()
    await db.refresh(musica)
    logger.info(f"Música {musica.titulo} ({musica.id}) promovida com sucesso para o Acervo Global pelo SuperAdmin.")
    return musica


@roteador_musicas.delete("/{musica_id}", status_code=status.HTTP_204_NO_CONTENT)
async def deletar_musica(
    musica_id: uuid.UUID,
    db: AsyncSession = Depends(obter_banco_de_dados)
):
    stmt = select(Musica).where(Musica.id == musica_id)
    res = await db.execute(stmt)
    musica = res.scalars().first()
    if not musica:
        raise HTTPException(status_code=404, detail="Música não encontrada")

    await db.delete(musica)
    await db.commit()
    return None
