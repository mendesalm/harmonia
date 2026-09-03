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
from backend.modelos.musica import MusicaEvento
from backend.api.eventos.schemas import EventoCriacao, EventoAtualizacao, EventoResposta
from backend.nucleo.formatadores import formatar_titulo_inteligente


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
        Lista eventos disponíveis para a loja.
        Retorna eventos padrão globais + eventos criados pela própria loja + eventos compartilhados.
        """
        stmt = select(
            Evento,
            func.count(MusicaEvento.id).label("total_musicas")
        ).outerjoin(MusicaEvento, Evento.id == MusicaEvento.evento_id).options(selectinload(Evento.canonico))

        filtros = []
        if apenas_ativos:
            filtros.append(Evento.ativo == True)
        
        # Como o Evento não tem mais organizacao_id, vamos retornar todos os eventos.
        # Numa aplicação real multi-tenant, você filtraria por Rito da Loja.
        
        if filtros:
            stmt = stmt.where(*filtros)

        stmt = stmt.group_by(Evento.id).order_by(Evento.nome)
        resultado = await db.execute(stmt)
        linhas = resultado.all()

        resposta = []
        for evento, total in linhas:
            resp_obj = EventoResposta(
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
            resposta.append(resp_obj)

        return resposta

    @staticmethod
    async def obter_por_id(db: AsyncSession, evento_id: uuid.UUID) -> EventoResposta:
        """Busca um evento específico com contagem de músicas."""
        stmt = select(
            Evento,
            func.count(MusicaEvento.id).label("total_musicas")
        ).outerjoin(MusicaEvento, Evento.id == MusicaEvento.evento_id).options(selectinload(Evento.canonico)).where(Evento.id == evento_id).group_by(Evento.id)
        
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
