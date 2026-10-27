from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, text, delete, or_, func
from sqlalchemy.orm import selectinload
from typing import List, Optional, Dict, Any
import uuid
from backend.nucleo.banco import obter_banco_de_dados
from backend.modelos.canonico import TipoSessaoCanonico, MomentoCanonico
from backend.modelos.rito import Rito
from backend.modelos.sessao import TipoSessao, TipoSessaoEvento, SessaoLoja, SessaoLojaEvento
from backend.modelos.evento import Evento
from backend.api.admin.schemas import (
    RitoSchema, TipoSessaoCanonicoSchema, MomentoCanonicoSchema,
    CriarRitoSchema, CriarSessaoSchema, SalvarSequenciaSchema, TipoSessaoSchema
)
from backend.nucleo.dependencias import exigir_super_admin

roteador_admin = APIRouter(
    prefix="/admin",
    tags=["Administração Global"],
    dependencies=[Depends(exigir_super_admin)],
)

@roteador_admin.get("/ritos", response_model=List[RitoSchema], summary="Listar Ritos")
async def listar_ritos(db: AsyncSession = Depends(obter_banco_de_dados)):
    """Retorna todos os ritos com seus templates (tipos de sessão) atrelados."""
    stmt = select(Rito).options(
        selectinload(Rito.tipos_sessao).selectinload(TipoSessao.canonico)
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
    stmt = select(MomentoCanonico).options(selectinload(MomentoCanonico.eventos).selectinload(Evento.musicas_sugeridas)).order_by(MomentoCanonico.ordem_sugerida)
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

@roteador_admin.get("/ritos/sessoes/{sessao_id}/sequencia", response_model=List[uuid.UUID], summary="Obter Sequência do Ritual")
async def obter_sequencia(sessao_id: uuid.UUID, db: AsyncSession = Depends(obter_banco_de_dados)):
    stmt = select(TipoSessaoEvento).where(TipoSessaoEvento.tipo_sessao_id == sessao_id).order_by(TipoSessaoEvento.ordem_sequencia).options(selectinload(TipoSessaoEvento.evento))
    resultado = await db.execute(stmt)
    eventos = resultado.scalars().all()
    # Retornamos os UUIDs dos Momentos Canonicos
    return [ev.evento.canonico_id for ev in eventos if ev.evento.canonico_id]

@roteador_admin.put("/ritos/{rito_id}/sessoes/{sessao_id}/sequencia", summary="Salvar Sequência do Ritual")
async def salvar_sequencia(rito_id: uuid.UUID, sessao_id: uuid.UUID, payload: SalvarSequenciaSchema, db: AsyncSession = Depends(obter_banco_de_dados)):
    """
    Salva a sequência de Momentos Canônicos de um Template de Sessão (`TipoSessao`) de um Rito,
    vinculando sempre o `Evento` pertencente ao `rito_id` correspondente e sincronizando
    eventuais sessões já instanciadas pelas Lojas.
    """
    rito = await db.get(Rito, rito_id)
    if not rito:
        raise HTTPException(status_code=404, detail="Rito não encontrado")

    await db.execute(delete(TipoSessaoEvento).where(TipoSessaoEvento.tipo_sessao_id == sessao_id))

    ordem = 1
    eventos_sequencia: list[tuple[int, Evento]] = []
    for can_id in payload.canonicos_ids:
        mcan = await db.get(MomentoCanonico, can_id)
        if not mcan:
            continue

        stmt_ev = select(Evento).where(Evento.canonico_id == can_id, Evento.rito_id == rito_id)
        ev = (await db.execute(stmt_ev)).scalar_one_or_none()

        if not ev:
            ev = Evento(
                nome=mcan.nome,
                descricao=mcan.descricao,
                rito_id=rito_id,
                canonico_id=mcan.id,
                observacao_padrao_mestre_harmonia=mcan.orientacao or "Aguardar comando do Venerável Mestre.",
            )
            db.add(ev)
            await db.flush()

        tse = TipoSessaoEvento(tipo_sessao_id=sessao_id, evento_id=ev.id, ordem_sequencia=ordem)
        db.add(tse)
        eventos_sequencia.append((ordem, ev))
        ordem += 1

    # Garante que sessões de Lojas baseadas neste template recebam momentos que estavam faltando
    res_sl = await db.execute(
        select(SessaoLoja)
        .options(selectinload(SessaoLoja.eventos_customizados))
        .where(SessaoLoja.tipo_sessao_id == sessao_id)
    )
    for sl in res_sl.scalars().all():
        ids_existentes = {item.evento_id for item in sl.eventos_customizados}
        for ord_seq, ev_obj in eventos_sequencia:
            if ev_obj.id not in ids_existentes:
                db.add(
                    SessaoLojaEvento(
                        sessao_loja_id=sl.id,
                        evento_id=ev_obj.id,
                        ordem_execucao=ord_seq,
                        observacao_mestre_harmonia=ev_obj.observacao_padrao_mestre_harmonia,
                    )
                )

    await db.commit()
    return {"status": "ok"}


from backend.api.admin.schemas import SalvarEventoGlobalSchema
from backend.modelos.musica import MusicaEventoSugerido


async def _sincronizar_eventos_por_rito(
    db: AsyncSession,
    mcan: MomentoCanonico,
    payload: SalvarEventoGlobalSchema,
) -> None:
    """
    Atualiza ou cria os registros `Evento` de cada Rito para o `MomentoCanonico` informado
    SEM executar DELETE destrutivo (preservando os UUIDs referenciados nas esteiras de sessão).
    Se um Rito não tiver variação explícita em `payload.ritos`, utiliza o nome e orientação globais.
    """
    todos_ritos = list((await db.execute(select(Rito))).scalars().all())
    mapa_variacoes = {v.rito_id: v for v in payload.ritos if v.rito_id}

    res_existentes = await db.execute(select(Evento).where(Evento.canonico_id == mcan.id))
    eventos_por_rito = {ev.rito_id: ev for ev in res_existentes.scalars().all() if ev.rito_id}

    ritos_alvo_ids = {r.id for r in todos_ritos} | set(mapa_variacoes.keys())

    for rito_id in ritos_alvo_ids:
        variacao = mapa_variacoes.get(rito_id)
        nome_efetivo = (variacao.nome.strip() if variacao and variacao.nome and variacao.nome.strip() else payload.nome)
        obs_efetiva = (
            variacao.observacao_padrao_mestre_harmonia
            if variacao and variacao.observacao_padrao_mestre_harmonia is not None
            else (payload.orientacao or "Aguardar comando do Venerável Mestre.")
        )

        ev = eventos_por_rito.get(rito_id)
        if ev:
            ev.nome = nome_efetivo
            ev.descricao = payload.descricao
            ev.observacao_padrao_mestre_harmonia = obs_efetiva
        else:
            ev = Evento(
                nome=nome_efetivo,
                descricao=payload.descricao,
                rito_id=rito_id,
                canonico_id=mcan.id,
                observacao_padrao_mestre_harmonia=obs_efetiva,
            )
            db.add(ev)
            await db.flush()

        await db.execute(delete(MusicaEventoSugerido).where(MusicaEventoSugerido.evento_id == ev.id))
        for mus_id in payload.musicas_sugeridas_ids:
            db.add(MusicaEventoSugerido(musica_id=mus_id, evento_id=ev.id))


@roteador_admin.post("/canonicos/momentos", response_model=MomentoCanonicoSchema, summary="Criar Evento Global")
async def criar_evento_global(payload: SalvarEventoGlobalSchema, db: AsyncSession = Depends(obter_banco_de_dados)):
    mcan = MomentoCanonico(
        nome=payload.nome,
        descricao=payload.descricao,
        orientacao=payload.orientacao,
        ordem_sugerida=payload.ordem_sugerida,
        grau_aplicado=payload.grau_aplicado
    )
    db.add(mcan)
    await db.flush()

    await _sincronizar_eventos_por_rito(db, mcan, payload)
    await db.commit()

    stmt = select(MomentoCanonico).options(selectinload(MomentoCanonico.eventos).selectinload(Evento.musicas_sugeridas)).where(MomentoCanonico.id == mcan.id)
    r = await db.execute(stmt)
    return r.scalar_one()


@roteador_admin.put("/canonicos/momentos/{momento_id}", response_model=MomentoCanonicoSchema, summary="Editar Evento Global")
async def editar_evento_global(momento_id: uuid.UUID, payload: SalvarEventoGlobalSchema, db: AsyncSession = Depends(obter_banco_de_dados)):
    mcan = await db.get(MomentoCanonico, momento_id)
    if not mcan:
        raise HTTPException(status_code=404, detail="Momento não encontrado")

    mcan.nome = payload.nome
    mcan.descricao = payload.descricao
    mcan.orientacao = payload.orientacao
    mcan.ordem_sugerida = payload.ordem_sugerida
    mcan.grau_aplicado = payload.grau_aplicado

    await _sincronizar_eventos_por_rito(db, mcan, payload)
    await db.commit()

    stmt = select(MomentoCanonico).options(selectinload(MomentoCanonico.eventos).selectinload(Evento.musicas_sugeridas)).where(MomentoCanonico.id == mcan.id)
    r = await db.execute(stmt)
    return r.scalar_one()
    
@roteador_admin.delete("/canonicos/momentos/{momento_id}", summary="Deletar Evento Global")
async def deletar_evento_global(momento_id: uuid.UUID, db: AsyncSession = Depends(obter_banco_de_dados)):
    mcan = await db.get(MomentoCanonico, momento_id)
    if not mcan:
        raise HTTPException(status_code=404, detail="Momento não encontrado")
    await db.delete(mcan)
    await db.commit()
    return {"status": "ok"}


from sqlalchemy import func
from backend.modelos.organizacao import Organizacao
from backend.modelos.musica import Musica, MusicaEventoSugerido
from backend.modelos.evento import Evento
from backend.api.admin.schemas import EstatisticasDashboardSchema
from backend.api.musicas.schemas import (
    MusicaClassificacaoSuperAdmin,
    MusicaClassificacaoLoteSchema,
)
from backend.nucleo.constantes import (
    ESTILOS_DISPONIVEIS,
    SUBCLASSIFICACOES_DISPONIVEIS,
    normalizar_estilo,
    normalizar_subclassificacao,
)
from backend.nucleo.dependencias import exigir_super_admin
from backend.nucleo.auth_esigma import UsuarioEsigma
from backend.api.musicas.midia import classificar_midia
from loguru import logger

@roteador_admin.get("/estatisticas", response_model=EstatisticasDashboardSchema, summary="Estatisticas do Dashboard")
async def obter_estatisticas(db: AsyncSession = Depends(obter_banco_de_dados)):
    r_lojas = await db.execute(select(func.count(Organizacao.id)))
    total_lojas = r_lojas.scalar() or 0
    
    r_templates = await db.execute(select(func.count(Rito.id)))
    total_templates = r_templates.scalar() or 0
    
    r_eventos = await db.execute(select(func.count(MomentoCanonico.id)))
    total_eventos = r_eventos.scalar() or 0
    
    r_musicas = await db.execute(select(func.count(Musica.id)))
    total_musicas = r_musicas.scalar() or 0
    
    return {
        "total_lojas": total_lojas,
        "total_templates": total_templates,
        "total_eventos": total_eventos,
        "total_musicas": total_musicas
    }


@roteador_admin.get(
    "/musicas/opcoes-classificacao",
    summary="Opções de Estilos e Momentos para Curadoria",
    description="Retorna a lista de estilos, subclassificações e momentos litúrgicos para a interface de curadoria.",
)
async def obter_opcoes_classificacao(
    db: AsyncSession = Depends(obter_banco_de_dados),
    usuario: UsuarioEsigma = Depends(exigir_super_admin),
):
    stmt_momentos = select(MomentoCanonico).order_by(MomentoCanonico.ordem_sugerida, MomentoCanonico.nome)
    res_m = await db.execute(stmt_momentos)
    momentos = [
        {"id": str(m.id), "nome": m.nome, "ordem": m.ordem_sugerida}
        for m in res_m.scalars().all()
    ]

    return {
        "estilos": ESTILOS_DISPONIVEIS,
        "subclassificacoes": SUBCLASSIFICACOES_DISPONIVEIS,
        "momentos_canonicos": momentos,
    }


@roteador_admin.get(
    "/musicas/catalogo",
    summary="Catálogo Global de Curadoria Litúrgica de Músicas",
    description="Lista o acervo musical completo com dados de estilo, subclassificação e momentos associados.",
)
async def listar_catalogo_curadoria(
    busca: Optional[str] = Query(None, description="Busca por título ou artista"),
    estilo: Optional[str] = Query(None, description="Filtrar por estilo"),
    subclassificacao: Optional[str] = Query(None, description="Filtrar por subclassificação"),
    momento_id: Optional[uuid.UUID] = Query(None, description="Filtrar por momento canônico ou evento"),
    apenas_sem_classificacao: bool = Query(False, description="Exibir apenas faixas com estilo UNIVERSAL padrão"),
    limite: int = Query(200, description="Limite de registros"),
    pagina: int = Query(1, description="Página"),
    db: AsyncSession = Depends(obter_banco_de_dados),
    usuario: UsuarioEsigma = Depends(exigir_super_admin),
):
    stmt = (
        select(Musica)
        .options(
            selectinload(Musica.eventos_sugeridos)
            .selectinload(MusicaEventoSugerido.evento)
            .selectinload(Evento.canonico)
        )
    )

    if busca and busca.strip():
        termo = f"%{busca.strip()}%"
        stmt = stmt.where(or_(Musica.titulo.ilike(termo), Musica.autor_artista.ilike(termo)))

    if estilo and estilo.strip():
        stmt = stmt.where(Musica.estilo == estilo.strip().upper())
    elif apenas_sem_classificacao:
        stmt = stmt.where(Musica.estilo == "UNIVERSAL")

    if subclassificacao and subclassificacao.strip():
        stmt = stmt.where(Musica.subclassificacao == subclassificacao.strip().upper())

    stmt = stmt.order_by(Musica.titulo)
    offset = max(0, (pagina - 1) * limite)
    stmt = stmt.offset(offset).limit(limite)

    res = await db.execute(stmt)
    musicas = res.scalars().all()

    # Contagem total para paginação
    count_stmt = select(func.count(Musica.id))
    if busca and busca.strip():
        termo = f"%{busca.strip()}%"
        count_stmt = count_stmt.where(or_(Musica.titulo.ilike(termo), Musica.autor_artista.ilike(termo)))
    if estilo and estilo.strip():
        count_stmt = count_stmt.where(Musica.estilo == estilo.strip().upper())
    elif apenas_sem_classificacao:
        count_stmt = count_stmt.where(Musica.estilo == "UNIVERSAL")
    if subclassificacao and subclassificacao.strip():
        count_stmt = count_stmt.where(Musica.subclassificacao == subclassificacao.strip().upper())

    total_registros = (await db.execute(count_stmt)).scalar() or 0

    itens = []
    for m in musicas:
        eventos_vinculados = []
        chaves_vistas = set()
        for es in m.eventos_sugeridos:
            if not es.evento:
                continue
            chave = es.evento.canonico_id or es.evento_id
            if chave not in chaves_vistas:
                chaves_vistas.add(chave)
                eventos_vinculados.append({
                    "evento_id": str(es.evento_id),
                    "canonico_id": str(es.evento.canonico_id) if es.evento.canonico_id else None,
                    "nome": es.evento.canonico.nome if es.evento.canonico else es.evento.nome,
                })

        midia = classificar_midia(m.arquivo_url, m.metadados)
        itens.append({
            "id": str(m.id),
            "titulo": m.titulo,
            "autor_artista": m.autor_artista,
            "estilo": getattr(m, "estilo", "UNIVERSAL") or "UNIVERSAL",
            "subclassificacao": getattr(m, "subclassificacao", "GERAL") or "GERAL",
            "arquivo_url": m.arquivo_url,
            "caminho_arquivo": midia["caminho_arquivo"],
            "link_externo": midia["link_externo"],
            "tipo_midia": midia["tipo_midia"],
            "duracao_segundos": (m.metadados or {}).get("duracao_segundos"),
            "eventos_vinculados": eventos_vinculados,
            "ativo": m.ativo,
        })

    return {
        "total": total_registros,
        "pagina": pagina,
        "limite": limite,
        "itens": itens,
    }


@roteador_admin.patch(
    "/musicas/{musica_id}/classificacao",
    summary="Classificar Estilo, Subclassificação e Momentos Litúrgicos de uma Música",
    description="Permite que o Superadmin altere o estilo, a subclassificação e associe a música a múltiplos momentos.",
)
async def classificar_musica(
    musica_id: uuid.UUID,
    payload: MusicaClassificacaoSuperAdmin,
    db: AsyncSession = Depends(obter_banco_de_dados),
    usuario: UsuarioEsigma = Depends(exigir_super_admin),
):
    stmt = (
        select(Musica)
        .where(Musica.id == musica_id)
        .options(selectinload(Musica.eventos_sugeridos))
    )
    res = await db.execute(stmt)
    musica = res.scalar_one_or_none()
    if not musica:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Música não encontrada.")

    estilo_norm = normalizar_estilo(payload.estilo)
    sub_norm = normalizar_subclassificacao(payload.subclassificacao)

    musica.estilo = estilo_norm
    musica.subclassificacao = sub_norm

    # Atualiza momentos litúrgicos associados se fornecido
    if payload.eventos_sugeridos_ids is not None:
        # Resolve todos os eventos correspondentes (inclusive por canônico para cobrir Rito Brasileiro e REAA)
        target_ids = set()
        for ev_id in payload.eventos_sugeridos_ids:
            # Verifica se ev_id é MomentoCanonico ou Evento
            res_mcan = await db.execute(select(MomentoCanonico).where(MomentoCanonico.id == ev_id))
            mcan = res_mcan.scalar_one_or_none()
            if mcan:
                res_evs = await db.execute(select(Evento.id).where(Evento.canonico_id == mcan.id))
                for eid in res_evs.scalars().all():
                    target_ids.add(eid)
            else:
                target_ids.add(ev_id)
                # Se for evento com canonico_id, inclui os equivalentes
                res_ev = await db.execute(select(Evento).where(Evento.id == ev_id))
                ev = res_ev.scalar_one_or_none()
                if ev and ev.canonico_id:
                    res_eq = await db.execute(select(Evento.id).where(Evento.canonico_id == ev.canonico_id))
                    for eid in res_eq.scalars().all():
                        target_ids.add(eid)

        # Remove associações antigas e insere novas
        await db.execute(delete(MusicaEventoSugerido).where(MusicaEventoSugerido.musica_id == musica.id))
        for eid in target_ids:
            db.add(MusicaEventoSugerido(musica_id=musica.id, evento_id=eid))

    await db.commit()
    logger.info(
        f"Música '{musica.titulo}' (id={musica.id}) classificada pelo Superadmin: "
        f"estilo={estilo_norm}, sub={sub_norm}, total_momentos={len(payload.eventos_sugeridos_ids or [])}"
    )

    return {
        "status": "ok",
        "id": str(musica.id),
        "estilo": musica.estilo,
        "subclassificacao": musica.subclassificacao,
    }


@roteador_admin.post(
    "/musicas/classificacao-lote",
    summary="Classificar Músicas em Lote",
    description="Aplica estilo, subclassificação e momentos ritualísticos a múltiplas músicas selecionadas.",
)
async def classificar_musicas_lote(
    payload: MusicaClassificacaoLoteSchema,
    db: AsyncSession = Depends(obter_banco_de_dados),
    usuario: UsuarioEsigma = Depends(exigir_super_admin),
):
    if not payload.musicas_ids:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Nenhuma música informada.")

    estilo_norm = normalizar_estilo(payload.estilo) if payload.estilo else None
    sub_norm = normalizar_subclassificacao(payload.subclassificacao) if payload.subclassificacao else None

    # Resolve os IDs dos eventos alvo
    target_eventos_ids = set()
    if payload.eventos_sugeridos_ids:
        for ev_id in payload.eventos_sugeridos_ids:
            res_mcan = await db.execute(select(MomentoCanonico).where(MomentoCanonico.id == ev_id))
            mcan = res_mcan.scalar_one_or_none()
            if mcan:
                res_evs = await db.execute(select(Evento.id).where(Evento.canonico_id == mcan.id))
                for eid in res_evs.scalars().all():
                    target_eventos_ids.add(eid)
            else:
                target_eventos_ids.add(ev_id)
                res_ev = await db.execute(select(Evento).where(Evento.id == ev_id))
                ev = res_ev.scalar_one_or_none()
                if ev and ev.canonico_id:
                    res_eq = await db.execute(select(Evento.id).where(Evento.canonico_id == ev.canonico_id))
                    for eid in res_eq.scalars().all():
                        target_eventos_ids.add(eid)

    for m_id in payload.musicas_ids:
        res = await db.execute(select(Musica).where(Musica.id == m_id))
        musica = res.scalar_one_or_none()
        if not musica:
            continue

        if estilo_norm:
            musica.estilo = estilo_norm
        if sub_norm:
            musica.subclassificacao = sub_norm

        if payload.eventos_sugeridos_ids is not None:
            if not payload.adicionar_eventos:
                await db.execute(delete(MusicaEventoSugerido).where(MusicaEventoSugerido.musica_id == musica.id))
            
            # Adiciona os novos que ainda não existam
            res_existentes = await db.execute(
                select(MusicaEventoSugerido.evento_id).where(MusicaEventoSugerido.musica_id == musica.id)
            )
            existentes = set(res_existentes.scalars().all())
            for eid in target_eventos_ids:
                if eid not in existentes:
                    db.add(MusicaEventoSugerido(musica_id=musica.id, evento_id=eid))

    await db.commit()
    logger.info(
        f"Classificação em lote aplicada pelo Superadmin para {len(payload.musicas_ids)} músicas."
    )
    return {
        "status": "ok",
        "total_afetadas": len(payload.musicas_ids),
        "estilo": estilo_norm,
        "subclassificacao": sub_norm,
    }



