"""
Serviços para Gestão de Sessões (Templates) e Sessões da Loja.
"""
import uuid
from typing import List, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from fastapi import HTTPException

from backend.modelos.sessao import TipoSessao, TipoSessaoEvento, SessaoLoja, SessaoLojaEvento
from backend.api.sessoes.schemas import SessaoLojaImportacao, SessaoLojaEventoAtualizacao


async def listar_tipos_sessao_por_rito(db: AsyncSession, rito_id: uuid.UUID) -> List[TipoSessao]:
    """Retorna os templates globais (TiposSessao) disponíveis para um Rito específico."""
    result = await db.execute(
        select(TipoSessao).where(TipoSessao.rito_id == rito_id)
    )
    return list(result.scalars().all())


async def listar_sessoes_loja(db: AsyncSession, loja_id: uuid.UUID) -> List[SessaoLoja]:
    """Lista as sessões que a Loja já instanciou/importou."""
    result = await db.execute(
        select(SessaoLoja).where(SessaoLoja.loja_id == loja_id)
    )
    return list(result.scalars().all())


async def importar_template_para_loja(
    db: AsyncSession, loja_id: uuid.UUID, dados: SessaoLojaImportacao
) -> SessaoLoja:
    """
    Importa um TipoSessao (template global) para a Loja, 
    copiando seus eventos para que possam ser customizados.
    """
    # 1. Verifica se o template existe
    res = await db.execute(select(TipoSessao).where(TipoSessao.id == dados.tipo_sessao_id))
    template = res.scalar_one_or_none()
    if not template:
        raise HTTPException(status_code=404, detail="Template de Sessão não encontrado.")

    # 2. Cria a Instância da Loja
    nova_sessao = SessaoLoja(
        loja_id=loja_id,
        tipo_sessao_id=template.id,
        nome_personalizado=dados.nome_personalizado or f"Minha {template.nome}"
    )
    db.add(nova_sessao)
    await db.flush()

    # 3. Copia os Eventos do Template para permitir customização (reordenação, supressão)
    res_ev = await db.execute(
        select(TipoSessaoEvento)
        .where(TipoSessaoEvento.tipo_sessao_id == template.id)
        .order_by(TipoSessaoEvento.ordem_sequencia)
    )
    
    eventos_template = res_ev.scalars().all()
    for ev_temp in eventos_template:
        novo_ev_loja = SessaoLojaEvento(
            sessao_loja_id=nova_sessao.id,
            evento_id=ev_temp.evento_id,
            ordem_execucao=ev_temp.ordem_sequencia,
            # Copia a orientação padrão como ponto de partida
            observacao_mestre_harmonia=ev_temp.evento.observacao_padrao_mestre_harmonia if ev_temp.evento else None
        )
        db.add(novo_ev_loja)

    await db.commit()
    await db.refresh(nova_sessao)
    return nova_sessao


async def atualizar_evento_customizado_loja(
    db: AsyncSession, 
    loja_id: uuid.UUID, 
    sessao_loja_evento_id: uuid.UUID, 
    dados: SessaoLojaEventoAtualizacao
) -> SessaoLojaEvento:
    """
    Permite à loja reordenar, suprimir ou adicionar notas para o Mestre de Harmonia em um evento específico.
    """
    res = await db.execute(
        select(SessaoLojaEvento)
        .join(SessaoLoja)
        .where(
            SessaoLojaEvento.id == sessao_loja_evento_id,
            SessaoLoja.loja_id == loja_id
        )
    )
    evento_loja = res.scalar_one_or_none()
    
    if not evento_loja:
        raise HTTPException(status_code=404, detail="Evento de Sessão não encontrado para esta loja.")

    evento_loja.ordem_execucao = dados.ordem_execucao
    evento_loja.suprimido = dados.suprimido
    if dados.observacao_mestre_harmonia is not None:
        evento_loja.observacao_mestre_harmonia = dados.observacao_mestre_harmonia

    await db.commit()
    await db.refresh(evento_loja)
    return evento_loja
