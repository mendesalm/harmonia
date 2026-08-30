"""
Modelo ORM de Músicas e Associação com Eventos Ritualísticos.
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
    from backend.modelos.evento import Evento


class Musica(Base):
    """
    Representa uma peça musical no acervo do Mestre de Harmonia.
    Pode ser um arquivo físico hospedado (MP3/WAV/OGG) ou um link de streaming (YouTube/Spotify).
    """
    __tablename__ = "musicas"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True
    )
    organizacao_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("organizacoes.id", ondelete="CASCADE"), nullable=False, index=True
    )
    titulo: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    autor_artista: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    
    # Tipo de mídia: ARQUIVO_LOCAL, YOUTUBE, SPOTIFY
    tipo_midia: Mapped[str] = mapped_column(String(50), default="ARQUIVO_LOCAL", nullable=False)
    
    # Caminho do arquivo físico no storage (/storage/instancias/public/slug/musicas/nome.mp3)
    caminho_arquivo: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    
    # Link externo de streaming (YouTube, Spotify)
    link_externo: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    
    duracao_segundos: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    tamanho_bytes: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    tipo_mime: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    
    # Metadados adicionais em JSONB (ex: tags, álbum, ano, volume recomendado)
    metadados: Mapped[dict] = mapped_column(JSONB, default=dict, nullable=False)
    
    ativo: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    criado_em: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)
    atualizado_em: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    # Relacionamentos
    organizacao: Mapped["Organizacao"] = relationship("Organizacao", back_populates="musicas")
    eventos_associados: Mapped[List["MusicaEvento"]] = relationship(
        "MusicaEvento",
        back_populates="musica",
        cascade="all, delete-orphan"
    )


class MusicaEvento(Base):
    """
    Tabela de associação N:N entre Música e Evento (Momento Ritualístico / Playlist).
    Permite que a mesma música apareça em múltiplos eventos (ex: 'Abertura do Livro' e 'Fechamento do Livro').
    """
    __tablename__ = "musica_eventos"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True
    )
    musica_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("musicas.id", ondelete="CASCADE"), nullable=False, index=True
    )
    evento_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("eventos.id", ondelete="CASCADE"), nullable=False, index=True
    )
    observacao: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)

    # Relacionamentos
    musica: Mapped["Musica"] = relationship("Musica", back_populates="eventos_associados")
    evento: Mapped["Evento"] = relationship("Evento", back_populates="musica_eventos")
