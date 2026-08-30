"""
Controlador de Rotas RESTful para Músicas e Acervo do Mestre de Harmonia.
"""
import uuid
import json
from typing import List, Optional
from fastapi import APIRouter, Depends, Query, UploadFile, File, Form, status
from sqlalchemy.ext.asyncio import AsyncSession
from backend.nucleo.banco import obter_banco_de_dados
from backend.api.musicas.schemas import (
    MusicaCriacaoLink,
    MusicaDownloadYouTube,
    MusicaAtualizacao,
    MusicaResposta
)
from backend.api.musicas.servicos import ServicoMusica

roteador_musicas = APIRouter(prefix="/musicas", tags=["Músicas e Acervo do Mestre"])


@roteador_musicas.get(
    "",
    response_model=List[MusicaResposta],
    summary="Listar Músicas do Acervo",
    description="Retorna músicas com suporte a filtros por loja, evento, tipo de mídia (local/streaming) e termo de busca."
)
async def listar_musicas(
    organizacao_id: Optional[uuid.UUID] = Query(None, description="UUID da Loja"),
    evento_id: Optional[uuid.UUID] = Query(None, description="Filtrar por evento ritualístico associado"),
    tipo_midia: Optional[str] = Query(None, description="ARQUIVO_LOCAL, YOUTUBE"),
    busca: Optional[str] = Query(None, description="Busca por título ou compositor"),
    apenas_ativas: bool = Query(True, description="Filtrar apenas músicas ativas"),
    db: AsyncSession = Depends(obter_banco_de_dados)
):
    return await ServicoMusica.listar(
        db=db,
        organizacao_id=organizacao_id,
        evento_id=evento_id,
        tipo_midia=tipo_midia,
        termo_busca=busca,
        apenas_ativas=apenas_ativas
    )


@roteador_musicas.get(
    "/{musica_id}",
    response_model=MusicaResposta,
    summary="Obter Detalhes da Música",
    description="Retorna dados completos da música com seus eventos associados."
)
async def obter_musica(
    musica_id: uuid.UUID,
    db: AsyncSession = Depends(obter_banco_de_dados)
):
    return await ServicoMusica.obter_por_id(db=db, musica_id=musica_id)


@roteador_musicas.post(
    "/upload",
    response_model=MusicaResposta,
    status_code=status.HTTP_201_CREATED,
    summary="Upload de Arquivo de Áudio Físico",
    description="Recebe arquivo de áudio (MP3, WAV, OGG), salva na pasta isolada do tenant e vincula aos eventos selecionados."
)
async def upload_musica(
    organizacao_id: uuid.UUID = Form(..., description="UUID da Loja"),
    arquivo: UploadFile = File(..., description="Arquivo de áudio (MP3, WAV, OGG)"),
    titulo: Optional[str] = Form(None, description="Título da música (opcional, usa nome do arquivo se omitido)"),
    autor_artista: Optional[str] = Form(None, description="Compositor ou intérprete"),
    evento_ids: Optional[str] = Form(None, description="Lista JSON de UUIDs de eventos (ex: ['uuid1', 'uuid2'])"),
    db: AsyncSession = Depends(obter_banco_de_dados)
):
    lista_eventos = []
    if evento_ids:
        try:
            ids_parsed = json.loads(evento_ids) if isinstance(evento_ids, str) else evento_ids
            lista_eventos = [uuid.UUID(str(i)) for i in ids_parsed]
        except Exception:
            lista_eventos = []

    return await ServicoMusica.criar_com_upload(
        db=db,
        organizacao_id=organizacao_id,
        arquivo=arquivo,
        titulo=titulo,
        autor_artista=autor_artista,
        evento_ids=lista_eventos
    )


@roteador_musicas.post(
    "/converter-youtube",
    response_model=MusicaResposta,
    status_code=status.HTTP_201_CREATED,
    summary="Baixar e Converter YouTube para MP3 320kbps",
    description="Baixa o fluxo de áudio de uma URL do YouTube, converte com FFmpeg em MP3 a 320 kbps e salva permanentemente na pasta da Loja."
)
async def converter_musica_youtube(
    dados: MusicaDownloadYouTube,
    db: AsyncSession = Depends(obter_banco_de_dados)
):
    return await ServicoMusica.baixar_e_converter_youtube(db=db, dados=dados)


@roteador_musicas.post(
    "/streaming",
    response_model=MusicaResposta,
    status_code=status.HTTP_201_CREATED,
    summary="Cadastrar Link de Streaming",
    description="Cadastra uma música a partir de um link externo associando-a aos eventos."
)
async def criar_musica_streaming(
    dados: MusicaCriacaoLink,
    db: AsyncSession = Depends(obter_banco_de_dados)
):
    return await ServicoMusica.criar_com_link(db=db, dados=dados)


@roteador_musicas.put(
    "/{musica_id}",
    response_model=MusicaResposta,
    summary="Atualizar Música",
    description="Atualiza metadados ou associações de eventos da música."
)
async def atualizar_musica(
    musica_id: uuid.UUID,
    dados: MusicaAtualizacao,
    db: AsyncSession = Depends(obter_banco_de_dados)
):
    return await ServicoMusica.atualizar(db=db, musica_id=musica_id, dados=dados)


@roteador_musicas.delete(
    "/{musica_id}",
    summary="Excluir Música",
    description="Remove a música do catálogo e apaga o arquivo físico correspondente do disco."
)
async def deletar_musica(
    musica_id: uuid.UUID,
    db: AsyncSession = Depends(obter_banco_de_dados)
):
    return await ServicoMusica.deletar(db=db, musica_id=musica_id)
