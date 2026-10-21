# EM CONFORMIDADE COM AS REGRAS DE OURO DO E-SIGMA
"""
Serviços para Gestão de Sessões (Templates) e Sessões Maçônicas da Loja.
"""
import uuid
from typing import List, Optional

from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from backend.api.sessoes.schemas import (
    SessaoLojaEventoAtualizacao,
    SessaoLojaImportacao,
    SessaoLojaSalvarCompleta,
)
from backend.modelos.evento import Evento
from backend.modelos.sessao import (
    SessaoLoja,
    SessaoLojaEvento,
    TipoSessao,
    TipoSessaoEvento,
)
from backend.nucleo.sincronizacao_tenant import (
    obter_ou_sincronizar_organizacao,
    sincronizar_organizacoes_base,
)


def _enriquecer_nomes_template(templates: List[TipoSessao]) -> List[TipoSessao]:
    """Preenche o atributo `evento_nome` nos itens de `TipoSessao.eventos`."""
    for t in templates:
        t.eventos.sort(key=lambda x: x.ordem_sequencia)
        for ev_t in t.eventos:
            ev_t.evento_nome = (
                ev_t.evento.nome if ev_t.evento else "Momento Ritualístico"
            )
    return templates


def _enriquecer_nomes_sessao_loja(sessoes: List[SessaoLoja]) -> List[SessaoLoja]:
    """Preenche o atributo `evento_nome` nos itens de `SessaoLoja.eventos_customizados`."""
    for s in sessoes:
        s.eventos_customizados.sort(key=lambda x: x.ordem_execucao)
        for ev_cust in s.eventos_customizados:
            ev_cust.evento_nome = (
                ev_cust.evento.nome if ev_cust.evento else "Momento Ritualístico"
            )
    return sessoes


async def listar_tipos_sessao_por_rito(
    db: AsyncSession, rito_id: Optional[uuid.UUID] = None
) -> List[TipoSessao]:
    """Retorna os templates globais (`TipoSessao`) disponíveis, filtrados opcionalmente pelo Rito."""
    await sincronizar_organizacoes_base(db)
    stmt = select(TipoSessao).options(
        selectinload(TipoSessao.eventos).selectinload(TipoSessaoEvento.evento)
    )
    if rito_id:
        stmt = stmt.where(TipoSessao.rito_id == rito_id)
    stmt = stmt.order_by(TipoSessao.nome)
    result = await db.execute(stmt)
    templates = list(result.scalars().all())
    return _enriquecer_nomes_template(templates)


async def listar_sessoes_loja(
    db: AsyncSession, loja_id: uuid.UUID
) -> List[SessaoLoja]:
    """Lista as sessões que a Loja já cadastrou/importou, com os eventos customizados carregados."""
    await obter_ou_sincronizar_organizacao(db, loja_id)
    result = await db.execute(
        select(SessaoLoja)
        .options(
            selectinload(SessaoLoja.tipo_sessao),
            selectinload(SessaoLoja.eventos_customizados).selectinload(
                SessaoLojaEvento.evento
            ),
        )
        .where(SessaoLoja.loja_id == loja_id)
    )
    sessoes = list(result.scalars().all())
    return _enriquecer_nomes_sessao_loja(sessoes)


async def importar_template_para_loja(
    db: AsyncSession, loja_id: uuid.UUID, dados: SessaoLojaImportacao
) -> SessaoLoja:
    """
    Cadastra uma nova Sessão Maçônica para a Loja a partir de um Template do Rito
    ou de uma seleção customizada de momentos ritualísticos.
    """
    org = await obter_ou_sincronizar_organizacao(db, loja_id)

    template: Optional[TipoSessao] = None
    if dados.tipo_sessao_id:
        res = await db.execute(
            select(TipoSessao).where(TipoSessao.id == dados.tipo_sessao_id)
        )
        template = res.scalar_one_or_none()

    if not template and org and org.rito_id:
        res_padrao = await db.execute(
            select(TipoSessao)
            .where(TipoSessao.rito_id == org.rito_id)
            .order_by(TipoSessao.nome)
        )
        template = res_padrao.scalars().first()

    if not template:
        res_qualquer = await db.execute(select(TipoSessao).order_by(TipoSessao.nome))
        template = res_qualquer.scalars().first()

    if not template:
        raise HTTPException(
            status_code=404, detail="Template de Sessão não encontrado."
        )

    nome_sessao = (dados.nome_personalizado or "").strip() or f"{template.nome}"
    nova_sessao = SessaoLoja(
        loja_id=loja_id,
        tipo_sessao_id=template.id,
        nome_personalizado=nome_sessao,
    )
    db.add(nova_sessao)
    await db.flush()

    if dados.eventos_customizados is not None and len(dados.eventos_customizados) > 0:
        for idx, item in enumerate(dados.eventos_customizados, start=1):
            ev_db = await db.get(Evento, item.evento_id)
            if not ev_db:
                continue
            db.add(
                SessaoLojaEvento(
                    sessao_loja_id=nova_sessao.id,
                    evento_id=ev_db.id,
                    ordem_execucao=item.ordem_execucao or idx,
                    suprimido=item.suprimido,
                    observacao_mestre_harmonia=(
                        item.observacao_mestre_harmonia
                        if item.observacao_mestre_harmonia is not None
                        else ev_db.observacao_padrao_mestre_harmonia
                    ),
                )
            )
    else:
        res_ev = await db.execute(
            select(TipoSessaoEvento)
            .options(selectinload(TipoSessaoEvento.evento))
            .where(TipoSessaoEvento.tipo_sessao_id == template.id)
            .order_by(TipoSessaoEvento.ordem_sequencia)
        )
        eventos_template = res_ev.scalars().all()
        for idx, ev_temp in enumerate(eventos_template, start=1):
            db.add(
                SessaoLojaEvento(
                    sessao_loja_id=nova_sessao.id,
                    evento_id=ev_temp.evento_id,
                    ordem_execucao=idx,
                    observacao_mestre_harmonia=(
                        ev_temp.evento.observacao_padrao_mestre_harmonia
                        if ev_temp.evento
                        else None
                    ),
                )
            )

    await db.commit()

    res_final = await db.execute(
        select(SessaoLoja)
        .options(
            selectinload(SessaoLoja.tipo_sessao),
            selectinload(SessaoLoja.eventos_customizados).selectinload(
                SessaoLojaEvento.evento
            ),
        )
        .where(SessaoLoja.id == nova_sessao.id)
    )
    sessao_criada = res_final.scalar_one()
    _enriquecer_nomes_sessao_loja([sessao_criada])
    return sessao_criada


