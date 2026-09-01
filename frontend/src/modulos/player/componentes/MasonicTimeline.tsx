import React, { useRef, useEffect } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { MomentoExecucao } from '../../../compartilhado/tipos';
import { getMasonicIcon } from './MasonicIcons';

interface MasonicTimelineProps {
  momentos: MomentoExecucao[];
  indiceAtual: number;
  onMudarMomento: (idx: number) => void;
}

export const MasonicTimeline: React.FC<MasonicTimelineProps> = ({ momentos, indiceAtual, onMudarMomento }) => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (containerRef.current) {
      const activeEl = containerRef.current.children[indiceAtual] as HTMLElement;
      if (activeEl) {
        activeEl.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
      }
    }
  }, [indiceAtual]);

  const handlePrev = () => {
    if (indiceAtual > 0) onMudarMomento(indiceAtual - 1);
  };

  const handleNext = () => {
    if (indiceAtual < momentos.length - 1) onMudarMomento(indiceAtual + 1);
  };

  return (
    <div className="relative w-full py-6 mb-2 border-b border-macaonico-inactive/30">
      {/* Decorative top border */}
      <div className="absolute top-0 left-0 right-0 flex justify-center">
        <div className="w-full max-w-3xl border-t border-macaonico-dourado/40 relative">
          <div className="absolute -top-1 left-0 w-2 h-2 bg-macaonico-dourado transform rotate-45"></div>
          <div className="absolute -top-1 right-0 w-2 h-2 bg-macaonico-dourado transform rotate-45"></div>
          <div className="absolute -top-[18px] left-1/2 -translate-x-1/2 w-8 h-8 border border-macaonico-dourado/40 transform rotate-45 bg-macaonico-surface"></div>
        </div>
      </div>

      <div className="text-center mt-6 mb-6">
        <h1 className="font-cinzel text-3xl tracking-widest text-transparent bg-clip-text bg-gold-gradient font-light">
          Ritual Sequence Player
        </h1>
        <div className="h-px bg-macaonico-dourado/30 w-64 mx-auto mt-2"></div>
      </div>

      <div className="relative max-w-3xl mx-auto flex items-center px-4">
        <button 
          onClick={handlePrev}
          className="text-macaonico-inactive hover:text-macaonico-dourado transition-colors disabled:opacity-30 absolute left-0 z-10"
          disabled={indiceAtual === 0}
        >
          <ChevronLeft size={28} strokeWidth={1} />
        </button>

        <div className="flex-1 overflow-hidden relative">
           {/* Connecting Line */}
           <div className="absolute top-[40px] left-0 right-0 h-px bg-macaonico-inactive/50 z-0"></div>
           
           <div 
             ref={containerRef}
             className="flex items-end space-x-4 overflow-x-auto scrollbar-hide snap-x snap-mandatory py-4 px-[50%] transition-all duration-500 ease-out"
           >
             {momentos.map((momento, idx) => {
               const isAtivo = idx === indiceAtual;
               
               return (
                 <div 
                   key={momento.evento_id}
                   className="snap-center flex flex-col items-center justify-end min-w-[80px] relative z-10 cursor-pointer group"
                   onClick={() => onMudarMomento(idx)}
                 >
                   {/* Icon Container */}
                   <div className={`
                     mb-4 flex items-center justify-center transition-all duration-500 relative
                     ${isAtivo 
                       ? 'w-16 h-16 border-2 border-macaonico-dourado rounded-md bg-macaonico-dourado/10 shadow-[0_0_15px_rgba(212,175,55,0.4)]' 
                       : 'w-12 h-12 border border-macaonico-inactive rounded-md bg-macaonico-surface group-hover:border-macaonico-dourado/50'
                     }
                   `}>
                     {/* The speech bubble pointer */}
                     {isAtivo && (
                       <div className="absolute -bottom-[9px] left-1/2 -translate-x-1/2 w-4 h-4 border-b-2 border-r-2 border-macaonico-dourado transform rotate-45 bg-macaonico-surface z-0"></div>
                     )}
                     <div className={`relative z-10 ${isAtivo ? 'text-macaonico-dourado' : 'text-macaonico-inactive'}`}>
                       {getMasonicIcon(momento.nome, { size: isAtivo ? 32 : 24 })}
                     </div>
                   </div>

                   {/* Node Dot */}
                   <div className={`
                     w-4 h-4 rounded-full border-2 z-10 bg-macaonico-surface transition-all duration-300
                     ${isAtivo ? 'border-macaonico-dourado shadow-[0_0_10px_rgba(212,175,55,0.8)]' : 'border-macaonico-inactive'}
                   `}>
                     {isAtivo && <div className="w-full h-full bg-macaonico-dourado rounded-full scale-50"></div>}
                   </div>

                   {/* Label */}
                   <div className={`
                     mt-3 text-xs font-cinzel transition-all duration-300 whitespace-nowrap text-center
                     ${isAtivo ? 'text-macaonico-dourado font-bold' : 'text-macaonico-inactive font-normal'}
                   `}>
                     {momento.nome.substring(0, 15)}
                   </div>
                 </div>
               );
             })}
           </div>
        </div>

        <button 
          onClick={handleNext}
          className="text-macaonico-inactive hover:text-macaonico-dourado transition-colors disabled:opacity-30 absolute right-0 z-10"
          disabled={indiceAtual === momentos.length - 1}
        >
          <ChevronRight size={28} strokeWidth={1} />
        </button>
      </div>
    </div>
  );
};
