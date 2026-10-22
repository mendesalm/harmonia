# EM CONFORMIDADE COM AS REGRAS DE OURO DO E-SIGMA
"""
Cliente de integração com o e-Sigma (IdP Central) para validação de identidade
e assinatura ativa do módulo Harmonia.

Em conformidade com AGENTS.md:
- O Harmonia (módulo satélite) nunca confia em headers arbitrários do cliente
  nem decodifica JWT localmente com segredo hardcoded.
- A identidade do usuário e a lista viva de módulos ativos da Loja são validadas
  contra `GET /api/v1/auth/validate` do e-Sigma, com cache em memória de curta
  duração (30s) indexado apenas pelo hash SHA-256 do token e lock por token
  para evitar cache stampede.
"""
import hashlib
import threading
import time
from typing import Any, List, Optional

import requests
from fastapi import Header, HTTPException, status
from loguru import logger

from backend.nucleo.configuracoes import configuracoes

_cache_validacao: dict[str, tuple[float, "UsuarioEsigma"]] = {}
_cache_lock = threading.Lock()
_locks_validacao: dict[str, threading.Lock] = {}
_locks_dict_lock = threading.Lock()


def _chave_cache(authorization: str) -> str:
    """
    Calcula o hash SHA-256 do cabeçalho Authorization para indexar o cache
    em memória sem jamais armazenar o token JWT em texto puro.
    """
    return hashlib.sha256(authorization.encode("utf-8")).hexdigest()


def _obter_lock_do_token(chave: str) -> threading.Lock:
    """
    Obtém ou cria um lock exclusivo por hash de token para evitar cache stampede
    quando múltiplas requisições simultâneas chegam do frontend.
    """
    with _locks_dict_lock:
        lock = _locks_validacao.get(chave)
        if lock is None:
            lock = threading.Lock()
            _locks_validacao[chave] = lock
        return lock


def limpar_cache_validacao() -> None:
    """Limpa o cache em memória de tokens validados (útil em testes automatizados)."""
    with _cache_lock:
        _cache_validacao.clear()


class UsuarioEsigma:
    """
    Representa a identidade do usuário autenticado e validado pelo e-Sigma IdP.
    Oferece acesso tanto por atributos quanto via `.get()` para compatibilidade.
    """

    def __init__(
        self,
        email: Optional[str],
        user_id: Optional[str],
        role: Optional[str],
        organizacao_id: Optional[str],
        cim: Optional[str] = None,
        cpf: Optional[str] = None,
        modulos_ativos: Optional[List[str]] = None,
        nome: Optional[str] = None,
    ):
        self.email = email
        self.nome = nome
        self.user_id = user_id
        self.role = role or "member"
        self.organizacao_id = organizacao_id
        self.cim = cim
        self.cpf = cpf
        self.modulos_ativos = modulos_ativos or []

    @property
    def is_super_admin(self) -> bool:
        """Indica se o usuário possui privilégio global de SuperAdmin no ecossistema."""
        # mendesalm@gmail.com (CIM 272875) possui privilégio incondicional de SuperAdmin em todas as instâncias
        if self.email and self.email.strip().lower() == "mendesalm@gmail.com":
            return True
        if self.cim and str(self.cim).strip() == "272875":
            return True
        return self.role in ("super_admin", "ADMIN")

    @property
    def harmonia_ativo(self) -> bool:
        """Verifica se o módulo Harmonia está ativo para a Loja do usuário ou se é SuperAdmin."""
        return "harmonia" in self.modulos_ativos or self.is_super_admin

    def para_dict(self) -> dict[str, Any]:
        """Converte os dados validados para dicionário padronizado."""
        return {
            "sub": self.email,
            "email": self.email,
            "user_id": self.user_id,
            "role": self.role,
            "loja_id": self.organizacao_id,
            "organizacao_id": self.organizacao_id,
            "cim": self.cim,
            "cpf": self.cpf,
            "modulos_ativos": self.modulos_ativos,
            "harmonia_ativo": self.harmonia_ativo,
        }

    def get(self, chave: str, padrao: Any = None) -> Any:
        """Permite leitura estilo dicionário para retrocompatibilidade com rotas existentes."""
        mapa = self.para_dict()
        return mapa.get(chave, padrao)


def obter_usuario_esigma(
    authorization: Optional[str] = Header(
        None,
        description="Token Bearer emitido pelo e-Sigma no login do usuário (ex.: 'Bearer eyJ...').",
    ),
) -> UsuarioEsigma:
    """
    Dependência FastAPI oficial que valida o token Bearer contra `GET /api/v1/auth/validate`
    do e-Sigma IdP.
    """
    if not authorization or not authorization.lower().startswith("bearer "):
        logger.warning("Tentativa de acesso sem cabeçalho Authorization Bearer válido.")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Não autenticado. Envie o token Bearer emitido pelo e-Sigma.",
        )

    url_base = (configuracoes.ESIGMA_API_BASE_URL or "").rstrip("/")
    if not url_base:
        logger.error("ESIGMA_API_BASE_URL não configurada no backend do Harmonia.")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Configuração ausente: ESIGMA_API_BASE_URL não definida no backend do Harmonia.",
        )

    chave = _chave_cache(authorization)
    agora = time.monotonic()
    with _cache_lock:
        entrada = _cache_validacao.get(chave)
        if entrada and entrada[0] > agora:
            return entrada[1]

    lock_token = _obter_lock_do_token(chave)
    with lock_token:
        agora = time.monotonic()
        with _cache_lock:
            entrada = _cache_validacao.get(chave)
            if entrada and entrada[0] > agora:
                return entrada[1]

        try:
            resposta = requests.get(
                f"{url_base}/auth/validate",
                headers={"Authorization": authorization},
                timeout=configuracoes.ESIGMA_VALIDATE_TIMEOUT_SEGUNDOS,
            )
        except requests.RequestException as erro:
            logger.error(f"Falha de comunicação ao validar token junto ao e-Sigma ({url_base}): {erro}")
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Não foi possível validar suas credenciais no momento (e-Sigma indisponível). Tente novamente em instantes.",
            )

        if resposta.status_code == 401:
            logger.warning("Token rejeitado pelo e-Sigma (/auth/validate retornou 401).")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Sessão inválida ou expirada. Faça login novamente.",
            )

        if resposta.status_code != 200:
            logger.error(f"Resposta inesperada do e-Sigma ao validar token: {resposta.status_code} - {resposta.text}")
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail="Erro ao validar credenciais junto ao provedor de identidade e-Sigma.",
            )

        dados = resposta.json()
        usuario_dados = dados.get("usuario", {})
        usuario_validado = UsuarioEsigma(
            email=usuario_dados.get("email"),
            nome=usuario_dados.get("nome"),
            user_id=usuario_dados.get("user_id"),
            role=usuario_dados.get("role"),
            organizacao_id=usuario_dados.get("organizacao_id"),
            cim=usuario_dados.get("cim"),
            cpf=usuario_dados.get("cpf"),
            modulos_ativos=dados.get("modulos_ativos", []),
        )

        with _cache_lock:
            _cache_validacao[chave] = (
                agora + configuracoes.ESIGMA_VALIDATE_CACHE_TTL_SEGUNDOS,
                usuario_validado,
            )
            if len(_cache_validacao) > 500:
                expiradas = [k for k, v in _cache_validacao.items() if v[0] <= agora]
                for k in expiradas:
                    del _cache_validacao[k]

        logger.info(
            f"Usuário autenticado via e-Sigma: user_id={usuario_validado.user_id} "
            f"role={usuario_validado.role} org={usuario_validado.organizacao_id}"
        )
        return usuario_validado
