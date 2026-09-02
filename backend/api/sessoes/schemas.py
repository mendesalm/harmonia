"""
Schemas Pydantic para o Domínio de Sessões (Templates e Lojas).
"""
import uuid
from datetime import datetime
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field, ConfigDict


# --- TEMPLATES GLOBAIS ---
class TipoSessaoEventoResposta(BaseModel):
    id: uuid.UUID
    evento_id: uuid.UUID
    ordem_sequencia: int
    momento_silencio: bool
    model_config = ConfigDict(from_attributes=True)

class TipoSessaoResposta(BaseModel):
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

class SessaoLojaEventoResposta(SessaoLojaEventoBase):
    id: uuid.UUID
    sessao_loja_id: uuid.UUID
    evento_id: uuid.UUID
    model_config = ConfigDict(from_attributes=True)

class SessaoLojaBase(BaseModel):
    nome_personalizado: Optional[str] = None

class SessaoLojaImportacao(BaseModel):
    tipo_sessao_id: uuid.UUID = Field(..., description="ID do Template (TipoSessao) a importar")
    nome_personalizado: Optional[str] = Field(None, description="Nome customizado (opcional)")

class SessaoLojaResposta(SessaoLojaBase):
    id: uuid.UUID
    loja_id: uuid.UUID
    tipo_sessao_id: uuid.UUID
    criado_em: datetime
    eventos_customizados: List[SessaoLojaEventoResposta] = []
    model_config = ConfigDict(from_attributes=True)
