"""
Controlador de Rotas RESTful para Músicas, Acervo Global e Sugestões.
"""
import uuid
import json
from typing import List, Optional
from fastapi import APIRouter, Depends, Query, UploadFile, File, Form, status
from sqlalchemy.ext.asyncio import AsyncSession
from backend.nucleo.banco import obter_banco_de_dados
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
from backend.api.assinaturas.dependencias import verificar_assinatura_ativa

roteador_musicas = APIRouter(
    prefix="/musicas", 
    tags=["Acervo Global e Músicas"],
    dependencies=[Depends(verificar_assinatura_ativa)]
)


from sqlalchemy import select
from backend.modelos.musica import Musica

@roteador_musicas.get(
    "",
    response_model=List[MusicaResposta],
    summary="Listar Acervo",
    description="Retorna todas as músicas do acervo."
)
async def listar_musicas(db: AsyncSession = Depends(obter_banco_de_dados)):
    stmt = select(Musica).order_by(Musica.titulo)
    res = await db.execute(stmt)
    return res.scalars().all()

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
    try:
        ids_parsed = json.loads(eventos_sugeridos_ids)
        lista_eventos = [uuid.UUID(str(i)) for i in ids_parsed]
    except Exception:
        lista_eventos = []

    from backend.nucleo.configuracoes import configuracoes
    import shutil
    import os
    
    # Define o diretório de destino
    diretorio_destino = configuracoes.DIRETORIO_INSTANCIAS_PUBLIC / "musicas"
    diretorio_destino.mkdir(parents=True, exist_ok=True)
    
    # Gera nome unico para evitar colisoes
    nome_arquivo_seguro = f"{uuid.uuid4().hex}_{arquivo.filename}"
    caminho_completo = diretorio_destino / nome_arquivo_seguro
    
    # Salva o arquivo no disco
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

from fastapi import HTTPException

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
