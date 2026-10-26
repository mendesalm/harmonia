import React, { useId } from 'react';

interface DiscoFaixaProps {
  /** Faixa marcada como preferida: borda e centro dourados. */
  preferida: boolean;
  /** Gira continuamente enquanto a faixa toca. */
  girando: boolean;
  /** Lado do disco em px de projeto. */
  tamanho?: number;
}

/**
 * Disco de vinil (imagem do card da faixa).
 * - Faixa comum: corpo grafite com sulcos sutis e centro branco.
 * - Faixa PREFERIDA: borda externa e centro dourados, com brilho pulsante.
 * O SVG é vetorial, então permanece nítido em qualquer escala do carrossel.
 */
export const DiscoFaixa: React.FC<DiscoFaixaProps> = ({ preferida, girando, tamanho = 76 }) => {
  const idBase = useId().replace(/:/g, '');
  const corBorda = preferida ? '#DDB96B' : '#55565c';
  const corCentro = preferida ? '#E8C873' : '#ffffff';

  return (
    <div
      className={preferida ? 'harmonia-disco-preferido' : undefined}
      style={{ width: tamanho, height: tamanho }}
      aria-hidden="true"
    >
      <svg
        viewBox="0 0 100 100"
        width={tamanho}
        height={tamanho}
        className={girando ? 'harmonia-disco-girando' : undefined}
        style={{ display: 'block' }}
      >
        <defs>
          <radialGradient id={`corpo-${idBase}`} cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#3b3b40" />
            <stop offset="100%" stopColor="#1b1b1f" />
          </radialGradient>
          <linearGradient id={`brilho-${idBase}`} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0.22" />
            <stop offset="45%" stopColor="#ffffff" stopOpacity="0" />
            <stop offset="55%" stopColor="#ffffff" stopOpacity="0" />
            <stop offset="100%" stopColor="#ffffff" stopOpacity="0.14" />
          </linearGradient>
        </defs>

        {/* Corpo e borda */}
        <circle cx="50" cy="50" r="48" fill={`url(#corpo-${idBase})`} stroke={corBorda} strokeWidth={preferida ? 3.4 : 2} />
        {/* Sulcos do vinil */}
        {[40, 34, 28].map((r) => (
          <circle key={r} cx="50" cy="50" r={r} fill="none" stroke="#ffffff" strokeOpacity="0.07" strokeWidth="0.8" />
        ))}
        {/* Reflexo diagonal (gira junto, dando sensação de movimento) */}
        <circle cx="50" cy="50" r="47" fill={`url(#brilho-${idBase})`} />
        {/* Rótulo central */}
        <circle cx="50" cy="50" r="17" fill={corCentro} />
        {preferida && <circle cx="50" cy="50" r="17" fill="none" stroke="#a5822f" strokeWidth="1.2" />}
        {/* Furo */}
        <circle cx="50" cy="50" r="3.6" fill="#0b0b0e" />
      </svg>
    </div>
  );
};
