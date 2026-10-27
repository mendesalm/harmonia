"""
Constantes e Enumerações Padronizadas do Ecossistema Harmonia.
Define os estilos musicais litúrgicos e as subclassificações funcionais.
"""
from enum import Enum
from typing import List


class EstiloMusica(str, Enum):
    """
    Estilos musicais litúrgicos disponíveis no Harmonia.
    - UNIVERSAL: Estilo base que compõe qualquer sessão, servindo de fallback seguro.
    - CLASSICA: Peças eruditas, orquestrais, barrocas ou renascentistas.
    - VIOLAO: Peças acústicas, cordas dedilhadas e violão solo ou duo.
    - SOUNDTRACKS: Trilhas sonoras cinematográficas e temas orquestrados instrumentais contemporâneos.
    - POPULAR: Arranjos instrumentais de canções populares, MPB ou folclóricas.
    """
    UNIVERSAL = "UNIVERSAL"
    CLASSICA = "CLASSICA"
    VIOLAO = "VIOLAO"
    SOUNDTRACKS = "SOUNDTRACKS"
    POPULAR = "POPULAR"


class SubclassificacaoMusica(str, Enum):
    """
    Subclassificação funcional da música para momentos com exigência de dinâmica controlada.
    - GERAL: Peça com dinâmica normal, temas melódicos marcantes e andamento regular.
    - AMBIENTE: Peça suave, contínua, com textura serena e sem sobressaltos, ideal para momentos em surdina.
    """
    GERAL = "GERAL"
    AMBIENTE = "AMBIENTE"


ESTILOS_DISPONIVEIS: List[str] = [e.value for e in EstiloMusica]
SUBCLASSIFICACOES_DISPONIVEIS: List[str] = [s.value for s in SubclassificacaoMusica]


def normalizar_estilo(estilo: str) -> str:
    """Normaliza o texto do estilo para uppercase seguro ou retorna UNIVERSAL se inválido."""
    if not estilo:
        return EstiloMusica.UNIVERSAL.value
    valor = estilo.strip().upper()
    return valor if valor in ESTILOS_DISPONIVEIS else EstiloMusica.UNIVERSAL.value


def normalizar_subclassificacao(sub: str) -> str:
    """Normaliza o texto da subclassificação para GERAL ou AMBIENTE."""
    if not sub:
        return SubclassificacaoMusica.GERAL.value
    valor = sub.strip().upper()
    return valor if valor in SUBCLASSIFICACOES_DISPONIVEIS else SubclassificacaoMusica.GERAL.value
