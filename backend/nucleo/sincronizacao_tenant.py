# EM CONFORMIDADE COM AS REGRAS DE OURO DO E-SIGMA
"""
Serviço de Sincronização e Autocorreção (Self-Healing) de Tenants, Ritos, Momentos e Sessões no Harmonia.
Garante que:
1. Todos os `MomentoCanonico` possuam seus registros `Evento` correspondentes em cada `Rito` (Rito Brasileiro, REAA).
2. Os templates `TipoSessao` (Sessão Ordinária, Sessão Magna de Iniciação) contenham todos os momentos ritualísticos
   do Rito (restaurando momentos que tenham sido afetados por deleções em cascata anteriores, como 'Ingresso no Templo - Irmãos'
   e 'Ingresso no Templo - Cortejo' / 'Entrada do Cortejo').
3. A Loja 2181 (`795b19d5-e14c-4c2e-b047-ee99e6e39a9c`) esteja vinculada ao Rito Brasileiro e possua suas sessões
   sincronizadas com todos os momentos do Rito Brasileiro.
"""
import uuid
from typing import Optional

from loguru import logger
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from backend.modelos.canonico import MomentoCanonico
from backend.modelos.evento import Evento
from backend.modelos.musica import Musica, MusicaEventoSugerido
from backend.modelos.organizacao import Organizacao
from backend.modelos.rito import Rito
from backend.modelos.sessao import (
    SessaoLoja,
    SessaoLojaEvento,
    TipoSessao,
    TipoSessaoEvento,
)
from backend.nucleo.armazenamento import ServicoArmazenamentoTenant

LOJA_2181_UUID = uuid.UUID("795b19d5-e14c-4c2e-b047-ee99e6e39a9c")
LOJA_2181_SLUG = "GOB_Loja2181"
LOJA_2181_NOME = "ARLS João Pedro Junqueira nº 2181"
RITO_BRASILEIRO_NOME = "Rito Brasileiro"

# Nomes dos momentos exclusivos de Iniciação (não entram na Sessão Ordinária padrão)
NOMES_EXCLUSIVOS_INICIACAO = {
    "Entrada do Pavilhão Nacional",
    "Preparo do Candidato",
    "Ingresso do Candidato no Templo",
    "Taça Sagrada",
    "Primeira Viagem Iniciação",
    "Segunda Viagem Iniciação",
    "Terceira Viagem Iniciação",
    "Compromisso de Adesão",
    "Decisão Final da Loja",
    "Retorno do Candidato",
    "Solene Juramento",
    "A Luz",
    "Consagração",
    "Investidura",
    "Assinatura do Livro de Presenças",
    "Distribuição de Flores",
}


