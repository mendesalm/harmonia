"""
Camada de Serviços para Autenticação e Gestão de Usuários.
"""
from datetime import datetime
import uuid
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from fastapi import HTTPException, status
from backend.modelos.pessoa import Pessoa
from backend.modelos.organizacao import Organizacao
from backend.nucleo.seguranca import verificar_senha, gerar_hash_senha, criar_token_acesso
from backend.api.auth.schemas import RequisicaoLogin, RequisicaoTrocaSenha, RespostaLogin, UsuarioInfo


class ServicoAuth:
    """Regras de negócio para Autenticação JWT e Gestão de Credenciais."""

    @staticmethod
    async def autenticar(db: AsyncSession, credenciais: RequisicaoLogin) -> RespostaLogin:
        """Autentica o usuário por email e senha, validando o status da assinatura SaaS da Loja."""
        stmt = (
            select(Pessoa)
            .where(Pessoa.email == credenciais.email.lower().strip())
            .options(selectinload(Pessoa.organizacao))
        )
        res = await db.execute(stmt)
        usuario = res.scalar_one_or_none()

        if not usuario or not usuario.senha_hash:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Credenciais inválidas. Verifique seu e-mail e senha."
            )

        if not usuario.status_acesso:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Seu acesso ao sistema está inativo. Entre em contato com o suporte."
            )

        # Validação de Assinatura da Loja (Tenant)
        if usuario.organizacao and usuario.organizacao.status_assinatura == "BLOQUEADO":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="A assinatura da sua Loja está suspensa ou pendente de regularização mensal."
            )

        if not verificar_senha(credenciais.senha, usuario.senha_hash):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Credenciais inválidas. Verifique seu e-mail e senha."
            )

        # Atualiza último login
        usuario.ultimo_login = datetime.utcnow()
        await db.commit()

        # Determina role primária
        permissoes = usuario.permissoes_sistema
        role = "membro"
        if "super_admin" in permissoes:
            role = "super_admin"
        elif "mestre_harmonia" in permissoes:
            role = "mestre_harmonia"
        elif "webmaster" in permissoes:
            role = "webmaster"

        # Emite JWT
        payload = {
            "sub": usuario.email,
            "user_id": str(usuario.id),
            "org_id": str(usuario.organizacao_id) if usuario.organizacao_id else None,
            "role": role,
            "nome": usuario.nome,
            "permissoes": permissoes
        }
        token = criar_token_acesso(payload)

        info = UsuarioInfo(
            id=usuario.id,
            nome=usuario.nome,
            email=usuario.email,
            tipo=usuario.tipo,
            organizacao_id=usuario.organizacao_id,
            organizacao_nome=usuario.organizacao.nome if usuario.organizacao else None,
            slug_armazenamento=usuario.organizacao.slug_armazenamento if usuario.organizacao else None,
            status_assinatura=usuario.organizacao.status_assinatura if usuario.organizacao else "ATIVO",
            plano_assinatura=usuario.organizacao.plano_assinatura if usuario.organizacao else "MENSAL_HARMONIA",
            permissoes=permissoes,
            dados_especificos=usuario.dados_especificos or {}
        )

        return RespostaLogin(access_token=token, token_type="bearer", usuario=info)

    @staticmethod
    async def alterar_senha(db: AsyncSession, user_id_str: str, dados: RequisicaoTrocaSenha) -> dict:
        """Permite que o usuário logado altere sua senha de acesso."""
        user_id = uuid.UUID(user_id_str)
        stmt = select(Pessoa).where(Pessoa.id == user_id)
        res = await db.execute(stmt)
        usuario = res.scalar_one_or_none()

        if not usuario or not usuario.senha_hash:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Usuário não encontrado.")

        if not verificar_senha(dados.senha_atual, usuario.senha_hash):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="A senha atual informada está incorreta."
            )

        usuario.senha_hash = gerar_hash_senha(dados.nova_senha)
        if isinstance(usuario.dados_especificos, dict):
            usuario.dados_especificos["senha_alterada_pelo_usuario"] = True
            usuario.dados_especificos["data_alteracao_senha"] = datetime.utcnow().isoformat()

        await db.commit()
        return {"mensagem": "Senha de acesso alterada com sucesso."}

    @staticmethod
    async def obter_perfil(db: AsyncSession, user_id_str: str) -> UsuarioInfo:
        """Retorna o perfil completo do usuário autenticado."""
        user_id = uuid.UUID(user_id_str)
        stmt = select(Pessoa).where(Pessoa.id == user_id).options(selectinload(Pessoa.organizacao))
        res = await db.execute(stmt)
        usuario = res.scalar_one_or_none()

        if not usuario:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Usuário não encontrado.")

        return UsuarioInfo(
            id=usuario.id,
            nome=usuario.nome,
            email=usuario.email,
            tipo=usuario.tipo,
            organizacao_id=usuario.organizacao_id,
            organizacao_nome=usuario.organizacao.nome if usuario.organizacao else None,
            slug_armazenamento=usuario.organizacao.slug_armazenamento if usuario.organizacao else None,
            status_assinatura=usuario.organizacao.status_assinatura if usuario.organizacao else "ATIVO",
            plano_assinatura=usuario.organizacao.plano_assinatura if usuario.organizacao else "MENSAL_HARMONIA",
            permissoes=usuario.permissoes_sistema,
            dados_especificos=usuario.dados_especificos or {}
        )
