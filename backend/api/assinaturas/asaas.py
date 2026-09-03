import httpx
import os
import logging
from typing import Optional, Dict, Any

logger = logging.getLogger(__name__)

ASAAS_API_URL = os.getenv("ASAAS_API_URL", "https://sandbox.asaas.com/api/v3")
ASAAS_API_KEY = os.getenv("ASAAS_API_KEY", "")

class ServicoAsaas:
    
    @staticmethod
    def _obter_headers():
        return {
            "access_token": ASAAS_API_KEY,
            "Content-Type": "application/json"
        }

    @staticmethod
    async def criar_cliente(nome: str, email: str, cpf_cnpj: Optional[str] = None) -> Dict[str, Any]:
        """Cria um novo cliente no Asaas e retorna os dados (incluindo o id do customer)."""
        async with httpx.AsyncClient() as client:
            payload = {
                "name": nome,
                "email": email,
            }
            if cpf_cnpj:
                payload["cpfCnpj"] = cpf_cnpj
                
            resposta = await client.post(
                f"{ASAAS_API_URL}/customers",
                json=payload,
                headers=ServicoAsaas._obter_headers()
            )
            
            if resposta.status_code >= 400:
                logger.error(f"Erro ao criar cliente no Asaas: {resposta.text}")
                resposta.raise_for_status()
                
            return resposta.json()

    @staticmethod
    async def criar_assinatura(customer_id: str, valor: float, ciclo: str = "MONTHLY", descricao: str = "Assinatura Harmonia") -> Dict[str, Any]:
        """Cria uma assinatura (billingType UNDEFINED deixa o cliente escolher Cartão, Boleto ou PIX)."""
        async with httpx.AsyncClient() as client:
            from datetime import datetime, timedelta
            vencimento = datetime.utcnow() + timedelta(days=1) # O primeiro vencimento amanhã
            
            payload = {
                "customer": customer_id,
                "billingType": "UNDEFINED",
                "value": valor,
                "nextDueDate": vencimento.strftime("%Y-%m-%d"),
                "cycle": ciclo,
                "description": descricao
            }
                
            resposta = await client.post(
                f"{ASAAS_API_URL}/subscriptions",
                json=payload,
                headers=ServicoAsaas._obter_headers()
            )
            
            if resposta.status_code >= 400:
                logger.error(f"Erro ao criar assinatura no Asaas: {resposta.text}")
                resposta.raise_for_status()
                
            return resposta.json()
