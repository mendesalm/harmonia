import React, { useState, useRef } from 'react';
import { PlusCircle, Disc3 } from 'lucide-react';
import { MomentoExecucao, Musica } from '../../../compartilhado/tipos';

interface Props {
  momento: MomentoExecucao;
  indiceMomento: number;
  isAtivo: boolean;
  musicas: Musica[];
  musicaSelecionadaId?: string;
  tocando: boolean;
  onSelecionarMusica: (musicaId: string) => void;
  onAlternarPreferencia?: (eventoId: string, musicaId: string, atual: boolean) => void;
  onAbrirUpload: () => void;
}

export const CardMomento3D: React.FC<Props> = ({
  momento,
  indiceMomento,
  isAtivo,
  musicas,
  musicaSelecionadaId,
  tocando,
  onSelecionarMusica,
  onAlternarPreferencia,
  onAbrirUpload,
}) => {
  // Localiza o índice da música atualmente selecionada
  const indiceMusicaAtiva = Math.max(
    0,
    musicas.findIndex((m) => m.id === musicaSelecionadaId)
  );

  // Estados de Arraste Vertical 3D
  const [offsetYDrag, setOffsetYDrag] = useState(0);
  const [estaArrastandoV, setEstaArrastandoV] = useState(false);
  const startYRef = useRef(0);
  const currentDragYRef = useRef(0);
  const ultimoWheelRef = useRef(0);

  // Duração total estimada da playlist
  const tempoTotalFormatado = React.useMemo(() => {
    const totalSeg = musicas.reduce((acc, m) => acc + (m.duracao_segundos || 180), 0);
    const min = Math.floor(totalSeg / 60);
    const seg = Math.floor(totalSeg % 60);
    return `${min < 10 ? '0' : ''}${min}:${seg < 10 ? '0' : ''}${seg}`;
  }, [musicas]);

  // Início do Arraste Vertical (Touch no Mobile ou Mouse no Desktop)
  const handlePointerDown = (e: React.PointerEvent) => {
    if (!isAtivo) return;
    if ((e.target as HTMLElement).closest('button, a')) return;

    e.stopPropagation();
    setEstaArrastandoV(true);
    startYRef.current = e.clientY;
    currentDragYRef.current = 0;

    try {
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    } catch {}
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!estaArrastandoV) return;
    e.stopPropagation();

    const deltaY = e.clientY - startYRef.current;
    currentDragYRef.current = deltaY;
    setOffsetYDrag(deltaY);
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (!estaArrastandoV) return;
    e.stopPropagation();
    setEstaArrastandoV(false);

    try {
      (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {}

    const deltaY = currentDragYRef.current;
    setOffsetYDrag(0);

    if (musicas.length > 1) {
      // Sensibilidade de arraste: ~35px muda 1 faixa
      const passos = Math.round(-deltaY / 38);
      if (passos !== 0) {
        const novoIndice = Math.max(0, Math.min(musicas.length - 1, indiceMusicaAtiva + passos));
        if (musicas[novoIndice] && musicas[novoIndice].id !== musicaSelecionadaId) {
          onSelecionarMusica(musicas[novoIndice].id);
        }
      }
    }
  };

  // Suporte a Mouse Wheel Scroll Vertical (Roda do Mouse)
  const handleWheel = (e: React.WheelEvent) => {
    if (!isAtivo) return;
    e.stopPropagation();

    if (musicas.length <= 1) return;

    const agora = Date.now();
    if (agora - ultimoWheelRef.current < 120) {
      return;
    }

    if (Math.abs(e.deltaY) > 5) {
      ultimoWheelRef.current = agora;
      const direcao = e.deltaY > 0 ? 1 : -1;
      const novoIndice = Math.max(0, Math.min(musicas.length - 1, indiceMusicaAtiva + direcao));
      if (novoIndice !== indiceMusicaAtiva && musicas[novoIndice]) {
        onSelecionarMusica(musicas[novoIndice].id);
      }
    }
  };

  const formatarTempo = (segundos: number) => {
    if (isNaN(segundos) || segundos <= 0) return '0:00';
    const min = Math.floor(segundos / 60);
    const seg = Math.floor(segundos % 60);
    return `${min}:${seg < 10 ? '0' : ''}${seg}`;
  };

  return (
    <div
      onWheel={handleWheel}
      className={`w-[320px] sm:w-[360px] md:w-[380px] lg:w-[400px] h-[310px] sm:h-[335px] md:h-[350px] rounded-[26px] p-3 sm:p-3.5 flex flex-col justify-between select-none transition-all duration-200 ${
        isAtivo
          ? 'border-2 border-[#00E5FF] shadow-[0_20px_50px_rgba(0,0,0,1),0_0_35px_rgba(0,229,255,0.35)]'
          : 'border border-cyan-500/25 shadow-xl pointer-events-none'
      }`}
      style={{
        backgroundColor: isAtivo ? '#060e1d' : '#050b16',
        opacity: isAtivo ? 1 : 0.85,
      }}
    >
      {/* 1. HERO BANNER DO MOMENTO LITÚRGICO */}
      <div 
        className="relative w-full h-22 sm:h-24 md:h-26 rounded-2xl overflow-hidden p-3 flex flex-col items-center justify-center border border-cyan-500/20 shadow-inner shrink-0 text-center"
        style={{ backgroundColor: '#021424' }}
      >
        <div className="absolute inset-0 bg-gradient-to-br from-[#02182b] via-[#04324f] to-[#011424] opacity-100" />
        
        <svg className="absolute inset-0 w-full h-full opacity-40 mix-blend-screen pointer-events-none" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <linearGradient id={`grad-${indiceMomento}`} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#00E5FF" stopOpacity="0.8" />
              <stop offset="50%" stopColor="#005b82" stopOpacity="0.3" />
              <stop offset="100%" stopColor="#00E5FF" stopOpacity="0.9" />
            </linearGradient>
          </defs>
          <path d="M-100,35 Q100,95 300,30 T700,55 L700,180 L-100,180 Z" fill={`url(#grad-${indiceMomento})`} />
          <path d="M-50,65 Q150,12 350,75 T750,30 L750,180 L-50,180 Z" fill="#00E5FF" opacity="0.2" />
        </svg>

        <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-[#00E5FF] to-transparent opacity-60" />

        <div className="relative z-10 flex flex-col items-center justify-center w-full">
          <h3 className="text-sm sm:text-base font-black text-white font-mono uppercase tracking-wider leading-tight truncate drop-shadow-md w-full px-2">
            {momento.evento_nome}
          </h3>

          <div className="flex items-center justify-center gap-2 mt-1 font-mono text-[9px] sm:text-[10px] font-bold text-[#00E5FF] tracking-wider">
            <span>{musicas.length} {musicas.length === 1 ? 'TRACK' : 'TRACKS'}</span>
            <span className="text-cyan-500/60">//</span>
            <span>{tempoTotalFormatado}</span>
          </div>
        </div>
      </div>

      {/* 2. LISTA DE MÚSICAS (SCROLL NATIVO) */}
      <div
        className={`relative flex-1 my-1 rounded-2xl border border-white/5 overflow-hidden ${
          isAtivo ? 'pointer-events-auto' : 'pointer-events-none'
        }`}
        style={{ backgroundColor: '#050b16' }}
      >
        {musicas.length === 0 ? (
          <div className="py-3 px-3 rounded-2xl bg-white/[0.02] text-center flex flex-col items-center justify-center h-full gap-3 w-full">
            <p className="text-xs font-mono text-slate-500 italic">
              [ SILÊNCIO PROGRAMADO ]
            </p>
            {isAtivo && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onAbrirUpload();
                }}
                className="px-4 py-2 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 text-xs font-bold hover:bg-cyan-500/20 transition-colors pointer-events-auto"
              >
                + Catalogar Música
              </button>
            )}
          </div>
        ) : (
          <div className="w-full h-[160px] sm:h-[175px] overflow-y-auto custom-scrollbar p-2 flex flex-col gap-1.5">
            {musicas.map((musica, idx) => {
              const estaSelecionada = idx === indiceMusicaAtiva;
              return (
                <div
                  key={musica.id}
                  onClick={(e) => {
                    if (isAtivo && musica.id !== musicaSelecionadaId) {
                      e.stopPropagation();
                      onSelecionarMusica(musica.id);
                    }
                  }}
                  className={`w-full px-3 py-2.5 rounded-xl transition-all ease-out border flex items-center justify-between cursor-pointer ${
                    estaSelecionada
                      ? 'border-cyan-500/80 shadow-[0_0_15px_rgba(0,229,255,0.25)] text-[#00E5FF] bg-[#0b1c33]'
                      : 'border-white/5 hover:border-cyan-500/30 text-slate-300 bg-[#071322] hover:bg-[#091829]'
                  }`}
                >
                  <div className="flex flex-col min-w-0 pr-1.5 flex-1">
                    <div className="flex items-center gap-2 truncate w-full">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          const isPref = !!(musica as any).preferida;
                          if (isPref) return;
                          
                          if (onAlternarPreferencia && momento.evento_id) {
                            onAlternarPreferencia(momento.evento_id, musica.id, false); 
                          }
                        }}
                        title={(musica as any).preferida ? "Música preferencial" : "Fixar como preferida"}
                        className={`shrink-0 p-1.5 -ml-1.5 rounded-lg transition-colors ${
                          (musica as any).preferida ? 'text-amber-400' : 'text-slate-600 hover:text-amber-400/50 hover:bg-white/10'
                        }`}
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill={(musica as any).preferida ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
                        </svg>
                      </button>
                      <span className={`text-[13px] font-mono font-bold truncate ${estaSelecionada ? 'text-[#00E5FF]' : 'text-slate-300'}`}>
                        {String(idx + 1).padStart(2, '0')} // {musica.titulo.toUpperCase()}
                      </span>
                    </div>

                    <span className="text-[10px] font-mono text-slate-400 truncate ml-8">
                      {musica.autor_artista || 'Compositor Tradicional'}
                    </span>
                  </div>

                  {/* Indicador Lateral: Tempo */}
                  <div className="shrink-0 flex items-center gap-1 ml-2">
                    {estaSelecionada && isAtivo && tocando ? (
                      <span className="text-[11px] font-mono font-bold text-cyan-400">
                        {formatarTempo(musica.duracao_segundos || 180)}
                      </span>
                    ) : (
                      <span className="text-[11px] font-mono text-slate-500">
                        {formatarTempo(musica.duracao_segundos || 180)}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 3. RODAPÉ DO CARD */}
      <div className="pt-1 border-t border-white/5 flex items-center justify-between text-[9px] sm:text-[10px] font-mono text-slate-500">
        <span className="flex items-center gap-1.5 text-cyan-400/90 truncate">
          <Disc3 className={`w-3 h-3 text-[#00E5FF] ${tocando ? 'animate-spin' : ''}`} />
          <span className="truncate">{isAtivo ? 'Mouse Scroll / Arraste faixas' : 'Clique para selecionar'}</span>
        </span>
        {isAtivo && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onAbrirUpload();
            }}
            className="text-cyan-400 hover:underline font-bold pointer-events-auto shrink-0 ml-1.5"
          >
            + Faixa
          </button>
        )}
      </div>

    </div>
  );
};
