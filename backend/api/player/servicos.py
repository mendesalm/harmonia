"""
Camada de Serviços para o Player Ritualístico do Mestre de Harmonia.
Implementa a esteira sequencial com sorteio randômico de faixas por momento litúrgico,
respeitando as playlists da Loja (`playlists_loja`) e a equivalência canônica entre Ritos.
"""
import random
import uuid
from typing import List, Optional

from fastapi import HTTPException, status
from loguru import logger
from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from backend.api.player.schemas import (
    MomentoRitualisticoExecucao,
    MusicaSorteadaInfo,
    SessaoPlayerExecucao,
)
from backend.api.musicas.midia import classificar_midia
from backend.core.constants import TERMOS_MOMENTO_SURDINA
from backend.modelos.evento import Evento
from backend.modelos.musica import Musica, MusicaEvento, MusicaEventoSugerido
from backend.modelos.sessao import SessaoLoja, SessaoLojaEvento, TipoSessao
from backend.nucleo.auth_esigma import UsuarioEsigma
from backend.nucleo.sincronizacao_tenant import sincronizar_organizacoes_base


def _converter_musica_para_info(musica: Musica, preferida: bool = False) -> MusicaSorteadaInfo:
    """
    Converte a entidade ORM `Musica` para o schema `MusicaSorteadaInfo`.

    O `tipo_midia` é sempre derivado da URL real via `classificar_midia`
    (enum `TipoMidia`), nunca de um valor legado salvo em `metadados`.
    """
    meta = musica.metadados or {}
    midia = classificar_midia(musica.arquivo_url, meta)
    sub = getattr(musica, "subclassificacao", "GERAL") or "GERAL"
    return MusicaSorteadaInfo(
        id=musica.id,
        titulo=musica.titulo,
        autor_artista=musica.autor_artista,
        tipo_midia=midia["tipo_midia"],
        caminho_arquivo=midia["caminho_arquivo"],
        link_externo=midia["link_externo"],
        duracao_segundos=meta.get("duracao_segundos"),
        preferida=preferida,
        surdina=bool(meta.get("surdina", False)) or (sub == "AMBIENTE"),
        estilo=getattr(musica, "estilo", "UNIVERSAL") or "UNIVERSAL",
        subclassificacao=sub,
    )


def classificar_momento_surdina(
    nome: Optional[str],
    descricao: Optional[str] = None,
    observacao: Optional[str] = None,
) -> bool:
    """
    Identifica se um momento ritualístico pertence à classe de Surdina / Interlúdio
    (acompanhamento de fala, leituras, giro de bolsas ou meditação), devendo iniciar
    com volume limitado a 25% por padrão (desabilitável pelo Mestre de Harmonia).
    """
    texto_unificado = " ".join(filter(None, [nome, descricao, observacao])).lower()
    return any(termo in texto_unificado for termo in TERMOS_MOMENTO_SURDINA)


def sortear_entre_candidatas(
    candidatas: List[MusicaSorteadaInfo],
    excluir_id: Optional[uuid.UUID] = None,
    momento_em_surdina: bool = False,
) -> Optional[MusicaSorteadaInfo]:
    """
    Regra de sorteio de um momento ritualístico (função pura, testável sem banco):

      1. Se existir UMA OU MAIS músicas preferidas, sorteia apenas entre elas.
      2. Se não houver preferidas, sorteia entre todas as candidatas.
      3. Se o momento estiver em surdina, prioriza faixas com subclassificação 'AMBIENTE' ou 'surdina=True'.
      4. `excluir_id` evita repetir a música atual no re-sorteio, desde que haja outra opção.
    """
    if not candidatas:
        return None

    preferidas = [m for m in candidatas if m.preferida]
    grupo = preferidas if preferidas else candidatas

    # Priorização estrita de faixas AMBIENTE em momentos de surdina
    if momento_em_surdina:
        grupo_ambiente = [m for m in grupo if m.subclassificacao == "AMBIENTE" or m.surdina]
        if grupo_ambiente:
            grupo = grupo_ambiente

    if excluir_id is not None and len(grupo) > 1:
        sem_atual = [m for m in grupo if m.id != excluir_id]
        if sem_atual:
            grupo = sem_atual

    return random.choice(grupo)


