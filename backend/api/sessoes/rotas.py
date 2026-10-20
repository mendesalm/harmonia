"""
Controlador de Rotas RESTful para Sessões (Templates e Roteiros).
"""
import uuid
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from backend.nucleo.banco import obter_banco_de_dados
from backend.modelos.sessao import TipoSessao, SessaoLoja

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
from backend.nucleo.dependencias import verificar_assinatura_ativa

roteador_sessoes = APIRouter(
    prefix="/sessoes",
    tags=["Templates e Sessões Customizadas"],
    dependencies=[Depends(verificar_assinatura_ativa)]
)


@roteador_sessoes.get(
    "/templates",
    response_model=List[TipoSessaoResposta],
    summary="Listar Templates Globais de Sessão",
    description="Lista os templates de sessão disponíveis para importação pelas Lojas, com filtro opcional por Rito."
)
async def listar_templates_disponiveis(
    rito_id: Optional[uuid.UUID] = Query(None, description="UUID opcional do Rito"),
    db: AsyncSession = Depends(obter_banco_de_dados)
):
    if rito_id:
        return await listar_tipos_sessao_por_rito(db=db, rito_id=rito_id)
    res = await db.execute(select(TipoSessao).options(selectinload(TipoSessao.eventos)).order_by(TipoSessao.nome))
    return list(res.scalars().all())


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


@roteador_sessoes.delete(
    "/loja/{loja_id}/{sessao_loja_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Excluir Sessão Customizada da Loja",
    description="Remove uma sessão/roteiro instanciado pela Loja."
)
async def deletar_sessao_loja(
    loja_id: uuid.UUID,
    sessao_loja_id: uuid.UUID,
    db: AsyncSession = Depends(obter_banco_de_dados)
):
    res = await db.execute(
        select(SessaoLoja).where(SessaoLoja.id == sessao_loja_id, SessaoLoja.loja_id == loja_id)
    )
    sessao = res.scalar_one_or_none()
    if not sessao:
        raise HTTPException(status_code=404, detail="Sessão não encontrada para esta Loja.")
    await db.delete(sessao)
    await db.commit()
    return None


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
