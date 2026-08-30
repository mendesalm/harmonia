"""
Módulo de Segurança, Criptografia e Emissão de Tokens JWT.
Padronizado com o padrão de autenticação do Sigma 2.0.
"""
from datetime import datetime, timedelta, timezone
from typing import Optional, Dict, Any
import bcrypt
import jwt
from backend.nucleo.configuracoes import configuracoes


def gerar_hash_senha(senha_plana: str) -> str:
    """Gera o hash seguro bcrypt para uma senha plana."""
    salt = bcrypt.gensalt(rounds=12)
    hash_bytes = bcrypt.hashpw(senha_plana.encode("utf-8"), salt)
    return hash_bytes.decode("utf-8")


def verificar_senha(senha_plana: str, senha_hash: str) -> bool:
    """Verifica se a senha fornecida corresponde ao hash bcrypt salvo."""
    if not senha_hash or not senha_plana:
        return False
    try:
        return bcrypt.checkpw(senha_plana.encode("utf-8"), senha_hash.encode("utf-8"))
    except ValueError:
        return False


def criar_token_acesso(dados: Dict[str, Any], expira_em_dias: int = 7) -> str:
    """
    Emite um token JWT codificado com a chave secreta.
    Payload padrão: {"sub": email, "user_id": ..., "org_id": ..., "role": ..., "nome": ...}
    """
    dados_para_codificar = dados.copy()
    expiracao = datetime.now(timezone.utc) + timedelta(days=expira_em_dias)
    dados_para_codificar.update({"exp": expiracao.timestamp()})
    
    token = jwt.encode(
        dados_para_codificar,
        configuracoes.CHAVE_SECRETA_JWT,
        algorithm=configuracoes.ALGORITMO_JWT
    )
    return token


def decodificar_token_acesso(token: str) -> Optional[Dict[str, Any]]:
    """Decodifica e valida a assinatura e expiração de um token JWT."""
    try:
        payload = jwt.decode(
            token,
            configuracoes.CHAVE_SECRETA_JWT,
            algorithms=[configuracoes.ALGORITMO_JWT]
        )
        return payload
    except (jwt.ExpiredSignatureError, jwt.PyJWTError):
        return None
