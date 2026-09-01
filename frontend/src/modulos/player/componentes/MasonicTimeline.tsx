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
      // Find the active node and scroll it into view
      const nodes = containerRef.current.querySelectorAll('.timeline-node');
      if (nodes[indiceAtual]) {
        (nodes[indiceAtual] as HTMLElement).scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
      }
    }
  }, [indiceAtual]);

  const handlePrev = () => {
    if (indiceAtual > 0) onMudarMomento(indiceAtual - 1);
  };

  const handleNext = () => {
    if (indiceAtual < momentos.length - 1) onMudarMomento(indiceAtual + 1);
  };

  const nodeWidth = 100; // Distance between each node in pixels
  const paddingX = 40; // Padding on left and right
  const totalWidth = (momentos.length > 1 ? momentos.length - 1 : 0) * nodeWidth + paddingX * 2;
  
  // Calculate the active fill width
  const activeWidth = paddingX + (indiceAtual * nodeWidth);

  return (
    <div className="relative w-full pb-6 pt-4 border-b border-white/5 bg-[#080808] z-10 before:absolute before:inset-0 before:bg-[url('https://www.transparenttextures.com/patterns/black-scales.png')] before:opacity-10 before:pointer-events-none">
      
      {/* Decorative Outer Frame */}
      <div className="absolute top-0 left-0 w-8 h-8 border-t-2 border-l-2 border-macaonico-dourado/30"></div>
      <div className="absolute top-0 right-0 w-8 h-8 border-t-2 border-r-2 border-macaonico-dourado/30"></div>
      
      {/* Title */}
      <div className="text-center mb-8 relative">
        <h1 className="font-cinzel text-2xl tracking-wider text-slate-100 font-normal shadow-black drop-shadow-md">
          Player Sequencial Ritualístico
        </h1>
        <div className="h-px w-64 mx-auto mt-2 bg-gradient-to-r from-transparent via-macaonico-dourado to-transparent opacity-80"></div>
      </div>

      <div className="relative max-w-4xl mx-auto flex items-center px-2">
        {/* Left Arrow */}
        <button 
          onClick={handlePrev}
          className="text-macaonico-inactive hover:text-macaonico-dourado transition-colors disabled:opacity-20 absolute left-2 z-20 bg-[#080808]/80 backdrop-blur-sm rounded-full"
          disabled={indiceAtual === 0}
        >
          <ChevronLeft size={28} strokeWidth={1} />
        </button>

        {/* Scrollable Timeline Area */}
        <div className="flex-1 overflow-x-auto scrollbar-hide relative px-[5%]" ref={containerRef}>
           
           <div className="relative mx-auto" style={{ width: `${totalWidth}px`, height: '140px' }}>
              
              {/* --- SVG PROGRESS TRACK --- */}
              <svg 
                className="absolute top-[75px] left-0 pointer-events-none" 
                width={totalWidth} 
                height="30" 
                viewBox={`0 0 ${totalWidth} 30`}
              >
                <defs>
                  <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
                    <feGaussianBlur stdDeviation="3" result="blur" />
                    <feComposite in="SourceGraphic" in2="blur" operator="over" />
                  </filter>
                  <linearGradient id="gold-gradient" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor="#D4AF37" />
                    <stop offset="50%" stopColor="#FBF5B7" />
                    <stop offset="100%" stopColor="#D4AF37" />
                  </linearGradient>
                </defs>

                {/* Inactive Base Track (Double Lines) */}
                <path 
                  d={`M ${paddingX} 11 L ${totalWidth - paddingX} 11`} 
                  stroke="#3A3A3A" strokeWidth="1.5" fill="none" 
                />
                <path 
                  d={`M ${paddingX} 19 L ${totalWidth - paddingX} 19`} 
                  stroke="#3A3A3A" strokeWidth="1.5" fill="none" 
                />

                {/* Active Progress Fill (Thick glowing center line) */}
                <line 
                  x1={paddingX} y1="15" 
                  x2={activeWidth} y2="15" 
                  stroke="url(#gold-gradient)" 
                  strokeWidth="5" 
                  strokeLinecap="round"
                  filter="url(#glow)"
                  className="transition-all duration-700 ease-in-out"
                />

                {/* Nodes (Circles) */}
                {momentos.map((_, idx) => {
                  const cx = paddingX + (idx * nodeWidth);
                  const isPassado = idx <= indiceAtual;
                  const isAtivo = idx === indiceAtual;
                  
                  return (
                    <g key={`svg-node-${idx}`}>
                      {/* Outer Ring */}
                      <circle 
                        cx={cx} cy="15" r="7" 
                        stroke={isPassado ? "#D4AF37" : "#3A3A3A"} 
                        strokeWidth="1.5" 
                        fill="#080808" 
                        className="transition-colors duration-500"
                      />
                      {/* Inner Dot */}
                      <circle 
                        cx={cx} cy="15" r={isAtivo ? "4.5" : "3"} 
                        fill={isAtivo ? "#FBF5B7" : isPassado ? "#D4AF37" : "#3A3A3A"} 
                        filter={isAtivo ? "url(#glow)" : "none"}
                        className="transition-all duration-500"
                      />
                    </g>
                  );
                })}
              </svg>

              {/* HTML Nodes (Icons and Text overlaid on SVG) */}
              {momentos.map((momento, idx) => {
                const x = paddingX + (idx * nodeWidth);
                const isAtivo = idx === indiceAtual;

                return (
                  <div 
                    key={`html-node-${momento.evento_id}`}
                    className="timeline-node absolute flex flex-col items-center justify-end cursor-pointer group"
                    style={{ left: `${x - 40}px`, width: '80px', top: '5px' }}
                    onClick={() => onMudarMomento(idx)}
                  >
                    {/* Icon Box */}
                    <div className={`
                      mb-[26px] flex items-center justify-center transition-all duration-500 relative rounded-[10px]
                      ${isAtivo 
                        ? 'w-12 h-12 border-[1.5px] border-macaonico-dourado bg-macaonico-dourado/10 shadow-[0_0_15px_rgba(212,175,55,0.3)]' 
                        : 'w-10 h-10 border border-macaonico-inactive bg-[#0c0c0c] group-hover:border-macaonico-dourado/50'
                      }
                    `}>
                      {/* Arrow Pointer */}
                      <div className={`absolute -bottom-[6px] left-1/2 -translate-x-1/2 w-[10px] h-[10px] transform rotate-45 border-b-[1.5px] border-r-[1.5px] transition-colors duration-500
                        ${isAtivo ? 'border-macaonico-dourado bg-[#1a1710]' : 'border-macaonico-inactive bg-[#0c0c0c]'}
                      `}></div>
                      
                      <div className={`relative z-10 ${isAtivo ? 'text-macaonico-dourado' : 'text-macaonico-inactive'}`}>
                        {getMasonicIcon(momento.evento_nome, { size: isAtivo ? 26 : 20, strokeWidth: isAtivo ? 1.5 : 1 })}
                      </div>
                    </div>

                    {/* Label */}
                    <div className={`
                      absolute top-[100px] w-24 text-[10px] font-cinzel transition-all duration-300 whitespace-nowrap text-center tracking-wide
                      ${isAtivo ? 'text-macaonico-dourado font-bold' : 'text-slate-400 font-normal'}
                    `}>
                      {momento.evento_nome.substring(0, 16)}
                    </div>
                  </div>
                );
              })}
           </div>
        </div>

        {/* Right Arrow */}
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
