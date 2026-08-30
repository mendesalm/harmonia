"""
Schemas Pydantic para o Domínio de Músicas e Acervo do Mestre de Harmonia.
"""
import uuid
from datetime import datetime
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field, ConfigDict


class EventoAssociadoInfo(BaseModel):
    """Informação resumida do evento associado à música."""
    evento_id: uuid.UUID
    evento_nome: str

    model_config = ConfigDict(from_attributes=True)


class MusicaBase(BaseModel):
    """Schema base de Música."""
    titulo: str = Field(..., min_length=1, max_length=255, description="Título da música")
    autor_artista: Optional[str] = Field(None, max_length=255, description="Compositor, intérprete ou autor")
    tipo_midia: str = Field("ARQUIVO_LOCAL", description="Tipo de mídia: ARQUIVO_LOCAL ou YOUTUBE")
    link_externo: Optional[str] = Field(None, description="URL original do YouTube se cadastrado via link")
    duracao_segundos: Optional[int] = Field(None, description="Duração da faixa em segundos")
    metadados: Dict[str, Any] = Field(default_factory=dict, description="Metadados adicionais em JSON (tags, álbum, bitrate)")


class MusicaCriacaoLink(MusicaBase):
    """Schema para cadastro de música via Link de Streaming."""
    organizacao_id: uuid.UUID = Field(..., description="UUID da Loja proprietária")
    evento_ids: List[uuid.UUID] = Field(default_factory=list, description="IDs dos eventos aos quais a música pertence")


class MusicaDownloadYouTube(BaseModel):
    """Schema para download e conversão direta do YouTube para MP3 320kbps."""
    organizacao_id: uuid.UUID = Field(..., description="UUID da Loja proprietária")
    link_youtube: str = Field(..., description="URL do vídeo ou música no YouTube")
    titulo: Optional[str] = Field(None, description="Título personalizado opcional")
    autor_artista: Optional[str] = Field(None, description="Compositor ou intérprete opcional")
    bitrate_kbps: int = Field(320, description="Taxa de bits para codificação MP3 (padrão: 320 kbps)")
    evento_ids: List[uuid.UUID] = Field(default_factory=list, description="IDs dos eventos associados")


class MusicaAtualizacao(BaseModel):
    """Schema para atualização de dados da Música."""
    titulo: Optional[str] = Field(None, min_length=1, max_length=255)
    autor_artista: Optional[str] = None
    link_externo: Optional[str] = None
    duracao_segundos: Optional[int] = None
    metadados: Optional[Dict[str, Any]] = None
    evento_ids: Optional[List[uuid.UUID]] = Field(None, description="Nova lista de IDs de eventos associados")
    ativo: Optional[bool] = None


class MusicaResposta(MusicaBase):
    """Schema de resposta detalhada de Música com seus eventos associados."""
    id: uuid.UUID
    organizacao_id: uuid.UUID
    caminho_arquivo: Optional[str]
    tamanho_bytes: Optional[int]
    tipo_mime: Optional[str]
    ativo: bool
    eventos: List[EventoAssociadoInfo] = []
    criado_em: datetime
    atualizado_em: datetime

    model_config = ConfigDict(from_attributes=True)
