"""
Módulo de Conversão e Download de Áudio do YouTube para MP3 320kbps.
Utiliza yt-dlp e o binário embutido do ffmpeg (via imageio-ffmpeg).
"""
import os
import uuid
import re
import asyncio
from typing import Dict, Any, Optional
import imageio_ffmpeg
import yt_dlp
from backend.nucleo.formatadores import sanitizar_nome_arquivo, formatar_titulo_inteligente


def _executar_download_yt_dlp(
    url: str,
    pasta_destino: str,
    nome_arquivo_base: str,
    bitrate_kbps: int = 320
) -> Dict[str, Any]:
    """Executa o download síncrono do YouTube e conversão para MP3 com bitrate especificado."""
    ffmpeg_exe = imageio_ffmpeg.get_ffmpeg_exe()
    os.makedirs(pasta_destino, exist_ok=True)

    caminho_template = os.path.join(pasta_destino, f"{nome_arquivo_base}.%(ext)s")

    ydl_opts = {
        'format': 'bestaudio/best',
        'outtmpl': caminho_template,
        'ffmpeg_location': ffmpeg_exe,
        'postprocessors': [{
            'key': 'FFmpegExtractAudio',
            'preferredcodec': 'mp3',
            'preferredquality': str(bitrate_kbps),
        }],
        'postprocessor_args': ['-nostdin'],
        'quiet': True,
        'no_warnings': True,
        'nocheckcertificate': True,
        'ignoreerrors': False,
    }

    with yt_dlp.YoutubeDL(ydl_opts) as ydl:
        info = ydl.extract_info(url, download=True)
        titulo = info.get('title', 'Música do YouTube')
        autor = info.get('uploader') or info.get('artist') or info.get('channel') or 'YouTube'
        duracao = info.get('duration') or 0

    caminho_mp3 = os.path.join(pasta_destino, f"{nome_arquivo_base}.mp3")
    tamanho_bytes = os.path.getsize(caminho_mp3) if os.path.exists(caminho_mp3) else 0

    return {
        'caminho_absoluto': caminho_mp3,
        'nome_arquivo': f"{nome_arquivo_base}.mp3",
        'titulo_original': titulo,
        'autor_original': autor,
        'duracao_segundos': int(duracao),
        'tamanho_bytes': tamanho_bytes,
        'bitrate_kbps': bitrate_kbps
    }


async def converter_youtube_para_mp3_async(
    url: str,
    pasta_destino: str,
    titulo_sugerido: Optional[str] = None,
    bitrate_kbps: int = 320
) -> Dict[str, Any]:
    """Envolve a extração em um threadpool assíncrono para não bloquear o event loop do FastAPI."""
    prefixo = sanitizar_nome_arquivo(titulo_sugerido) if titulo_sugerido else f"yt_{uuid.uuid4().hex[:8]}"
    nome_arquivo_base = f"{uuid.uuid4().hex[:6]}_{prefixo}"

    loop = asyncio.get_running_loop()
    resultado = await loop.run_in_executor(
        None,
        _executar_download_yt_dlp,
        url,
        pasta_destino,
        nome_arquivo_base,
        bitrate_kbps
    )
    return resultado
