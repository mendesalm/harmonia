# EM CONFORMIDADE COM AS REGRAS DE OURO DO E-SIGMA
from enum import Enum

class RitoMaconico(str, Enum):
    REAA = "Rito Escocês Antigo e Aceito"
    YORK = "Rito de York"
    ADONHIRAMITA = "Rito Adonhiramita"
    BRASILEIRO = "Rito Brasileiro"
    MODERNO = "Rito Moderno"
    SCHRODER = "Rito Schröder"

class GrauSimbolico(str, Enum):
    APRENDIZ = "Aprendiz"
    COMPANHEIRO = "Companheiro"
    MESTRE = "Mestre"
    MESTRE_INSTALADO = "Mestre Instalado"

class CargoLoja(str, Enum):
    VENERAVEL_MESTRE = "Venerável Mestre"
    PRIMEIRO_VIGILANTE = "Primeiro Vigilante"
    SEGUNDO_VIGILANTE = "Segundo Vigilante"
    ORADOR = "Orador"
    SECRETARIO = "Secretário"
    TESOUREIRO = "Tesoureiro"
    CHANCELER = "Chanceler"
    PRIMEIRO_EXPERTO = "Primeiro Experto"
    SEGUNDO_EXPERTO = "Segundo Experto"
    PRIMEIRO_DIACONO = "Primeiro Diácono"
    SEGUNDO_DIACONO = "Segundo Diácono"
    MESTRE_HARMONIA = "Mestre de Harmonia"
    HOSPITALEIRO = "Hospitaleiro"
    ARQUITETO = "Arquiteto"
    PORTA_ESTANDARTE = "Porta Estandarte"
    PORTA_BANDEIRAS = "Porta Bandeiras"
    MESTRE_DE_BANQUETES = "Mestre de Banquetes"
    COBRIDOR_EXTERNO = "Cobridor Externo"
    COBRIDOR_INTERNO = "Cobridor Interno"
    BIBLIOTECARIO = "Bibliotecário"
    PORTA_ESPADAS = "Porta Espadas"
    GUARDA_DO_TEMPLO = "Guarda do Templo"

class CargoConselho(str, Enum):
    PRESIDENTE = "presidente"
    VICE_PRESIDENTE = "vice-presidente"
    SECRETARIO = "secretario"
    DELEGADO = "delegado"

class StatusObreiro(str, Enum):
    ATIVO = "Ativo"
    INATIVO = "Inativo"
    REGULAR = "Regular"
    IRREGULAR = "Irregular"
    FALECIDO = "Falecido"


class TipoMidia(str, Enum):
    """
    Tipos de mídia aceitos pelo Player do Harmonia (Dicionário de Dados).
    Valor único e canônico trafegado entre backend e frontend, evitando
    divergências como "STREAMING" vs "YOUTUBE".
    """
    ARQUIVO_LOCAL = "ARQUIVO_LOCAL"  # MP3/WAV hospedado no servidor (ou URL direta de áudio)
    YOUTUBE = "YOUTUBE"              # Link do YouTube reproduzido via IFrame API
    SPOTIFY = "SPOTIFY"              # Link do Spotify (embed)


# Volume padrão (25%) aplicado automaticamente em momentos classificados como Surdina / Interlúdio
VOLUME_SURDINA_PADRAO: float = 0.25

# Quantidade máxima de faixas selecionadas por momento litúrgico na abertura da sessão (priorizando preferidas)
MAX_FAIXAS_POR_MOMENTO: int = 8

# Termos canônicos que classificam um momento ritualístico como Surdina (fundo para fala/circulação)
TERMOS_MOMENTO_SURDINA: tuple[str, ...] = (
    "surdina",
    "interlúdio",
    "interludio",
    "fundo",
    "balaústre",
    "balaustre",
    "expediente",
    "bolsa de propostas",
    "tronco",
    "palavra",
    "leitura",
    "ordem do dia",
    "escrutínio",
    "escrutinio",
    "meditação",
    "meditacao",
    "reflexão",
    "reflexao",
)