async def _reparar_eventos_e_templates_ritos(db: AsyncSession) -> bool:
    """
    Garante que cada `MomentoCanonico` tenha um `Evento` para cada `Rito` cadastrado
    e que os templates `TipoSessao` (Sessão Ordinária e Sessão Magna de Iniciação)
    contenham todos os eventos correspondentes na ordem ritualística correta.
    """
    alterou = False

    ritos = list((await db.execute(select(Rito))).scalars().all())
    if not ritos:
        return False

    mcans = list(
        (
            await db.execute(
                select(MomentoCanonico)
                .options(
                    selectinload(MomentoCanonico.eventos).selectinload(
                        Evento.musicas_sugeridas
                    )
                )
                .order_by(MomentoCanonico.ordem_sugerida, MomentoCanonico.nome)
            )
        )
        .scalars()
        .all()
    )

    # 1. Garante que todo MomentoCanonico possua Evento em cada Rito
    for mcan in mcans:
        eventos_por_rito = {ev.rito_id: ev for ev in mcan.eventos if ev.rito_id}
        musicas_ids_canonico = {
            ms.musica_id
            for ev in mcan.eventos
            for ms in (ev.musicas_sugeridas or [])
            if ms.musica_id
        }

        for rito in ritos:
            if rito.id not in eventos_por_rito:
                novo_ev = Evento(
                    nome=mcan.nome,
                    descricao=mcan.descricao,
                    rito_id=rito.id,
                    canonico_id=mcan.id,
                    observacao_padrao_mestre_harmonia=mcan.orientacao
                    or "Aguardar comando do Venerável Mestre.",
                )
                db.add(novo_ev)
                await db.flush()
                for mus_id in musicas_ids_canonico:
                    db.add(
                        MusicaEventoSugerido(
                            musica_id=mus_id, evento_id=novo_ev.id
                        )
                    )
                eventos_por_rito[rito.id] = novo_ev
                alterou = True

    if alterou:
        await db.flush()

    # 2. Repara a sequência dos templates TipoSessao de cada Rito
    for rito in ritos:
        res_evs_rito = await db.execute(
            select(Evento)
            .options(selectinload(Evento.canonico))
            .where(Evento.rito_id == rito.id, Evento.ativo == True)
        )
        eventos_rito = list(res_evs_rito.scalars().all())
        eventos_rito.sort(
            key=lambda e: (
                e.canonico.ordem_sugerida if e.canonico else 999,
                e.nome,
            )
        )

        res_templates = await db.execute(
            select(TipoSessao)
            .options(
                selectinload(TipoSessao.eventos).selectinload(
                    TipoSessaoEvento.evento
                ).selectinload(Evento.canonico)
            )
            .where(TipoSessao.rito_id == rito.id)
        )
        templates = list(res_templates.scalars().all())

        for ts in templates:
            eh_ordinaria = "ordin" in ts.nome.lower()
            eh_iniciacao = "inicia" in ts.nome.lower()
            if not (eh_ordinaria or eh_iniciacao):
                continue

            # Se o template já tiver eventos definidos, preserva a esteira cadastrada
            if ts.eventos and len(ts.eventos) > 0:
                continue

            eventos_atuais_ids = {tse.evento_id for tse in ts.eventos}
            eventos_esperados: list[Evento] = []

            for ev in eventos_rito:
                nome_base = (ev.canonico.nome if ev.canonico else ev.nome).strip()
                if eh_ordinaria:
                    if nome_base not in NOMES_EXCLUSIVOS_INICIACAO:
                        eventos_esperados.append(ev)
                elif eh_iniciacao:
                    if nome_base != "Ordem do Dia":
                        eventos_esperados.append(ev)

            faltantes = [
                ev for ev in eventos_esperados if ev.id not in eventos_atuais_ids
            ]
            if faltantes:
                # Reconstrói a ordenação preservando todos os momentos esperados
                todos_eventos_ts = {tse.evento_id: tse for tse in ts.eventos}
                for ev in faltantes:
                    novo_tse = TipoSessaoEvento(
                        tipo_sessao_id=ts.id,
                        evento_id=ev.id,
                        ordem_sequencia=999,
                    )
                    db.add(novo_tse)
                    ts.eventos.append(novo_tse)
                    todos_eventos_ts[ev.id] = novo_tse

                await db.flush()

                # Ordena pelo peso sugerido do momento canônico
                mapa_peso = {
                    ev.id: (ev.canonico.ordem_sugerida if ev.canonico else 999)
                    for ev in eventos_rito
                }
                ts_ordenados = sorted(
                    ts.eventos,
                    key=lambda item: (
                        mapa_peso.get(item.evento_id, 999),
                        item.ordem_sequencia,
                    ),
                )
                for idx, item_tse in enumerate(ts_ordenados, start=1):
                    item_tse.ordem_sequencia = idx

                alterou = True

    return alterou


