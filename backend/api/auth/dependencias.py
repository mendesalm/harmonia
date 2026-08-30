"""
Dependências FastAPI de Autenticação e Controle de Acesso Baseado em Roles.
"""
from typing import Dict, Any
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from backend.nucleo.seguranca import decodificar_token_acesso

# Rota de obtenção de token
esquema_oauth2 = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login")


async def obter_usuario_autenticado(token: str = Depends(esquema_oauth2)) -> Dict[str, Any]:
    """
    Decodifica o token JWT e retorna o payload do usuário logado.
    Lança HTTP 401 caso o token seja inválido ou expirado.
    """
    payload = decodificar_token_acesso(token)
    if not payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token de acesso inválido ou expirado.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return payload


async def exigir_mestre_ou_admin(usuario: Dict[str, Any] = Depends(obter_usuario_autenticado)) -> Dict[str, Any]:
    """
    Exige que o usuário possua papel de Mestre de Harmonia, Webmaster ou SuperAdmin.
    """
    role = usuario.get("role", "membro")
    permissoes = usuario.get("permissoes", [])
    
    papeis_permitidos = {"super_admin", "webmaster", "mestre_harmonia"}
    if role not in papeis_permitidos and not any(p in papeis_permitidos for p in permissoes):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Acesso restrito ao Mestre de Harmonia ou Administradores."
        )
    return usuario
