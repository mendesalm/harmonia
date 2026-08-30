"""
Módulo de Formatadores e Utilitários de Texto.
Implementa o Title Casing inteligente e padronizações estritas em PT-BR.
"""
import re
import unicodedata

PREPOSICOES_PORTUGUES = {
    "de", "da", "do", "das", "dos",
    "e", "em", "no", "na", "nos", "nas",
    "por", "para", "com", "a", "o", "as", "os"
}

SIGLAS_CONHECIDAS = {
    "GOB", "GLEG", "GL", "GLM", "GLESP", "GLMMG", "COMAB",
    "REAA", "YORK", "SCHROEDER", "MODERNO", "ADONHIRAMITA",
    "MP3", "WAV", "OGG", "URL", "ID", "UUID", "TI", "JPJ"
}


def formatar_titulo_inteligente(texto: str) -> str:
    """
    Formata uma string para Title Case inteligente em português:
    - Primeira letra de cada palavra em maiúscula.
    - Preposições permanecem em minúsculas (a menos que seja a primeira palavra).
    - Siglas conhecidas são mantidas em caixa alta (ex: GOB, REAA).
    
    Exemplo: "sessao MAGNA de iniciacao no rito REAA" -> "Sessão Magna de Iniciação no Rito REAA"
    """
    if not texto:
        return ""
    
    palavras = texto.strip().split()
    resultado = []
    
    for i, palavra in enumerate(palavras):
        palavra_limpa = re.sub(r'[^\w]', '', palavra).upper()
        
        # Se for uma sigla conhecida
        if palavra_limpa in SIGLAS_CONHECIDAS:
            # Preserva pontuações ao redor se houver
            palavra_formatada = palavra.upper()
        # Se for preposição e não for a primeira palavra
        elif palavra.lower() in PREPOSICOES_PORTUGUES and i > 0:
            palavra_formatada = palavra.lower()
        else:
            palavra_formatada = palavra.capitalize()
            
        resultado.append(palavra_formatada)
        
    return " ".join(resultado)


def gerar_slug_limpo(texto: str) -> str:
    """
    Gera um slug seguro para pastas e identificadores:
    Remove acentuação e caracteres especiais, mantendo letras, números, hífens e sublinhados.
    """
    if not texto:
        return "sem_identificador"
    
    # Normaliza unicode para remover acentos
    texto_sem_acento = unicodedata.normalize('NFKD', texto).encode('ASCII', 'ignore').decode('ASCII')
    # Substitui espaços por sublinhados e remove caracteres proibidos
    slug = re.sub(r'[^a-zA-Z0-9_-]', '_', texto_sem_acento)
    slug = re.sub(r'_+', '_', slug).strip('_')
    return slug


def sanitizar_nome_arquivo(nome: str) -> str:
    """Sanitiza o nome de um arquivo para gravação segura em disco."""
    if not nome:
        return "audio"
    # Remove acentos
    nome_sem_acento = unicodedata.normalize('NFKD', nome).encode('ASCII', 'ignore').decode('ASCII')
    # Remove caracteres inválidos no Windows / Linux
    limpo = re.sub(r'[\\/*?:"<>|]', "", nome_sem_acento)
    limpo = re.sub(r'[\s_]+', '_', limpo).strip('._')
    return limpo[:100] or "audio"
