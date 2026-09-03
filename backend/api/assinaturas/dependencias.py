from fastapi import Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from datetime import datetime

from backend.nucleo.banco import obter_banco_de_dados
from backend.api.auth.dependencias import obter_usuario_autenticado
from backend.modelos.organizacao import Organizacao

async def verificar_assinatura_ativa(
    usuario = Depends(obter_usuario_autenticado),
    db: AsyncSession = Depends(obter_banco_de_dados)
):
    """
    Verifica se a loja associada ao usuário está com a assinatura em dia.
    Usado para bloquear rotas do Mestre de Harmonia (Player, Sessões, etc).
    """
    org_id = usuario.get("org_id")
    if not org_id:
        return usuario
        
    stmt = select(Organizacao).where(Organizacao.id == org_id)
    res = await db.execute(stmt)
    org = res.scalar_one_or_none()
    
    if not org:
        return usuario
        
    if org.status_assinatura == "INATIVA" or org.status_assinatura == "BLOQUEADO":
        raise HTTPException(
            status_code=status.HTTP_402_PAYMENT_REQUIRED,
            detail="Assinatura bloqueada ou inativa. Por favor, renove sua assinatura."
        )
        
    if org.validade_assinatura and datetime.utcnow() > org.validade_assinatura:
        # Passou da validade e não houve webhook renovando
        raise HTTPException(
            status_code=status.HTTP_402_PAYMENT_REQUIRED,
            detail="Sua assinatura expirou. Por favor, regularize o pagamento para continuar."
        )
        
    return usuario
