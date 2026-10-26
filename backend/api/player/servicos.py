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
    return MusicaSorteadaInfo(
        id=musica.id,
        titulo=musica.titulo,
        autor_artista=musica.autor_artista,
        tipo_midia=midia["tipo_midia"],
        caminho_arquivo=midia["caminho_arquivo"],
        link_externo=midia["link_externo"],
        duracao_segundos=meta.get("duracao_segundos"),
        preferida=preferida,
    )


def sortear_entre_candidatas(
    candidatas: List[MusicaSorteadaInfo],
    excluir_id: Optional[uuid.UUID] = None,
) -> Optional[MusicaSorteadaInfo]:
    """
    Regra de sorteio de um momento ritualístico (função pura, testável sem banco):

      1. Se existir UMA OU MAIS músicas preferidas, sorteia aleatoriamente apenas entre elas.
      2. Se não houver preferidas, sorteia entre todas as candidatas.
      3. `excluir_id` evita repetir a música atual no re-sorteio, desde que haja outra opção
         dentro do mesmo grupo (preferidas ou todas).
    """
    if not candidatas:
        return None

    preferidas = [m for m in candidatas if m.preferida]
    grupo = preferidas if preferidas else candidatas

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
    ) -> List[MusicaSorteadaInfo]:
        """
        Busca as músicas candidatas para um momento ritualístico:
        1. Músicas vinculadas diretamente na playlist da sessão da Loja (`MusicaEvento`) -> marcadas como `preferida=True`.
        2. Músicas sugeridas no acervo global/da Loja (`MusicaEventoSugerido`) para o `evento.id` ou para qualquer
           evento equivalente com o mesmo `canonico_id`.
        """
        ids_preferidas: set[uuid.UUID] = set()
        mapa_musicas: dict[uuid.UUID, Musica] = {}

        if sessao_loja_evento_id:
            stmt_playlist = (
                select(Musica)
                .join(MusicaEvento, Musica.id == MusicaEvento.musica_id)
                .where(
                    MusicaEvento.sessao_loja_evento_id == sessao_loja_evento_id,
                    Musica.ativo == True,
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
    async def carregar_sessao_para_player(db: AsyncSession, sessao_id: uuid.UUID) -> SessaoPlayerExecucao:
        """
        Carrega a sessão da Loja, localiza todos os eventos não suprimidos em ordem sequencial e,
        para cada momento, sorteia aleatoriamente uma música elegível do acervo (priorizando a playlist da Loja).
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

        for item in eventos_ordenados:
            evento = item.evento
            if not evento:
                continue

            lista_candidatas_info = await ServicoPlayer._buscar_candidatas_momento(
                db=db,
                evento=evento,
                loja_id=sessao.loja_id,
                sessao_loja_evento_id=item.id,
            )

            # Várias preferidas são permitidas: sorteia entre elas; sem preferidas, sorteia entre todas
            musica_escolhida = sortear_entre_candidatas(lista_candidatas_info)

            esteira.append(
                MomentoRitualisticoExecucao(
                    posicao=item.ordem_execucao,
                    evento_id=evento.id,
                    evento_nome=evento.nome,
                    evento_descricao=evento.descricao,
                    obrigatorio=not item.suprimido,
                    observacao_ritual=item.observacao_mestre_harmonia or evento.observacao_padrao_mestre_harmonia,
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
        if sessao_id:
            res_item = await db.execute(
                select(SessaoLojaEvento.id).where(
                    SessaoLojaEvento.sessao_loja_id == sessao_id,
                    SessaoLojaEvento.evento_id == evento_id,
                )
            )
            sessao_loja_evento_id = res_item.scalar_one_or_none()

        lista_info = await ServicoPlayer._buscar_candidatas_momento(
            db=db,
            evento=evento,
            loja_id=organizacao_id,
            sessao_loja_evento_id=sessao_loja_evento_id,
        )
        return sortear_entre_candidatas(lista_info, excluir_id=musica_id_atual)

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

