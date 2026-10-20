# EM CONFORMIDADE COM AS REGRAS DE OURO DO E-SIGMA
"""
Módulo de Segurança e Criptografia Auxiliar.
Em conformidade com AGENTS.md, nenhuma chave secreta é hardcoded e a validação
de identidade em produção ocorre via `backend/nucleo/auth_esigma.py`.
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
    Emite um token JWT codificado caso `CHAVE_SECRETA_JWT` esteja definida no ambiente.
    Falha explicitamente se a variável de ambiente não estiver configurada.
    """
    if not configuracoes.CHAVE_SECRETA_JWT:
        raise RuntimeError("CHAVE_SECRETA_JWT não configurada no ambiente.")
    dados_para_codificar = dados.copy()
    expiracao = datetime.now(timezone.utc) + timedelta(days=expira_em_dias)
    dados_para_codificar.update({"exp": expiracao.timestamp()})

    token = jwt.encode(
        dados_para_codificar,
        configuracoes.CHAVE_SECRETA_JWT,
        algorithm=configuracoes.ALGORITMO_JWT,
    )
    return token


def decodificar_token_acesso(token: str) -> Optional[Dict[str, Any]]:
    """
    Decodifica um token JWT local apenas se `CHAVE_SECRETA_JWT` estiver definida.
    Para autenticação de rotas do Harmonia, utilize sempre `obter_usuario_esigma`.
    """
    if not configuracoes.CHAVE_SECRETA_JWT:
        return None
    try:
        payload = jwt.decode(
            token,
            configuracoes.CHAVE_SECRETA_JWT,
            algorithms=[configuracoes.ALGORITMO_JWT],
        )
        return payload
    except (jwt.ExpiredSignatureError, jwt.PyJWTError):
        return None
