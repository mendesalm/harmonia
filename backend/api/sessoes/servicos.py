"""
Camada de Serviços para o Domínio de Sessões e Sequenciamento Ritualístico.
Implementa a ordenação atômica de eventos, clonagem de modelos e validações em PT-BR.
"""
import uuid
from typing import List, Optional
from sqlalchemy import select, func, delete
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from fastapi import HTTPException, status
from backend.modelos.sessao import Sessao, SessaoEvento
from backend.modelos.evento import Evento
from backend.modelos.musica import MusicaEvento
from backend.api.sessoes.schemas import (
    SessaoCriacao,
    SessaoClonagem,
    SessaoAtualizacao,
    SessaoDefinirSequencia,
    SessaoResposta,
    SessaoDetalhadaResposta,
    ItemSequenciaResposta
)
from backend.nucleo.formatadores import formatar_titulo_inteligente


class ServicoSessao:
    """Regras de negócio para Sessões e Esteiras de Eventos."""

    @staticmethod
    async def listar(
        db: AsyncSession,
        organizacao_id: Optional[uuid.UUID] = None,
        apenas_ativas: bool = True
    ) -> List[SessaoResposta]:
        """Lista todas as sessões da loja."""
        stmt = select(
            Sessao,
            func.count(SessaoEvento.id).label("total_eventos")
        ).outerjoin(SessaoEvento, Sessao.id == SessaoEvento.sessao_id)

        filtros = []
        if apenas_ativas:
            filtros.append(Sessao.ativo == True)
        if organizacao_id is not None:
            filtros.append(Sessao.organizacao_id == organizacao_id)

        if filtros:
            stmt = stmt.where(*filtros)

        stmt = stmt.group_by(Sessao.id).order_by(Sessao.grau, Sessao.nome)
        resultado = await db.execute(stmt)
        linhas = resultado.all()

        resposta = []
        for sessao, total in linhas:
            resposta.append(
                SessaoResposta(
                    id=sessao.id,
                    organizacao_id=sessao.organizacao_id,
                    nome=sessao.nome,
                    rito=sessao.rito,
                    grau=sessao.grau,
                    descricao=sessao.descricao,
                    configuracoes=sessao.configuracoes,
                    ativo=sessao.ativo,
                    total_eventos=total,
                    criado_em=sessao.criado_em,
                    atualizado_em=sessao.atualizado_em
                )
            )
        return resposta

    @staticmethod
    async def obter_detalhada(db: AsyncSession, sessao_id: uuid.UUID) -> SessaoDetalhadaResposta:
        """Busca os detalhes de uma sessão com toda a esteira de eventos e contagem de músicas."""
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
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Sessão com ID '{sessao_id}' não encontrada."
            )

        # Monta a lista sequenciada
        itens_sequencia = []
        for assoc in sorted(sessao.eventos_associados, key=lambda x: x.ordem):
            # Conta músicas disponíveis para o evento
            stmt_count = select(func.count(MusicaEvento.id)).where(MusicaEvento.evento_id == assoc.evento_id)
            res_count = await db.execute(stmt_count)
            total_m = res_count.scalar() or 0

            itens_sequencia.append(
                ItemSequenciaResposta(
                    id=assoc.id,
                    evento_id=assoc.evento_id,
                    evento_nome=assoc.evento.nome if assoc.evento else "Evento Desconhecido",
                    ordem=assoc.ordem,
                    obrigatorio=assoc.obrigatorio,
                    observacao_ritual=assoc.observacao_ritual,
                    total_musicas=total_m
                )
            )

        return SessaoDetalhadaResposta(
            id=sessao.id,
            organizacao_id=sessao.organizacao_id,
            nome=sessao.nome,
            rito=sessao.rito,
            grau=sessao.grau,
            descricao=sessao.descricao,
            configuracoes=sessao.configuracoes,
            ativo=sessao.ativo,
            total_eventos=len(itens_sequencia),
            sequencia_eventos=itens_sequencia,
            criado_em=sessao.criado_em,
            atualizado_em=sessao.atualizado_em
        )

    @staticmethod
    async def criar(db: AsyncSession, dados: SessaoCriacao) -> SessaoDetalhadaResposta:
        """Cria uma nova sessão e adiciona seus eventos ordenados iniciais."""
        nome_formatado = formatar_titulo_inteligente(dados.nome)

        # Valida duplicidade
        stmt_check = select(Sessao).where(
            func.lower(Sessao.nome) == nome_formatado.lower(),
            Sessao.organizacao_id == dados.organizacao_id
        )
        res_check = await db.execute(stmt_check)
        if res_check.scalar_one_or_none():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Já existe uma sessão cadastrada com o nome '{nome_formatado}' nesta Loja."
            )

        nova_sessao = Sessao(
            organizacao_id=dados.organizacao_id,
            nome=nome_formatado,
            rito=dados.rito.upper(),
            grau=dados.grau,
            descricao=dados.descricao,
            configuracoes=dados.configuracoes,
            ativo=True
        )
        db.add(nova_sessao)
        await db.flush()

        # Adiciona os eventos iniciais se fornecidos
        if dados.eventos:
            for item in dados.eventos:
                db.add(
                    SessaoEvento(
                        sessao_id=nova_sessao.id,
                        evento_id=item.evento_id,
                        ordem=item.ordem,
                        obrigatorio=item.obrigatorio,
                        observacao_ritual=item.observacao_ritual
                    )
                )

        await db.commit()
        return await ServicoSessao.obter_detalhada(db, nova_sessao.id)

    @staticmethod
    async def clonar(
        db: AsyncSession,
        sessao_id: uuid.UUID,
        dados: SessaoClonagem
    ) -> SessaoDetalhadaResposta:
        """
        Clona um modelo de sessão existente copiando integralmente sua esteira litúrgica.
        Permite renomear, alterar o rito (ex: para Rito Brasileiro) e o grau.
        """
        stmt = (
            select(Sessao)
            .where(Sessao.id == sessao_id)
            .options(
                selectinload(Sessao.eventos_associados)
            )
        )
        res = await db.execute(stmt)
        origem = res.scalar_one_or_none()

        if not origem:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Modelo de sessão de origem não encontrado."
            )

        # Define novo nome
        if dados.novo_nome:
            nome_clonado = formatar_titulo_inteligente(dados.novo_nome)
        else:
            nome_clonado = formatar_titulo_inteligente(f"{origem.nome} (Cópia)")

        org_destino_id = dados.organizacao_id_destino or origem.organizacao_id

        # Verifica colisão de nome
        stmt_check = select(Sessao).where(
            func.lower(Sessao.nome) == nome_clonado.lower(),
            Sessao.organizacao_id == org_destino_id
        )
        res_check = await db.execute(stmt_check)
        if res_check.scalar_one_or_none():
            nome_clonado = f"{nome_clonado} - {uuid.uuid4().hex[:4]}"

        nova_sessao = Sessao(
            organizacao_id=org_destino_id,
            nome=nome_clonado,
            rito=(dados.novo_rito or origem.rito).upper(),
            grau=dados.novo_grau if dados.novo_grau is not None else origem.grau,
            descricao=f"Clonado a partir de '{origem.nome}'. {origem.descricao or ''}".strip(),
            configuracoes=dict(origem.configuracoes or {}),
            ativo=True
        )
        db.add(nova_sessao)
        await db.flush()

        # Copia todos os eventos da esteira mantendo a ordem exata
        for item in sorted(origem.eventos_associados, key=lambda x: x.ordem):
            db.add(
                SessaoEvento(
                    sessao_id=nova_sessao.id,
                    evento_id=item.evento_id,
                    ordem=item.ordem,
                    obrigatorio=item.obrigatorio,
                    observacao_ritual=item.observacao_ritual
                )
            )

        await db.commit()
        return await ServicoSessao.obter_detalhada(db, nova_sessao.id)

    @staticmethod
    async def atualizar(db: AsyncSession, sessao_id: uuid.UUID, dados: SessaoAtualizacao) -> SessaoDetalhadaResposta:
        """Atualiza metadados da sessão."""
        stmt = select(Sessao).where(Sessao.id == sessao_id)
        res = await db.execute(stmt)
        sessao = res.scalar_one_or_none()
        if not sessao:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Sessão não encontrada.")

        if dados.nome is not None:
            nome_formatado = formatar_titulo_inteligente(dados.nome)
            stmt_check = select(Sessao).where(
                func.lower(Sessao.nome) == nome_formatado.lower(),
                Sessao.organizacao_id == sessao.organizacao_id,
                Sessao.id != sessao_id
            )
            res_check = await db.execute(stmt_check)
            if res_check.scalar_one_or_none():
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Já existe outra sessão com este nome.")
            sessao.nome = nome_formatado

        if dados.rito is not None:
            sessao.rito = dados.rito.upper()
        if dados.grau is not None:
            sessao.grau = dados.grau
        if dados.descricao is not None:
            sessao.descricao = dados.descricao
        if dados.configuracoes is not None:
            sessao.configuracoes = {**sessao.configuracoes, **dados.configuracoes}
        if dados.ativo is not None:
            sessao.ativo = dados.ativo

        await db.commit()
        return await ServicoSessao.obter_detalhada(db, sessao_id)

    @staticmethod
    async def definir_sequencia(db: AsyncSession, sessao_id: uuid.UUID, dados: SessaoDefinirSequencia) -> SessaoDetalhadaResposta:
        """Substitui de forma atômica toda a sequência de eventos de uma sessão."""
        stmt = select(Sessao).where(Sessao.id == sessao_id)
        res = await db.execute(stmt)
        sessao = res.scalar_one_or_none()
        if not sessao:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Sessão não encontrada.")

        # Remove eventos atuais
        await db.execute(delete(SessaoEvento).where(SessaoEvento.sessao_id == sessao_id))

        # Adiciona a nova esteira ordenada
        for item in dados.eventos:
            db.add(
                SessaoEvento(
                    sessao_id=sessao_id,
                    evento_id=item.evento_id,
                    ordem=item.ordem,
                    obrigatorio=item.obrigatorio,
                    observacao_ritual=item.observacao_ritual
                )
            )

        await db.commit()
        return await ServicoSessao.obter_detalhada(db, sessao_id)

    @staticmethod
    async def deletar(db: AsyncSession, sessao_id: uuid.UUID) -> dict:
        """Exclui uma sessão e suas associações."""
        stmt = select(Sessao).where(Sessao.id == sessao_id)
        res = await db.execute(stmt)
        sessao = res.scalar_one_or_none()
        if not sessao:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Sessão não encontrada.")

        await db.delete(sessao)
        await db.commit()
        return {"mensagem": f"Sessão '{sessao.nome}' removida com sucesso."}
