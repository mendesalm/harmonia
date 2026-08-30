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
        ).outerjoin(MusicaEvento, Evento.id == MusicaEvento.evento_id)

        filtros = []
        if apenas_ativos:
            filtros.append(Evento.ativo == True)

        if organizacao_id is not None:
            if incluir_globais:
                filtros.append(
                    or_(
                        Evento.organizacao_id == organizacao_id,
                        Evento.padrao_sistema == True,
                        Evento.compartilhado == True
                    )
                )
            else:
                filtros.append(Evento.organizacao_id == organizacao_id)
        elif not incluir_globais:
            filtros.append(Evento.padrao_sistema == False)

        if filtros:
            stmt = stmt.where(*filtros)

        stmt = stmt.group_by(Evento.id).order_by(Evento.ordem_sugerida, Evento.nome)
        resultado = await db.execute(stmt)
        linhas = resultado.all()

        resposta = []
        for evento, total in linhas:
            resp_obj = EventoResposta(
                id=evento.id,
                nome=evento.nome,
                descricao=evento.descricao,
                categoria_rito=evento.categoria_rito,
                compartilhado=evento.compartilhado,
                ordem_sugerida=evento.ordem_sugerida,
                organizacao_id=evento.organizacao_id,
                padrao_sistema=evento.padrao_sistema,
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
        ).outerjoin(MusicaEvento, Evento.id == MusicaEvento.evento_id).where(Evento.id == evento_id).group_by(Evento.id)
        
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
            descricao=evento.descricao,
            categoria_rito=evento.categoria_rito,
            compartilhado=evento.compartilhado,
            ordem_sugerida=evento.ordem_sugerida,
            organizacao_id=evento.organizacao_id,
            padrao_sistema=evento.padrao_sistema,
            ativo=evento.ativo,
            total_musicas=total,
            criado_em=evento.criado_em,
            atualizado_em=evento.atualizado_em
        )

    @staticmethod
    async def criar(db: AsyncSession, dados: EventoCriacao) -> EventoResposta:
        """Cria um novo evento ritualístico personalizado."""
        nome_formatado = formatar_titulo_inteligente(dados.nome)

        # Verifica duplicidade no escopo da loja
        stmt_check = select(Evento).where(
            func.lower(Evento.nome) == nome_formatado.lower(),
            or_(
                Evento.organizacao_id == dados.organizacao_id,
                Evento.padrao_sistema == True
            )
        )
        res_check = await db.execute(stmt_check)
        if res_check.scalar_one_or_none():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Já existe um evento ritualístico cadastrado com o nome '{nome_formatado}'."
            )

        novo_evento = Evento(
            nome=nome_formatado,
            descricao=dados.descricao,
            categoria_rito=dados.categoria_rito,
            compartilhado=dados.compartilhado,
            ordem_sugerida=dados.ordem_sugerida,
            organizacao_id=dados.organizacao_id,
            padrao_sistema=False,
            ativo=True
        )

        db.add(novo_evento)
        await db.commit()
        await db.refresh(novo_evento)

        return EventoResposta(
            id=novo_evento.id,
            nome=novo_evento.nome,
            descricao=novo_evento.descricao,
            categoria_rito=novo_evento.categoria_rito,
            compartilhado=novo_evento.compartilhado,
            ordem_sugerida=novo_evento.ordem_sugerida,
            organizacao_id=novo_evento.organizacao_id,
            padrao_sistema=novo_evento.padrao_sistema,
            ativo=novo_evento.ativo,
            total_musicas=0,
            criado_em=novo_evento.criado_em,
            atualizado_em=novo_evento.atualizado_em
        )

    @staticmethod
    async def atualizar(db: AsyncSession, evento_id: uuid.UUID, dados: EventoAtualizacao) -> EventoResposta:
        """Atualiza um evento ritualístico existente."""
        stmt = select(Evento).where(Evento.id == evento_id)
        res = await db.execute(stmt)
        evento = res.scalar_one_or_none()
        if not evento:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Evento com ID '{evento_id}' não encontrado."
            )

        if dados.nome is not None:
            nome_formatado = formatar_titulo_inteligente(dados.nome)
            stmt_check = select(Evento).where(
                func.lower(Evento.nome) == nome_formatado.lower(),
                Evento.id != evento_id,
                or_(
                    Evento.organizacao_id == evento.organizacao_id,
                    Evento.padrao_sistema == True
                )
            )
            res_check = await db.execute(stmt_check)
            if res_check.scalar_one_or_none():
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Já existe outro evento com o nome '{nome_formatado}'."
                )
            evento.nome = nome_formatado

        if dados.descricao is not None:
            evento.descricao = dados.descricao
        if dados.categoria_rito is not None:
            evento.categoria_rito = dados.categoria_rito
        if dados.compartilhado is not None:
            evento.compartilhado = dados.compartilhado
        if dados.ordem_sugerida is not None:
            evento.ordem_sugerida = dados.ordem_sugerida
        if dados.ativo is not None:
            evento.ativo = dados.ativo

        await db.commit()
        return await ServicoEvento.obter_por_id(db, evento_id)

    @staticmethod
    async def deletar(db: AsyncSession, evento_id: uuid.UUID) -> dict:
        """Exclui um evento caso não seja padrão do sistema."""
        stmt = select(Evento).where(Evento.id == evento_id)
        res = await db.execute(stmt)
        evento = res.scalar_one_or_none()
        if not evento:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Evento com ID '{evento_id}' não encontrado."
            )
        
        if evento.padrao_sistema:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Eventos padrão do sistema não podem ser excluídos, apenas desativados."
            )

        await db.delete(evento)
        await db.commit()
        return {"mensagem": f"Evento '{evento.nome}' removido com sucesso."}