class ServicoPlayer:
    """Regras de montagem e sorteio de músicas para execução em Sessão."""

    @staticmethod
    async def _buscar_candidatas_momento(
        db: AsyncSession,
        evento: Evento,
        loja_id: Optional[uuid.UUID],
        sessao_loja_evento_id: Optional[uuid.UUID] = None,
        estilo: Optional[str] = None,
    ) -> List[MusicaSorteadaInfo]:
        """
        Busca as músicas candidatas para um momento ritualístico:
        1. Músicas vinculadas diretamente na playlist da sessão da Loja (`MusicaEvento`) -> marcadas como `preferida=True`.
        2. Músicas sugeridas no acervo global/da Loja (`MusicaEventoSugerido`) para o `evento.id` ou para qualquer
           evento equivalente com o mesmo `canonico_id`.
        3. Aplica o filtro inclusivo de estilo: {Estilo Escolhido} + {UNIVERSAL}.
        """
        ids_preferidas: set[uuid.UUID] = set()
        mapa_musicas: dict[uuid.UUID, Musica] = {}

        filtro_estilo = True
        if estilo and estilo.strip().upper() != "UNIVERSAL":
            estilo_limpo = estilo.strip().upper()
            filtro_estilo = or_(
                Musica.estilo == estilo_limpo,
                Musica.estilo == "UNIVERSAL",
                Musica.estilo.is_(None),
            )

        if sessao_loja_evento_id:
            stmt_playlist = (
                select(Musica)
                .join(MusicaEvento, Musica.id == MusicaEvento.musica_id)
                .where(
                    MusicaEvento.sessao_loja_evento_id == sessao_loja_evento_id,
                    Musica.ativo == True,
                    filtro_estilo,
                )
            )
            res_pl = await db.execute(stmt_playlist)
            for m in res_pl.scalars().all():
                ids_preferidas.add(m.id)
                mapa_musicas[m.id] = m

        # Busca IDs de eventos equivalentes pelo canonico_id
        eventos_equivalentes_ids = [evento.id]
        if evento.canonico_id:
            stmt_eq = select(Evento.id).where(Evento.canonico_id == evento.canonico_id)
            res_eq = await db.execute(stmt_eq)
            eventos_equivalentes_ids = list(set(res_eq.scalars().all()) | {evento.id})

        filtro_escopo = (
            or_(Musica.upload_por_loja_id == loja_id, Musica.upload_por_loja_id.is_(None))
            if loja_id
            else Musica.upload_por_loja_id.is_(None)
        )

        stmt_sugeridas = (
            select(Musica)
            .join(MusicaEventoSugerido, Musica.id == MusicaEventoSugerido.musica_id)
            .where(
                MusicaEventoSugerido.evento_id.in_(eventos_equivalentes_ids),
                Musica.ativo == True,
                filtro_escopo,
                filtro_estilo,
            )
        )
        res_sug = await db.execute(stmt_sugeridas)
        for m in res_sug.scalars().all():
            mapa_musicas[m.id] = m

        return [
            _converter_musica_para_info(m, preferida=(m.id in ids_preferidas))
            for m in mapa_musicas.values()
        ]

    @staticmethod
    async def carregar_sessao_para_player(
        db: AsyncSession,
        sessao_id: uuid.UUID,
        estilo: Optional[str] = None,
    ) -> SessaoPlayerExecucao:
        """
        Carrega a sessão da Loja, localiza todos os eventos não suprimidos em ordem sequencial e,
        para cada momento, sorteia uma música elegível do acervo com base no estilo litúrgico
        e na classificação de surdina (priorizando faixas Ambiente).
        """
        await sincronizar_organizacoes_base(db)
        stmt = (
            select(SessaoLoja)
            .where(SessaoLoja.id == sessao_id)
            .options(
                selectinload(SessaoLoja.tipo_sessao).selectinload(TipoSessao.rito),
                selectinload(SessaoLoja.eventos_customizados).selectinload(SessaoLojaEvento.evento),
            )
        )
        res = await db.execute(stmt)
        sessao = res.scalar_one_or_none()
        if not sessao:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Sessão não encontrada.")

        esteira: List[MomentoRitualisticoExecucao] = []
        eventos_ordenados = sorted(
            [ev for ev in sessao.eventos_customizados if not ev.suprimido],
            key=lambda x: x.ordem_execucao,
        )

        estilo_normalizado = estilo.strip().upper() if estilo and estilo.strip() else "UNIVERSAL"

        for item in eventos_ordenados:
            evento = item.evento
            if not evento:
                continue

            lista_candidatas_info = await ServicoPlayer._buscar_candidatas_momento(
                db=db,
                evento=evento,
                loja_id=sessao.loja_id,
                sessao_loja_evento_id=item.id,
                estilo=estilo_normalizado,
            )

            observacao_final = item.observacao_mestre_harmonia or evento.observacao_padrao_mestre_harmonia
            em_surdina_momento = (
                item.em_surdina
                if item.em_surdina is not None
                else classificar_momento_surdina(
                    evento.nome,
                    evento.descricao,
                    observacao_final,
                )
            )

            # Sorteia considerando preferidas, surdina (priorizando faixas AMBIENTE) e estilo
            musica_escolhida = sortear_entre_candidatas(
                lista_candidatas_info,
                momento_em_surdina=em_surdina_momento,
            )

            esteira.append(
                MomentoRitualisticoExecucao(
                    posicao=item.ordem_execucao,
                    evento_id=evento.id,
                    evento_nome=evento.nome,
                    evento_descricao=evento.descricao,
                    obrigatorio=not item.suprimido,
                    observacao_ritual=observacao_final,
                    em_surdina=em_surdina_momento,
                    musica_sorteada=musica_escolhida,
                    total_musicas_disponiveis=len(lista_candidatas_info),
                    candidatas=lista_candidatas_info,
                )
            )

        nome_rito = (
            sessao.tipo_sessao.rito.nome
            if sessao.tipo_sessao and sessao.tipo_sessao.rito
            else "Rito Brasileiro"
        )

        return SessaoPlayerExecucao(
            sessao_id=sessao.id,
            sessao_nome=sessao.nome_personalizado or (sessao.tipo_sessao.nome if sessao.tipo_sessao else "Sessão"),
            rito=nome_rito,
            grau=1,
            configuracoes_audio={},
            estilo_aplicado=estilo_normalizado,
            total_momentos=len(esteira),
            esteira_ritualistica=esteira,
        )

    @staticmethod
    async def sortear_musica_avulsa(
        db: AsyncSession,
        evento_id: uuid.UUID,
        organizacao_id: uuid.UUID,
        musica_id_atual: Optional[uuid.UUID] = None,
        sessao_id: Optional[uuid.UUID] = None,
        estilo: Optional[str] = None,
    ) -> Optional[MusicaSorteadaInfo]:
        """
        Re-sorteia uma música para um momento específico (botão 'Re-sortear').

        Quando `sessao_id` é informado, as preferidas da playlist da Loja naquele momento
        (`playlists_loja`) entram no sorteio com prioridade, igual à montagem da esteira.
        """
        res_ev = await db.execute(select(Evento).where(Evento.id == evento_id))
        evento = res_ev.scalar_one_or_none()
        if not evento:
            return None

        sessao_loja_evento_id = None
        em_surdina_momento = False
        if sessao_id:
            res_item = await db.execute(
                select(SessaoLojaEvento).where(
                    SessaoLojaEvento.sessao_loja_id == sessao_id,
                    SessaoLojaEvento.evento_id == evento_id,
                )
            )
            item_db = res_item.scalar_one_or_none()
            if item_db:
                sessao_loja_evento_id = item_db.id
                em_surdina_momento = (
                    item_db.em_surdina
                    if item_db.em_surdina is not None
                    else classificar_momento_surdina(evento.nome, evento.descricao)
                )

        lista_info = await ServicoPlayer._buscar_candidatas_momento(
            db=db,
            evento=evento,
            loja_id=organizacao_id,
            sessao_loja_evento_id=sessao_loja_evento_id,
            estilo=estilo,
        )
        return sortear_entre_candidatas(
            lista_info,
            excluir_id=musica_id_atual,
            momento_em_surdina=em_surdina_momento,
        )

    @staticmethod
    async def alternar_preferencia(
        db: AsyncSession,
        sessao_id: uuid.UUID,
        evento_id: uuid.UUID,
        musica_id: uuid.UUID,
        preferida: bool,
        usuario: UsuarioEsigma,
    ) -> dict:
        """
        Marca ou desmarca uma música como PREFERIDA de um momento da sessão da Loja.

        Modelo: "preferida" == existir uma linha em `playlists_loja` ligando a música ao
        momento customizado da sessão (`sessoes_loja_eventos`). Várias músicas podem ser
        preferidas no mesmo momento; o sorteio escolhe somente entre elas.

        Segurança: a identidade vem de `obter_usuario_esigma`; a Loja dona da sessão precisa
        ser a Loja do usuário (ou o usuário ser SuperAdmin) — nunca confiamos em parâmetros
        enviados pelo cliente.
        Banco afetado: harmoniadb (`playlists_loja`).
        """
        res_sessao = await db.execute(select(SessaoLoja).where(SessaoLoja.id == sessao_id))
        sessao = res_sessao.scalar_one_or_none()
        if not sessao:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Sessão não encontrada.")

        if not usuario.is_super_admin and str(sessao.loja_id) != str(usuario.organizacao_id):
            logger.warning(
                f"Preferência negada: user={usuario.email} org={usuario.organizacao_id} "
                f"tentou alterar sessão da loja {sessao.loja_id}"
            )
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Esta sessão pertence a outra Loja.",
            )

        res_item = await db.execute(
            select(SessaoLojaEvento).where(
                SessaoLojaEvento.sessao_loja_id == sessao_id,
                SessaoLojaEvento.evento_id == evento_id,
            )
        )
        item = res_item.scalar_one_or_none()
        if not item:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Momento não encontrado nesta sessão.",
            )

        musica = await db.get(Musica, musica_id)
        if not musica or not musica.ativo:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Música não encontrada.")

        res_vinculo = await db.execute(
            select(MusicaEvento).where(
                MusicaEvento.sessao_loja_evento_id == item.id,
                MusicaEvento.musica_id == musica_id,
            )
        )
        vinculo = res_vinculo.scalar_one_or_none()

        if preferida and not vinculo:
            res_max = await db.execute(
                select(func.coalesce(func.max(MusicaEvento.ordem_musica), 0)).where(
                    MusicaEvento.sessao_loja_evento_id == item.id
                )
            )
            db.add(
                MusicaEvento(
                    sessao_loja_evento_id=item.id,
                    musica_id=musica_id,
                    ordem_musica=(res_max.scalar_one() or 0) + 1,
                )
            )
        elif not preferida and vinculo:
            await db.delete(vinculo)

        await db.commit()
        logger.info(
            f"Preferência {'ADICIONADA' if preferida else 'REMOVIDA'}: música={musica_id} "
            f"momento={evento_id} sessão={sessao_id} por={usuario.email} (harmoniadb.playlists_loja)"
        )
        return {"status": "ok", "preferida": preferida, "musica_id": musica_id, "evento_id": evento_id}

    @staticmethod
    async def definir_surdina_momento(
        db: AsyncSession,
        sessao_id: uuid.UUID,
        evento_id: uuid.UUID,
        em_surdina: bool,
        organizacao_id: uuid.UUID,
        is_super_admin: bool = False,
    ) -> dict:
        """
        Define permanentemente se um momento ritualístico deve ser executado em Surdina na sessão da Loja.
        """
        stmt_sessao = select(SessaoLoja).where(SessaoLoja.id == sessao_id)
        if not is_super_admin:
            stmt_sessao = stmt_sessao.where(SessaoLoja.loja_id == organizacao_id)
        res_sessao = await db.execute(stmt_sessao)
        sessao = res_sessao.scalar_one_or_none()
        if not sessao:
            raise HTTPException(status_code=404, detail="Sessão não encontrada para esta Loja.")

        res_item = await db.execute(
            select(SessaoLojaEvento).where(
                SessaoLojaEvento.sessao_loja_id == sessao_id,
                SessaoLojaEvento.evento_id == evento_id,
            )
        )
        item = res_item.scalar_one_or_none()
        if not item:
            raise HTTPException(status_code=404, detail="Momento ritualístico não encontrado nesta sessão.")

        item.em_surdina = em_surdina
        await db.commit()
        logger.info(
            f"Momento {evento_id} na sessão {sessao_id} definido como em_surdina={em_surdina} (harmoniadb.sessoes_loja_eventos)"
        )
        return {"status": "ok", "sessao_id": str(sessao_id), "evento_id": str(evento_id), "em_surdina": em_surdina}


