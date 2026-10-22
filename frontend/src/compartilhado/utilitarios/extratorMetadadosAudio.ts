/**
 * Utilitário para extração de metadados de arquivos de áudio no cliente.
 * Lê tags ID3v1/ID3v2 (MP3/WAV) diretamente do Blob/File sem dependências pesadas,
 * com fallback inteligente para análise semântica do nome do arquivo.
 */

export interface MetadadosAudioExtraidos {
  titulo: string;
  autor_artista: string;
}

/**
 * Remove números de faixa e formatações indesejadas do início de nomes de arquivos.
 * Ex: "01 - Mozart - Requiem" -> "Mozart - Requiem"
 */
export function extrairMetadadosDoNomeArquivo(nomeArquivo: string): MetadadosAudioExtraidos {
  // Remove a extensão do arquivo (.mp3, .wav, .ogg, etc.)
  const nomeLimpo = nomeArquivo.replace(/\.[^/.]+$/, '').trim();

  // Remove padrão de faixa inicial ex: "01 - ", "01. ", "1 - "
  const semFaixa = nomeLimpo.replace(/^\d+[\s.\-_]+/, '').trim();
  const textoBase = semFaixa || nomeLimpo;

  // Verifica separadores comuns como " - ", " _ ", " – ", " — "
  const partes = textoBase.split(/\s*[-_–—]\s*/);
  if (partes.length >= 2) {
    const artista = partes[0].trim();
    const titulo = partes.slice(1).join(' - ').trim();
    if (titulo && artista) {
      return { titulo, autor_artista: artista };
    }
  }

  return {
    titulo: textoBase,
    autor_artista: '',
  };
}

/**
 * Decodifica o texto de um frame ID3 baseado no byte de codificação:
 * 0: ISO-8859-1 (Latin1)
 * 1: UTF-16 com BOM
 * 2: UTF-16BE sem BOM
 * 3: UTF-8
 */
function decodificarTextoFrame(bytes: Uint8Array): string {
  if (bytes.length <= 1) return '';
  const codificacao = bytes[0];
  const dados = bytes.slice(1);

  try {
    let decoder: TextDecoder;
    if (codificacao === 1) {
      decoder = new TextDecoder('utf-16');
    } else if (codificacao === 2) {
      decoder = new TextDecoder('utf-16be');
    } else if (codificacao === 3) {
      decoder = new TextDecoder('utf-8');
    } else {
      decoder = new TextDecoder('iso-8859-1');
    }

    return decoder.decode(dados).replace(/\0/g, '').trim();
  } catch {
    // Fallback simples
    return new TextDecoder('iso-8859-1').decode(dados).replace(/\0/g, '').trim();
  }
}

/**
 * Faz a leitura de tags ID3v2 nos primeiros bytes do arquivo.
 */
function lerTagsID3v2(buffer: ArrayBuffer): { titulo?: string; artista?: string } {
  const bytes = new Uint8Array(buffer);
  if (bytes.length < 10) return {};

  // Verifica identificador "ID3"
  if (bytes[0] !== 0x49 || bytes[1] !== 0x44 || bytes[2] !== 0x33) {
    return {};
  }

  const versaoMaior = bytes[3];
  // Tamanho do cabeçalho ID3v2 (syncsafe 7-bit integer)
  const tamanhoTag =
    ((bytes[6] & 0x7f) << 21) |
    ((bytes[7] & 0x7f) << 14) |
    ((bytes[8] & 0x7f) << 7) |
    (bytes[9] & 0x7f);

  const limite = Math.min(bytes.length, 10 + tamanhoTag);
  let pos = 10;
  let titulo: string | undefined;
  let artista: string | undefined;

  while (pos + 10 <= limite) {
    // Lê o identificador do frame (4 caracteres)
    const frameId = String.fromCharCode(bytes[pos], bytes[pos + 1], bytes[pos + 2], bytes[pos + 3]);
    if (!/^[A-Z0-9]{4}$/.test(frameId)) {
      break;
    }

    let frameSize = 0;
    if (versaoMaior === 4) {
      // ID3v2.4 usa syncsafe integers
      frameSize =
        ((bytes[pos + 4] & 0x7f) << 21) |
        ((bytes[pos + 5] & 0x7f) << 14) |
        ((bytes[pos + 6] & 0x7f) << 7) |
        (bytes[pos + 7] & 0x7f);
    } else {
      // ID3v2.3 usa inteiros normais big-endian de 32 bits
      frameSize =
        (bytes[pos + 4] << 24) |
        (bytes[pos + 5] << 16) |
        (bytes[pos + 6] << 8) |
        bytes[pos + 7];
    }

    pos += 10;
    if (pos + frameSize > bytes.length || frameSize <= 0) {
      break;
    }

    const frameData = bytes.slice(pos, pos + frameSize);
    pos += frameSize;

    if (frameId === 'TIT2' && !titulo) {
      titulo = decodificarTextoFrame(frameData);
    } else if ((frameId === 'TPE1' || frameId === 'TPE2') && !artista) {
      artista = decodificarTextoFrame(frameData);
    }

    if (titulo && artista) break;
  }

  return { titulo, artista };
}

/**
 * Lê metadados inteligentes do arquivo de áudio selecionado.
 * Prioridade: Tags ID3v2 internas -> Fallback para nome do arquivo.
 */
export async function extrairMetadadosAudio(arquivo: File): Promise<MetadadosAudioExtraidos> {
  const fallback = extrairMetadadosDoNomeArquivo(arquivo.name);

  try {
    // Lê os primeiros 128 KB do arquivo (onde as tags ID3v2 ficam localizadas)
    const pedacoCabecalho = arquivo.slice(0, 128 * 1024);
    const buffer = await pedacoCabecalho.arrayBuffer();
    const tags = lerTagsID3v2(buffer);

    return {
      titulo: tags.titulo?.trim() || fallback.titulo,
      autor_artista: tags.artista?.trim() || fallback.autor_artista,
    };
  } catch (erro) {
    console.warn('Não foi possível ler tags internas de áudio, usando nome do arquivo:', erro);
    return fallback;
  }
}
