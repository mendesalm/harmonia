import React, { useRef, useEffect } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { MomentoExecucao } from '../../../compartilhado/tipos';
import { getMasonicIcon } from './MasonicIcons';

interface MasonicTimelineProps {
  momentos: MomentoExecucao[];
  indiceAtual: number;
  tocando: boolean;
  onMudarMomento: (idx: number) => void;
}

/**
 * Linha do tempo horizontal dos Momentos Ritualísticos.
 * Compactada em dispositivos móveis para preservar a área útil da lista de músicas.
 */
export const MasonicTimeline: React.FC<MasonicTimelineProps> = ({
  momentos,
  indiceAtual,
  tocando,
  onMudarMomento,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);

  const handlePrev = () => {
    if (indiceAtual > 0) onMudarMomento(indiceAtual - 1);
  };

  const handleNext = () => {
    if (indiceAtual < momentos.length - 1) onMudarMomento(indiceAtual + 1);
  };

  const nodeWidth = 88; // Distância horizontal entre cada nó
  const viewWidth = 264; // Largura visível compacta (cabe em telas de 320px com botões laterais)
  const paddingX = viewWidth / 2;
  const totalWidth = (momentos.length > 1 ? momentos.length - 1 : 0) * nodeWidth + paddingX * 2;
  const activeWidth = paddingX + indiceAtual * nodeWidth;

  useEffect(() => {
    if (containerRef.current) {
      const targetScroll = paddingX + indiceAtual * nodeWidth - viewWidth / 2;
      containerRef.current.scrollTo({ left: targetScroll, behavior: 'smooth' });
    }
  }, [indiceAtual, paddingX, nodeWidth, viewWidth]);

  const momentoAtivo = momentos[indiceAtual];
  const proximoMomento = indiceAtual < momentos.length - 1 ? momentos[indiceAtual + 1] : null;

  return (
    <div className="relative w-full pt-2 pb-2.5 sm:pt-3 sm:pb-4 border-b border-white/10 bg-sigma-bg z-10 shrink-0">
      {/* Título visível apenas em telas maiores para economizar altura no celular */}
      <div className="hidden sm:block text-center mb-2 relative">
        <h1 className="font-cinzel text-lg md:text-2xl tracking-widest text-slate-100 font-normal drop-shadow">
          Player Sequencial Ritualístico
        </h1>
      </div>

      <div className="relative w-full max-w-md mx-auto flex items-center justify-center px-10">
        {/* Seta Esquerda (Alvo de toque 44x44px) */}
        <button
          onClick={handlePrev}
          aria-label="Momento Anterior"
          className="w-10 h-10 flex items-center justify-center text-macaonico-dourado hover:text-yellow-300 transition-colors disabled:opacity-20 absolute left-1 z-20 bg-sigma-surface/90 border border-macaonico-dourado/30 rounded-full active:scale-95"
          disabled={indiceAtual === 0}
        >
          <ChevronLeft size={22} strokeWidth={1.75} />
        </button>

        {/* Área Rolável Horizontal com Máscara Suave */}
        <div
          className="overflow-hidden scrollbar-hide relative"
          ref={containerRef}
          style={{
            width: `${viewWidth}px`,
            maskImage: 'linear-gradient(to right, transparent 0%, black 18%, black 82%, transparent 100%)',
            WebkitMaskImage:
              'linear-gradient(to right, transparent 0%, black 18%, black 82%, transparent 100%)',
          }}
        >
          <div className="relative" style={{ width: `${totalWidth}px`, height: '84px' }}>
            {/* Trilho SVG de Progresso */}
            <svg
              className="absolute top-[54px] left-0 pointer-events-none"
              width={totalWidth}
              height="26"
              viewBox={`0 0 ${totalWidth} 26`}
            >
              <defs>
                <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
                  <feGaussianBlur stdDeviation="3" result="blur" />
                  <feComposite in="SourceGraphic" in2="blur" operator="over" />
                </filter>
                <linearGradient id="gold-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#D4AF37" />
                  <stop offset="50%" stopColor="#FBF5B7" />
                  <stop offset="100%" stopColor="#D4AF37" />
                </linearGradient>
              </defs>

              <path
                d={`M ${paddingX} 10 L ${totalWidth - paddingX} 10`}
                stroke="#3A3A3A"
                strokeWidth="1.5"
                fill="none"
              />
              <path
                d={`M ${paddingX} 16 L ${totalWidth - paddingX} 16`}
                stroke="#3A3A3A"
                strokeWidth="1.5"
                fill="none"
              />

              <rect
                x={paddingX}
                y="11"
                width={Math.max(0, activeWidth - paddingX)}
                height="4"
                rx="2"
                fill="url(#gold-gradient)"
                filter="url(#glow)"
                className="transition-all duration-500 ease-in-out"
              />

              {momentos.map((_, idx) => {
                const cx = paddingX + idx * nodeWidth;
                const isPassado = idx <= indiceAtual;
                const isAtivo = idx === indiceAtual;

                return (
                  <g key={`svg-node-${idx}`}>
                    <circle
                      cx={cx}
                      cy="13"
                      r={isAtivo ? '9' : '6'}
                      stroke={isAtivo ? '#FBF5B7' : isPassado ? '#D4AF37' : '#3A3A3A'}
                      strokeWidth={isAtivo ? '2' : '1.5'}
                      fill="#080808"
                      filter={isAtivo ? 'url(#glow)' : 'none'}
                      className="transition-all duration-300"
                    />
                    <circle
                      cx={cx}
                      cy="13"
                      r={isAtivo ? '3.5' : '2.5'}
                      fill={isAtivo ? '#FBF5B7' : isPassado ? '#D4AF37' : '#3A3A3A'}
                    />
                  </g>
                );
              })}
            </svg>

            {/* Ícones Interativos dos Momentos */}
            {momentos.map((momento, idx) => {
              const x = paddingX + idx * nodeWidth;
              const isAtivo = idx === indiceAtual;

              return (
                <div
                  key={`html-node-${momento.evento_id}-${idx}`}
                  className="timeline-node absolute flex flex-col items-center justify-end cursor-pointer group"
                  style={{ left: `${x - 36}px`, width: '72px', top: '4px' }}
                  onClick={() => onMudarMomento(idx)}
                >
                  <div
                    className={`
                      flex items-center justify-center transition-all duration-300 relative rounded-xl
                      ${
                        isAtivo
                          ? 'w-11 h-11 border-2 border-macaonico-dourado bg-macaonico-dourado/20 shadow-[0_0_20px_rgba(212,175,55,0.65)] scale-105 z-20'
                          : 'w-9 h-9 border border-macaonico-inactive/60 bg-sigma-surface opacity-60 hover:opacity-100 z-10'
                      }
                    `}
                  >
                    <div
                      className={`relative z-10 ${
                        isAtivo ? 'text-macaonico-dourado' : 'text-macaonico-inactive'
                      }`}
                    >
                      {getMasonicIcon(momento.evento_nome, {
                        size: isAtivo ? 22 : 17,
                        strokeWidth: isAtivo ? 1.6 : 1.2,
                      })}
                    </div>

                    {isAtivo && tocando && (
                      <div className="absolute inset-0 flex items-center justify-center bg-sigma-surface/85 rounded-xl z-30">
                        <div className="flex space-x-[2px] items-end h-[14px]">
                          <div className="w-[2.5px] bg-macaonico-dourado rounded-full h-[80%] animate-pulse"></div>
                          <div className="w-[2.5px] bg-macaonico-dourado rounded-full h-[100%] animate-bounce"></div>
                          <div className="w-[2.5px] bg-macaonico-dourado rounded-full h-[65%] animate-pulse"></div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Seta Direita (Alvo de toque 44x44px) */}
        <button
          onClick={handleNext}
          aria-label="Próximo Momento"
          className="w-10 h-10 flex items-center justify-center text-macaonico-dourado hover:text-yellow-300 transition-colors disabled:opacity-20 absolute right-1 z-20 bg-sigma-surface/90 border border-macaonico-dourado/30 rounded-full active:scale-95"
          disabled={indiceAtual === momentos.length - 1}
        >
          <ChevronRight size={22} strokeWidth={1.75} />
        </button>
      </div>

      {/* Rótulo do Momento Atual e Próximo (sempre visível e legível sem cortar no mobile) */}
      {momentoAtivo && (
        <div className="px-4 pt-1 text-center">
          <div className="font-cinzel text-xs sm:text-sm text-macaonico-dourado font-bold tracking-wider truncate">
            {momentoAtivo.evento_nome}
          </div>
          {proximoMomento && (
            <div className="text-[10px] sm:text-xs text-slate-400 truncate mt-0.5">
              Próximo: <span className="text-slate-300">{proximoMomento.evento_nome}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
