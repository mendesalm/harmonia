"""
Camada de Serviços para o Domínio de Eventos Ritualísticos (Playlists).
Controla regras de compartilhamento, contagem de músicas e validações em PT-BR.
"""
import uuid
from typing import List, Optional
from sqlalchemy import select, func, or_
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from fastapi import HTTPException, status
from backend.modelos.evento import Evento
from backend.modelos.organizacao import Organizacao
from backend.modelos.musica import MusicaEventoSugerido
from backend.api.eventos.schemas import EventoCriacao, EventoAtualizacao, EventoResposta
from backend.nucleo.formatadores import formatar_titulo_inteligente
from backend.nucleo.sincronizacao_tenant import obter_ou_sincronizar_organizacao


class ServicoEvento:
    """Regras de negócio e operações de banco para Eventos Ritualísticos."""

    @staticmethod
    async def listar(
        db: AsyncSession,
        organizacao_id: Optional[uuid.UUID] = None,
        incluir_globais: bool = True,
        apenas_ativos: bool = True
    ) -> List[EventoResposta]:
        """
        Lista eventos disponíveis para a loja filtrando pelo Rito vinculado à Organização,
        evitando duplicidade de momentos homônimos pertencentes a outros Ritos.
        """
        stmt = (
            select(
                Evento,
                func.count(MusicaEventoSugerido.id).label("total_musicas")
            )
            .outerjoin(MusicaEventoSugerido, Evento.id == MusicaEventoSugerido.evento_id)
            .options(selectinload(Evento.canonico), selectinload(Evento.rito))
        )

        filtros = []
        if apenas_ativos:
            filtros.append(Evento.ativo == True)

        if organizacao_id:
            org = await obter_ou_sincronizar_organizacao(db, organizacao_id)
            if org and org.rito_id:
                filtros.append(or_(Evento.rito_id == org.rito_id, Evento.rito_id.is_(None)))

        if filtros:
            stmt = stmt.where(*filtros)

        stmt = stmt.group_by(Evento.id).order_by(Evento.nome)
        resultado = await db.execute(stmt)
        linhas = resultado.all()

        # Calcula também a contagem consolidada de músicas por canonico_id (equivalência entre Ritos)
        stmt_can = (
            select(Evento.canonico_id, func.count(func.distinct(MusicaEventoSugerido.musica_id)))
            .join(MusicaEventoSugerido, Evento.id == MusicaEventoSugerido.evento_id)
            .where(Evento.canonico_id.is_not(None))
            .group_by(Evento.canonico_id)
        )
        res_can = await db.execute(stmt_can)
        mapa_total_canonico = {row[0]: row[1] for row in res_can.all()}

        # Consolida momentos com mesmo canonico_id (ou nome normalizado) para evitar duplicidade visual
        agrupados = {}
        for evento, total in linhas:
            chave = str(evento.canonico_id) if evento.canonico_id else evento.nome.strip().lower()
            total_efetivo = mapa_total_canonico.get(evento.canonico_id, total) if evento.canonico_id else total
            nome_rito = evento.rito.nome if evento.rito else "Universal"

            if chave not in agrupados:
                agrupados[chave] = EventoResposta(
                    id=evento.id,
                    nome=evento.canonico.nome if evento.canonico else evento.nome,
                    descricao=evento.descricao or (evento.canonico.descricao if evento.canonico else None),
                    categoria_rito=nome_rito,
                    compartilhado=True,
                    ordem_sugerida=evento.canonico.ordem_sugerida if evento.canonico else 999,
                    organizacao_id=None,
                    padrao_sistema=True,
                    ativo=evento.ativo,
                    total_musicas=total_efetivo,
                    criado_em=evento.criado_em,
                    atualizado_em=evento.atualizado_em
                )
            else:
                existente = agrupados[chave]
                existente.total_musicas = max(existente.total_musicas or 0, total_efetivo or 0)
                if not organizacao_id and existente.categoria_rito != nome_rito:
                    existente.categoria_rito = "Multi-Rito"

        resposta = list(agrupados.values())
        resposta.sort(key=lambda x: (x.ordem_sugerida, x.nome))
        return resposta

    @staticmethod
    async def obter_por_id(db: AsyncSession, evento_id: uuid.UUID) -> EventoResposta:
        """Busca um evento específico com contagem de músicas."""
        stmt = select(
            Evento,
            func.count(MusicaEventoSugerido.id).label("total_musicas")
        ).outerjoin(MusicaEventoSugerido, Evento.id == MusicaEventoSugerido.evento_id).options(selectinload(Evento.canonico)).where(Evento.id == evento_id).group_by(Evento.id)
        
        resultado = await db.execute(stmt)
        linha = resultado.first()
        if not linha:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Evento com ID '{evento_id}' não foi encontrado."
            )
        
        evento, total = linha
        return EventoResposta(
            id=evento.id,
            nome=evento.nome,
            descricao=evento.descricao or (evento.canonico.descricao if evento.canonico else None),
            categoria_rito="Universal",
            compartilhado=True,
            ordem_sugerida=evento.canonico.ordem_sugerida if evento.canonico else 999,
            organizacao_id=None,
            padrao_sistema=True,
            ativo=evento.ativo,
            total_musicas=total,
            criado_em=evento.criado_em,
            atualizado_em=evento.atualizado_em
        )

    @staticmethod
    async def criar(db: AsyncSession, dados: EventoCriacao) -> EventoResposta:
        raise HTTPException(status_code=501, detail="Criação de eventos legados desativada.")

    @staticmethod
    async def atualizar(db: AsyncSession, evento_id: uuid.UUID, dados: EventoAtualizacao) -> EventoResposta:
        raise HTTPException(status_code=501, detail="Atualização de eventos legados desativada.")

    @staticmethod
    async def deletar(db: AsyncSession, evento_id: uuid.UUID) -> dict:
        raise HTTPException(status_code=501, detail="Exclusão de eventos legados desativada.")
