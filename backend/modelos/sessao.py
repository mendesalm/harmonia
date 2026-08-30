"""
Modelo ORM de Sessão Ritualística e Sequência de Eventos.
"""
import uuid
from datetime import datetime
from typing import Optional, List, TYPE_CHECKING
from sqlalchemy import String, Text, Boolean, DateTime, ForeignKey, Integer, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship
from backend.nucleo.banco import Base

if TYPE_CHECKING:
    from backend.modelos.organizacao import Organizacao
    from backend.modelos.evento import Evento


class Sessao(Base):
    """
    Representa um modelo/tipo de Sessão Maçônica (ex: Ordinária no Grau 1, Magna de Iniciação, etc).
    Contém a sequência ordenada de eventos/playlists para execução pelo Mestre de Harmonia.
    """
    __tablename__ = "sessoes"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True
    )
    organizacao_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("organizacoes.id", ondelete="CASCADE"), nullable=False, index=True
    )
    nome: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    rito: Mapped[str] = mapped_column(String(50), default="REAA", nullable=False) # REAA, York, Schroeder, etc.
    grau: Mapped[int] = mapped_column(Integer, default=1, nullable=False) # 1 (Aprendiz), 2 (Companheiro), 3 (Mestre), etc.
    descricao: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    
    # Configurações operacionais da sessão (ex: fade in/out em segundos, tempo de silêncio)
    configuracoes: Mapped[dict] = mapped_column(JSONB, default=dict, nullable=False)
    
    ativo: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    criado_em: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)
    atualizado_em: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    # Relacionamentos
    organizacao: Mapped["Organizacao"] = relationship("Organizacao", back_populates="sessoes")
    eventos_associados: Mapped[List["SessaoEvento"]] = relationship(
        "SessaoEvento",
        back_populates="sessao",
        cascade="all, delete-orphan",
        order_by="SessaoEvento.ordem"
    )


class SessaoEvento(Base):
    """
    Tabela de associação que define a esteira sequencial de eventos dentro de uma sessão.
    """
    __tablename__ = "sessao_eventos"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True
    )
    sessao_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("sessoes.id", ondelete="CASCADE"), nullable=False, index=True
    )
    evento_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("eventos.id", ondelete="CASCADE"), nullable=False, index=True
    )
    ordem: Mapped[int] = mapped_column(Integer, nullable=False, default=1)
    obrigatorio: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    observacao_ritual: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)

    __table_args__ = (
        UniqueConstraint("sessao_id", "ordem", name="uq_sessao_evento_ordem"),
    )

    # Relacionamentos
    sessao: Mapped["Sessao"] = relationship("Sessao", back_populates="eventos_associados")
    evento: Mapped["Evento"] = relationship("Evento", back_populates="sessao_eventos")
