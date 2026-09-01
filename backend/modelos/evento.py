"""
Modelo ORM de Evento Ritualístico (Momento da Sessão / Playlist).
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
    from backend.modelos.sessao import SessaoEvento
    from backend.modelos.musica import MusicaEvento


class Evento(Base):
    """
    Representa um momento ou evento ritualístico de uma sessão maçônica
    (ex: Entrada do Cortejo, Cerimônia das Luzes, Abertura do Livro da Lei, Tronco, etc).
    Atua também como uma Playlist categorizadora de músicas.
    """
    __tablename__ = "eventos"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True
    )
    # Se organizacao_id for nulo, é um evento padrão global do sistema
    organizacao_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True), ForeignKey("organizacoes.id", ondelete="CASCADE"), nullable=True, index=True
    )
    nome: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    descricao: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    categoria_rito: Mapped[str] = mapped_column(String(50), default="Geral", nullable=False) # REAA, York, Geral...
    
    # Flags de compartilhamento
    padrao_sistema: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    compartilhado: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    ordem_sugerida: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    
    ativo: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    criado_em: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)
    atualizado_em: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    __table_args__ = (
        UniqueConstraint("nome", "organizacao_id", name="uq_evento_nome_org"),
    )

    # Relacionamentos
    organizacao: Mapped[Optional["Organizacao"]] = relationship("Organizacao", back_populates="eventos")
    sessao_eventos: Mapped[List["SessaoEvento"]] = relationship("SessaoEvento", back_populates="evento", cascade="all, delete-orphan")
    musica_eventos: Mapped[List["MusicaEvento"]] = relationship("MusicaEvento", back_populates="evento", cascade="all, delete-orphan")
