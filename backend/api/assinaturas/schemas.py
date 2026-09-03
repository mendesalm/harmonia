from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime

class AssinaturaStatus(BaseModel):
    status: str
    plano: str
    validade: Optional[datetime]
    customer_id: Optional[str]
    subscription_id: Optional[str]
    invoice_url: Optional[str] = None

class CheckoutRequest(BaseModel):
    ciclo: str # "MENSAL" ou "ANUAL"