async def _sincronizar_sessoes_da_loja(
    db: AsyncSession, loja_id: uuid.UUID, rito_id: uuid.UUID
) -> bool:
    """
    Garante que a Loja possua sua Sessão Ordinária instanciada e que as sessões existentes
    da Loja contenham todos os momentos do seu Template (`TipoSessao`) na ordem correta.
    """
    alterou = False

    res_sessoes = await db.execute(
        select(SessaoLoja)
        .options(
            selectinload(SessaoLoja.eventos_customizados).selectinload(
                SessaoLojaEvento.evento
            ).selectinload(Evento.canonico)
        )
        .where(SessaoLoja.loja_id == loja_id)
    )
    sessoes_existentes = list(res_sessoes.scalars().all())

    if not sessoes_existentes:
        res_ts = await db.execute(
            select(TipoSessao)
            .options(selectinload(TipoSessao.eventos))
            .where(
                TipoSessao.rito_id == rito_id,
                TipoSessao.nome == "Sessão Ordinária",
            )
        )
        ts_ord = res_ts.scalar_one_or_none()
        if ts_ord:
            nova_sl = SessaoLoja(
                loja_id=loja_id,
                tipo_sessao_id=ts_ord.id,
                nome_personalizado="Sessão Ordinária",
            )
            db.add(nova_sl)
            await db.flush()

            eventos_ts = sorted(ts_ord.eventos, key=lambda x: x.ordem_sequencia)
            for idx, tse in enumerate(eventos_ts, start=1):
                db.add(
                    SessaoLojaEvento(
                        sessao_loja_id=nova_sl.id,
                        evento_id=tse.evento_id,
                        ordem_execucao=idx,
                    )
                )
            await db.flush()
            return True

    # Para cada sessão já existente na Loja, restaura momentos do template que estavam ausentes
    for sl in sessoes_existentes:
        res_tse = await db.execute(
            select(TipoSessaoEvento)
            .options(
                selectinload(TipoSessaoEvento.evento).selectinload(Evento.canonico)
            )
            .where(TipoSessaoEvento.tipo_sessao_id == sl.tipo_sessao_id)
            .order_by(TipoSessaoEvento.ordem_sequencia)
        )
        template_eventos = list(res_tse.scalars().all())
        if not template_eventos:
            continue

        ids_atuais = {ev_c.evento_id for ev_c in sl.eventos_customizados}
        faltantes_tse = [
            tse for tse in template_eventos if tse.evento_id not in ids_atuais
        ]

        if faltantes_tse:
            for tse in faltantes_tse:
                novo_sle = SessaoLojaEvento(
                    sessao_loja_id=sl.id,
                    evento_id=tse.evento_id,
                    ordem_execucao=tse.ordem_sequencia,
                    suprimido=False,
                    observacao_mestre_harmonia=(
                        tse.evento.observacao_padrao_mestre_harmonia
                        if tse.evento
                        else None
                    ),
                )
                db.add(novo_sle)
                sl.eventos_customizados.append(novo_sle)

            await db.flush()

            # Reordena preservando a sequência canônica do template
            mapa_ordem_template = {
                tse.evento_id: tse.ordem_sequencia for tse in template_eventos
            }
            ordenados = sorted(
                sl.eventos_customizados,
                key=lambda item: (
                    mapa_ordem_template.get(item.evento_id, 999),
                    item.ordem_execucao,
                ),
            )
            for idx, item_sle in enumerate(ordenados, start=1):
                item_sle.ordem_execucao = idx

            alterou = True

    return alterou


