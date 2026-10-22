"""
Serviço utilitário para extração automática de metadados em arquivos de áudio.
Lê tags ID3v1/ID3v2 (TIT2, TPE1, TPE2), Vorbis e MP4 via Mutagen,
com fallback semântico inteligente a partir do nome do arquivo.
"""
import re
from typing import Tuple, Optional
from loguru import logger
import mutagen


def extrair_metadados_nome_arquivo(nome_arquivo: str) -> Tuple[str, Optional[str]]:
    """
    Analisa o nome de arquivo e extrai título e artista com base em convenções comuns.
    Exemplos:
      - "01 - Mozart - Marcha dos Sacerdotes.mp3" -> ("Marcha dos Sacerdotes", "Mozart")
      - "Sibelius - Finlândia.mp3" -> ("Finlândia", "Sibelius")
      - "Hino Nacional.wav" -> ("Hino Nacional", None)
    """
    # Remove a extensão do arquivo
    base = nome_arquivo.rsplit(".", 1)[0].strip()

    # Remove números de faixa iniciais (ex: "01 - ", "01. ", "1 - ")
    base_sem_faixa = re.sub(r"^\d+[\s.\-_]+", "", base).strip()
    if base_sem_faixa:
        base = base_sem_faixa

    # Divide por separadores comuns
    partes = re.split(r"\s*[-_–—]\s*", base)
    if len(partes) >= 2:
        artista = partes[0].strip()
        titulo = " - ".join(partes[1:]).strip()
        if titulo and artista:
            return titulo, artista

    return base, None


def extrair_metadados_arquivo_audio(
    caminho_arquivo: str,
    nome_arquivo_original: Optional[str] = None
) -> Tuple[Optional[str], Optional[str], Optional[int]]:
    """
    Extrai título, artista(s) e duração de um arquivo de áudio.
    Prioriza metadados embutidos (ID3/Vorbis/MP4) e usa o nome do arquivo como fallback.
    Retorna (titulo, autor_artista, duracao_segundos).
    """
    titulo: Optional[str] = None
    artista: Optional[str] = None
    duracao_segundos: Optional[int] = None

    try:
        # Tenta modo fácil (EasyID3 / Vorbis / MP4 / FLAC)
        audio_easy = mutagen.File(caminho_arquivo, easy=True)
        if audio_easy:
            if hasattr(audio_easy, "info") and hasattr(audio_easy.info, "length") and audio_easy.info.length:
                duracao_segundos = round(audio_easy.info.length)

            if "title" in audio_easy and audio_easy["title"]:
                titulo = str(audio_easy["title"][0]).strip()
            if "artist" in audio_easy and audio_easy["artist"]:
                artista = str(audio_easy["artist"][0]).strip()
            elif "performer" in audio_easy and audio_easy["performer"]:
                artista = str(audio_easy["performer"][0]).strip()
            elif "composer" in audio_easy and audio_easy["composer"]:
                artista = str(audio_easy["composer"][0]).strip()

        # Se não obteve título ou artista no modo easy, inspeciona tags brutas
        if not titulo or not artista:
            audio_raw = mutagen.File(caminho_arquivo)
            if audio_raw:
                if not duracao_segundos and hasattr(audio_raw, "info") and hasattr(audio_raw.info, "length") and audio_raw.info.length:
                    duracao_segundos = round(audio_raw.info.length)

                if hasattr(audio_raw, "tags") and audio_raw.tags:
                    tags = audio_raw.tags
                    if not titulo:
                        for chave in ["TIT2", "title", "\xa9nam", "TITLE"]:
                            if chave in tags:
                                val = tags[chave]
                                titulo = str(val[0] if isinstance(val, (list, tuple)) else val).strip()
                                break

                    if not artista:
                        for chave in ["TPE1", "TPE2", "artist", "\xa9ART", "ARTIST", "TCOM"]:
                            if chave in tags:
                                val = tags[chave]
                                artista = str(val[0] if isinstance(val, (list, tuple)) else val).strip()
                                break
    except Exception as erro:
        logger.warning(f"Erro ao extrair tags de áudio de {caminho_arquivo}: {erro}")

    # Fallback se o nome original estiver disponível e faltar título ou artista
    if nome_arquivo_original and (not titulo or not artista):
        fallback_titulo, fallback_artista = extrair_metadados_nome_arquivo(nome_arquivo_original)
        if not titulo:
            titulo = fallback_titulo
        if not artista and fallback_artista:
            artista = fallback_artista

    return titulo, artista, duracao_segundos
