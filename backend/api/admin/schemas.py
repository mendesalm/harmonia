from pydantic import BaseModel, ConfigDict
import uuid
from typing import List, Optional

class VariacaoRitoSchema(BaseModel):
    rito_id: uuid.UUID
    nome: str
    observacao_padrao_mestre_harmonia: Optional[str] = None

class SalvarEventoGlobalSchema(BaseModel):
    nome: str
    descricao: Optional[str] = None
    orientacao: Optional[str] = None
    ordem_sugerida: int
    ritos: List[VariacaoRitoSchema] = []
    musicas_sugeridas_ids: List[uuid.UUID] = []

class EventoSchema(BaseModel):
    id: uuid.UUID
    nome: str
    rito_id: uuid.UUID
    observacao_padrao_mestre_harmonia: Optional[str] = None

    class Config:
        from_attributes = True

class MomentoCanonicoSchema(BaseModel):
    id: uuid.UUID
    nome: str
    descricao: Optional[str] = None
    orientacao: Optional[str] = None
    ordem_sugerida: int
    ativo: bool
    eventos: List[EventoSchema] = []

    class Config:
        from_attributes = True

class TipoSessaoCanonicoSchema(BaseModel):
    id: uuid.UUID
    nome: str
    descricao: Optional[str] = None
    ativo: bool
    model_config = ConfigDict(from_attributes=True)

class EventoSchema(BaseModel):
    id: uuid.UUID
    nome: str
    canonico_id: Optional[uuid.UUID]
    canonico: Optional[MomentoCanonicoSchema] = None
    model_config = ConfigDict(from_attributes=True)

class TipoSessaoSchema(BaseModel):
    id: uuid.UUID
    nome: str
    rito_id: uuid.UUID
    canonico_id: Optional[uuid.UUID]
    canonico: Optional[TipoSessaoCanonicoSchema] = None
    model_config = ConfigDict(from_attributes=True)

class RitoSchema(BaseModel):
    id: uuid.UUID
    nome: str
    descricao: Optional[str] = None
    tipos_sessao: List[TipoSessaoSchema] = []
    model_config = ConfigDict(from_attributes=True)

class CriarRitoSchema(BaseModel):
    nome: str
    descricao: Optional[str] = None

class CriarSessaoSchema(BaseModel):
    nome: str
    canonico_id: uuid.UUID

class SalvarSequenciaSchema(BaseModel):
    canonicos_ids: List[uuid.UUID]
