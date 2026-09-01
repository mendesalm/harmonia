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

export const MasonicTimeline: React.FC<MasonicTimelineProps> = ({ momentos, indiceAtual, tocando, onMudarMomento }) => {
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
  const viewWidth = 300; // Fixed width for 3 items
  const paddingX = viewWidth / 2; // Padding so first and last items can reach exact center
  const totalWidth = (momentos.length > 1 ? momentos.length - 1 : 0) * nodeWidth + paddingX * 2;
  
  // Calculate the active fill width
  const activeWidth = paddingX + (indiceAtual * nodeWidth);

  // Auto-scroll logic to ALWAYS center the active node in the 300px viewport
  useEffect(() => {
    if (containerRef.current) {
      // scrollLeft should be the center of the active node minus half the viewport
      const targetScroll = (paddingX + indiceAtual * nodeWidth) - (viewWidth / 2);
      containerRef.current.scrollTo({ left: targetScroll, behavior: 'smooth' });
    }
  }, [indiceAtual]);

  return (
    <div className="relative w-full pb-6 pt-4 border-b border-white/5 bg-[#080808] z-10 before:absolute before:inset-0 before:bg-[url('https://www.transparenttextures.com/patterns/black-scales.png')] before:opacity-10 before:pointer-events-none">
      
      {/* Decorative Outer Frame */}
      <div className="absolute top-0 left-0 w-8 h-8 border-t-2 border-l-2 border-macaonico-dourado/30"></div>
      <div className="absolute top-0 right-0 w-8 h-8 border-t-2 border-r-2 border-macaonico-dourado/30"></div>
      
      {/* Title */}
      <div className="text-center mb-8 relative">
        <h1 className="font-cinzel text-3xl tracking-widest text-slate-100 font-normal shadow-black drop-shadow-lg">
          Player Sequencial Ritualístico
        </h1>
        <div className="h-px w-72 mx-auto mt-3 bg-gradient-to-r from-transparent via-macaonico-dourado to-transparent opacity-80"></div>
      </div>

      <div className="relative w-full max-w-lg mx-auto flex items-center px-2 justify-center">
        {/* Left Arrow */}
        <button 
          onClick={handlePrev}
          className="text-macaonico-inactive hover:text-macaonico-dourado transition-colors disabled:opacity-20 absolute left-4 z-20 bg-[#080808]/80 backdrop-blur-sm rounded-full"
          disabled={indiceAtual === 0}
        >
          <ChevronLeft size={28} strokeWidth={1} />
        </button>

        {/* Scrollable Timeline Area with Fade Mask to show exactly 3 items */}
        <div 
          className="overflow-hidden scrollbar-hide relative" 
          ref={containerRef}
          style={{ 
            width: `${viewWidth}px`, // Strictly 300px wide
            maskImage: 'linear-gradient(to right, transparent 0%, black 20%, black 80%, transparent 100%)',
            WebkitMaskImage: 'linear-gradient(to right, transparent 0%, black 20%, black 80%, transparent 100%)'
          }}
        >
           <div className="relative" style={{ width: `${totalWidth}px`, height: '150px' }}>
              
              {/* --- SVG PROGRESS TRACK --- */}
              <svg 
                className="absolute top-[75px] left-0 pointer-events-none" 
                width={totalWidth} 
                height="30" 
                viewBox={`0 0 ${totalWidth} 30`}
              >
                <defs>
                  <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
                    <feGaussianBlur stdDeviation="4" result="blur" />
                    <feComposite in="SourceGraphic" in2="blur" operator="over" />
                  </filter>
                  <linearGradient id="gold-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
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
                <rect 
                  x={paddingX} 
                  y="12.5" 
                  width={Math.max(0, activeWidth - paddingX)} 
                  height="5" 
                  rx="2.5"
                  fill="url(#gold-gradient)" 
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
                        cx={cx} cy="15" r={isAtivo ? "12" : "7"} 
                        stroke={isAtivo ? "#FBF5B7" : isPassado ? "#D4AF37" : "#3A3A3A"} 
                        strokeWidth={isAtivo ? "2" : "1.5"} 
                        fill="#080808" 
                        filter={isAtivo ? "url(#glow)" : "none"}
                        className="transition-all duration-500"
                      />
                      
                      {/* Inner Element */}
                      {isAtivo ? (
                        <g transform={`translate(${cx - 10}, 5) scale(0.85)`} stroke="#FBF5B7" strokeWidth="1.8" fill="none" strokeLinecap="round" strokeLinejoin="round" filter="url(#glow)">
                           {/* Compass */}
                           <path d="M12 4 L5 18 M12 4 L19 18" />
                           {/* Square */}
                           <path d="M6 13 L12 19 L18 13" />
                           {/* Hinge */}
                           <circle cx="12" cy="4" r="1.5" fill="#FBF5B7" />
                           {/* G (Central Dot) */}
                           <circle cx="12" cy="11.5" r="1" fill="#FBF5B7" stroke="none" />
                        </g>
                      ) : (
                        <circle 
                          cx={cx} cy="15" r="3" 
                          fill={isPassado ? "#D4AF37" : "#3A3A3A"} 
                          className="transition-all duration-500"
                        />
                      )}
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
                        ? 'w-14 h-14 border-2 border-macaonico-dourado bg-macaonico-dourado/20 shadow-[0_0_25px_rgba(212,175,55,0.7)] scale-110 z-20' 
                        : 'w-10 h-10 border border-macaonico-inactive bg-[#0c0c0c] group-hover:border-macaonico-dourado/50 opacity-50 hover:opacity-100 z-10'
                      }
                    `}>
                      {/* Arrow Pointer */}
                      <div className={`absolute -bottom-[6px] left-1/2 -translate-x-1/2 w-[10px] h-[10px] transform rotate-45 border-b-[1.5px] border-r-[1.5px] transition-colors duration-500
                        ${isAtivo ? 'border-macaonico-dourado bg-macaonico-dourado' : 'border-macaonico-inactive bg-[#0c0c0c]'}
                      `}></div>
                      
                      <div className={`relative z-10 ${isAtivo ? 'text-macaonico-dourado drop-shadow-[0_0_8px_rgba(212,175,55,1)]' : 'text-macaonico-inactive'}`}>
                        {getMasonicIcon(momento.evento_nome, { size: isAtivo ? 30 : 20, strokeWidth: isAtivo ? 1.5 : 1 })}
                      </div>

                      {/* Equalizer (Bargraph) Overlay when Playing */}
                      {isAtivo && tocando && (
                        <div className="absolute inset-0 flex items-center justify-center bg-[#111]/80 rounded-[8px] z-30 backdrop-blur-[1px]">
                          <style>{`
                            @keyframes eq {
                              0%, 100% { transform: scaleY(0.3); }
                              50% { transform: scaleY(1); }
                            }
                            .eq-bar {
                              width: 3px;
                              background-color: #D4AF37;
                              border-radius: 2px;
                              animation: eq 1s ease-in-out infinite;
                              transform-origin: bottom;
                              box-shadow: 0 0 5px rgba(212,175,55,0.8);
                            }
                          `}</style>
                          <div className="flex space-x-[3px] items-end h-[18px]">
                            <div className="eq-bar h-[80%]" style={{ animationDuration: '0.8s', animationDelay: '0.1s' }}></div>
                            <div className="eq-bar h-[100%]" style={{ animationDuration: '0.9s', animationDelay: '0.3s' }}></div>
                            <div className="eq-bar h-[60%]" style={{ animationDuration: '0.7s', animationDelay: '0.0s' }}></div>
                            <div className="eq-bar h-[90%]" style={{ animationDuration: '1.1s', animationDelay: '0.2s' }}></div>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Label - ONLY VISIBLE IF ACTIVE */}
                    <div className={`
                      absolute top-[100px] w-64 text-sm font-cinzel transition-all duration-300 whitespace-normal leading-tight text-center tracking-widest text-macaonico-dourado font-bold drop-shadow-[0_0_8px_rgba(212,175,55,0.9)]
                      ${isAtivo ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2 pointer-events-none'}
                    `}>
                      {momento.evento_nome}
                    </div>
                  </div>
                );
              })}
           </div>
        </div>

        {/* Right Arrow */}
        <button 
          onClick={handleNext}
          className="text-macaonico-inactive hover:text-macaonico-dourado transition-colors disabled:opacity-20 absolute right-4 z-20 bg-[#080808]/80 backdrop-blur-sm rounded-full"
          disabled={indiceAtual === momentos.length - 1}
        >
          <ChevronRight size={28} strokeWidth={1} />
        </button>
      </div>
    </div>
  );
};
