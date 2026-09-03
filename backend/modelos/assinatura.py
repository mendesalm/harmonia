import uuid
from datetime import datetime
from typing import Optional
from sqlalchemy import String, DateTime, ForeignKey, Float
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID

from backend.nucleo.banco import Base

class HistoricoPagamento(Base):
    __tablename__ = "historico_pagamentos"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    organizacao_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("organizacoes.id", ondelete="CASCADE"), nullable=False)
    
    gateway_pagamento: Mapped[str] = mapped_column(String(50), default="ASAAS", nullable=False)
    gateway_id: Mapped[Optional[str]] = mapped_column(String(255), nullable=True) # ID do pagamento no Asaas (pay_xxx)
    
    valor: Mapped[float] = mapped_column(Float, nullable=False)
    vencimento: Mapped[datetime] = mapped_column(DateTime, nullable=False)
    data_pagamento: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    
    status: Mapped[str] = mapped_column(String(50), default="PENDENTE", nullable=False) # PENDENTE, PAGO, VENCIDO, CANCELADO
    
    criado_em: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    atualizado_em: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relacionamentos
    organizacao = relationship("Organizacao", back_populates="historico_pagamentos")
