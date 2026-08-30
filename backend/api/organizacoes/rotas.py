"""
Controlador de Rotas RESTful para Organizações (Lojas e Obediências).
Autodocumentado via OpenAPI / Swagger.
"""
import uuid
from typing import List
from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession
from backend.nucleo.banco import obter_banco_de_dados
from backend.api.organizacoes.schemas import OrganizacaoCriacao, OrganizacaoAtualizacao, OrganizacaoResposta
from backend.api.organizacoes.servicos import ServicoOrganizacao

roteador_organizacoes = APIRouter(prefix="/organizacoes", tags=["Organizações (Tenants / Lojas)"])


@roteador_organizacoes.get(
    "",
    response_model=List[OrganizacaoResposta],
    summary="Listar Organizações / Lojas",
    description="Retorna todas as organizações (lojas maçônicas e obediências) cadastradas no sistema."
)
async def listar_organizacoes(
    apenas_ativas: bool = True,
    db: AsyncSession = Depends(obter_banco_de_dados)
):
    return await ServicoOrganizacao.listar(db=db, apenas_ativas=apenas_ativas)


@roteador_organizacoes.get(
    "/{org_id}",
    response_model=OrganizacaoResposta,
    summary="Obter Detalhes da Organização",
    description="Retorna os dados detalhados de uma loja ou obediência específica pelo seu UUID."
)
async def obter_organizacao(
    org_id: uuid.UUID,
    db: AsyncSession = Depends(obter_banco_de_dados)
):
    return await ServicoOrganizacao.obter_por_id(db=db, org_id=org_id)


@roteador_organizacoes.post(
    "",
    response_model=OrganizacaoResposta,
    status_code=status.HTTP_201_CREATED,
    summary="Cadastrar Nova Organização / Loja",
    description="Cadastra uma nova loja maçônica, aplicando Title Casing, validação de duplicidade e provisionamento de pastas."
)
async def criar_organizacao(
    dados: OrganizacaoCriacao,
    db: AsyncSession = Depends(obter_banco_de_dados)
):
    return await ServicoOrganizacao.criar(db=db, dados=dados)


@roteador_organizacoes.put(
    "/{org_id}",
    response_model=OrganizacaoResposta,
    summary="Atualizar Organização / Loja",
    description="Atualiza campos cadastrais de uma organização existente."
)
async def atualizar_organizacao(
    org_id: uuid.UUID,
    dados: OrganizacaoAtualizacao,
    db: AsyncSession = Depends(obter_banco_de_dados)
):
    return await ServicoOrganizacao.atualizar(db=db, org_id=org_id, dados=dados)


@roteador_organizacoes.delete(
    "/{org_id}",
    summary="Excluir Organização / Loja",
    description="Exclui uma organização do banco de dados."
)
async def deletar_organizacao(
    org_id: uuid.UUID,
    db: AsyncSession = Depends(obter_banco_de_dados)
):
    return await ServicoOrganizacao.deletar(db=db, org_id=org_id)