async def sincronizar_organizacoes_base(db: AsyncSession) -> Optional[Organizacao]:
    """
    Executa a autocorreção completa de Ritos, Eventos, Templates e da Loja 2181.
    """
    try:
        # Garante a existência da coluna em_surdina em sessoes_loja_eventos (self-healing migration)
        try:
            from sqlalchemy import text
            await db.execute(text("ALTER TABLE sessoes_loja_eventos ADD COLUMN IF NOT EXISTS em_surdina BOOLEAN DEFAULT NULL;"))
            await db.commit()
        except Exception as e_col:
            logger.debug(f"Verificação de coluna em_surdina: {e_col}")

        # 1. Localiza ou cria o Rito Brasileiro
        res_rito = await db.execute(
            select(Rito).where(Rito.nome == RITO_BRASILEIRO_NOME)
        )
        rito_br = res_rito.scalar_one_or_none()
        if not rito_br:
            rito_br = Rito(
                nome=RITO_BRASILEIRO_NOME,
                descricao="Rito Brasileiro de Maçons Antigos, Livres e Aceitos",
            )
            db.add(rito_br)
            await db.flush()

        alterou = await _reparar_eventos_e_templates_ritos(db)

        # 2. Verifica se já existe a organização com o UUID oficial da Loja 2181
        res_oficial = await db.execute(
            select(Organizacao)
            .options(selectinload(Organizacao.rito))
            .where(Organizacao.id == LOJA_2181_UUID)
        )
        org_oficial = res_oficial.scalar_one_or_none()

        # 3. Procura eventual registro legado da Loja 2181 com UUID diferente
        res_legadas = await db.execute(
            select(Organizacao).where(
                Organizacao.id != LOJA_2181_UUID,
                (Organizacao.slug_armazenamento == LOJA_2181_SLUG)
                | (Organizacao.nome.ilike("%2181%")),
            )
        )
        orgs_legadas = list(res_legadas.scalars().all())

        if orgs_legadas:
            for org_legada in orgs_legadas:
                logger.info(
                    f"Migrando organização legada da Loja 2181 ({org_legada.id}) "
                    f"para o UUID oficial do e-Sigma ({LOJA_2181_UUID})."
                )
                if org_legada.slug_armazenamento == LOJA_2181_SLUG:
                    org_legada.slug_armazenamento = f"legado_{org_legada.id.hex[:8]}"
                    await db.flush()

            if not org_oficial:
                primeira_legada = orgs_legadas[0]
                org_oficial = Organizacao(
                    id=LOJA_2181_UUID,
                    nome=primeira_legada.nome or LOJA_2181_NOME,
                    sigla=primeira_legada.sigla or "JPJ-2181",
                    tipo=primeira_legada.tipo or "LOJA",
                    slug_armazenamento=LOJA_2181_SLUG,
                    rito_id=rito_br.id,
                    ativo=True,
                )
                db.add(org_oficial)
                await db.flush()

            for org_legada in orgs_legadas:
                await db.execute(
                    update(SessaoLoja)
                    .where(SessaoLoja.loja_id == org_legada.id)
                    .values(loja_id=LOJA_2181_UUID)
                )
                await db.execute(
                    update(Musica)
                    .where(Musica.organizacao_id == org_legada.id)
                    .values(organizacao_id=LOJA_2181_UUID)
                )
                await db.delete(org_legada)

            alterou = True

        if not org_oficial:
            org_oficial = Organizacao(
                id=LOJA_2181_UUID,
                nome=LOJA_2181_NOME,
                sigla="JPJ-2181",
                tipo="LOJA",
                slug_armazenamento=LOJA_2181_SLUG,
                rito_id=rito_br.id,
                ativo=True,
            )
            db.add(org_oficial)
            await db.flush()
            ServicoArmazenamentoTenant.provisionar_estrutura_tenant(LOJA_2181_SLUG)
            alterou = True

        if org_oficial.rito_id != rito_br.id:
            org_oficial.rito_id = rito_br.id
            alterou = True

        if await _sincronizar_sessoes_da_loja(db, LOJA_2181_UUID, rito_br.id):
            alterou = True

        if alterou:
            await db.commit()

        res_final = await db.execute(
            select(Organizacao)
            .options(selectinload(Organizacao.rito))
            .where(Organizacao.id == LOJA_2181_UUID)
        )
        return res_final.scalar_one_or_none()
    except Exception as erro:
        logger.warning(f"Aviso ao sincronizar organização base da Loja 2181: {erro}")
        await db.rollback()
        return None


async def obter_ou_sincronizar_organizacao(
    db: AsyncSession, org_uuid: uuid.UUID
) -> Optional[Organizacao]:
    """
    Busca a Organização pelo UUID com seu Rito carregado e garante que suas sessões
    e eventos do Rito estejam íntegros.
    """
    if org_uuid == LOJA_2181_UUID:
        return await sincronizar_organizacoes_base(db)

    stmt = (
        select(Organizacao)
        .options(selectinload(Organizacao.rito))
        .where(Organizacao.id == org_uuid)
    )
    res = await db.execute(stmt)
    return res.scalar_one_or_none()
