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
    estilo: str = Field("UNIVERSAL", description="Estilo musical litúrgico (UNIVERSAL, CLASSICA, VIOLAO, SOUNDTRACKS, POPULAR)")
    subclassificacao: str = Field("GERAL", description="Subclassificação funcional: GERAL ou AMBIENTE")
    
    # Metadados adicionais em JSON (tags, hash, etc)
    metadados: Dict[str, Any] = Field(default_factory=dict, description="Metadados adicionais em JSON")


class MusicaUpload(MusicaBase):
    """Schema para cadastro de música via Upload."""
    upload_por_loja_id: Optional[uuid.UUID] = Field(None, description="UUID da Loja (Null se Superadmin)")
    eventos_sugeridos_ids: List[uuid.UUID] = Field(default_factory=list, description="IDs dos eventos sugeridos para esta música")


class MusicaDownloadYouTube(BaseModel):
    """Schema para solicitação de conversão de vídeo do YouTube para MP3."""
    link_youtube: str = Field(..., description="URL do vídeo do YouTube")
    titulo: Optional[str] = Field(None, description="Título opcional")
    autor_artista: Optional[str] = Field(None, description="Autor/Artista opcional")
    estilo: Optional[str] = Field("UNIVERSAL", description="Estilo musical litúrgico")
    subclassificacao: Optional[str] = Field("GERAL", description="Subclassificação funcional")
    organizacao_id: Optional[uuid.UUID] = Field(None, description="UUID da Loja")
    bitrate_kbps: int = Field(320, description="Qualidade de áudio em kbps")
    eventos_sugeridos_ids: List[uuid.UUID] = Field(default_factory=list, description="IDs dos eventos sugeridos")


class MusicaLinkStreaming(BaseModel):
    """Schema para cadastro de link externo (ex: streaming YouTube sem conversão)."""
    link_externo: str = Field(..., description="URL externa")
    titulo: str = Field(..., min_length=1, max_length=255)
    autor_artista: Optional[str] = None
    tipo_midia: str = Field("YOUTUBE", description="Tipo de mídia externa")
    organizacao_id: Optional[uuid.UUID] = None
    eventos_sugeridos_ids: List[uuid.UUID] = Field(default_factory=list)


class MusicaAtualizacao(BaseModel):
    """Schema para atualização de dados da Música."""
    titulo: Optional[str] = Field(None, min_length=1, max_length=255)
    autor_artista: Optional[str] = None
    estilo: Optional[str] = Field(None, description="Estilo musical litúrgico")
    subclassificacao: Optional[str] = Field(None, description="Subclassificação funcional: GERAL ou AMBIENTE")
    metadados: Optional[Dict[str, Any]] = None
    eventos_sugeridos_ids: Optional[List[uuid.UUID]] = Field(None, description="Nova lista de eventos sugeridos")
    sinalizada_erro: Optional[bool] = None
    status_uso: Optional[str] = None
    ativo: Optional[bool] = None


class EventoResumoSchema(BaseModel):
    """Resumo de evento litúrgico associado à música."""
    id: uuid.UUID
    nome: str
    descricao: Optional[str] = None
    rito_id: Optional[uuid.UUID] = None
    canonico_id: Optional[uuid.UUID] = None

    model_config = ConfigDict(from_attributes=True)


class MusicaResposta(MusicaBase):
    """Schema de resposta detalhada de Música."""
    id: uuid.UUID
    upload_por_loja_id: Optional[uuid.UUID]
    arquivo_url: Optional[str]
    sinalizada_erro: bool
    status_uso: str
    ativo: bool
    eventos_vinculados: List[EventoResumoSchema] = Field(default_factory=list, description="Momentos litúrgicos associados")
    criado_em: datetime
    atualizado_em: datetime

    model_config = ConfigDict(from_attributes=True)


class MusicaClassificacaoSuperAdmin(BaseModel):
    """Schema para o Superadmin classificar estilo, subclassificação e momentos associados."""
    estilo: str = Field(..., description="Estilo musical (UNIVERSAL, CLASSICA, VIOLAO, SOUNDTRACKS, POPULAR)")
    subclassificacao: str = Field(..., description="Subclassificação (GERAL ou AMBIENTE)")
    eventos_sugeridos_ids: Optional[List[uuid.UUID]] = Field(None, description="Lista de IDs de momentos ritualísticos para atribuir")


class MusicaClassificacaoLoteSchema(BaseModel):
    """Schema para classificação em lote pelo Superadmin."""
    musicas_ids: List[uuid.UUID] = Field(..., min_length=1, description="Lista de UUIDs das músicas selecionadas")
    estilo: Optional[str] = Field(None, description="Estilo a aplicar nas músicas selecionadas")
    subclassificacao: Optional[str] = Field(None, description="Subclassificação a aplicar")
    eventos_sugeridos_ids: Optional[List[uuid.UUID]] = Field(None, description="Momentos litúrgicos para associar")
    adicionar_eventos: bool = Field(True, description="Se True adiciona aos eventos existentes; se False sobrescreve")
