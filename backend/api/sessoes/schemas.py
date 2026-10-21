# EM CONFORMIDADE COM AS REGRAS DE OURO DO E-SIGMA
"""
Schemas Pydantic para o Domínio de Sessões (Templates e Lojas).
"""
import uuid
from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, ConfigDict, Field


# --- TEMPLATES GLOBAIS ---
class TipoSessaoEventoResposta(BaseModel):
    """Representa um momento ritualístico vinculado a um Template de Sessão (`TipoSessao`)."""
    id: uuid.UUID
    evento_id: uuid.UUID
    evento_nome: Optional[str] = None
    ordem_sequencia: int
    momento_silencio: bool
    model_config = ConfigDict(from_attributes=True)


class TipoSessaoResposta(BaseModel):
    """Representa um Template Global de Sessão de um Rito."""
    id: uuid.UUID
    nome: str
    rito_id: uuid.UUID
    criado_em: datetime
    eventos: List[TipoSessaoEventoResposta] = []
    model_config = ConfigDict(from_attributes=True)


# --- SESSÃO DA LOJA ---
class SessaoLojaEventoBase(BaseModel):
    ordem_execucao: int
    suprimido: bool = False
    observacao_mestre_harmonia: Optional[str] = None


class SessaoLojaEventoAtualizacao(SessaoLojaEventoBase):
    pass


class SessaoLojaEventoItemInput(BaseModel):
    """Item de momento ritualístico enviado ao criar ou atualizar uma Sessão da Loja."""
    evento_id: uuid.UUID
    ordem_execucao: int
    suprimido: bool = False
    observacao_mestre_harmonia: Optional[str] = None


class SessaoLojaEventoResposta(SessaoLojaEventoBase):
    id: uuid.UUID
    sessao_loja_id: uuid.UUID
    evento_id: uuid.UUID
    evento_nome: Optional[str] = None
    model_config = ConfigDict(from_attributes=True)


class SessaoLojaBase(BaseModel):
    nome_personalizado: Optional[str] = None


class SessaoLojaImportacao(BaseModel):
    """Payload para criação/importação de uma Sessão Maçônica da Loja."""
    tipo_sessao_id: Optional[uuid.UUID] = Field(
        None, description="ID do Template (TipoSessao) base do Rito"
    )
    nome_personalizado: Optional[str] = Field(
        None, description="Nome da Sessão na Loja (ex: Sessão Ordinária de Aprendiz)"
    )
    eventos_customizados: Optional[List[SessaoLojaEventoItemInput]] = Field(
        None,
        description="Lista opcional de momentos ritualísticos selecionados e ordenados para a sessão",
    )


class SessaoLojaSalvarCompleta(BaseModel):
    """Payload para atualização completa do nome e da esteira de momentos de uma Sessão da Loja."""
    nome_personalizado: str = Field(..., description="Nome personalizado da Sessão na Loja")
    eventos_customizados: List[SessaoLojaEventoItemInput] = Field(
        default_factory=list,
        description="Lista ordenada completa de momentos ritualísticos da sessão",
    )


class SessaoLojaResposta(SessaoLojaBase):
    id: uuid.UUID
    loja_id: uuid.UUID
    tipo_sessao_id: uuid.UUID
    criado_em: datetime
    eventos_customizados: List[SessaoLojaEventoResposta] = []
    model_config = ConfigDict(from_attributes=True)
