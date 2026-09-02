"""
Modelo ORM de Músicas (Acervo Global) e Associação com Eventos.
"""
import uuid
from datetime import datetime
from typing import Optional, List, TYPE_CHECKING
from sqlalchemy import String, Text, Boolean, DateTime, ForeignKey, Integer
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship
from backend.nucleo.banco import Base

if TYPE_CHECKING:
    from backend.modelos.organizacao import Organizacao
    from backend.modelos.sessao import SessaoLojaEvento
    from backend.modelos.evento import Evento


class Musica(Base):
    """
    Representa uma peça musical no acervo global do Harmonia.
    """
    __tablename__ = "acervo_musicas"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True
    )
    # Loja que fez o upload (pode ser nulo se upado pelo Superadmin)
    upload_por_loja_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True), ForeignKey("organizacoes.id", ondelete="SET NULL"), nullable=True, index=True
    )
    titulo: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    autor_artista: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    
    arquivo_url: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    
    # Flags de moderação e uso
    sinalizada_erro: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    status_uso: Mapped[str] = mapped_column(String(20), default="ATIVA", nullable=False) # ATIVA, ORFA
    
    # Metadados adicionais em JSONB (ex: hash, duração, tamanho)
    metadados: Mapped[dict] = mapped_column(JSONB, default=dict, nullable=False)
    
    ativo: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    criado_em: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)
    atualizado_em: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    # Relacionamentos
    organizacao: Mapped[Optional["Organizacao"]] = relationship("Organizacao", back_populates="musicas")
    eventos_sugeridos: Mapped[List["MusicaEventoSugerido"]] = relationship(
        "MusicaEventoSugerido", back_populates="musica", cascade="all, delete-orphan"
    )
    playlists: Mapped[List["MusicaEvento"]] = relationship(
        "MusicaEvento", back_populates="musica", cascade="all, delete-orphan"
    )


class MusicaEventoSugerido(Base):
    """
    Tabela de associação N:N entre Música e Evento Ritualístico (Global).
    Define os momentos ritualísticos sugeridos para a música no momento do upload.
    """
    __tablename__ = "acervo_musicas_eventos_sugeridos"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True
    )
    musica_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("acervo_musicas.id", ondelete="CASCADE"), nullable=False, index=True
    )
    evento_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("eventos_ritualisticos.id", ondelete="CASCADE"), nullable=False, index=True
    )

    # Relacionamentos
    musica: Mapped["Musica"] = relationship("Musica", back_populates="eventos_sugeridos")
    evento: Mapped["Evento"] = relationship("Evento", back_populates="musicas_sugeridas")


class MusicaEvento(Base):
    """
    Tabela de Playlist (As músicas escolhidas pela Loja para tocar no seu evento customizado).
    """
    __tablename__ = "playlists_loja"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True
    )
    sessao_loja_evento_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("sessoes_loja_eventos.id", ondelete="CASCADE"), nullable=False, index=True
    )
    musica_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("acervo_musicas.id", ondelete="CASCADE"), nullable=False, index=True
    )
    ordem_musica: Mapped[int] = mapped_column(Integer, nullable=False, default=1)

    # Relacionamentos
    sessao_loja_evento: Mapped["SessaoLojaEvento"] = relationship("SessaoLojaEvento", back_populates="playlists")
    musica: Mapped["Musica"] = relationship("Musica", back_populates="playlists")
