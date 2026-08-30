/**
 * Utilitários para extração de IDs e URLs de Streaming (YouTube e Spotify).
 */

export const extrairIdYoutube = (url?: string | null): string | null => {
  if (!url) return null;
  const regExp = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/;
  const match = url.match(regExp);
  return match && match[1] ? match[1] : null;
};

export const extrairEmbedSpotify = (url?: string | null): string | null => {
  if (!url) return null;

  // Trata formato URI (spotify:track:XXXXX)
  if (url.startsWith('spotify:track:')) {
    const id = url.split(':')[2];
    return `https://open.spotify.com/embed/track/${id}?utm_source=generator&theme=0`;
  }
  if (url.startsWith('spotify:playlist:')) {
    const id = url.split(':')[2];
    return `https://open.spotify.com/embed/playlist/${id}?utm_source=generator&theme=0`;
  }

  // Trata URLs do Spotify Web (incluindo intl-pt, intl-es, etc)
  const regex = /spotify\.com\/(?:intl-[a-z]{2}\/)?(track|playlist|album|episode)\/([a-zA-Z0-9]+)/;
  const match = url.match(regex);
  if (match) {
    const tipo = match[1];
    const id = match[2];
    return `https://open.spotify.com/embed/${tipo}/${id}?utm_source=generator&theme=0`;
  }

  if (url.includes('spotify.com/embed/')) {
    return url;
  }

  return null;
};
