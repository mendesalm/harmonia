"""
Controlador de Rotas RESTful para Sessões e Sequenciamento Ritualístico.
"""
import uuid
from typing import List, Optional
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession
from backend.nucleo.banco import obter_banco_de_dados
from backend.api.sessoes.schemas import (
    SessaoCriacao,
    SessaoClonagem,
    SessaoAtualizacao,
    SessaoDefinirSequencia,
    SessaoResposta,
    SessaoDetalhadaResposta
)
from backend.api.sessoes.servicos import ServicoSessao

roteador_sessoes = APIRouter(prefix="/sessoes", tags=["Sessões e Sequenciamento Ritualístico"])


@roteador_sessoes.get(
    "",
    response_model=List[SessaoResposta],
    summary="Listar Sessões Maçônicas",
    description="Retorna todas as sessões cadastradas com a contagem de eventos de cada esteira."
)
async def listar_sessoes(
    organizacao_id: Optional[uuid.UUID] = Query(None, description="UUID da loja para filtrar"),
    apenas_ativas: bool = Query(True, description="Filtrar apenas sessões ativas"),
    db: AsyncSession = Depends(obter_banco_de_dados)
):
    return await ServicoSessao.listar(db=db, organizacao_id=organizacao_id, apenas_ativas=apenas_ativas)


@roteador_sessoes.get(
    "/{sessao_id}",
    response_model=SessaoDetalhadaResposta,
    summary="Obter Sessão com Esteira Completa de Eventos",
    description="Retorna os dados da sessão com a lista ordenada de todos os eventos ritualísticos associados."
)
async def obter_sessao(
    sessao_id: uuid.UUID,
    db: AsyncSession = Depends(obter_banco_de_dados)
):
    return await ServicoSessao.obter_detalhada(db=db, sessao_id=sessao_id)


@roteador_sessoes.post(
    "",
    response_model=SessaoDetalhadaResposta,
    status_code=status.HTTP_201_CREATED,
    summary="Cadastrar Nova Sessão Maçônica",
    description="Cria uma nova sessão litúrgica (ex: Magna de Iniciação) e define os eventos iniciais."
)
async def criar_sessao(
    dados: SessaoCriacao,
    db: AsyncSession = Depends(obter_banco_de_dados)
):
    return await ServicoSessao.criar(db=db, dados=dados)


@roteador_sessoes.post(
    "/{sessao_id}/clonar",
    response_model=SessaoDetalhadaResposta,
    status_code=status.HTTP_201_CREATED,
    summary="Clonar Modelo de Sessão",
    description="Clona uma sessão existente duplicando toda a sua esteira sequencial de eventos para customização rápida ou mudança de Rito (ex: para Rito Brasileiro)."
)
async def clonar_sessao(
    sessao_id: uuid.UUID,
    dados: SessaoClonagem,
    db: AsyncSession = Depends(obter_banco_de_dados)
):
    return await ServicoSessao.clonar(db=db, sessao_id=sessao_id, dados=dados)


@roteador_sessoes.put(
    "/{sessao_id}",
    response_model=SessaoDetalhadaResposta,
    summary="Atualizar Dados da Sessão",
    description="Atualiza nome, rito, grau ou notas da sessão."
)
async def atualizar_sessao(
    sessao_id: uuid.UUID,
    dados: SessaoAtualizacao,
    db: AsyncSession = Depends(obter_banco_de_dados)
):
    return await ServicoSessao.atualizar(db=db, sessao_id=sessao_id, dados=dados)


@roteador_sessoes.put(
    "/{sessao_id}/sequencia",
    response_model=SessaoDetalhadaResposta,
    summary="Definir / Reordenar Sequência de Eventos",
    description="Substitui a ordem completa da esteira de eventos da sessão de forma atômica."
)
async def definir_sequencia_sessao(
    sessao_id: uuid.UUID,
    dados: SessaoDefinirSequencia,
    db: AsyncSession = Depends(obter_banco_de_dados)
):
    return await ServicoSessao.definir_sequencia(db=db, sessao_id=sessao_id, dados=dados)


@roteador_sessoes.delete(
    "/{sessao_id}",
    summary="Excluir Sessão Maçônica",
    description="Remove uma sessão cadastrada e desvincula os eventos da esteira."
)
async def deletar_sessao(
    sessao_id: uuid.UUID,
    db: AsyncSession = Depends(obter_banco_de_dados)
):
    return await ServicoSessao.deletar(db=db, sessao_id=sessao_id)
