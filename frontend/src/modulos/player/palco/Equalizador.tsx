import React from 'react';

/** Alturas e atrasos fixos para um equalizador com aparência orgânica (sem aleatoriedade em render). */
const BARRAS = [
  { altura: 70, atraso: 0 },
  { altura: 100, atraso: 0.18 },
  { altura: 55, atraso: 0.36 },
  { altura: 85, atraso: 0.08 },
  { altura: 45, atraso: 0.5 },
  { altura: 95, atraso: 0.27 },
  { altura: 60, atraso: 0.42 },
];

interface EqualizadorProps {
  /** Anima as barras; quando falso elas ficam estáticas e baixas. */
  tocando: boolean;
  /** Altura total em px. */
  altura?: number;
  /** Cor das barras (CSS). */
  cor?: string;
}

/** Equalizador animado exibido no card da faixa ativa. */
export const Equalizador: React.FC<EqualizadorProps> = ({ tocando, altura = 22, cor = '#00E5FF' }) => (
  <div className="flex items-end justify-center gap-[3px]" style={{ height: altura }} aria-hidden="true">
    {BARRAS.map((b, i) => (
      <span
        key={i}
        className="harmonia-eq-barra block rounded-full"
        style={{
          width: 3,
          height: `${b.altura}%`,
          background: cor,
          opacity: tocando ? 1 : 0.4,
          animationDelay: `${b.atraso}s`,
          animationPlayState: tocando ? 'running' : 'paused',
          transform: tocando ? undefined : 'scaleY(0.3)',
        }}
      />
    ))}
  </div>
);
