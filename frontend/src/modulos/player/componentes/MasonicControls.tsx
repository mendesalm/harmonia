import React from 'react';
import { Play, Pause, SkipBack, SkipForward, Rewind, FastForward } from 'lucide-react';

interface MasonicControlsProps {
  tocando: boolean;
  onPlayPause: () => void;
  onPrevTrack: () => void;
  onNextTrack: () => void;
  onPrevMoment: () => void;
  onNextMoment: () => void;
  proximoEventoNome?: string;
  // Progress bar props
  tempoAtual: number;
  duracaoTotal: number;
  onSeek: (novoTempo: number) => void;
}

export const MasonicControls: React.FC<MasonicControlsProps> = ({
  tocando,
  onPlayPause,
  onPrevTrack,
  onNextTrack,
  onPrevMoment,
  onNextMoment,
  proximoEventoNome,
  tempoAtual,
  duracaoTotal,
  onSeek
}) => {
  // Format MM:SS
  const formatarTempo = (secs: number) => {
    if (!secs || isNaN(secs)) return "00:00";
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const progressoPercentual = duracaoTotal > 0 ? (tempoAtual / duracaoTotal) * 100 : 0;

  const handleSeekClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const perc = clickX / rect.width;
    onSeek(perc * duracaoTotal);
  };

  return (
    <div className="w-full bg-[#050505] border-t border-macaonico-dourado/20 pt-4 pb-6 px-4 flex flex-col items-center relative z-20">
      
      {/* Decorative Top Border */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-1/3 h-px bg-gradient-to-r from-transparent via-macaonico-dourado/50 to-transparent"></div>

      <div className="w-full max-w-3xl mx-auto flex flex-col items-center">
        {proximoEventoNome && (
          <div className="text-macaonico-dourado/80 font-cinzel mb-3 tracking-widest text-sm uppercase font-bold drop-shadow-[0_0_5px_rgba(212,175,55,0.4)]">
            Próximo Evento: {proximoEventoNome}
          </div>
        )}
      </div>

      {/* Main Control Panel */}
      <div className="relative w-full max-w-[450px] h-32 flex items-center justify-center mb-6">
        
        {/* Left Wing (Previous) */}
        <div className="absolute left-0 w-[45%] h-14 bg-macaonico-surface rounded-l-full border border-macaonico-inactive/50 flex items-center justify-between px-5 pr-12 z-0 shadow-[inset_0_0_15px_rgba(212,175,55,0.05)]">
          <button 
            onClick={onPrevMoment}
            className="text-macaonico-dourado/80 hover:text-macaonico-dourado transition-colors flex flex-col items-center active:scale-95"
          >
            <Rewind size={22} fill="currentColor" />
            <span className="text-[9px] font-cinzel mt-1 tracking-wider opacity-70">Moment</span>
          </button>
          
          <button 
            onClick={onPrevTrack}
            className="text-macaonico-dourado/80 hover:text-macaonico-dourado transition-colors flex flex-col items-center active:scale-95"
          >
            <SkipBack size={22} fill="currentColor" />
            <span className="text-[9px] font-cinzel mt-1 tracking-wider opacity-70">Track</span>
          </button>
        </div>

        {/* Right Wing (Next) */}
        <div className="absolute right-0 w-[45%] h-14 bg-macaonico-surface rounded-r-full border border-macaonico-inactive/50 flex items-center justify-between px-5 pl-12 z-0 shadow-[inset_0_0_15px_rgba(212,175,55,0.05)]">
          <button 
            onClick={onNextTrack}
            className="text-macaonico-dourado/80 hover:text-macaonico-dourado transition-colors flex flex-col items-center active:scale-95"
          >
            <SkipForward size={22} fill="currentColor" />
            <span className="text-[9px] font-cinzel mt-1 tracking-wider opacity-70">Track</span>
          </button>

          <button 
            onClick={onNextMoment}
            className="text-macaonico-dourado/80 hover:text-macaonico-dourado transition-colors flex flex-col items-center active:scale-95"
          >
            <FastForward size={22} fill="currentColor" />
            <span className="text-[9px] font-cinzel mt-1 tracking-wider opacity-70">Moment</span>
          </button>
        </div>

        {/* Center Play Button */}
        <button 
          onClick={onPlayPause}
          className={`relative z-10 w-28 h-28 rounded-full border-2 flex flex-col items-center justify-center transition-all duration-300 active:scale-95
            ${tocando 
              ? 'bg-[#151515] border-macaonico-dourado shadow-[0_0_30px_rgba(212,175,55,0.25)]' 
              : 'bg-[#0a0a0a] border-macaonico-dourado/60 hover:border-macaonico-dourado'
            }
          `}
        >
          {/* Inner ring */}
          <div className="absolute inset-[6px] rounded-full border border-macaonico-dourado/30 pointer-events-none"></div>
          
          <div className="flex-1 flex items-center justify-center mt-3">
            {tocando ? (
               <Pause size={40} fill="currentColor" className="text-macaonico-dourado drop-shadow-[0_0_8px_rgba(212,175,55,0.8)]" />
            ) : (
               <Play size={40} fill="currentColor" className="text-macaonico-dourado ml-2" />
            )}
          </div>
          <span className="text-[10px] font-cinzel text-macaonico-dourado/70 mb-3 tracking-widest uppercase">
            {tocando ? 'Pause' : 'Play'}
          </span>
        </button>
      </div>

      {/* Horizontal Seek Bar */}
      <div className="w-full max-w-[450px] px-6 mt-2">
         <div className="flex items-center justify-between text-[11px] font-inter text-macaonico-inactive font-medium mb-1.5 px-1">
            <span>{formatarTempo(tempoAtual)}</span>
            <span>{duracaoTotal > 0 ? formatarTempo(duracaoTotal) : '--:--'}</span>
         </div>
         
         <div 
            className="relative w-full h-1.5 bg-[#1a1a1a] rounded-full cursor-pointer overflow-hidden border border-white/5"
            onClick={(e) => {
              if (duracaoTotal <= 0) return;
              const rect = e.currentTarget.getBoundingClientRect();
              const clickX = e.clientX - rect.left;
              const percent = Math.max(0, Math.min(1, clickX / rect.width));
              onSeek(percent * duracaoTotal);
            }}
         >
            <div 
              className="absolute top-0 left-0 h-full bg-gold-gradient shadow-[0_0_10px_rgba(212,175,55,0.5)] transition-all duration-100 ease-linear rounded-r-full"
              style={{ width: `${progressoPercentual}%` }}
            ></div>
         </div>
      </div>
    </div>
  );
};
