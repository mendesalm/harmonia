import React, { useRef, useEffect } from 'react';
import { Play, Pause, Plus } from 'lucide-react';
import { Musica } from '../../../compartilhado/tipos';

interface MasonicTrackListProps {
  musicas: Musica[];
  indiceAtivo: number;
  tocando: boolean;
  onSelecionarMusica: (idx: number) => void;
  onAbrirUpload: () => void;
  progressoPercentual: number;
}

/**
 * Lista vertical rolável de faixas do Momento Ritualístico ativo.
 * Otimizada para telas móveis sem espaçadores elásticos que comprimiam os cards.
 */
export const MasonicTrackList: React.FC<MasonicTrackListProps> = ({
  musicas,
  indiceAtivo,
  tocando,
  onSelecionarMusica,
  onAbrirUpload,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (containerRef.current && musicas.length > 0) {
      const items = containerRef.current.querySelectorAll('[data-track-item]');
      const activeEl = items[indiceAtivo] as HTMLElement | undefined;
      if (activeEl) {
        activeEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    }
  }, [indiceAtivo, musicas.length]);

  return (
    <div className="flex-1 w-full min-h-0 relative flex flex-col items-center overflow-hidden bg-[#080d18]">
      {/* Textura de fundo sutil */}
      <div
        className="absolute inset-0 opacity-30 mix-blend-overlay pointer-events-none"
        style={{ backgroundImage: 'url("https://www.transparenttextures.com/patterns/black-scales.png")' }}
      ></div>

      <div
        className="flex-1 w-full max-w-2xl relative overflow-y-auto px-3 sm:px-5 py-3 sm:py-5 space-y-2.5"
        ref={containerRef}
      >
        {musicas.map((musica, idx) => {
          const isAtivo = idx === indiceAtivo;
          const isPreferencial = !!(musica as any).preferida;
          const duracaoSeg = musica.duracao_segundos || 0;
          const duracaoFormatada =
            duracaoSeg > 0
              ? `${Math.floor(duracaoSeg / 60)}:${(duracaoSeg % 60).toString().padStart(2, '0')}`
              : 'Áudio';

          return (
            <div
              key={musica.id}
              data-track-item
              onClick={() => onSelecionarMusica(idx)}
              className={`
                relative min-h-[64px] sm:min-h-[76px] rounded-xl flex items-center px-3.5 sm:px-5 py-2.5 transition-all duration-200 cursor-pointer w-full select-none
                ${
                  isAtivo
                    ? 'bg-sigma-bg border-[1.5px] border-macaonico-dourado shadow-[0_0_16px_rgba(212,175,55,0.25)] z-10'
                    : 'bg-sigma-surface/60 border border-white/5 hover:bg-white/5 z-0 opacity-85 hover:opacity-100'
                }
              `}
            >
              {isPreferencial && !isAtivo && (
                <div className="absolute inset-0 bg-macaonico-dourado/5 rounded-xl pointer-events-none"></div>
              )}

              {/* Ícone Musical */}
              <div
                className={`mr-3 sm:mr-4 shrink-0 flex items-center justify-center transition-colors ${
                  isAtivo
                    ? 'text-macaonico-dourado drop-shadow-[0_0_8px_rgba(212,175,55,0.8)]'
                    : 'text-macaonico-inactive'
                }`}
              >
                <svg
                  className="w-6 h-6 sm:w-7 sm:h-7"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={isAtivo ? 2 : 1.5}
                    d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3"
                  />
                </svg>
              </div>

              {/* Informações da Faixa */}
              <div className="flex-1 min-w-0 flex flex-col justify-center">
                <div className="flex items-center gap-1.5">
                  <h3
                    className={`font-cinzel text-sm sm:text-base truncate tracking-wide transition-colors ${
                      isAtivo ? 'text-slate-100 font-bold' : 'text-slate-300 font-normal'
                    }`}
                  >
                    {musica.titulo}
                  </h3>
                  {isPreferencial && (
                    <svg
                      className={`w-3.5 h-3.5 shrink-0 ${
                        isAtivo ? 'text-macaonico-dourado' : 'text-macaonico-dourado/60'
                      }`}
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                  )}
                </div>
                <p className="font-inter text-xs text-slate-400 truncate mt-0.5 tracking-wide">
                  {musica.autor_artista || 'Acervo Harmonia'} • {duracaoFormatada}
                </p>
              </div>

              {/* Botão de Ação (44x44px para toque confortável) */}
              <div className="flex items-center ml-2 shrink-0">
                <button
                  type="button"
                  aria-label={isAtivo && tocando ? 'Pausar faixa' : 'Tocar faixa'}
                  className={`w-11 h-11 rounded-full flex items-center justify-center transition-colors ${
                    isAtivo
                      ? 'bg-macaonico-dourado/20 text-macaonico-dourado hover:bg-macaonico-dourado/30 border border-macaonico-dourado/40'
                      : 'bg-white/5 text-macaonico-inactive hover:bg-white/10'
                  }`}
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelecionarMusica(idx);
                  }}
                >
                  {isAtivo && tocando ? (
                    <Pause size={18} fill="currentColor" />
                  ) : (
                    <Play size={18} fill="currentColor" className="ml-0.5" />
                  )}
                </button>
              </div>
            </div>
          );
        })}

        {musicas.length > 0 && (
          <div className="pt-2 pb-4 flex justify-center">
            <button
              type="button"
              onClick={onAbrirUpload}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-cinzel tracking-wider text-macaonico-dourado/90 bg-macaonico-dourado/10 border border-macaonico-dourado/30 rounded-lg hover:bg-macaonico-dourado/20 transition-all"
            >
              <Plus className="w-4 h-4" />
              Adicionar Música a este Momento
            </button>
          </div>
        )}

        {musicas.length === 0 && (
          <div className="flex flex-col items-center justify-center py-10 text-macaonico-inactive font-cinzel text-center">
            <span className="text-sm sm:text-base tracking-widest mb-4 opacity-80">
              [ Nenhuma Música Vinculada a este Momento ]
            </span>
            <button
              type="button"
              onClick={onAbrirUpload}
              className="px-5 py-3 bg-macaonico-dourado/15 border border-macaonico-dourado/40 text-macaonico-dourado hover:bg-macaonico-dourado/25 transition-all rounded-xl tracking-wider flex items-center text-xs sm:text-sm font-bold shadow-[0_0_15px_rgba(212,175,55,0.15)]"
            >
              <Plus className="w-4 h-4 mr-2" />
              Adicionar Música ao Acervo
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
