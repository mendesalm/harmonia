import React from 'react';
import { Play, Pause, SkipBack, SkipForward, Rewind, FastForward } from 'lucide-react';
import { feedbackTatil } from '../../../compartilhado/utilitarios/dispositivoNativo';

interface MasonicControlsProps {
  tocando: boolean;
  onPlayPause: () => void;
  onPrevTrack: () => void;
  onNextTrack: () => void;
  onPrevMoment: () => void;
  onNextMoment: () => void;
  tempoAtual: number;
  duracaoTotal: number;
  onSeek: (novoTempo: number) => void;
}

/**
 * Painel inferior de controles de reprodução do Player Harmonia.
 * Dimensionado ergonomicamente para operação com uma mão no celular (thumb zone).
 */
export const MasonicControls: React.FC<MasonicControlsProps> = ({
  tocando,
  onPlayPause,
  onPrevTrack,
  onNextTrack,
  onPrevMoment,
  onNextMoment,
  tempoAtual,
  duracaoTotal,
  onSeek,
}) => {
  const formatarTempo = (secs: number) => {
    if (!secs || isNaN(secs)) return '00:00';
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const progressoPercentual = duracaoTotal > 0 ? (tempoAtual / duracaoTotal) * 100 : 0;

  return (
    <div className="w-full bg-[#050811] border-t border-macaonico-dourado/25 pt-3 pb-3 sm:pt-5 sm:pb-5 px-3 sm:px-4 flex flex-col items-center relative z-20">
      {/* Linha decorativa superior */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-1/3 h-px bg-gradient-to-r from-transparent via-macaonico-dourado/50 to-transparent"></div>

      <div className="w-full max-w-3xl mx-auto flex flex-col items-center">
        {/* Barra de Progresso (Seek Bar) com área de toque ampliada */}
        <div className="w-full max-w-[440px] px-2 sm:px-4 mb-2 sm:mb-3">
          <div className="flex items-center justify-between text-[10px] sm:text-[11px] font-inter text-macaonico-inactive font-medium mb-1 px-1">
            <span>{formatarTempo(tempoAtual)}</span>
            <span>{duracaoTotal > 0 ? formatarTempo(duracaoTotal) : '--:--'}</span>
          </div>

          <div
            className="relative w-full py-2 cursor-pointer"
            onClick={(e) => {
              if (duracaoTotal <= 0) return;
              const rect = e.currentTarget.getBoundingClientRect();
              const clickX = e.clientX - rect.left;
              const percent = Math.max(0, Math.min(1, clickX / rect.width));
              onSeek(percent * duracaoTotal);
            }}
          >
            <div className="relative w-full h-1.5 sm:h-2 bg-sigma-elevated rounded-full overflow-hidden border border-white/10">
              <div
                className="absolute top-0 left-0 h-full bg-gold-gradient shadow-[0_0_10px_rgba(212,175,55,0.5)] transition-all duration-100 ease-linear rounded-r-full"
                style={{ width: `${progressoPercentual}%` }}
              ></div>
            </div>
          </div>
        </div>

        {/* Painel Principal de Controles */}
        <div className="relative w-full max-w-[420px] h-20 sm:h-28 flex items-center justify-center">
          {/* Asa Esquerda (Anterior) */}
          <div className="absolute left-0 w-[45%] h-12 sm:h-14 bg-macaonico-surface rounded-l-full border border-macaonico-dourado/30 flex items-center justify-between px-3 sm:px-5 pr-9 sm:pr-12 z-0 shadow-[inset_0_0_15px_rgba(212,175,55,0.05)]">
            <button
              type="button"
              onClick={() => {
                feedbackTatil.clique();
                onPrevMoment();
              }}
              className="text-macaonico-dourado/85 hover:text-macaonico-dourado transition-colors flex flex-col items-center justify-center min-w-[44px] min-h-[44px] active:scale-95"
            >
              <Rewind className="w-4 h-4 sm:w-5 sm:h-5" fill="currentColor" />
              <span className="text-[8px] sm:text-[9px] font-cinzel mt-0.5 tracking-wider opacity-80">
                Momento
              </span>
            </button>

            <button
              type="button"
              onClick={() => {
                feedbackTatil.clique();
                onPrevTrack();
              }}
              className="text-macaonico-dourado/85 hover:text-macaonico-dourado transition-colors flex flex-col items-center justify-center min-w-[44px] min-h-[44px] active:scale-95"
            >
              <SkipBack className="w-4 h-4 sm:w-5 sm:h-5" fill="currentColor" />
              <span className="text-[8px] sm:text-[9px] font-cinzel mt-0.5 tracking-wider opacity-80">
                Faixa
              </span>
            </button>
          </div>

          {/* Asa Direita (Próximo) */}
          <div className="absolute right-0 w-[45%] h-12 sm:h-14 bg-macaonico-surface rounded-r-full border border-macaonico-dourado/30 flex items-center justify-between px-3 sm:px-5 pl-9 sm:pl-12 z-0 shadow-[inset_0_0_15px_rgba(212,175,55,0.05)]">
            <button
              type="button"
              onClick={() => {
                feedbackTatil.clique();
                onNextTrack();
              }}
              className="text-macaonico-dourado/85 hover:text-macaonico-dourado transition-colors flex flex-col items-center justify-center min-w-[44px] min-h-[44px] active:scale-95"
            >
              <SkipForward className="w-4 h-4 sm:w-5 sm:h-5" fill="currentColor" />
              <span className="text-[8px] sm:text-[9px] font-cinzel mt-0.5 tracking-wider opacity-80">
                Faixa
              </span>
            </button>

            <button
              type="button"
              onClick={() => {
                feedbackTatil.clique();
                onNextMoment();
              }}
              className="text-macaonico-dourado/85 hover:text-macaonico-dourado transition-colors flex flex-col items-center justify-center min-w-[44px] min-h-[44px] active:scale-95"
            >
              <FastForward className="w-4 h-4 sm:w-5 sm:h-5" fill="currentColor" />
              <span className="text-[8px] sm:text-[9px] font-cinzel mt-0.5 tracking-wider opacity-80">
                Momento
              </span>
            </button>
          </div>

          {/* Botão Central Play/Pause */}
          <button
            type="button"
            onClick={() => {
              feedbackTatil.acaoMedia();
              onPlayPause();
            }}
            className={`relative z-10 w-20 h-20 sm:w-26 sm:h-26 rounded-full border-2 flex flex-col items-center justify-center transition-all duration-300 active:scale-95
              ${
                tocando
                  ? 'bg-[#121a2d] border-macaonico-dourado shadow-[0_0_25px_rgba(212,175,55,0.35)]'
                  : 'bg-[#0a1020] border-macaonico-dourado/75 hover:border-macaonico-dourado shadow-lg'
              }
            `}
          >
            <div className="absolute inset-[4px] sm:inset-[6px] rounded-full border border-macaonico-dourado/30 pointer-events-none"></div>

            <div className="flex items-center justify-center mt-1">
              {tocando ? (
                <Pause
                  className="w-7 h-7 sm:w-9 sm:h-9 text-macaonico-dourado drop-shadow-[0_0_8px_rgba(212,175,55,0.8)]"
                  fill="currentColor"
                />
              ) : (
                <Play
                  className="w-7 h-7 sm:w-9 sm:h-9 text-macaonico-dourado ml-1"
                  fill="currentColor"
                />
              )}
            </div>
            <span className="text-[8px] sm:text-[10px] font-cinzel text-macaonico-dourado/80 mt-0.5 tracking-widest uppercase">
              {tocando ? 'Pausar' : 'Tocar'}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
};
