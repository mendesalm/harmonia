"""
Modelo ORM de Evento Ritualístico (Momento da Sessão / Playlist).
"""
import uuid
from datetime import datetime
from typing import Optional, List, TYPE_CHECKING
from sqlalchemy import String, Text, Boolean, DateTime
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship
from backend.nucleo.banco import Base

if TYPE_CHECKING:
    from backend.modelos.sessao import TipoSessaoEvento, SessaoLojaEvento
    from backend.modelos.musica import MusicaEvento, MusicaEventoSugerido


class Evento(Base):
    """
    Representa um evento ritualístico global do sistema
    (ex: Entrada do Cortejo, Tronco de Beneficência, etc).
    Padronizado para unificar equivalências entre ritos.
    """
    __tablename__ = "eventos_ritualisticos"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True
    )
    nome: Mapped[str] = mapped_column(String(255), nullable=False, index=True, unique=True)
    descricao: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    
    observacao_padrao_mestre_harmonia: Mapped[Optional[str]] = mapped_column(
        Text, nullable=True, comment="Orientação sugerida globalmente para o evento"
    )
    
    ativo: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    criado_em: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)
    atualizado_em: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    # Relacionamentos
    tipos_sessao_eventos: Mapped[List["TipoSessaoEvento"]] = relationship("TipoSessaoEvento", back_populates="evento", cascade="all, delete-orphan")
    sessoes_loja_eventos: Mapped[List["SessaoLojaEvento"]] = relationship("SessaoLojaEvento", back_populates="evento", cascade="all, delete-orphan")
    musicas_sugeridas: Mapped[List["MusicaEventoSugerido"]] = relationship("MusicaEventoSugerido", back_populates="evento", cascade="all, delete-orphan")
    # musica_eventos: Mapped[List["MusicaEvento"]] (playlists) agora estarão atreladas ao SessaoLojaEvento.
