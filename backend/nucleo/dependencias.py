# EM CONFORMIDADE COM AS REGRAS DE OURO DO E-SIGMA
"""
Dependências de Autenticação e Controle de Acesso Baseado em Papéis (RBAC) do Harmonia.
Todas as validações de identidade passam obrigatoriamente por `obter_usuario_esigma`
contra `GET /api/v1/auth/validate` do e-Sigma IdP.
"""
from fastapi import Depends, HTTPException, status
from loguru import logger
from backend.nucleo.auth_esigma import UsuarioEsigma, obter_usuario_esigma


def obter_usuario_logado(
    usuario: UsuarioEsigma = Depends(obter_usuario_esigma),
) -> UsuarioEsigma:
    """
    Retorna a identidade do usuário já validada pelo e-Sigma IdP.
    """
    return usuario


def verificar_assinatura_ativa(
    usuario: UsuarioEsigma = Depends(obter_usuario_esigma),
) -> UsuarioEsigma:
    """
    Verifica se o módulo Harmonia está ativo para a Loja do usuário autenticado
    (via `modulos_ativos` retornado pelo e-Sigma) ou se o usuário é SuperAdmin.
    """
    if not usuario.harmonia_ativo:
        logger.warning(
            f"Acesso negado ao Harmonia (assinatura inativa): user_id={usuario.user_id} "
            f"org={usuario.organizacao_id} modulos={usuario.modulos_ativos}"
        )
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="O módulo Harmonia não está ativo para esta Loja ou a assinatura encontra-se pendente.",
        )
    return usuario


def exigir_super_admin(
    usuario: UsuarioEsigma = Depends(obter_usuario_esigma),
) -> UsuarioEsigma:
    """
    Garante que apenas usuários com papel `super_admin` acessem rotas administrativas globais.
    """
    if not usuario.is_super_admin:
        logger.warning(
            f"Tentativa de acesso administrativo negada: user_id={usuario.user_id} role={usuario.role}"
        )
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Acesso restrito ao Super Administrador do ecossistema Sigma.",
        )
    return usuario
