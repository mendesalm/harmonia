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
 * Calcula o ângulo exato (em graus, sentido horário a partir da vertical) do braço da vitrola
 * pela Lei dos Cossenos para que a agulha:
 * - Em repouso (`girando = false`): fique em `0°` sobre o suporte lateral (`x = 108`), TOTALMENTE FORA do disco (`x <= 96`).
 * - Ao dar Play (`progresso = 0`): pouse exatamente na borda externa do vinil (`raio = 43.5`, `~18.6°`).
 * - Durante a música (`0 -> 1`): percorra radialmente a superfície do disco até a borda do selo central (`raio = 18.0`, `~42.4°`).
 */
function calcularAnguloBraco(girando: boolean, progresso: number): number {
  if (!girando) return 0; // Fora do disco, estacionado no descanso lateral (x = 108)

  const p = Math.max(0, Math.min(1, isNaN(progresso) ? 0 : progresso));
  // Raio alvo no disco (centro em 50,50): vai da borda externa (43.5) até junto ao selo central (18.0)
  const raioAlvo = 43.5 - p * (43.5 - 18.0);

  // Distância entre o pivô (108, 12) e o centro do disco (50, 50): sqrt(58^2 + 38^2) = 69.3397
  const D = Math.hypot(108 - 50, 50 - 12);
  // Comprimento efetivo do pivô até a agulha
  const L = 62;
  // Ângulo do vetor Pivô -> Centro do Disco a partir do eixo vertical (+Y): atan2(58, 38) ≈ 56.768°
  const alfaCentro = (Math.atan2(108 - 50, 50 - 12) * 180) / Math.PI;

  const cosPhi = Math.max(-1, Math.min(1, (D * D + L * L - raioAlvo * raioAlvo) / (2 * D * L)));
  const phi = (Math.acos(cosPhi) * 180) / Math.PI;

  return alfaCentro - phi;
}

/**
 * Disco de vinil com Braço de Vitrola (Tonearm) realista proporcional ao progresso da faixa.
 */
export const DiscoFaixa: React.FC<DiscoFaixaProps> = ({
  preferida,
  girando,
  tamanho = 96,
  mostrarBraco = false,
  progresso = 0,
}) => {
  const idBase = useId().replace(/:/g, '');
  const corBorda = preferida ? '#DDB96B' : '#55565c';
  const corCentro = preferida ? '#E8C873' : '#ffffff';

  const anguloBraco = calcularAnguloBraco(girando, progresso);

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
        {[41, 36, 31, 26, 21].map((r) => (
          <circle
            key={r}
            cx="50"
            cy="50"
            r={r}
            fill="none"
            stroke="#ffffff"
            strokeOpacity="0.09"
            strokeWidth="0.65"
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

      {/* Braço da vitrola (Tonearm) sobreposto — inicia FORA do disco (x=108) e percorre da borda ao centro */}
      {mostrarBraco && (
        <svg
          viewBox="0 0 124 100"
          width={tamanho * 1.24}
          height={tamanho}
          className="pointer-events-none absolute top-0 left-0 overflow-visible"
          style={{ filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.85))' }}
        >
          {/* Suporte de descanso do braço (fora do disco, à direita) */}
          <rect
            x="105"
            y="48"
            width="6"
            height="4"
            rx="1.5"
            fill="#1e293b"
            stroke="#DDB96B"
            strokeWidth="0.7"
          />

          {/* Base / Torre do pivô fora do disco no canto superior direito (108, 12) */}
          <circle
            cx="108"
            cy="12"
            r="7.2"
            fill="#0d1729"
            stroke="#DDB96B"
            strokeWidth="1.4"
          />
          <circle cx="108" cy="12" r="3.2" fill="#DDB96B" />

          {/* Origem exata no pivô (108, 12) para rotação consistente em mobile e desktop */}
          <g transform="translate(108, 12)">
            <g
              style={{
                transform: `rotate(${anguloBraco}deg)`,
                transformOrigin: '0px 0px',
                transition: girando
                  ? 'transform 0.4s linear'
                  : 'transform 0.55s cubic-bezier(0.22, 0.9, 0.25, 1)',
              }}
            >
              {/* Contrapeso traseiro */}
              <rect
                x="-2.8"
                y="-9.5"
                width="5.6"
                height="6.2"
                rx="1.5"
                fill="#94a3b8"
                stroke="#DDB96B"
                strokeWidth="0.8"
              />
              {/* Haste metálica do braço (alinhada ao eixo Y local quando em repouso fora do disco) */}
              <path
                d="M 0 0 L 0 46 Q 0 53 -1.5 56"
                fill="none"
                stroke="#e2e8f0"
                strokeWidth="2.1"
                strokeLinecap="round"
              />
              {/* Cápsula / Headshell dourada */}
              <g transform="translate(-1.5, 56) rotate(14)">
                <rect
                  x="-3"
                  y="-1"
                  width="6"
                  height="8.5"
                  rx="1.4"
                  fill="#DDB96B"
                  stroke="#070F1E"
                  strokeWidth="0.9"
                />
                {/* Agulha luminosa na ponta (exatamente a L=62 do pivô) */}
                <circle
                  cx="0"
                  cy="6.5"
                  r={girando ? 2.1 : 1.5}
                  fill={girando ? (preferida ? '#FDE68A' : '#00E5FF') : '#94a3b8'}
                />
              </g>
            </g>
          </g>
        </svg>
      )}
    </div>
  );
};
