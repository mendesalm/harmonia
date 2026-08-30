"""
Schemas Pydantic para o Domínio de Eventos Ritualísticos (Playlists).
"""
import uuid
from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, Field, ConfigDict


class EventoBase(BaseModel):
    """Schema base para Evento / Momento Ritualístico."""
    nome: str = Field(..., min_length=2, max_length=255, description="Nome do evento ritualístico", example="Entrada do Cortejo")
    descricao: Optional[str] = Field(None, description="Descrição ou momento de execução", example="Música solene para o ingresso das Luzes no Templo")
    categoria_rito: str = Field("Geral", description="Rito associado: REAA, York, Geral, etc.", example="REAA")
    compartilhado: bool = Field(True, description="Indica se o evento pode ser visualizado por outras lojas")
    ordem_sugerida: int = Field(0, description="Ordem sugerida na esteira ritualística")


class EventoCriacao(EventoBase):
    """Schema para criação de um Evento personalizado."""
    organizacao_id: Optional[uuid.UUID] = Field(None, description="UUID da loja criadora (None para evento padrão global)")


class EventoAtualizacao(BaseModel):
    """Schema para atualização de Evento."""
    nome: Optional[str] = Field(None, min_length=2, max_length=255)
    descricao: Optional[str] = None
    categoria_rito: Optional[str] = None
    compartilhado: Optional[bool] = None
    ordem_sugerida: Optional[int] = None
    ativo: Optional[bool] = None


class EventoResposta(EventoBase):
    """Schema de resposta detalhada de Evento."""
    id: uuid.UUID
    organizacao_id: Optional[uuid.UUID]
    padrao_sistema: bool
    ativo: bool
    total_musicas: Optional[int] = Field(0, description="Quantidade de músicas catalogadas para este evento")
    criado_em: datetime
    atualizado_em: datetime

    model_config = ConfigDict(from_attributes=True)
