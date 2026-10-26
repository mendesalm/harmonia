import React, { useId } from 'react';

interface DiscoFaixaProps {
  /** Faixa marcada como preferida: borda e centro dourados. */
  preferida: boolean;
  /** Gira continuamente enquanto a faixa toca e posiciona o braço sobre o vinil. */
  girando: boolean;
  /** Lado do disco em px de projeto. */
  tamanho?: number;
  /** Exibe o braço de vitrola (apenas no card ativo). */
  mostrarBraco?: boolean;
  /** Progresso da música entre 0 e 1 (0 = borda externa do vinil, 1 = sulco interno próximo ao rótulo). */
  progresso?: number;
}

/**
 * Disco de vinil com Braço de Vitrola (Tonearm) proporcional ao progresso da faixa.
 * - Faixa comum: corpo grafite com sulcos sutis e centro branco.
 * - Faixa PREFERIDA: borda externa e centro dourados, com brilho pulsante.
 * - Braço de vitrola: pivô no canto superior direito; quando parado fica em repouso (0°),
 *   e quando tocando pousa na borda externa (~16°) e avança suavemente até o sulco interno (~38°)
 *   em proporção direta ao tempo decorrido da música.
 */
export const DiscoFaixa: React.FC<DiscoFaixaProps> = ({
  preferida,
  girando,
  tamanho = 76,
  mostrarBraco = false,
  progresso = 0,
}) => {
  const idBase = useId().replace(/:/g, '');
  const corBorda = preferida ? '#DDB96B' : '#55565c';
  const corCentro = preferida ? '#E8C873' : '#ffffff';

  const progSeguro = Math.max(0, Math.min(1, isNaN(progresso) ? 0 : progresso));
  // Ângulo do braço em graus (pivô em 92, 12):
  // - Em repouso (pausado): 2° (fora do disco, à direita)
  // - Tocando no início (0%): 18° (agulha na borda externa do vinil)
  // - Tocando no fim (100%): 39° (agulha próxima ao selo central)
  const anguloBraco = girando ? 18 + progSeguro * 21 : 2;

  return (
    <div
      className={`relative ${preferida ? 'harmonia-disco-preferido' : ''}`}
      style={{ width: tamanho, height: tamanho }}
      aria-hidden="true"
    >
      {/* Disco de vinil que gira */}
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
        <circle
          cx="50"
          cy="50"
          r="46"
          fill={`url(#corpo-${idBase})`}
          stroke={corBorda}
          strokeWidth={preferida ? 3.4 : 2}
        />
        {/* Sulcos do vinil */}
        {[39, 33, 27, 22].map((r) => (
          <circle
            key={r}
            cx="50"
            cy="50"
            r={r}
            fill="none"
            stroke="#ffffff"
            strokeOpacity="0.08"
            strokeWidth="0.7"
          />
        ))}
        {/* Reflexo diagonal */}
        <circle cx="50" cy="50" r="45" fill={`url(#brilho-${idBase})`} />
        {/* Rótulo central */}
        <circle cx="50" cy="50" r="15.5" fill={corCentro} />
        {preferida && (
          <circle cx="50" cy="50" r="15.5" fill="none" stroke="#a5822f" strokeWidth="1.2" />
        )}
        {/* Furo central */}
        <circle cx="50" cy="50" r="3.4" fill="#0b0b0e" />
      </svg>

      {/* Braço da vitrola (Tonearm) sobreposto — não gira com o disco */}
      {mostrarBraco && (
        <svg
          viewBox="0 0 116 100"
          width={tamanho * 1.16}
          height={tamanho}
          className="pointer-events-none absolute top-0 left-0 overflow-visible"
          style={{ filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.85))' }}
        >
          {/* Base / Torre do pivô no canto superior direito */}
          <circle
            cx="96"
            cy="14"
            r="7.5"
            fill="#0d1729"
            stroke="#DDB96B"
            strokeWidth="1.4"
          />
          <circle cx="96" cy="14" r="3.5" fill="#DDB96B" />

          {/* Conjunto móvel do braço rotacionando em torno do pivô (96, 14) */}
          <g
            style={{
              transform: `rotate(${anguloBraco}deg)`,
              transformOrigin: '96px 14px',
              transition: girando
                ? 'transform 0.35s linear'
                : 'transform 0.55s cubic-bezier(0.22, 0.9, 0.25, 1)',
            }}
          >
            {/* Contrapeso traseiro */}
            <rect
              x="93.2"
              y="3"
              width="5.6"
              height="6.5"
              rx="1.5"
              fill="#94a3b8"
              stroke="#DDB96B"
              strokeWidth="0.8"
            />
            {/* Haste metálica em S suave até a cápsula */}
            <path
              d="M 96 14 L 95 54 Q 94.5 64 87 72"
              fill="none"
              stroke="#e2e8f0"
              strokeWidth="2.1"
              strokeLinecap="round"
            />
            {/* Cápsula / Headshell dourada */}
            <g transform="translate(87, 72) rotate(32)">
              <rect
                x="-3.2"
                y="-1.5"
                width="6.4"
                height="9.5"
                rx="1.4"
                fill="#DDB96B"
                stroke="#070F1E"
                strokeWidth="0.9"
              />
              {/* Agulha luminosa (diamante) */}
              <circle
                cx="0"
                cy="8.2"
                r="1.7"
                fill={girando ? '#00E5FF' : '#94a3b8'}
              />
            </g>
          </g>
        </svg>
      )}
    </div>
  );
};
