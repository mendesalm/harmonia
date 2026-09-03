"""
Modelo ORM de Sessão (Templates e Instâncias da Loja) e Roteiros de Eventos.
"""
import uuid
from datetime import datetime
from typing import Optional, List, TYPE_CHECKING
from sqlalchemy import String, Text, Boolean, DateTime, ForeignKey, Integer, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship
from backend.nucleo.banco import Base

if TYPE_CHECKING:
    from backend.modelos.organizacao import Organizacao
    from backend.modelos.evento import Evento
    from backend.modelos.rito import Rito
    from backend.modelos.musica import MusicaEvento
    from backend.modelos.canonico import TipoSessaoCanonico


class TipoSessao(Base):
    """
    Template global de uma Sessão para um Rito (ex: Sessão Magna de Iniciação).
    """
    __tablename__ = "tipos_sessao"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True
    )
    nome: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    rito_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("ritos.id", ondelete="CASCADE"), nullable=False, index=True
    )
    canonico_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True), ForeignKey("tipos_sessao_canonicos.id", ondelete="SET NULL"), nullable=True, index=True
    )
    
    criado_em: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)

    __table_args__ = (
        UniqueConstraint("nome", "rito_id", name="uq_tiposessao_nome_rito"),
    )

    # Relacionamentos
    rito: Mapped["Rito"] = relationship("Rito", back_populates="tipos_sessao")
    canonico: Mapped[Optional["TipoSessaoCanonico"]] = relationship("TipoSessaoCanonico", back_populates="sessoes_rito")
    eventos: Mapped[List["TipoSessaoEvento"]] = relationship(
        "TipoSessaoEvento", back_populates="tipo_sessao", cascade="all, delete-orphan", order_by="TipoSessaoEvento.ordem_sequencia"
    )
    sessoes_loja: Mapped[List["SessaoLoja"]] = relationship("SessaoLoja", back_populates="tipo_sessao")


class TipoSessaoEvento(Base):
    """
    Roteiro padrão do template: Ordem dos eventos em um Tipo de Sessão.
    """
    __tablename__ = "tipos_sessao_eventos"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True
    )
    tipo_sessao_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("tipos_sessao.id", ondelete="CASCADE"), nullable=False, index=True
    )
    evento_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("eventos_ritualisticos.id", ondelete="CASCADE"), nullable=False, index=True
    )
    ordem_sequencia: Mapped[int] = mapped_column(Integer, nullable=False, default=1)
    momento_silencio: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    
    # Relacionamentos
    tipo_sessao: Mapped["TipoSessao"] = relationship("TipoSessao", back_populates="eventos")
    evento: Mapped["Evento"] = relationship("Evento", back_populates="tipos_sessao_eventos")


class SessaoLoja(Base):
    """
    Instância customizada de uma sessão adotada por uma Loja.
    """
    __tablename__ = "sessoes_loja"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True
    )
    loja_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("organizacoes.id", ondelete="CASCADE"), nullable=False, index=True
    )
    tipo_sessao_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("tipos_sessao.id", ondelete="CASCADE"), nullable=False, index=True
    )
    nome_personalizado: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)

    criado_em: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)

    # Relacionamentos
    loja: Mapped["Organizacao"] = relationship("Organizacao", back_populates="sessoes_loja")
    tipo_sessao: Mapped["TipoSessao"] = relationship("TipoSessao", back_populates="sessoes_loja")
    eventos_customizados: Mapped[List["SessaoLojaEvento"]] = relationship(
        "SessaoLojaEvento", back_populates="sessao_loja", cascade="all, delete-orphan", order_by="SessaoLojaEvento.ordem_execucao"
    )


class SessaoLojaEvento(Base):
    """
    Roteiro customizado pela Loja para sua sessão. 
    A Loja pode reordenar, suprimir ou editar a observação de um evento.
    """
    __tablename__ = "sessoes_loja_eventos"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True
    )
    sessao_loja_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("sessoes_loja.id", ondelete="CASCADE"), nullable=False, index=True
    )
    evento_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("eventos_ritualisticos.id", ondelete="CASCADE"), nullable=False, index=True
    )
    ordem_execucao: Mapped[int] = mapped_column(Integer, nullable=False, default=1)
    suprimido: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    observacao_mestre_harmonia: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # Relacionamentos
    sessao_loja: Mapped["SessaoLoja"] = relationship("SessaoLoja", back_populates="eventos_customizados")
    evento: Mapped["Evento"] = relationship("Evento", back_populates="sessoes_loja_eventos")
    playlists: Mapped[List["MusicaEvento"]] = relationship("MusicaEvento", back_populates="sessao_loja_evento", cascade="all, delete-orphan")
