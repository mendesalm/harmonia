import React, { useState, useRef, useMemo, useCallback } from 'react';
import { MomentoExecucao } from '../../../compartilhado/tipos';

interface Props {
  momentos: MomentoExecucao[];
  indiceAtual: number;
  onMudarMomento: (novoIndice: number) => void;
}

interface CardInfo {
  idx: number;
  momento: MomentoExecucao;
  deltaCont: number;
}

export const CarrosselMiniaturas3D: React.FC<Props> = ({
  momentos,
  indiceAtual,
  onMudarMomento,
}) => {
  const [offsetXDrag, setOffsetXDrag] = useState(0);
  const [estaArrastandoH, setEstaArrastandoH] = useState(false);
  const startXRef = useRef(0);
  const currentDragXRef = useRef(0);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const handlePointerDown = (e: React.PointerEvent) => {
    setEstaArrastandoH(true);
    startXRef.current = e.clientX;
    currentDragXRef.current = 0;
    setOffsetXDrag(0);
    if (containerRef.current) {
      containerRef.current.setPointerCapture(e.pointerId);
    }
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!estaArrastandoH) return;
    const dx = e.clientX - startXRef.current;
    currentDragXRef.current = dx;
    setOffsetXDrag(dx);
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (!estaArrastandoH) return;
    setEstaArrastandoH(false);
    if (containerRef.current) {
      containerRef.current.releasePointerCapture(e.pointerId);
    }

    const dx = currentDragXRef.current;
    const moveLimit = 40;
    
    if (dx > moveLimit) {
      // Arrastar para a direita avança (próximo índice)
      onMudarMomento(Math.min(momentos.length - 1, indiceAtual + 1));
    } else if (dx < -moveLimit) {
      // Arrastar para a esquerda retrocede (índice anterior)
      onMudarMomento(Math.max(0, indiceAtual - 1));
    }
    
    setOffsetXDrag(0);
    currentDragXRef.current = 0;
  };

  const calcularGeometriaCards = useCallback(() => {
    const n = momentos.length;
    if (n === 0) return [];
    
    const dragOffset = -offsetXDrag / 150; 
    const currentPosition = indiceAtual - dragOffset;
    
    const cards: CardInfo[] = [];
    
    for (let i = 0; i < n; i++) {
      let delta = i - currentPosition;
      cards.push({ idx: i, momento: momentos[i], deltaCont: delta });
    }

    cards.sort((a, b) => Math.abs(b.deltaCont) - Math.abs(a.deltaCont));
    return cards;
  }, [momentos, indiceAtual, offsetXDrag]);

  const listaCardsProcessada = useMemo(() => {
    return calcularGeometriaCards();
  }, [calcularGeometriaCards]);

  return (
    <div className="w-full flex flex-col items-center justify-center mt-1 pt-2 pb-3 border-t border-white/5 overflow-hidden">
      <div 
        ref={containerRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        className={`relative w-full h-[50px] flex items-center justify-center preserve-3d perspective-1000 touch-none ${
          estaArrastandoH ? 'cursor-grabbing' : 'cursor-grab'
        }`}
      >
        {listaCardsProcessada.map(({ momento, idx, deltaCont }) => {
          const isAtivo = Math.abs(deltaCont) < 0.4;
          
          // Geometria 3D para miniaturas
          const anguloRad = (deltaCont * 25 * Math.PI) / 180;
          const translateX = Math.sin(anguloRad) * 200; // Espaçamento horizontal
          const translateZ = isAtivo ? 20 : (Math.cos(anguloRad) - 1) * 80 - 10;
          const rotateY = deltaCont * 15;
          const escala = isAtivo ? 1.0 : Math.max(0.7, 1 - Math.abs(deltaCont) * 0.1);
          
          const distanciaAbs = Math.abs(deltaCont);
          let opacidade = 0;
          if (isAtivo) {
            opacidade = 1.0;
          } else if (distanciaAbs <= 3) {
            opacidade = Math.max(0, 0.8 - distanciaAbs * 0.2);
          }
          
          const zIndex = isAtivo ? 100 : Math.round(50 - distanciaAbs * 10);

          return (
            <button
              key={`${momento.evento_id}-${idx}`}
              onClick={(e) => {
                e.stopPropagation();
                if (!estaArrastandoH && idx !== indiceAtual) {
                  onMudarMomento(idx);
                }
              }}
              className={`absolute preserve-3d transition-transform ease-out shrink-0 w-28 p-1.5 rounded-lg border flex flex-col items-center justify-center ${opacidade > 0 ? 'pointer-events-auto' : 'pointer-events-none hidden'} ${
                idx === indiceAtual
                  ? 'bg-[#0b1c33] border-cyan-500/80 shadow-[0_0_10px_rgba(0,229,255,0.2)]'
                  : 'bg-white/[0.02] border-white/10 hover:border-cyan-500/30 hover:bg-white/[0.05]'
              }`}
              style={{
                transform: `translateX(${translateX}px) translateZ(${translateZ}px) rotateY(${rotateY}deg) scale(${escala})`,
                opacity: opacidade,
                zIndex: zIndex,
                transition: estaArrastandoH ? 'none' : 'transform 0.3s cubic-bezier(0.2, 0.8, 0.2, 1), opacity 0.3s ease-out',
              }}
              title={momento.evento_nome}
            >
              <span className={`text-[9px] font-mono font-bold truncate w-full text-center ${idx === indiceAtual ? 'text-[#00E5FF]' : 'text-slate-400'}`}>
                {String(idx + 1).padStart(2, '0')} //
              </span>
              <span className={`text-[8px] font-mono truncate w-full text-center ${idx === indiceAtual ? 'text-white' : 'text-slate-500'}`}>
                {momento.evento_nome}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
