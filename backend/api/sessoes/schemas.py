"""
Schemas Pydantic para o Domínio de Sessões e Sequenciamento Ritualístico.
"""
import uuid
from datetime import datetime
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field, ConfigDict


class ItemSequenciaCriacao(BaseModel):
    """Schema para item de evento dentro da sequência da sessão."""
    evento_id: uuid.UUID = Field(..., description="UUID do evento/playlist ritualística")
    ordem: int = Field(..., ge=1, description="Posição sequencial na esteira da sessão")
    obrigatorio: bool = Field(True, description="Se o evento é obrigatório")
    observacao_ritual: Optional[str] = Field(None, description="Observações específicas para o Mestre de Harmonia")


class ItemSequenciaResposta(BaseModel):
    """Schema de resposta para item de evento na sequência da sessão."""
    id: uuid.UUID
    evento_id: uuid.UUID
    evento_nome: str
    ordem: int
    obrigatorio: bool
    observacao_ritual: Optional[str]
    total_musicas: int = 0

    model_config = ConfigDict(from_attributes=True)


class SessaoBase(BaseModel):
    """Schema base para Sessão Maçônica."""
    nome: str = Field(..., min_length=3, max_length=255, description="Nome da sessão")
    rito: str = Field("REAA", description="Rito associado: REAA, Brasileiro, York, Schroeder, Moderno, Adonhiramita, etc.")
    grau: int = Field(1, ge=1, le=33, description="Grau da sessão (1: Aprendiz, 2: Companheiro, 3: Mestre, etc.)")
    descricao: Optional[str] = Field(None, description="Descrição ou notas litúrgicas")
    configuracoes: Dict[str, Any] = Field(default_factory=dict, description="Configurações de áudio: fade in, tempo de transição, etc.")


class SessaoCriacao(SessaoBase):
    """Schema para criação de Sessão com lista inicial de eventos sequenciados."""
    organizacao_id: uuid.UUID = Field(..., description="UUID da Loja proprietária")
    eventos: Optional[List[ItemSequenciaCriacao]] = Field(default_factory=list, description="Lista ordenada de eventos")


class SessaoClonagem(BaseModel):
    """Schema para clonar uma sessão existente com toda a sua esteira litúrgica."""
    novo_nome: Optional[str] = Field(None, min_length=3, max_length=255, description="Novo nome para a sessão clonada")
    novo_rito: Optional[str] = Field(None, description="Novo rito associado (ex: Brasileiro, REAA, York, etc.)")
    novo_grau: Optional[int] = Field(None, ge=1, le=33, description="Novo grau associado")
    organizacao_id_destino: Optional[uuid.UUID] = Field(None, description="UUID da organização destino se diferente")


class SessaoAtualizacao(BaseModel):
    """Schema para atualização de dados cadastrais da Sessão."""
    nome: Optional[str] = Field(None, min_length=3, max_length=255)
    rito: Optional[str] = None
    grau: Optional[int] = None
    descricao: Optional[str] = None
    configuracoes: Optional[Dict[str, Any]] = None
    ativo: Optional[bool] = None


class SessaoDefinirSequencia(BaseModel):
    """Schema para definir ou reordenar completamente a sequência de eventos de uma sessão."""
    eventos: List[ItemSequenciaCriacao] = Field(..., description="Lista ordenada de eventos da sessão")


class SessaoResposta(SessaoBase):
    """Schema de resposta para resumo de Sessão."""
    id: uuid.UUID
    organizacao_id: uuid.UUID
    ativo: bool
    total_eventos: int = 0
    criado_em: datetime
    atualizado_em: datetime

    model_config = ConfigDict(from_attributes=True)


class SessaoDetalhadaResposta(SessaoResposta):
    """Schema de resposta com a lista completa de eventos sequenciados da Sessão."""
    sequencia_eventos: List[ItemSequenciaResposta] = Field(default_factory=list)
