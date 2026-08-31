import React, { useState, useRef } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { MomentoExecucao, Musica } from '../../../compartilhado/tipos';
import { CardMomento3D } from './CardMomento3D';

interface Props {
  momentos: MomentoExecucao[];
  indiceAtual: number;
  musicasDoMomento: Musica[];
  musicaAtualId?: string;
  tocando: boolean;
  onMudarMomento: (novoIndice: number) => void;
  onSelecionarMusica: (musicaId: string) => void;
  onAbrirUpload: () => void;
}

export const Carrossel3DMomentos: React.FC<Props> = ({
  momentos,
  indiceAtual,
  musicasDoMomento,
  musicaAtualId,
  tocando,
  onMudarMomento,
  onSelecionarMusica,
  onAbrirUpload,
}) => {
  const [offsetXDrag, setOffsetXDrag] = useState(0);
  const [estaArrastandoH, setEstaArrastandoH] = useState(false);
  const startXRef = useRef(0);
  const currentDragXRef = useRef(0);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Handlers do Arraste Horizontal 3D (Pointer Events)
  const handlePointerDown = (e: React.PointerEvent) => {
    // Não inicia arraste se o alvo for botão ou controle interno
    if ((e.target as HTMLElement).closest('button')) return;

    setEstaArrastandoH(true);
    startXRef.current = e.clientX;
    currentDragXRef.current = 0;
    (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!estaArrastandoH) return;
    const deltaX = e.clientX - startXRef.current;
    currentDragXRef.current = deltaX;
    setOffsetXDrag(deltaX);
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (!estaArrastandoH) return;
    setEstaArrastandoH(false);
    (e.currentTarget as HTMLElement).releasePointerCapture?.(e.pointerId);

    const deltaX = currentDragXRef.current;
    setOffsetXDrag(0);

    // Sensibilidade de transição: ~80px de arraste muda 1 card
    const passos = Math.round(-deltaX / 80);
    if (passos !== 0) {
      const novoIndice = Math.max(0, Math.min(momentos.length - 1, indiceAtual + passos));
      if (novoIndice !== indiceAtual) {
        onMudarMomento(novoIndice);
      }
    }
  };

  if (!momentos || momentos.length === 0) {
    return (
      <div className="w-full py-16 text-center font-mono text-slate-400 vidro-escuro rounded-3xl">
        [ NENHUM MOMENTO LITÚRGICO CONFIGURADO ]
      </div>
    );
  }

  // Deslocamento contínuo durante o arraste
  const deltaDragItems = offsetXDrag / 220;

  return (
    <div className="relative w-full flex flex-col items-center select-none my-1">
      
      {/* Botões Laterais Sutis de Navegação 3D */}
      <button
        onClick={() => indiceAtual > 0 && onMudarMomento(indiceAtual - 1)}
        disabled={indiceAtual === 0}
        aria-label="Momento anterior"
        className="absolute left-1 sm:left-4 top-1/2 -translate-y-1/2 z-30 p-2.5 rounded-full bg-[#050e1c]/80 hover:bg-[#00E5FF]/20 text-[#00E5FF] border border-cyan-500/30 backdrop-blur-md disabled:opacity-20 transition-all cursor-pointer shadow-lg"
      >
        <ChevronLeft className="w-5 h-5" />
      </button>

      <button
        onClick={() => indiceAtual < momentos.length - 1 && onMudarMomento(indiceAtual + 1)}
        disabled={indiceAtual >= momentos.length - 1}
        aria-label="Próximo momento"
        className="absolute right-1 sm:right-4 top-1/2 -translate-y-1/2 z-30 p-2.5 rounded-full bg-[#050e1c]/80 hover:bg-[#00E5FF]/20 text-[#00E5FF] border border-cyan-500/30 backdrop-blur-md disabled:opacity-20 transition-all cursor-pointer shadow-lg"
      >
        <ChevronRight className="w-5 h-5" />
      </button>

      {/* PALCO 3D COM PERSPECTIVA ESPACIAL */}
      <div
        ref={containerRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        className="relative w-full h-[430px] sm:h-[450px] flex items-center justify-center preserve-3d perspective-1200 cursor-grab active:cursor-grabbing overflow-visible touch-none"
      >
        {momentos.map((momento, idx) => {
          const distancia = idx - indiceAtual;
          const deltaCont = distancia - deltaDragItems;

          // Renderiza até 2 cards para a esquerda e 2 para a direita
          const visivel = Math.abs(deltaCont) <= 2.5;
          if (!visivel) return null;

          const isAtivo = idx === indiceAtual;

          // Geometria 3D: Curva em Semicírculo Cilíndrico
          const anguloRad = (deltaCont * 34 * Math.PI) / 180;
          const translateX = Math.sin(anguloRad) * 260;
          const translateZ = (Math.cos(anguloRad) - 1) * 220;
          const rotateY = deltaCont * 30; // inclinação angular do card
          const escala = Math.max(0.72, 1 - Math.abs(deltaCont) * 0.12);
          const opacidade = Math.max(0.2, 1 - Math.abs(deltaCont) * 0.38);
          const zIndex = Math.round(100 - Math.abs(deltaCont) * 20);

          return (
            <div
              key={`${momento.evento_id}-${idx}`}
              onClick={() => {
                if (!estaArrastandoH && idx !== indiceAtual) {
                  onMudarMomento(idx);
                }
              }}
              className="absolute preserve-3d transition-transform ease-out pointer-events-auto"
              style={{
                transform: `translateX(${translateX}px) translateZ(${translateZ}px) rotateY(${rotateY}deg) scale(${escala})`,
                opacity: opacidade,
                zIndex: zIndex,
                transition: estaArrastandoH ? 'none' : 'transform 0.35s cubic-bezier(0.2, 0.8, 0.2, 1), opacity 0.35s ease-out',
              }}
            >
              <CardMomento3D
                momento={momento}
                indiceMomento={idx}
                isAtivo={isAtivo}
                musicas={isAtivo ? musicasDoMomento : (momento.musica_sorteada ? [{
                  id: momento.musica_sorteada.id,
                  organizacao_id: '',
                  titulo: momento.musica_sorteada.titulo,
                  autor_artista: momento.musica_sorteada.autor_artista || undefined,
                  tipo_midia: momento.musica_sorteada.tipo_midia as 'ARQUIVO_LOCAL' | 'YOUTUBE' | 'SPOTIFY',
                  caminho_arquivo: momento.musica_sorteada.caminho_arquivo || undefined,
                  link_externo: momento.musica_sorteada.link_externo || undefined,
                  duracao_segundos: momento.musica_sorteada.duracao_segundos || undefined,
                  metadados: {},
                  ativo: true,
                  eventos: [],
                  criado_em: '',
                  atualizado_em: ''
                }] : [])}
                musicaSelecionadaId={isAtivo ? musicaAtualId : momento.musica_sorteada?.id}
                tocando={isAtivo && tocando}
                onSelecionarMusica={onSelecionarMusica}
                onAbrirUpload={onAbrirUpload}
              />
            </div>
          );
        })}
      </div>

    </div>
  );
};
