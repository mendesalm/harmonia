import React, { useState, useRef } from 'react';
import { PlusCircle, Sparkles } from 'lucide-react';
import { MomentoExecucao, Musica } from '../../../compartilhado/tipos';

interface Props {
  momento: MomentoExecucao;
  indiceMomento: number;
  isAtivo: boolean;
  musicas: Musica[];
  musicaSelecionadaId?: string;
  tocando: boolean;
  onSelecionarMusica: (musicaId: string) => void;
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
  onAbrirUpload,
}) => {
  // Índice da música ativa na lista
  const indiceMusicaAtiva = Math.max(
    0,
    musicas.findIndex((m) => m.id === musicaSelecionadaId)
  );

  // Estados de Arraste Vertical 3D
  const [offsetYDrag, setOffsetYDrag] = useState(0);
  const [estaArrastandoV, setEstaArrastandoV] = useState(false);
  const startYRef = useRef(0);
  const currentDragYRef = useRef(0);

  // Duração total estimada da playlist
  const tempoTotalFormatado = React.useMemo(() => {
    const totalSeg = musicas.reduce((acc, m) => acc + (m.duracao_segundos || 180), 0);
    const min = Math.floor(totalSeg / 60);
    const seg = Math.floor(totalSeg % 60);
    return `${min < 10 ? '0' : ''}${min}:${seg < 10 ? '0' : ''}${seg}`;
  }, [musicas]);

  // Handlers do Arraste Vertical (Pointer Events)
  const handlePointerDown = (e: React.PointerEvent) => {
    if (musicas.length <= 1) return;
    setEstaArrastandoV(true);
    startYRef.current = e.clientY;
    currentDragYRef.current = 0;
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!estaArrastandoV) return;
    const deltaY = e.clientY - startYRef.current;
    currentDragYRef.current = deltaY;
    setOffsetYDrag(deltaY);
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (!estaArrastandoV) return;
    setEstaArrastandoV(false);
    (e.target as HTMLElement).releasePointerCapture?.(e.pointerId);

    const deltaY = currentDragYRef.current;
    setOffsetYDrag(0);

    const passos = Math.round(-deltaY / 54);
    if (passos !== 0) {
      const novoIndice = Math.max(0, Math.min(musicas.length - 1, indiceMusicaAtiva + passos));
      if (musicas[novoIndice] && musicas[novoIndice].id !== musicaSelecionadaId) {
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
      className={`w-[320px] sm:w-[360px] md:w-[380px] h-[400px] sm:h-[420px] rounded-[30px] p-3.5 flex flex-col justify-between select-none transition-all duration-200 ${
        isAtivo
          ? 'bg-[#060e1d] border-2 border-[#00E5FF] shadow-[0_15px_50px_rgba(0,0,0,0.95),0_0_35px_rgba(0,229,255,0.3)]'
          : 'bg-[#040914] border border-cyan-500/20 opacity-60 hover:opacity-85 shadow-2xl'
      }`}
    >
      {/* 1. HERO BANNER DO MOMENTO LITÚRGICO */}
      <div className="relative w-full h-32 sm:h-34 rounded-2xl overflow-hidden p-3.5 flex flex-col justify-end border border-cyan-500/20 shadow-inner shrink-0 bg-[#021424]">
        
        {/* Fundo com Textura Fluídica / Cyber Waves */}
        <div className="absolute inset-0 bg-gradient-to-br from-[#02182b] via-[#04324f] to-[#011424] opacity-100" />
        
        <svg className="absolute inset-0 w-full h-full opacity-40 mix-blend-screen pointer-events-none" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <linearGradient id={`grad-${indiceMomento}`} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#00E5FF" stopOpacity="0.8" />
              <stop offset="50%" stopColor="#005b82" stopOpacity="0.3" />
              <stop offset="100%" stopColor="#00E5FF" stopOpacity="0.9" />
            </linearGradient>
          </defs>
          <path d="M-100,45 Q100,110 300,35 T700,60 L700,200 L-100,200 Z" fill={`url(#grad-${indiceMomento})`} />
          <path d="M-50,75 Q150,15 350,85 T750,35 L750,200 L-50,200 Z" fill="#00E5FF" opacity="0.2" />
        </svg>

        {/* Linha superior de neon */}
        <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-[#00E5FF] to-transparent opacity-60" />

        <div className="relative z-10">
          <span className="text-[10px] font-mono tracking-widest text-cyan-300 font-bold uppercase block mb-0.5">
            {String(indiceMomento + 1).padStart(2, '0')} // MOMENTO RITUALÍSTICO
          </span>

          <h3 className="text-base sm:text-lg font-black text-white font-mono uppercase tracking-wider leading-tight truncate drop-shadow-md">
            {momento.evento_nome}
          </h3>

          <div className="flex items-center gap-2 mt-1.5 font-mono text-[10px] font-bold text-[#00E5FF] tracking-wider">
            <span>{musicas.length} {musicas.length === 1 ? 'TRACK' : 'TRACKS'}</span>
            <span className="text-cyan-500/60">//</span>
            <span>{tempoTotalFormatado}</span>
          </div>
        </div>
      </div>

      {/* 2. CARROSSEL VERTICAL 3D DE MÚSICAS (DRAGGABLE VERTICALMENTE) */}
      <div
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        className="relative flex-1 my-2 overflow-hidden flex flex-col items-center justify-center cursor-grab active:cursor-grabbing preserve-3d perspective-1000 touch-none bg-[#050b16] rounded-2xl border border-white/5"
      >
        {musicas.length === 0 ? (
          <div className="py-4 px-3 rounded-2xl bg-white/[0.02] text-center flex flex-col items-center gap-2 w-full">
            <p className="text-[11px] font-mono text-slate-400 italic">
              [ SILÊNCIO PROGRAMADO ]
            </p>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onAbrirUpload();
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-cyan-500/15 hover:bg-cyan-500/25 text-[#00E5FF] border border-cyan-500/30 text-[10px] font-mono font-bold transition-all cursor-pointer"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span>+ CATALOGAR FAIXA</span>
            </button>
          </div>
        ) : (
          <div className="relative w-full h-[210px] flex items-center justify-center preserve-3d">
            {musicas.map((musica, idx) => {
              const estaSelecionada = idx === indiceMusicaAtiva;
              const distancia = idx - indiceMusicaAtiva;
              
              const dragOffsetItems = offsetYDrag / 54;
              const deltaCont = distancia - dragOffsetItems;

              const visivel = Math.abs(deltaCont) <= 2.5;
              if (!visivel) return null;

              const anguloRotacaoX = deltaCont * 26;
              const translateY = deltaCont * 54;
              const translateZ = 30 - Math.min(Math.abs(deltaCont) * 25, 60);
              const opacidade = Math.max(0.2, 1 - Math.abs(deltaCont) * 0.35);
              const escala = Math.max(0.78, 1 - Math.abs(deltaCont) * 0.1);

              return (
                <div
                  key={musica.id}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (!estaArrastandoV && musica.id !== musicaSelecionadaId) {
                      onSelecionarMusica(musica.id);
                    }
                  }}
                  className={`absolute w-[95%] px-3 py-2.5 rounded-2xl transition-transform ease-out border flex items-center justify-between pointer-events-auto ${
                    estaSelecionada && Math.abs(offsetYDrag) < 15
                      ? 'bg-[#0b1c33] border-cyan-500/80 shadow-[0_0_20px_rgba(0,229,255,0.25)] text-[#00E5FF] z-20'
                      : 'bg-[#071322] border-white/5 hover:border-cyan-500/30 text-slate-300 z-10'
                  }`}
                  style={{
                    transform: `translateY(${translateY}px) translateZ(${translateZ}px) rotateX(${-anguloRotacaoX}deg) scale(${escala})`,
                    opacity: opacidade,
                    transition: estaArrastandoV ? 'none' : 'transform 0.25s ease-out, opacity 0.25s ease-out',
                  }}
                >
                  <div className="flex flex-col min-w-0 pr-2">
                    <div className="flex items-center gap-1.5 truncate">
                      <span className={`text-xs font-mono font-bold truncate ${estaSelecionada ? 'text-[#00E5FF]' : 'text-slate-300'}`}>
                        {String(idx + 1).padStart(2, '0')} // {musica.titulo.toUpperCase()}
                      </span>
                    </div>

                    <span className="text-[10px] font-mono text-slate-400 truncate">
                      {musica.autor_artista || 'Compositor Tradicional'}
                    </span>
                  </div>

                  {/* Indicador Lateral: Equalizador Animado na faixa ativa ou duração */}
                  <div className="shrink-0 flex items-center gap-1.5">
                    {estaSelecionada && isAtivo ? (
                      <div className="flex items-end gap-0.5 h-3.5 px-1.5 py-0.5 rounded bg-cyan-500/20 border border-cyan-500/40">
                        {[0.6, 1, 0.4, 0.9].map((h, i) => (
                          <span
                            key={i}
                            className={`w-0.5 rounded-full bg-[#00E5FF] ${tocando ? 'animate-pulse' : 'h-1'}`}
                            style={{
                              height: tocando ? `${h * 100}%` : '30%',
                              animationDuration: `${0.3 + (i % 3) * 0.15}s`,
                            }}
                          />
                        ))}
                      </div>
                    ) : (
                      <span className="text-[10px] font-mono text-slate-500">
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

      {/* 3. RODAPÉ DO CARD: DICA DE ARRASTE 3D */}
      <div className="pt-2 border-t border-white/5 flex items-center justify-between text-[10px] font-mono text-slate-500">
        <span className="flex items-center gap-1 text-cyan-400/80">
          <Sparkles className="w-3 h-3" />
          <span>Arraste verticalmente para navegar</span>
        </span>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onAbrirUpload();
          }}
          className="text-cyan-400 hover:underline font-bold"
        >
          + Faixa
        </button>
      </div>

    </div>
  );
};
