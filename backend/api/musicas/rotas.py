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

roteador_musicas = APIRouter(prefix="/musicas", tags=["Acervo Global e Músicas"])


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

    # Aqui teríamos a lógica real de salvar o arquivo no ServicoArmazenamentoTenant
    # Simulando o caminho salvo:
    caminho_salvo = f"/storage/global/{arquivo.filename}"

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
