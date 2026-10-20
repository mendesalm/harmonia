"""
Camada de Serviços para o Player Ritualístico do Mestre de Harmonia.
Implementa a esteira sequencial com sorteio randômico de faixas por momento litúrgico,
respeitando as playlists da Loja (`playlists_loja`) e a equivalência canônica entre Ritos.
"""
import random
import uuid
from typing import List, Optional

from fastapi import HTTPException, status
from sqlalchemy import or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from backend.api.player.schemas import (
    MomentoRitualisticoExecucao,
    MusicaSorteadaInfo,
    SessaoPlayerExecucao,
)
from backend.modelos.evento import Evento
from backend.modelos.musica import Musica, MusicaEvento, MusicaEventoSugerido
from backend.modelos.sessao import SessaoLoja, SessaoLojaEvento, TipoSessao


def _converter_musica_para_info(musica: Musica, preferida: bool = False) -> MusicaSorteadaInfo:
    """Converte a entidade ORM `Musica` para o schema `MusicaSorteadaInfo`."""
    meta = musica.metadados or {}
    url = musica.arquivo_url or ""
    eh_link_externo = url.startswith("http://") or url.startswith("https://")
    tipo_midia = meta.get("tipo_midia") or ("STREAMING" if eh_link_externo else "ARQUIVO_LOCAL")
    return MusicaSorteadaInfo(
        id=musica.id,
        titulo=musica.titulo,
        autor_artista=musica.autor_artista,
        tipo_midia=tipo_midia,
        caminho_arquivo=None if eh_link_externo else url,
        link_externo=url if eh_link_externo else meta.get("link_externo"),
        duracao_segundos=meta.get("duracao_segundos"),
        preferida=preferida,
    )


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

            musica_escolhida = None
            if lista_candidatas_info:
                preferidas = [m for m in lista_candidatas_info if m.preferida]
                musica_escolhida = random.choice(preferidas) if preferidas else random.choice(lista_candidatas_info)

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
    ) -> Optional[MusicaSorteadaInfo]:
        """Sorteia uma nova música aleatória para um momento específico (botão 'Re-sortear')."""
        res_ev = await db.execute(select(Evento).where(Evento.id == evento_id))
        evento = res_ev.scalar_one_or_none()
        if not evento:
            return None

        lista_info = await ServicoPlayer._buscar_candidatas_momento(
            db=db,
            evento=evento,
            loja_id=organizacao_id,
        )
        if not lista_info:
            return None

        candidatas = (
            [m for m in lista_info if m.id != musica_id_atual]
            if len(lista_info) > 1 and musica_id_atual
            else lista_info
        )
        preferidas = [m for m in candidatas if m.preferida]
        return random.choice(preferidas) if preferidas else random.choice(candidatas)
