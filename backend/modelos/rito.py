"""
Modelo ORM do Rito.
"""
import uuid
from datetime import datetime
from typing import List, TYPE_CHECKING
from sqlalchemy import String, DateTime
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship
from backend.nucleo.banco import Base

if TYPE_CHECKING:
    from backend.modelos.organizacao import Organizacao
    from backend.modelos.sessao import TipoSessao


class Rito(Base):
    """
    Representa os Ritos Maçônicos (Ex: REAA, Rito Brasileiro, York).
    Usado para vincular lojas e templates de sessão.
    """
    __tablename__ = "ritos"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True
    )
    nome: Mapped[str] = mapped_column(String(255), nullable=False, unique=True, index=True)
    descricao: Mapped[str] = mapped_column(String(500), nullable=True)

    criado_em: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)
    
    # Relacionamentos
    lojas: Mapped[List["Organizacao"]] = relationship("Organizacao", back_populates="rito")
    tipos_sessao: Mapped[List["TipoSessao"]] = relationship("TipoSessao", back_populates="rito", cascade="all, delete-orphan")
    eventos: Mapped[List["Evento"]] = relationship("Evento", back_populates="rito", cascade="all, delete-orphan")
