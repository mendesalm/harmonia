"""
Schemas Pydantic para Autenticação e Usuários.
"""
import uuid
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, EmailStr, Field, ConfigDict


class RequisicaoLogin(BaseModel):
    """Schema de envio de credenciais de login."""
    email: EmailStr = Field(..., description="E-mail cadastrado (ex: loja2181@harmonia.sigma.app)")
    senha: str = Field(..., min_length=4, description="Senha do usuário")


class RequisicaoTrocaSenha(BaseModel):
    """Schema para alteração de senha pelo usuário logado."""
    senha_atual: str = Field(..., min_length=4, description="Senha atual para confirmação")
    nova_senha: str = Field(..., min_length=6, description="Nova senha desejada")


class UsuarioInfo(BaseModel):
    """Informações resumidas do usuário logado."""
    id: uuid.UUID
    nome: str
    email: str
    tipo: str
    organizacao_id: Optional[uuid.UUID]
    organizacao_nome: Optional[str] = None
    slug_armazenamento: Optional[str] = None
    status_assinatura: Optional[str] = "ATIVO"
    plano_assinatura: Optional[str] = "MENSAL_HARMONIA"
    permissoes: List[str] = []
    dados_especificos: Dict[str, Any] = {}

    model_config = ConfigDict(from_attributes=True)


class RespostaLogin(BaseModel):
    """Payload retornado após autenticação bem-sucedida."""
    access_token: str
    token_type: str = "bearer"
    usuario: UsuarioInfo
