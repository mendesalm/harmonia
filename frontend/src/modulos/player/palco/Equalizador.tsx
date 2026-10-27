import React from 'react';

/** Alturas e atrasos fixos para um equalizador com aparência orgânica e espectro dinâmico. */
const BARRAS = [
  { altura: 65, atraso: 0, cor: '#6366f1' },
  { altura: 95, atraso: 0.18, cor: '#38bdf8' },
  { altura: 50, atraso: 0.36, cor: '#22c55e' },
  { altura: 85, atraso: 0.08, cor: '#ec4899' },
  { altura: 40, atraso: 0.5, cor: '#f59e0b' },
  { altura: 90, atraso: 0.27, cor: '#eab308' },
  { altura: 55, atraso: 0.42, cor: '#a855f7' },
];

interface EqualizadorProps {
  /** Anima as barras; quando falso elas ficam estáticas e baixas. */
  tocando: boolean;
  /** Altura total em px. */
  altura?: number;
  /** Cor customizada opcional (se omitida, utiliza o gradiente espectral do mockup). */
  cor?: string;
}

/** Equalizador animado exibido no card da faixa ativa. */
export const Equalizador: React.FC<EqualizadorProps> = ({ tocando, altura = 16, cor }) => (
  <div className="flex items-end justify-center gap-[2.5px]" style={{ height: altura }} aria-hidden="true">
    {BARRAS.map((b, i) => (
      <span
        key={i}
        className="harmonia-eq-barra block rounded-full"
        style={{
          width: 2.5,
          height: `${b.altura}%`,
          background: cor || b.cor,
          opacity: tocando ? 1 : 0.45,
          animationDelay: `${b.atraso}s`,
          animationPlayState: tocando ? 'running' : 'paused',
          transform: tocando ? undefined : 'scaleY(0.25)',
        }}
      />
    ))}
  </div>
);
