from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, text
from sqlalchemy.orm import selectinload
from typing import List
import uuid
from backend.nucleo.banco import obter_banco_de_dados
from backend.modelos.canonico import TipoSessaoCanonico, MomentoCanonico
from backend.modelos.rito import Rito
from backend.modelos.sessao import TipoSessao, TipoSessaoEvento
from backend.modelos.evento import Evento
from backend.api.admin.schemas import (
    RitoSchema, TipoSessaoCanonicoSchema, MomentoCanonicoSchema,
    CriarRitoSchema, CriarSessaoSchema, SalvarSequenciaSchema, TipoSessaoSchema
)

roteador_admin = APIRouter(prefix="/admin", tags=["Administração Global"])

@roteador_admin.get("/ritos", response_model=List[RitoSchema], summary="Listar Ritos")
async def listar_ritos(db: AsyncSession = Depends(obter_banco_de_dados)):
    """Retorna todos os ritos com seus templates (tipos de sessão) atrelados."""
    stmt = select(Rito).options(
        selectinload(Rito.tipos_sessao).selectinload("canonico")
    ).order_by(Rito.nome)
    resultado = await db.execute(stmt)
    return resultado.scalars().all()

@roteador_admin.get("/canonicos/sessoes", response_model=List[TipoSessaoCanonicoSchema], summary="Listar Sessões Canônicas")
async def listar_sessoes_canonicas(db: AsyncSession = Depends(obter_banco_de_dados)):
    """Retorna as sessões canônicas globais (gabaritos)."""
    stmt = select(TipoSessaoCanonico).order_by(TipoSessaoCanonico.nome)
    resultado = await db.execute(stmt)
    return resultado.scalars().all()

@roteador_admin.get("/canonicos/momentos", response_model=List[MomentoCanonicoSchema], summary="Listar Momentos Canônicos")
async def listar_momentos_canonicos(db: AsyncSession = Depends(obter_banco_de_dados)):
    """Retorna os momentos canônicos globais (gabaritos)."""
    stmt = select(MomentoCanonico).order_by(MomentoCanonico.nome)
    resultado = await db.execute(stmt)
    return resultado.scalars().all()

@roteador_admin.post("/ritos", response_model=RitoSchema, summary="Criar Rito")
async def criar_rito(rito_in: CriarRitoSchema, db: AsyncSession = Depends(obter_banco_de_dados)):
    novo_rito = Rito(nome=rito_in.nome, descricao=rito_in.descricao)
    db.add(novo_rito)
    await db.commit()
    await db.refresh(novo_rito)
    # Refresh lazy properties
    stmt = select(Rito).options(selectinload(Rito.tipos_sessao)).where(Rito.id == novo_rito.id)
    r = await db.execute(stmt)
    return r.scalar_one()

@roteador_admin.post("/ritos/{rito_id}/sessoes", response_model=TipoSessaoSchema, summary="Criar Sessão (Ritual)")
async def criar_sessao(rito_id: uuid.UUID, sessao_in: CriarSessaoSchema, db: AsyncSession = Depends(obter_banco_de_dados)):
    nova_sessao = TipoSessao(nome=sessao_in.nome, rito_id=rito_id, canonico_id=sessao_in.canonico_id)
    db.add(nova_sessao)
    await db.commit()
    await db.refresh(nova_sessao)
    stmt = select(TipoSessao).options(selectinload(TipoSessao.canonico)).where(TipoSessao.id == nova_sessao.id)
    r = await db.execute(stmt)
    return r.scalar_one()

@roteador_admin.put("/ritos/{rito_id}/sessoes/{sessao_id}/sequencia", summary="Salvar Sequência do Ritual")
async def salvar_sequencia(rito_id: uuid.UUID, sessao_id: uuid.UUID, payload: SalvarSequenciaSchema, db: AsyncSession = Depends(obter_banco_de_dados)):
    # 1. Carregar rito
    rito = await db.get(Rito, rito_id)
    if not rito:
        raise HTTPException(status_code=404, detail="Rito não encontrado")
    
    # 2. Deletar sequência anterior
    await db.execute(text(f"DELETE FROM tipos_sessao_eventos WHERE tipo_sessao_id = '{sessao_id}'"))
    
    # 3. Reconstruir
    ordem = 1
    for can_id in payload.canonicos_ids:
        # Busca o canonico para saber o nome
        mcan = await db.get(MomentoCanonico, can_id)
        if not mcan:
            continue
            
        nome_esperado = f"{mcan.nome} ({rito.nome})"
        stmt_ev = select(Evento).where(Evento.nome == nome_esperado)
        ev = (await db.execute(stmt_ev)).scalar_one_or_none()
        
        if not ev:
            ev = Evento(nome=nome_esperado, canonico_id=mcan.id, observacao_padrao_mestre_harmonia="")
            db.add(ev)
            await db.flush()
            
        tse = TipoSessaoEvento(tipo_sessao_id=sessao_id, evento_id=ev.id, ordem_sequencia=ordem)
        db.add(tse)
        ordem += 1
        
    await db.commit()
    return {"status": "ok"}

