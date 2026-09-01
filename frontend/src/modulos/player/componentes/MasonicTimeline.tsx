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

  // Calculate the progress width based on the active index
  const numItems = momentos.length > 1 ? momentos.length - 1 : 1;
  const progressPercent = (indiceAtual / numItems) * 100;

  return (
    <div className="relative w-full pb-6 pt-4 border-b border-white/5 bg-[#080808] z-10 before:absolute before:inset-0 before:bg-[url('https://www.transparenttextures.com/patterns/black-scales.png')] before:opacity-10 before:pointer-events-none">
      
      {/* Decorative Outer Frame (Top Corner Details) */}
      <div className="absolute top-0 left-0 w-8 h-8 border-t-2 border-l-2 border-macaonico-dourado/30"></div>
      <div className="absolute top-0 right-0 w-8 h-8 border-t-2 border-r-2 border-macaonico-dourado/30"></div>
      
      {/* Title */}
      <div className="text-center mb-8 relative">
        <h1 className="font-cinzel text-2xl tracking-wider text-slate-100 font-normal shadow-black drop-shadow-md">
          Player Sequencial Ritualístico
        </h1>
        <div className="h-px w-64 mx-auto mt-2 bg-gradient-to-r from-transparent via-macaonico-dourado to-transparent opacity-80"></div>
      </div>

      <div className="relative max-w-3xl mx-auto flex items-center px-2">
        <button 
          onClick={handlePrev}
          className="text-macaonico-inactive hover:text-macaonico-dourado transition-colors disabled:opacity-20 absolute left-2 z-20 bg-[#080808]/80 backdrop-blur-sm rounded-full"
          disabled={indiceAtual === 0}
        >
          <ChevronLeft size={28} strokeWidth={1} />
        </button>

        <div className="flex-1 overflow-x-auto scrollbar-hide relative px-[10%]" ref={containerRef}>
           
           <div className="flex items-end justify-between min-w-max relative z-10 px-8 transition-all duration-500 ease-out">
             {/* Timeline Line Container (Now inside the flex container to stretch precisely) */}
             <div className="absolute top-[68px] left-12 right-12 h-[2px] bg-macaonico-inactive/40 z-0">
                {/* Active Glowing Line */}
                <div 
                  className="absolute top-0 left-0 h-full bg-macaonico-dourado shadow-[0_0_10px_rgba(212,175,55,1)] transition-all duration-700 ease-in-out"
                  style={{ width: `${progressPercent}%` }}
                ></div>
             </div>
             
             {momentos.map((momento, idx) => {
               const isAtivo = idx === indiceAtual;
               const isPassado = idx <= indiceAtual;
               
               return (
                 <div 
                   key={momento.evento_id}
                   className="flex flex-col items-center justify-end relative z-10 cursor-pointer group mx-4 w-20"
                   onClick={() => onMudarMomento(idx)}
                 >
                   {/* Speech Bubble Icon Container */}
                   <div className={`
                     mb-6 flex items-center justify-center transition-all duration-500 relative rounded-lg
                     ${isAtivo 
                       ? 'w-14 h-14 border-[1.5px] border-macaonico-dourado bg-macaonico-dourado/10 shadow-[0_0_15px_rgba(212,175,55,0.3)]' 
                       : 'w-12 h-12 border border-macaonico-inactive bg-[#0c0c0c] group-hover:border-macaonico-dourado/50'
                     }
                   `}>
                     {/* The speech bubble pointer */}
                     <div className={`absolute -bottom-[7px] left-1/2 -translate-x-1/2 w-3 h-3 transform rotate-45 border-b-[1.5px] border-r-[1.5px] transition-colors duration-500
                       ${isAtivo ? 'border-macaonico-dourado bg-[#1a1710]' : 'border-macaonico-inactive bg-[#0c0c0c]'}
                     `}></div>
                     
                     <div className={`relative z-10 ${isAtivo ? 'text-macaonico-dourado' : 'text-macaonico-inactive'}`}>
                       {getMasonicIcon(momento.evento_nome, { size: isAtivo ? 28 : 22, strokeWidth: isAtivo ? 1.5 : 1 })}
                     </div>
                   </div>

                   {/* Bullseye Dot */}
                   <div className="relative w-4 h-4 flex items-center justify-center z-10 bg-[#080808]">
                     <div className={`
                       absolute inset-0 rounded-full border-2 transition-all duration-500
                       ${isPassado ? 'border-macaonico-dourado' : 'border-macaonico-inactive'}
                     `}></div>
                     <div className={`
                       w-1.5 h-1.5 rounded-full transition-all duration-500
                       ${isAtivo ? 'bg-macaonico-dourado shadow-[0_0_8px_rgba(212,175,55,1)] scale-150' : 
                         isPassado ? 'bg-macaonico-dourado/50' : 'bg-transparent'
                       }
                     `}></div>
                   </div>

                   {/* Label */}
                   <div className={`
                     mt-3 text-[10px] font-cinzel transition-all duration-300 whitespace-nowrap text-center
                     ${isAtivo ? 'text-macaonico-dourado font-bold' : 'text-slate-400 font-normal'}
                   `}>
                     {momento.evento_nome.substring(0, 15)}
                   </div>
                 </div>
               );
             })}
           </div>
        </div>

        <button 
          onClick={handleNext}
          className="text-macaonico-inactive hover:text-macaonico-dourado transition-colors disabled:opacity-20 absolute right-2 z-20 bg-[#080808]/80 backdrop-blur-sm rounded-full"
          disabled={indiceAtual === momentos.length - 1}
        >
          <ChevronRight size={28} strokeWidth={1} />
        </button>
      </div>
    </div>
  );
};
