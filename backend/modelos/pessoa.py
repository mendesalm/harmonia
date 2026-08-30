"""
Modelo ORM de Pessoa / Usuário do Sistema Harmonia.
Compatível com a arquitetura de controle de acesso do ecossistema Sigma.
"""
import uuid
from datetime import datetime
from typing import Optional, TYPE_CHECKING
from sqlalchemy import String, Boolean, DateTime, ForeignKey
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship
from backend.nucleo.banco import Base

if TYPE_CHECKING:
    from backend.modelos.organizacao import Organizacao


class Pessoa(Base):
    """
    Representa a entidade humana / usuário autenticável no sistema.
    Possui credenciais de acesso (JWT/bcrypt) e vinculação a uma Loja Maçônica (Tenant).
    """
    __tablename__ = "pessoas"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True
    )
    organizacao_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True), ForeignKey("organizacoes.id", ondelete="SET NULL"), nullable=True, index=True
    )
    nome: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    email: Mapped[str] = mapped_column(String(255), unique=True, nullable=False, index=True)
    senha_hash: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    
    # Tipo de membro: MACOM, MESTRE_HARMONIA, SUPER_ADMIN, VISITANTE
    tipo: Mapped[str] = mapped_column(String(50), default="MACOM", nullable=False)
    
    # Se o login está ativo
    status_acesso: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    
    # Envelope de dados civis e permissões em JSONB (ex: {"permissoes_sistema": ["mestre_harmonia", "membro"]})
    dados_civis: Mapped[dict] = mapped_column(JSONB, default=dict, nullable=False)
    
    # Envelope de dados específicos maçônicos em JSONB (ex: {"cim": "123456", "grau": 3, "cargo": "Mestre de Harmonia"})
    dados_especificos: Mapped[dict] = mapped_column(JSONB, default=dict, nullable=False)
    
    ultimo_login: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    criado_em: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)
    atualizado_em: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    # Relacionamento
    organizacao: Mapped[Optional["Organizacao"]] = relationship("Organizacao")

    @property
    def permissoes_sistema(self) -> list:
        """Retorna a lista de permissões extraída do envelope dados_civis."""
        if not self.dados_civis or not isinstance(self.dados_civis, dict):
            return ["membro"]
        return self.dados_civis.get("permissoes_sistema", ["membro"])
