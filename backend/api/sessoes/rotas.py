"""
Controlador de Rotas RESTful para Sessões (Templates e Roteiros).
"""
import uuid
from typing import List
from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession
from backend.nucleo.banco import obter_banco_de_dados

from backend.api.sessoes.schemas import (
    TipoSessaoResposta,
    SessaoLojaImportacao,
    SessaoLojaResposta,
    SessaoLojaEventoAtualizacao,
    SessaoLojaEventoResposta
)
from backend.api.sessoes.servicos import (
    listar_tipos_sessao_por_rito,
    listar_sessoes_loja,
    importar_template_para_loja,
    atualizar_evento_customizado_loja
)
from backend.api.assinaturas.dependencias import verificar_assinatura_ativa

roteador_sessoes = APIRouter(
    prefix="/sessoes", 
    tags=["Templates e Sessões Customizadas"],
    dependencies=[Depends(verificar_assinatura_ativa)]
)


@roteador_sessoes.get(
    "/templates/rito/{rito_id}",
    response_model=List[TipoSessaoResposta],
    summary="SuperAdmin / Loja: Listar Templates do Rito"
)
async def get_templates(
    rito_id: uuid.UUID,
    db: AsyncSession = Depends(obter_banco_de_dados)
):
    return await listar_tipos_sessao_por_rito(db=db, rito_id=rito_id)


@roteador_sessoes.get(
    "/loja/{loja_id}",
    response_model=List[SessaoLojaResposta],
    summary="Dashboard: Sessões Ativas da Loja"
)
async def get_sessoes_loja(
    loja_id: uuid.UUID,
    db: AsyncSession = Depends(obter_banco_de_dados)
):
    return await listar_sessoes_loja(db=db, loja_id=loja_id)


@roteador_sessoes.post(
    "/loja/{loja_id}/importar",
    response_model=SessaoLojaResposta,
    status_code=status.HTTP_201_CREATED,
    summary="Cadastrar Sessão: Importar Template",
    description="A loja escolhe um Template Global (ex: Sessão Ordinária) e o sistema clona o roteiro para ela customizar."
)
async def importar_template(
    loja_id: uuid.UUID,
    dados: SessaoLojaImportacao,
    db: AsyncSession = Depends(obter_banco_de_dados)
):
    return await importar_template_para_loja(db=db, loja_id=loja_id, dados=dados)


@roteador_sessoes.put(
    "/loja/{loja_id}/roteiro/{evento_loja_id}",
    response_model=SessaoLojaEventoResposta,
    summary="Dashboard: Editar Evento da Sessão",
    description="Permite à Loja reordenar, suprimir ou editar a orientação do Mestre de Harmonia."
)
async def editar_roteiro_evento(
    loja_id: uuid.UUID,
    evento_loja_id: uuid.UUID,
    dados: SessaoLojaEventoAtualizacao,
    db: AsyncSession = Depends(obter_banco_de_dados)
):
    return await atualizar_evento_customizado_loja(
        db=db, loja_id=loja_id, sessao_loja_evento_id=evento_loja_id, dados=dados
    )
