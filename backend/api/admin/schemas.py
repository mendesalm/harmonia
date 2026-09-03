from pydantic import BaseModel, ConfigDict
import uuid
from typing import List, Optional

class MomentoCanonicoSchema(BaseModel):
    id: uuid.UUID
    nome: str
    descricao: Optional[str] = None
    ordem_sugerida: int
    ativo: bool
    model_config = ConfigDict(from_attributes=True)

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
