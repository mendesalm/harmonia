"""
Schemas Pydantic para o Domínio de Organizações (Lojas e Obediências).
"""
import uuid
from datetime import datetime
from typing import Optional, Dict, Any
from pydantic import BaseModel, Field, ConfigDict


class OrganizacaoBase(BaseModel):
    """Schema base com atributos compartilhados de Organização."""
    nome: str = Field(..., min_length=3, max_length=255, description="Nome oficial da Loja ou Obediência", example="A.R.L.S. João Pedro Junqueira nº 2181")
    sigla: Optional[str] = Field(None, max_length=50, description="Sigla da Loja ou Obediência", example="JPJ-2181")
    tipo: str = Field("LOJA", description="Tipo institucional: LOJA, OBEDIENCIA, SUBOBEDIENCIA", example="LOJA")
    rito_padrao: str = Field("REAA", description="Rito litúrgico padrão praticado", example="REAA")
    dados_especificos: Dict[str, Any] = Field(default_factory=dict, description="Dados flexíveis em JSON (número, oriente, UF, webmaster, etc.)")


class OrganizacaoCriacao(OrganizacaoBase):
    """Schema para criação de uma nova Organização."""
    slug_armazenamento: Optional[str] = Field(None, description="Slug customizado para armazenamento (se omitido, será gerado automaticamente)")


class OrganizacaoAtualizacao(BaseModel):
    """Schema para atualização parcial de Organização."""
    nome: Optional[str] = Field(None, min_length=3, max_length=255)
    sigla: Optional[str] = None
    tipo: Optional[str] = None
    rito_padrao: Optional[str] = None
    dados_especificos: Optional[Dict[str, Any]] = None
    ativo: Optional[bool] = None


class OrganizacaoResposta(OrganizacaoBase):
    """Schema de resposta detalhada de Organização."""
    id: uuid.UUID
    slug_armazenamento: str
    ativo: bool
    criado_em: datetime
    atualizado_em: datetime

    model_config = ConfigDict(from_attributes=True)
