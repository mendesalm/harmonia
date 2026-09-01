import React, { useRef, useEffect } from 'react';
import { Play, Pause, MoreHorizontal } from 'lucide-react';
import { Musica } from '../../../compartilhado/tipos';
import { getMasonicIcon } from './MasonicIcons';

interface MasonicTrackListProps {
  musicas: Musica[];
  indiceAtivo: number; // Index of the currently playing/selected track
  tocando: boolean;
  onSelecionarMusica: (idx: number) => void;
  progressoPercentual: number; // 0 to 100
}

export const MasonicTrackList: React.FC<MasonicTrackListProps> = ({
  musicas,
  indiceAtivo,
  tocando,
  onSelecionarMusica,
  progressoPercentual
}) => {
  const containerRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to center the active track
  useEffect(() => {
    if (containerRef.current) {
      const activeEl = containerRef.current.children[indiceAtivo] as HTMLElement;
      if (activeEl) {
        // We use a custom smooth scroll to center it exactly between the pillars
        const container = containerRef.current;
        const scrollTarget = activeEl.offsetTop - (container.clientHeight / 2) + (activeEl.clientHeight / 2);
        container.scrollTo({ top: scrollTarget, behavior: 'smooth' });
      }
    }
  }, [indiceAtivo, musicas.length]);

  return (
    <div className="flex-1 w-full max-w-3xl mx-auto relative flex overflow-hidden">
      
      {/* Left Pillar (J) - Acts as vertical progress bar */}
      <div className="w-8 flex flex-col items-center z-20 relative">
        <div className="text-macaonico-dourado font-cinzel text-sm mb-2 font-bold">J</div>
        <div className="flex-1 w-2 bg-macaonico-inactive/30 rounded-full relative overflow-hidden shadow-[inset_0_0_5px_rgba(0,0,0,0.8)] border border-macaonico-inactive/20">
          <div 
            className="absolute bottom-0 left-0 w-full bg-gold-gradient transition-all duration-300 ease-linear shadow-[0_0_10px_rgba(212,175,55,0.8)]"
            style={{ height: `${progressoPercentual}%` }}
          ></div>
        </div>
        {/* Decorative Base */}
        <div className="w-6 h-2 bg-macaonico-dourado/40 mt-1 rounded-sm"></div>
      </div>

      {/* Center Carousel Area */}
      <div 
        className="flex-1 relative overflow-y-auto scrollbar-hide py-[50vh] px-4 perspective-1000"
        ref={containerRef}
      >
        {/* Active Track Highlight Guidelines */}
        {tocando && (
          <div className="absolute left-0 right-0 h-24 top-1/2 -translate-y-1/2 pointer-events-none z-0">
             <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-macaonico-dourado via-transparent to-macaonico-dourado opacity-50 shadow-[0_0_8px_rgba(212,175,55,0.8)]"></div>
             <div className="absolute bottom-0 left-0 w-full h-[1px] bg-gradient-to-r from-macaonico-dourado via-transparent to-macaonico-dourado opacity-50 shadow-[0_0_8px_rgba(212,175,55,0.8)]"></div>
          </div>
        )}

        {musicas.map((musica, idx) => {
          const isAtivo = idx === indiceAtivo;
          // Calculate distance from active for 3D effect
          const dist = idx - indiceAtivo;
          
          let transformStyle = '';
          let opacityStyle = 1;
          
          if (isAtivo) {
            transformStyle = 'translateZ(0) rotateX(0deg) scale(1)';
            opacityStyle = 1;
          } else {
            const sign = Math.sign(dist);
            const absDist = Math.abs(dist);
            // Cylinder effect: rotateX pushes it back, translateZ also pushes it back
            const rotateX = sign * Math.min(absDist * 15, 60); 
            const translateZ = -absDist * 30;
            const translateY = sign * absDist * 10;
            transformStyle = `translateY(${translateY}px) translateZ(${translateZ}px) rotateX(${rotateX}deg) scale(${1 - (absDist * 0.05)})`;
            opacityStyle = Math.max(0.2, 1 - (absDist * 0.3));
          }

          return (
            <div 
              key={musica.id}
              onClick={() => onSelecionarMusica(idx)}
              className={`
                relative h-20 mb-4 rounded-xl flex items-center px-4 transition-all duration-500 cursor-pointer preserve-3d
                ${isAtivo ? 'bg-[#151515] border border-macaonico-dourado/80 shadow-[0_0_20px_rgba(212,175,55,0.15)] z-10' : 'bg-[#0a0a0a] border border-macaonico-inactive/30 z-0'}
              `}
              style={{
                transform: transformStyle,
                opacity: opacityStyle,
                transformOrigin: '50% 50% -100px'
              }}
            >
              {/* Icon */}
              <div className={`w-12 h-12 rounded-full flex items-center justify-center mr-4 border ${isAtivo ? 'bg-[#1e1a12] border-macaonico-dourado text-macaonico-dourado' : 'bg-[#111] border-macaonico-inactive/50 text-macaonico-inactive'}`}>
                {getMasonicIcon(musica.titulo, { size: 24, strokeWidth: 1.5 })}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <h3 className={`font-cinzel text-lg truncate ${isAtivo ? 'text-slate-100' : 'text-slate-400'}`}>
                  {musica.titulo}
                </h3>
                <p className="font-inter text-xs text-slate-500 truncate mt-0.5">
                  {musica.autor_artista} • {Math.floor(musica.duracao_segundos / 60)}:{(musica.duracao_segundos % 60).toString().padStart(2, '0')}
                </p>
              </div>

              {/* Controls */}
              <div className="flex items-center space-x-3 ml-2">
                <button 
                  className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${isAtivo ? 'bg-macaonico-dourado/10 text-macaonico-dourado hover:bg-macaonico-dourado/20' : 'bg-[#111] text-macaonico-inactive'}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelecionarMusica(idx);
                  }}
                >
                  {isAtivo && tocando ? <Pause size={16} fill="currentColor" /> : <Play size={16} fill="currentColor" className="ml-1" />}
                </button>
                <button className="text-macaonico-inactive hover:text-slate-300">
                  <MoreHorizontal size={20} />
                </button>
              </div>
            </div>
          );
        })}
        
        {musicas.length === 0 && (
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-center text-macaonico-inactive font-cinzel">
            [ Nenhuma música neste estágio ]
          </div>
        )}
      </div>

      {/* Right Pillar (B) - Acts as vertical progress bar */}
      <div className="w-8 flex flex-col items-center z-20 relative">
        <div className="text-macaonico-dourado font-cinzel text-sm mb-2 font-bold">B</div>
        <div className="flex-1 w-2 bg-macaonico-inactive/30 rounded-full relative overflow-hidden shadow-[inset_0_0_5px_rgba(0,0,0,0.8)] border border-macaonico-inactive/20">
           <div 
            className="absolute bottom-0 left-0 w-full bg-gold-gradient transition-all duration-300 ease-linear shadow-[0_0_10px_rgba(212,175,55,0.8)]"
            style={{ height: `${progressoPercentual}%` }}
          ></div>
        </div>
        {/* Decorative Base */}
        <div className="w-6 h-2 bg-macaonico-dourado/40 mt-1 rounded-sm"></div>
      </div>

    </div>
  );
};
