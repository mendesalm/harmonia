"""
Controlador de Rotas RESTful para Autenticação, Troca de Senha e Perfil.
Autodocumentado no Swagger OpenAPI.
"""
from typing import Dict, Any
from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession
from backend.nucleo.banco import obter_banco_de_dados
from backend.api.auth.schemas import RequisicaoLogin, RequisicaoTrocaSenha, RespostaLogin, UsuarioInfo
from backend.api.auth.servicos import ServicoAuth
from backend.api.auth.dependencias import obter_usuario_autenticado

roteador_auth = APIRouter(prefix="/auth", tags=["Autenticação e Sessão"])


@roteador_auth.post(
    "/login",
    response_model=RespostaLogin,
    summary="Efetuar Login (JWT)",
    description="Autentica a Loja assinante (ex: loja2181@harmonia.sigma.app) via e-mail e senha, retornando o Token Bearer JWT e o status da assinatura mensal."
)
async def login(
    credenciais: RequisicaoLogin,
    db: AsyncSession = Depends(obter_banco_de_dados)
):
    return await ServicoAuth.autenticar(db=db, credenciais=credenciais)


@roteador_auth.get(
    "/me",
    response_model=UsuarioInfo,
    summary="Obter Perfil do Usuário Autenticado",
    description="Retorna os dados cadastrais, Loja vinculada e status da assinatura do usuário portador do token JWT ativo."
)
async def obter_meu_perfil(
    usuario_jwt: Dict[str, Any] = Depends(obter_usuario_autenticado),
    db: AsyncSession = Depends(obter_banco_de_dados)
):
    return await ServicoAuth.obter_perfil(db=db, user_id_str=usuario_jwt["user_id"])


@roteador_auth.post(
    "/alterar-senha",
    summary="Alterar Senha de Acesso",
    description="Permite que a Loja ou Mestre de Harmonia substitua sua senha padrão gerada pelo sistema por uma nova senha personalizada."
)
async def alterar_senha(
    dados: RequisicaoTrocaSenha,
    usuario_jwt: Dict[str, Any] = Depends(obter_usuario_autenticado),
    db: AsyncSession = Depends(obter_banco_de_dados)
):
    return await ServicoAuth.alterar_senha(db=db, user_id_str=usuario_jwt["user_id"], dados=dados)
