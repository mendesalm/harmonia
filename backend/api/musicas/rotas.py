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
from backend.nucleo.dependencias import verificar_assinatura_ativa
from backend.modelos.musica import Musica, MusicaEventoSugerido
from backend.modelos.evento import Evento
from backend.api.musicas.schemas import (
    MusicaUpload,
    MusicaAtualizacao,
    MusicaResposta
)
from backend.api.musicas.servicos import (
    registrar_upload_musica,
    buscar_musicas_sugeridas_para_evento,
    listar_arquivos_orfaos
)

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

    caminho_salvo = f"/storage/instancias/public/musicas/{nome_arquivo_seguro}"

    dados_upload = MusicaUpload(
        titulo=titulo,
        autor_artista=autor_artista,
        upload_por_loja_id=upload_por_loja_id,
        eventos_sugeridos_ids=lista_eventos
    )
    return await registrar_upload_musica(db=db, dados=dados_upload, arquivo_url=caminho_salvo)


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
    stmt = select(Musica).where(Musica.id == musica_id)
    res = await db.execute(stmt)
    musica = res.scalars().first()
    if not musica:
        raise HTTPException(status_code=404, detail="Música não encontrada")

    if dados.titulo is not None:
        musica.titulo = dados.titulo
    if dados.autor_artista is not None:
        musica.autor_artista = dados.autor_artista

    await db.commit()
    await db.refresh(musica)
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
