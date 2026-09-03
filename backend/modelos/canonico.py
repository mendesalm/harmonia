"""
Modelos ORM de Matriz Global Canônica (Momentos e Sessões).
Usados para unificar equivalências entre diversos Ritos.
"""
import uuid
from datetime import datetime
from typing import Optional, List, TYPE_CHECKING
from sqlalchemy import String, Text, Boolean, DateTime, Integer
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship
from backend.nucleo.banco import Base

if TYPE_CHECKING:
    from backend.modelos.evento import Evento
    from backend.modelos.sessao import TipoSessao


class TipoSessaoCanonico(Base):
    """
    Categoria Universal de Sessão (ex: "Sessão Magna de Iniciação").
    Usado para agrupar as sessões dos diversos Ritos sob a mesma semântica.
    """
    __tablename__ = "tipos_sessao_canonicos"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True
    )
    nome: Mapped[str] = mapped_column(String(255), nullable=False, unique=True, index=True)
    descricao: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    ativo: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    criado_em: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)

    # Relacionamentos
    # Uma sessão canônica mapeia para vários TipoSessao (um por Rito)
    sessoes_rito: Mapped[List["TipoSessao"]] = relationship("TipoSessao", back_populates="canonico", cascade="all, delete-orphan")


class MomentoCanonico(Base):
    """
    Categoria Universal de Evento/Momento (ex: "Entrada do Pavilhão Nacional").
    Permite que músicas sugeridas sejam compartilhadas entre ritos diferentes.
    """
    __tablename__ = "momentos_canonicos"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True
    )
    nome: Mapped[str] = mapped_column(String(255), nullable=False, unique=True, index=True)
    descricao: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    ordem_sugerida: Mapped[int] = mapped_column(Integer, nullable=False, default=999)
    ativo: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    criado_em: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)

    # Relacionamentos
    # Um momento canônico mapeia para vários Eventos (que têm nomes específicos por Rito)
    eventos: Mapped[List["Evento"]] = relationship("Evento", back_populates="canonico", cascade="all, delete-orphan")
