"""
Schemas Pydantic para o Domínio de Músicas e Acervo Global.
"""
import uuid
from datetime import datetime
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field, ConfigDict


class EventoSugeridoInfo(BaseModel):
    """Informação resumida do evento sugerido associado à música."""
    evento_id: uuid.UUID
    evento_nome: Optional[str] = None # Populated manually if needed

    model_config = ConfigDict(from_attributes=True)


class MusicaBase(BaseModel):
    """Schema base de Música."""
    titulo: str = Field(..., min_length=1, max_length=255, description="Título da música")
    autor_artista: Optional[str] = Field(None, max_length=255, description="Compositor, intérprete ou autor")
    
    # Metadados adicionais em JSON (tags, hash, etc)
    metadados: Dict[str, Any] = Field(default_factory=dict, description="Metadados adicionais em JSON")


class MusicaUpload(MusicaBase):
    """Schema para cadastro de música via Upload."""
    upload_por_loja_id: Optional[uuid.UUID] = Field(None, description="UUID da Loja (Null se Superadmin)")
    eventos_sugeridos_ids: List[uuid.UUID] = Field(default_factory=list, description="IDs dos eventos sugeridos para esta música")


class MusicaAtualizacao(BaseModel):
    """Schema para atualização de dados da Música."""
    titulo: Optional[str] = Field(None, min_length=1, max_length=255)
    autor_artista: Optional[str] = None
    metadados: Optional[Dict[str, Any]] = None
    eventos_sugeridos_ids: Optional[List[uuid.UUID]] = Field(None, description="Nova lista de eventos sugeridos")
    sinalizada_erro: Optional[bool] = None
    status_uso: Optional[str] = None
    ativo: Optional[bool] = None


class MusicaResposta(MusicaBase):
    """Schema de resposta detalhada de Música."""
    id: uuid.UUID
    upload_por_loja_id: Optional[uuid.UUID]
    arquivo_url: Optional[str]
    sinalizada_erro: bool
    status_uso: str
    ativo: bool
    # eventos_sugeridos: List[EventoSugeridoInfo] = [] # Removido para simplificar
    criado_em: datetime
    atualizado_em: datetime

    model_config = ConfigDict(from_attributes=True)
