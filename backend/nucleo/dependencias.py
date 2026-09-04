from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from backend.nucleo.seguranca import decodificar_token_acesso

oauth2_scheme = HTTPBearer(auto_error=False)

def obter_usuario_logado(token: HTTPAuthorizationCredentials = Depends(oauth2_scheme)):
    """Extrai e valida o token JWT do header."""
    if not token:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Nao autenticado")
    
    payload = decodificar_token_acesso(token.credentials)
    if not payload:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token invalido ou expirado")
        
    return payload

def verificar_assinatura_ativa(usuario: dict = Depends(obter_usuario_logado)):
    """Verifica se o JWT possui as claims necessarias de acesso ao Harmonia."""
    harmonia_ativo = usuario.get("harmonia_ativo", False)
    role = usuario.get("role", "admin")
    
    if not harmonia_ativo and role != "super_admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, 
            detail="O modulo Harmonia nao esta ativo ou a assinatura encontra-se pendente."
        )
    return usuario
