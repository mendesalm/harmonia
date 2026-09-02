"""
Modelo ORM da Organização (Tenant / Loja / Obediência).
"""
import uuid
from datetime import datetime
from typing import Optional, List
from sqlalchemy import String, Boolean, DateTime, ForeignKey
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship
from backend.nucleo.banco import Base


class Organizacao(Base):
    """
    Representa a entidade institucional (Loja Maçônica, Obediência).
    Atua como âncora Multi-tenant para isolar sessões, músicas, arquivos e assinaturas.
    """
    __tablename__ = "organizacoes"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True
    )
    nome: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    sigla: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    tipo: Mapped[str] = mapped_column(String(50), default="LOJA", nullable=False) # LOJA, OBEDIENCIA, SUBOBEDIENCIA
    slug_armazenamento: Mapped[str] = mapped_column(String(100), unique=True, nullable=False, index=True)
    
    # Rito principal adotado pela Loja
    rito_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), ForeignKey("ritos.id"), nullable=True)
    
    # Modelo SaaS / Assinatura
    status_assinatura: Mapped[str] = mapped_column(String(50), default="ATIVO", nullable=False) # ATIVO, PENDENTE, BLOQUEADO
    plano_assinatura: Mapped[str] = mapped_column(String(50), default="MENSAL_HARMONIA", nullable=False)
    validade_assinatura: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    
    # Dados flexíveis no formato JSONB (nº da loja, oriente, UF, email_padrao, etc.)
    dados_especificos: Mapped[dict] = mapped_column(JSONB, default=dict, nullable=False)
    
    ativo: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    criado_em: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)
    atualizado_em: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    # Relacionamentos
    rito: Mapped[Optional["Rito"]] = relationship("Rito", back_populates="lojas")
    # eventos removidos da organizacao, pois agora são globais
    sessoes_loja: Mapped[List["SessaoLoja"]] = relationship("SessaoLoja", back_populates="loja", cascade="all, delete-orphan")
    musicas: Mapped[List["Musica"]] = relationship("Musica", back_populates="organizacao", cascade="all, delete-orphan")
