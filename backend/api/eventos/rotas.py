"""
Controlador de Rotas RESTful para Eventos Ritualísticos (Playlists).
"""
import uuid
from typing import List, Optional
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession
from backend.nucleo.banco import obter_banco_de_dados
from backend.api.eventos.schemas import EventoCriacao, EventoAtualizacao, EventoResposta
from backend.api.eventos.servicos import ServicoEvento

roteador_eventos = APIRouter(prefix="/eventos", tags=["Eventos Ritualísticos (Playlists)"])


@roteador_eventos.get(
    "",
    response_model=List[EventoResposta],
    summary="Listar Eventos Ritualísticos",
    description="Retorna eventos disponíveis para a loja informada, incluindo eventos padrão do sistema e compartilhados."
)
async def listar_eventos(
    organizacao_id: Optional[uuid.UUID] = Query(None, description="UUID da loja para filtrar eventos"),
    incluir_globais: bool = Query(True, description="Se deve incluir os eventos padrão do sistema"),
    apenas_ativos: bool = Query(True, description="Se deve filtrar apenas eventos ativos"),
    db: AsyncSession = Depends(obter_banco_de_dados)
):
    return await ServicoEvento.listar(
        db=db,
        organizacao_id=organizacao_id,
        incluir_globais=incluir_globais,
        apenas_ativos=apenas_ativos
    )


@roteador_eventos.get(
    "/{evento_id}",
    response_model=EventoResposta,
    summary="Obter Detalhes do Evento",
    description="Retorna os dados de um evento ritualístico específico e a contagem de músicas."
)
async def obter_evento(
    evento_id: uuid.UUID,
    db: AsyncSession = Depends(obter_banco_de_dados)
):
    return await ServicoEvento.obter_por_id(db=db, evento_id=evento_id)


@roteador_eventos.post(
    "",
    response_model=EventoResposta,
    status_code=status.HTTP_201_CREATED,
    summary="Cadastrar Novo Evento Ritualístico",
    description="Cria um novo momento ritualístico / playlist customizada para a Loja."
)
async def criar_evento(
    dados: EventoCriacao,
    db: AsyncSession = Depends(obter_banco_de_dados)
):
    return await ServicoEvento.criar(db=db, dados=dados)


@roteador_eventos.put(
    "/{evento_id}",
    response_model=EventoResposta,
    summary="Atualizar Evento Ritualístico",
    description="Atualiza nome, descrição ou configurações de compartilhamento de um evento."
)
async def atualizar_evento(
    evento_id: uuid.UUID,
    dados: EventoAtualizacao,
    db: AsyncSession = Depends(obter_banco_de_dados)
):
    return await ServicoEvento.atualizar(db=db, evento_id=evento_id, dados=dados)


@roteador_eventos.delete(
    "/{evento_id}",
    summary="Excluir Evento Ritualístico",
    description="Exclui um evento customizado da loja. Eventos padrão do sistema não podem ser deletados."
)
async def deletar_evento(
    evento_id: uuid.UUID,
    db: AsyncSession = Depends(obter_banco_de_dados)
):
    return await ServicoEvento.deletar(db=db, evento_id=evento_id)
