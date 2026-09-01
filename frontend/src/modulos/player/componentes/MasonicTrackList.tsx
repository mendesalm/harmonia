import React, { useRef, useEffect } from 'react';
import { Play, Pause, MoreHorizontal } from 'lucide-react';
import { Musica } from '../../../compartilhado/tipos';
import { getMasonicIcon } from './MasonicIcons';

interface MasonicTrackListProps {
  musicas: Musica[];
  indiceAtivo: number;
  tocando: boolean;
  onSelecionarMusica: (idx: number) => void;
  onAbrirUpload: () => void;
  progressoPercentual: number;
}

export const MasonicTrackList: React.FC<MasonicTrackListProps> = ({
  musicas,
  indiceAtivo,
  tocando,
  onSelecionarMusica,
  onAbrirUpload
}) => {
  const containerRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to center the active track
  useEffect(() => {
    if (containerRef.current) {
      const activeEl = containerRef.current.children[indiceAtivo] as HTMLElement;
      if (activeEl) {
        const container = containerRef.current;
        const scrollTarget = activeEl.offsetTop - (container.clientHeight / 2) + (activeEl.clientHeight / 2);
        container.scrollTo({ top: scrollTarget, behavior: 'smooth' });
      }
    }
  }, [indiceAtivo, musicas.length]);

  return (
    <div className="flex-1 w-full relative flex flex-col items-center justify-center overflow-hidden bg-[#0a0a0a]">
      
      {/* Dark Stone Texture Background */}
      <div className="absolute inset-0 opacity-40 mix-blend-overlay pointer-events-none" style={{ backgroundImage: 'url("https://www.transparenttextures.com/patterns/black-scales.png")' }}></div>
      <div className="absolute inset-0 opacity-20 pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle at center, transparent 0%, #000 100%)' }}></div>

      <div 
        className="flex-1 w-full max-w-2xl relative overflow-y-auto scrollbar-hide py-[35vh] px-4"
        ref={containerRef}
      >
        {musicas.map((musica, idx) => {
          const isAtivo = idx === indiceAtivo;

          return (
            <div 
              key={musica.id}
              onClick={() => onSelecionarMusica(idx)}
              className={`
                relative h-[84px] mb-3 rounded-lg flex items-center px-4 transition-all duration-300 cursor-pointer w-full
                ${isAtivo 
                  ? 'bg-black border-[1.5px] border-macaonico-dourado shadow-[0_0_18px_rgba(212,175,55,0.25)] z-10' 
                  : 'bg-transparent border border-transparent hover:bg-white/5 z-0 opacity-70 hover:opacity-100'
                }
              `}
            >
              {/* Icon Circle */}
              <div className={`w-14 h-14 rounded-full flex flex-shrink-0 items-center justify-center mr-4 transition-colors ${isAtivo ? 'bg-[#1e1a12] border-[1.5px] border-macaonico-dourado text-macaonico-dourado shadow-inner' : 'bg-[#181818] border border-white/10 text-macaonico-inactive'}`}>
                {getMasonicIcon(musica.titulo, { size: 28, strokeWidth: isAtivo ? 1.5 : 1 })}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0 flex flex-col justify-center">
                <h3 className={`font-cinzel text-[17px] truncate tracking-wide transition-colors ${isAtivo ? 'text-slate-100 font-bold' : 'text-slate-400 font-normal'}`}>
                  {musica.titulo}
                </h3>
                <p className="font-inter text-[13px] text-slate-500 truncate mt-0.5 tracking-wide">
                  {musica.autor_artista} • {Math.floor((musica.duracao_segundos || 0) / 60)}:{((musica.duracao_segundos || 0) % 60).toString().padStart(2, '0')}
                </p>
              </div>

              {/* Controls */}
              <div className="flex items-center space-x-2 ml-4 flex-shrink-0">
                <button 
                  className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors ${isAtivo ? 'bg-macaonico-dourado/20 text-macaonico-dourado hover:bg-macaonico-dourado/30 border border-macaonico-dourado/30' : 'bg-transparent text-macaonico-inactive hover:bg-white/10'}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelecionarMusica(idx);
                  }}
                >
                  {isAtivo && tocando ? <Pause size={20} fill="currentColor" /> : <Play size={20} fill="currentColor" className="ml-1" />}
                </button>
                <button className="text-macaonico-inactive hover:text-slate-300 w-10 h-10 flex items-center justify-center rounded-full hover:bg-white/5 transition-colors">
                  <MoreHorizontal size={20} />
                </button>
              </div>
            </div>
          );
        })}
        
        {musicas.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-macaonico-inactive font-cinzel absolute inset-0 z-10">
            <span className="text-lg tracking-widest mb-4 opacity-70">[ Sem Músicas ]</span>
            <button 
              onClick={onAbrirUpload}
              className="px-6 py-2.5 bg-macaonico-dourado/10 border border-macaonico-dourado/40 text-macaonico-dourado hover:bg-macaonico-dourado/20 transition-all rounded-md tracking-wider flex items-center shadow-[0_0_15px_rgba(212,175,55,0.15)] hover:shadow-[0_0_20px_rgba(212,175,55,0.3)]"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Adicionar Música ao Acervo
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
