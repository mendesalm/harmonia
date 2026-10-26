# EM CONFORMIDADE COM AS REGRAS DE OURO DO E-SIGMA
"""
Classificação canônica de mídia das músicas do acervo.

Único ponto do backend que decide `tipo_midia`, `caminho_arquivo` e `link_externo`
a partir de `arquivo_url` + `metadados`. É usado tanto pelo Player (`/player/sessao`)
quanto pela listagem do acervo (`/musicas`), garantindo que o frontend receba sempre
o mesmo formato (enum `TipoMidia`).
"""
from typing import Any, Dict, Optional
from urllib.parse import urlparse

from backend.core.constants import TipoMidia

_DOMINIOS_YOUTUBE = ("youtube.com", "youtu.be", "youtube-nocookie.com")
_DOMINIOS_SPOTIFY = ("spotify.com", "spotify.link")


def _dominio_corresponde(url: str, dominios: tuple[str, ...]) -> bool:
    """Retorna True se o host da URL pertence (ou é subdomínio) a algum dos domínios informados."""
    host = (urlparse(url).hostname or "").lower()
    return any(host == d or host.endswith("." + d) for d in dominios)


def classificar_midia(
    arquivo_url: Optional[str],
    metadados: Optional[Dict[str, Any]] = None,
) -> Dict[str, Optional[str]]:
    """
    Classifica a mídia de uma música.

    Regras (em ordem):
      1. URL http(s) de YouTube  -> YOUTUBE (link_externo = URL).
      2. URL http(s) de Spotify  -> SPOTIFY (link_externo = URL).
      3. `metadados.link_externo` de YouTube/Spotify com `arquivo_url` vazio -> idem 1/2.
      4. Qualquer outra URL http(s) -> ARQUIVO_LOCAL tocável direto no <audio> (caminho = URL).
      5. Caminho relativo/absoluto do servidor -> ARQUIVO_LOCAL.

    O valor legado "STREAMING" salvo em metadados nunca é propagado: a decisão é sempre
    refeita a partir da URL real, que é a fonte da verdade.

    Retorna dict com as chaves: `tipo_midia`, `caminho_arquivo`, `link_externo`.
    """
    meta = metadados or {}
    url = (arquivo_url or "").strip()
    link_meta = (meta.get("link_externo") or "").strip()
    candidata = url if url.startswith(("http://", "https://")) else link_meta

    if candidata.startswith(("http://", "https://")):
        if _dominio_corresponde(candidata, _DOMINIOS_YOUTUBE):
            return {
                "tipo_midia": TipoMidia.YOUTUBE.value,
                "caminho_arquivo": None,
                "link_externo": candidata,
            }
        if _dominio_corresponde(candidata, _DOMINIOS_SPOTIFY):
            return {
                "tipo_midia": TipoMidia.SPOTIFY.value,
                "caminho_arquivo": None,
                "link_externo": candidata,
            }
        # Link direto para um arquivo de áudio hospedado em outro lugar
        return {
            "tipo_midia": TipoMidia.ARQUIVO_LOCAL.value,
            "caminho_arquivo": candidata,
            "link_externo": None,
        }

    return {
        "tipo_midia": TipoMidia.ARQUIVO_LOCAL.value,
        "caminho_arquivo": url or None,
        "link_externo": None,
    }
