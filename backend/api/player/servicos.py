"""
Camada de Serviços para o Player Ritualístico do Mestre de Harmonia.
Implementa a esteira sequencial com sorteio randômico de faixas por momento litúrgico.
"""
import uuid
import random
from typing import List, Optional
from sqlalchemy import select, or_
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from fastapi import HTTPException, status
from backend.modelos.sessao import Sessao, SessaoEvento
from backend.modelos.evento import Evento
from backend.modelos.musica import Musica, MusicaEvento
from backend.api.player.schemas import (
    SessaoPlayerExecucao,
    MomentoRitualisticoExecucao,
    MusicaSorteadaInfo
)


class ServicoPlayer:
    """Regras de montagem e sorteio de músicas para execução em Sessão."""

    @staticmethod
    async def carregar_sessao_para_player(db: AsyncSession, sessao_id: uuid.UUID) -> SessaoPlayerExecucao:
        """
        Carrega a sessão, localiza todos os eventos em ordem sequencial e,
        para cada evento, sorteia aleatoriamente uma música elegível do acervo.
        """
        stmt = (
            select(Sessao)
            .where(Sessao.id == sessao_id)
            .options(
                selectinload(Sessao.eventos_associados).selectinload(SessaoEvento.evento)
            )
        )
        res = await db.execute(stmt)
        sessao = res.scalar_one_or_none()
        if not sessao:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Sessão não encontrada.")

        esteira: List[MomentoRitualisticoExecucao] = []
        eventos_ordenados = sorted(sessao.eventos_associados, key=lambda x: x.ordem)

        for item in eventos_ordenados:
            evento = item.evento
            if not evento:
                continue

            # Busca todas as músicas ativas associadas a este evento
            stmt_musicas = (
                select(Musica)
                .join(MusicaEvento, Musica.id == MusicaEvento.musica_id)
                .where(
                    MusicaEvento.evento_id == evento.id,
                    Musica.ativo == True,
                    or_(
                        Musica.organizacao_id == sessao.organizacao_id,
                        # Permite acervo compartilhado se houver
                        Musica.organizacao_id == None
                    )
                )
            )
            res_musicas = await db.execute(stmt_musicas)
            musicas_candidatas = res_musicas.scalars().all()

            lista_candidatas_info = [
                MusicaSorteadaInfo(
                    id=m.id,
                    titulo=m.titulo,
                    autor_artista=m.autor_artista,
                    tipo_midia=m.tipo_midia,
                    caminho_arquivo=m.caminho_arquivo,
                    link_externo=m.link_externo,
                    duracao_segundos=m.duracao_segundos
                )
                for m in musicas_candidatas
            ]

            # Sorteia uma música aleatória da lista de candidatas
            musica_escolhida = None
            if lista_candidatas_info:
                musica_escolhida = random.choice(lista_candidatas_info)

            esteira.append(
                MomentoRitualisticoExecucao(
                    posicao=item.ordem,
                    evento_id=evento.id,
                    evento_nome=evento.nome,
                    evento_descricao=evento.descricao,
                    obrigatorio=item.obrigatorio,
                    observacao_ritual=item.observacao_ritual,
                    musica_sorteada=musica_escolhida,
                    total_musicas_disponiveis=len(lista_candidatas_info),
                    candidatas=lista_candidatas_info
                )
            )

        return SessaoPlayerExecucao(
            sessao_id=sessao.id,
            sessao_nome=sessao.nome,
            rito=sessao.rito,
            grau=sessao.grau,
            configuracoes_audio=sessao.configuracoes,
            total_momentos=len(esteira),
            esteira_ritualistica=esteira
        )

    @staticmethod
    async def sortear_musica_avulsa(
        db: AsyncSession,
        evento_id: uuid.UUID,
        organizacao_id: uuid.UUID,
        musica_id_atual: Optional[uuid.UUID] = None
    ) -> Optional[MusicaSorteadaInfo]:
        """Sorteia uma nova música aleatória para um momento específico (ideal para o botão 'Re-sortear')."""
        stmt = (
            select(Musica)
            .join(MusicaEvento, Musica.id == MusicaEvento.musica_id)
            .where(
                MusicaEvento.evento_id == evento_id,
                Musica.ativo == True,
                or_(
                    Musica.organizacao_id == organizacao_id,
                    Musica.organizacao_id == None
                )
            )
        )
        res = await db.execute(stmt)
        musicas = res.scalars().all()

        if not musicas:
            return None

        # Se houver mais de uma música, tenta sortear uma diferente da atual
        candidatas = [m for m in musicas if m.id != musica_id_atual] if len(musicas) > 1 and musica_id_atual else musicas
        escolhida = random.choice(candidatas)

        return MusicaSorteadaInfo(
            id=escolhida.id,
            titulo=escolhida.titulo,
            autor_artista=escolhida.autor_artista,
            tipo_midia=escolhida.tipo_midia,
            caminho_arquivo=escolhida.caminho_arquivo,
            link_externo=escolhida.link_externo,
            duracao_segundos=escolhida.duracao_segundos
        )
