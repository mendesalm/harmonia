"""
Schemas Pydantic para o Domínio do Player Ritualístico do Mestre de Harmonia.
"""
import uuid
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field, ConfigDict
from backend.api.musicas.schemas import MusicaResposta


class MusicaSorteadaInfo(BaseModel):
    """Dados resumidos da música sorteada para execução."""
    id: uuid.UUID
    titulo: str
    autor_artista: Optional[str]
    tipo_midia: str
    caminho_arquivo: Optional[str]
    link_externo: Optional[str]
    duracao_segundos: Optional[int]
    preferida: bool = False

    model_config = ConfigDict(from_attributes=True)


class MomentoRitualisticoExecucao(BaseModel):
    """Representa um momento da esteira ritualística com a música sorteada para tocar."""
    posicao: int = Field(..., description="Posição sequencial na esteira (1, 2, 3...)")
    evento_id: uuid.UUID
    evento_nome: str
    evento_descricao: Optional[str]
    obrigatorio: bool
    observacao_ritual: Optional[str]
    musica_sorteada: Optional[MusicaSorteadaInfo] = Field(None, description="Música sorteada aleatoriamente para este momento")
    total_musicas_disponiveis: int = Field(0, description="Quantidade total de músicas cadastradas para este evento")
    candidatas: List[MusicaSorteadaInfo] = Field(default_factory=list, description="Lista de todas as músicas disponíveis para troca manual")


class SessaoPlayerExecucao(BaseModel):
    """Payload completo entregue ao Player do Mestre ao selecionar uma Sessão."""
    sessao_id: uuid.UUID
    sessao_nome: str
    rito: str
    grau: int
    configuracoes_audio: Dict[str, Any] = Field(default_factory=dict)
    total_momentos: int
    esteira_ritualistica: List[MomentoRitualisticoExecucao]