async def salvar_sessao_loja_completa(
    db: AsyncSession,
    loja_id: uuid.UUID,
    sessao_loja_id: uuid.UUID,
    dados: SessaoLojaSalvarCompleta,
) -> SessaoLoja:
    """
    Atualiza o nome e a esteira completa de momentos de uma Sessão da Loja,
    preservando os vínculos existentes (e playlists) e permitindo incluir novos
    momentos do Rito ou remover momentos indesejados.
    """
    res = await db.execute(
        select(SessaoLoja)
        .options(selectinload(SessaoLoja.eventos_customizados))
        .where(SessaoLoja.id == sessao_loja_id, SessaoLoja.loja_id == loja_id)
    )
    sessao = res.scalar_one_or_none()
    if not sessao:
        raise HTTPException(
            status_code=404, detail="Sessão não encontrada para esta Loja."
        )

    if dados.nome_personalizado and dados.nome_personalizado.strip():
        sessao.nome_personalizado = dados.nome_personalizado.strip()

    existentes_por_evento = {
        ev.evento_id: ev for ev in sessao.eventos_customizados
    }
    eventos_enviados_ids = {item.evento_id for item in dados.eventos_customizados}

    # Remove momentos que foram excluídos da esteira
    for ev_id, obj_existente in list(existentes_por_evento.items()):
        if ev_id not in eventos_enviados_ids:
            await db.delete(obj_existente)

    # Atualiza ou insere na ordem enviada
    for idx, item in enumerate(dados.eventos_customizados, start=1):
        existente = existentes_por_evento.get(item.evento_id)
        if existente:
            existente.ordem_execucao = idx
            existente.suprimido = item.suprimido
            if item.observacao_mestre_harmonia is not None:
                existente.observacao_mestre_harmonia = (
                    item.observacao_mestre_harmonia
                )
        else:
            ev_db = await db.get(Evento, item.evento_id)
            if not ev_db:
                continue
            db.add(
                SessaoLojaEvento(
                    sessao_loja_id=sessao.id,
                    evento_id=ev_db.id,
                    ordem_execucao=idx,
                    suprimido=item.suprimido,
                    observacao_mestre_harmonia=(
                        item.observacao_mestre_harmonia
                        if item.observacao_mestre_harmonia is not None
                        else ev_db.observacao_padrao_mestre_harmonia
                    ),
                )
            )

    await db.commit()

    res_final = await db.execute(
        select(SessaoLoja)
        .options(
            selectinload(SessaoLoja.tipo_sessao),
            selectinload(SessaoLoja.eventos_customizados).selectinload(
                SessaoLojaEvento.evento
            ),
        )
        .where(SessaoLoja.id == sessao.id)
    )
    sessao_atualizada = res_final.scalar_one()
    _enriquecer_nomes_sessao_loja([sessao_atualizada])
    return sessao_atualizada


async def atualizar_evento_customizado_loja(
    db: AsyncSession,
    loja_id: uuid.UUID,
    sessao_loja_evento_id: uuid.UUID,
    dados: SessaoLojaEventoAtualizacao,
) -> SessaoLojaEvento:
    """
    Permite à loja reordenar, suprimir ou adicionar notas para o Mestre de Harmonia em um evento específico.
    """
    res = await db.execute(
        select(SessaoLojaEvento)
        .options(selectinload(SessaoLojaEvento.evento))
        .join(SessaoLoja)
        .where(
            SessaoLojaEvento.id == sessao_loja_evento_id,
            SessaoLoja.loja_id == loja_id,
        )
    )
    evento_loja = res.scalar_one_or_none()

    if not evento_loja:
        raise HTTPException(
            status_code=404,
            detail="Evento de Sessão não encontrado para esta loja.",
        )

    evento_loja.ordem_execucao = dados.ordem_execucao
    evento_loja.suprimido = dados.suprimido
    if dados.observacao_mestre_harmonia is not None:
        evento_loja.observacao_mestre_harmonia = (
            dados.observacao_mestre_harmonia
        )

    await db.commit()
    await db.refresh(evento_loja)
    evento_loja.evento_nome = (
        evento_loja.evento.nome if evento_loja.evento else "Momento Ritualístico"
    )
    return evento_loja
