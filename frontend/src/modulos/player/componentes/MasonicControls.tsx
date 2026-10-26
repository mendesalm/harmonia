import React from 'react';
import { Play, Pause, SkipBack, SkipForward, Rewind, FastForward, Compass, ArrowRightCircle } from 'lucide-react';
import { feedbackTatil } from '../../../compartilhado/utilitarios/dispositivoNativo';
import { MomentoExecucao } from '../../../compartilhado/tipos';

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
  momentoAtual?: MomentoExecucao | null;
  proximoMomento?: MomentoExecucao | null;
}

/**
 * Painel inferior de controles de reprodução do Player Harmonia.
 * Dimensionado ergonomicamente para operação com uma mão no celular (thumb zone),
 * seguido do box de Orientação ao Mestre de Harmonia e Prévia do Momento Seguinte.
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
  momentoAtual,
  proximoMomento,
}) => {
  const formatarTempo = (secs: number) => {
    if (!secs || isNaN(secs)) return '00:00';
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const progressoPercentual = duracaoTotal > 0 ? (tempoAtual / duracaoTotal) * 100 : 0;

  const orientacaoAtual =
    momentoAtual?.observacao_ritual?.trim() ||
    momentoAtual?.evento_descricao?.trim() ||
    'Executar a peça com volume equilibrado, atento ao comando do Venerável Mestre ou Mestre de Cerimônias.';

  const orientacaoProximo =
    proximoMomento?.observacao_ritual?.trim() ||
    proximoMomento?.evento_descricao?.trim() ||
    null;

  return (
    <div className="w-full bg-[#050811] border-t border-macaonico-dourado/25 pt-2.5 pb-2.5 sm:pt-3.5 sm:pb-3.5 px-3 sm:px-4 flex flex-col items-center relative z-20">
      {/* Linha decorativa superior */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-1/3 h-px bg-gradient-to-r from-transparent via-macaonico-dourado/50 to-transparent"></div>

      <div className="w-full max-w-3xl mx-auto flex flex-col items-center">
        {/* Barra de Progresso (Seek Bar) com feixe luminoso e marcador */}
        <div className="w-full max-w-[440px] px-2 sm:px-4 mb-1.5 sm:mb-2">
          <div className="flex items-center justify-between text-[10px] sm:text-[11px] font-inter text-macaonico-inactive font-medium mb-1 px-1">
            <span>{formatarTempo(tempoAtual)}</span>
            <span>{duracaoTotal > 0 ? formatarTempo(duracaoTotal) : '--:--'}</span>
          </div>

          <div
            className="relative w-full py-2 cursor-pointer group select-none"
            onClick={(e) => {
              if (duracaoTotal <= 0) return;
              const rect = e.currentTarget.getBoundingClientRect();
              const clickX = e.clientX - rect.left;
              const percent = Math.max(0, Math.min(1, clickX / rect.width));
              onSeek(percent * duracaoTotal);
            }}
          >
            {/* Feixe dourado */}
            <div className="relative w-full h-2 bg-sigma-elevated/80 rounded-full overflow-hidden border border-macaonico-dourado/25">
              <div
                className="absolute top-0 left-0 h-full bg-gold-gradient shadow-[0_0_12px_rgba(221,185,107,0.65)] transition-all duration-100 ease-linear rounded-r-full"
                style={{ width: `${progressoPercentual}%` }}
              ></div>
            </div>

            {/* Marcador circular luminoso (Thumb) */}
            <div
              className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-4 h-4 rounded-full bg-[#070F1E] border-2 border-macaonico-dourado shadow-[0_0_14px_rgba(221,185,107,0.9)] flex items-center justify-center transition-all duration-100 ease-linear pointer-events-none group-hover:scale-125"
              style={{ left: `${Math.max(2, Math.min(98, progressoPercentual))}%` }}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-macaonico-dourado" />
            </div>
          </div>
        </div>

        {/* Painel Principal de Controles (classes Tailwind v3 explícitas e shrink-0 para evitar deformação) */}
        <div className="relative w-full max-w-[440px] h-20 sm:h-24 shrink-0 flex items-center justify-center my-0.5">
          {/* Asa Esquerda (Anterior) */}
          <div className="absolute left-0 w-[45%] h-12 sm:h-14 bg-macaonico-surface rounded-l-full border border-macaonico-dourado/30 flex items-center justify-between px-3 sm:px-5 pr-10 sm:pr-12 z-0 shadow-[inset_0_0_15px_rgba(212,175,55,0.05)]">
            <button
              type="button"
              onClick={() => {
                feedbackTatil.clique();
                onPrevMoment();
              }}
              className="text-macaonico-dourado/85 hover:text-macaonico-dourado transition-colors flex flex-col items-center justify-center min-w-[44px] min-h-[44px] shrink-0 active:scale-95"
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
              className="text-macaonico-dourado/85 hover:text-macaonico-dourado transition-colors flex flex-col items-center justify-center min-w-[44px] min-h-[44px] shrink-0 active:scale-95"
            >
              <SkipBack className="w-4 h-4 sm:w-5 sm:h-5" fill="currentColor" />
              <span className="text-[8px] sm:text-[9px] font-cinzel mt-0.5 tracking-wider opacity-80">
                Faixa
              </span>
            </button>
          </div>

          {/* Asa Direita (Próximo) */}
          <div className="absolute right-0 w-[45%] h-12 sm:h-14 bg-macaonico-surface rounded-r-full border border-macaonico-dourado/30 flex items-center justify-between px-3 sm:px-5 pl-10 sm:pl-12 z-0 shadow-[inset_0_0_15px_rgba(212,175,55,0.05)]">
            <button
              type="button"
              onClick={() => {
                feedbackTatil.clique();
                onNextTrack();
              }}
              className="text-macaonico-dourado/85 hover:text-macaonico-dourado transition-colors flex flex-col items-center justify-center min-w-[44px] min-h-[44px] shrink-0 active:scale-95"
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
              className="text-macaonico-dourado/85 hover:text-macaonico-dourado transition-colors flex flex-col items-center justify-center min-w-[44px] min-h-[44px] shrink-0 active:scale-95"
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
            className={`relative z-10 w-20 h-20 sm:w-24 sm:h-24 shrink-0 aspect-square rounded-full border-2 flex flex-col items-center justify-center transition-all duration-300 active:scale-95
              ${
                tocando
                  ? 'bg-[#121a2d] border-macaonico-dourado shadow-[0_0_25px_rgba(212,175,55,0.35)]'
                  : 'bg-[#0a1020] border-macaonico-dourado/75 hover:border-macaonico-dourado shadow-lg'
              }
            `}
          >
            <div className="absolute inset-[4px] sm:inset-[5px] rounded-full border border-macaonico-dourado/30 pointer-events-none"></div>

            <div className="flex items-center justify-center mt-0.5">
              {tocando ? (
                <Pause
                  className="w-7 h-7 sm:w-8 sm:h-8 text-macaonico-dourado drop-shadow-[0_0_8px_rgba(212,175,55,0.8)]"
                  fill="currentColor"
                />
              ) : (
                <Play
                  className="w-7 h-7 sm:w-8 sm:h-8 text-macaonico-dourado ml-0.5"
                  fill="currentColor"
                />
              )}
            </div>
            <span className="text-[8px] sm:text-[9px] font-cinzel text-macaonico-dourado/80 mt-0.5 tracking-widest uppercase">
              {tocando ? 'Pausar' : 'Tocar'}
            </span>
          </button>
        </div>

        {/* Box de Orientação ao Mestre de Harmonia + Observação do Momento Seguinte */}
        {momentoAtual && (
          <div className="w-full max-w-2xl mt-2 grid grid-cols-2 gap-2 px-1 shrink-0">
            {/* Orientação do Momento Atual */}
            <div className="rounded-xl bg-[#071122]/90 border border-cyan-400/25 px-2.5 py-1.5 flex items-start gap-2 shadow-inner min-w-0">
              <Compass className="w-3.5 h-3.5 text-[#00E5FF] shrink-0 mt-0.5" />
              <div className="min-w-0 flex-1">
                <span className="block text-[8px] sm:text-[9px] font-mono uppercase tracking-wider text-[#00E5FF] font-bold truncate">
                  Orientação • Mestre de Harmonia
                </span>
                <p className="text-[10px] sm:text-[11px] text-slate-200 leading-snug line-clamp-2 mt-0.5">
                  {orientacaoAtual}
                </p>
              </div>
            </div>

            {/* Observação do Momento Seguinte */}
            <div
              onClick={() => {
                if (proximoMomento) {
                  feedbackTatil.clique();
                  onNextMoment();
                }
              }}
              className={`rounded-xl bg-[#071122]/75 border border-macaonico-dourado/25 px-2.5 py-1.5 flex items-start gap-2 transition-colors min-w-0 ${
                proximoMomento ? 'cursor-pointer hover:border-macaonico-dourado/50 hover:bg-[#0a172d]' : 'opacity-60'
              }`}
              title={proximoMomento ? 'Toque para avançar ao momento seguinte' : undefined}
            >
              <ArrowRightCircle className="w-3.5 h-3.5 text-macaonico-dourado shrink-0 mt-0.5" />
              <div className="min-w-0 flex-1">
                <span className="block text-[8px] sm:text-[9px] font-mono uppercase tracking-wider text-macaonico-dourado font-bold truncate">
                  Seguinte {proximoMomento ? `• #${proximoMomento.posicao}` : ''}
                </span>
                {proximoMomento ? (
                  <>
                    <p className="text-[10px] sm:text-[11px] font-semibold text-white truncate mt-0.5">
                      {proximoMomento.evento_nome}
                    </p>
                    {orientacaoProximo && (
                      <p className="text-[9px] sm:text-[10px] text-slate-400 leading-snug line-clamp-1 mt-0.5">
                        {orientacaoProximo}
                      </p>
                    )}
                  </>
                ) : (
                  <p className="text-[10px] sm:text-[11px] text-slate-400 italic mt-0.5">
                    Último momento da esteira.
                  </p>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
