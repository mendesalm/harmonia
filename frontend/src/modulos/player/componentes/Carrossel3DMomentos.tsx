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

  const deltaDragItems = offsetXDrag / 220;

  // Prepara e ordena os cards para que os secundários fiquem atrás no DOM e o ativo fique SEMPRE por último (no topo absoluto)
  const listaCardsProcessada = momentos
    .map((momento, idx) => {
      const distancia = idx - indiceAtual;
      const deltaCont = distancia - deltaDragItems;
      return { momento, idx, distancia, deltaCont };
    })
    .filter((item) => Math.abs(item.deltaCont) <= 2.5);

  // Ordena por distância absoluta decrescente: o mais distante renderiza primeiro, o mais próximo (ativo) por último
  listaCardsProcessada.sort((a, b) => Math.abs(b.deltaCont) - Math.abs(a.deltaCont));

  return (
    <div className="relative w-full flex flex-col items-center select-none my-1">
      
      {/* Botões Laterais Sutis de Navegação 3D */}
      <button
        onClick={() => indiceAtual > 0 && onMudarMomento(indiceAtual - 1)}
        disabled={indiceAtual === 0}
        aria-label="Momento anterior"
        className="absolute left-1 sm:left-3 top-1/2 -translate-y-1/2 z-40 p-2.5 rounded-full bg-[#040a17]/95 hover:bg-[#00E5FF]/20 text-[#00E5FF] border border-cyan-500/40 backdrop-blur-md disabled:opacity-20 transition-all cursor-pointer shadow-lg active:scale-95"
      >
        <ChevronLeft className="w-5 h-5" />
      </button>

      <button
        onClick={() => indiceAtual < momentos.length - 1 && onMudarMomento(indiceAtual + 1)}
        disabled={indiceAtual >= momentos.length - 1}
        aria-label="Próximo momento"
        className="absolute right-1 sm:right-3 top-1/2 -translate-y-1/2 z-40 p-2.5 rounded-full bg-[#040a17]/95 hover:bg-[#00E5FF]/20 text-[#00E5FF] border border-cyan-500/40 backdrop-blur-md disabled:opacity-20 transition-all cursor-pointer shadow-lg active:scale-95"
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
        {listaCardsProcessada.map(({ momento, idx, deltaCont }) => {
          const isAtivo = Math.abs(deltaCont) < 0.4;

          // Geometria 3D: Curva em Semicírculo Cilíndrico com separação em Z
          const anguloRad = (deltaCont * 32 * Math.PI) / 180;
          const translateX = Math.sin(anguloRad) * 320;
          const translateZ = isAtivo ? 60 : (Math.cos(anguloRad) - 1) * 260 - 80;
          const rotateY = deltaCont * 26;
          const escala = isAtivo ? 1.0 : Math.max(0.80, 1 - Math.abs(deltaCont) * 0.1);
          const opacidade = isAtivo ? 1.0 : Math.max(0.65, 0.85 - Math.abs(deltaCont) * 0.12);
          const zIndex = isAtivo ? 300 : Math.round(100 - Math.abs(deltaCont) * 30);
          const visualFilter = isAtivo ? 'none' : 'brightness(0.8)';

          return (
            <div
              key={`${momento.evento_id}-${idx}`}
              onClick={() => {
                if (!estaArrastandoH && idx !== indiceAtual) {
                  onMudarMomento(idx);
                }
              }}
              className="absolute preserve-3d transition-transform ease-out pointer-events-auto cursor-pointer"
              style={{
                transform: `translateX(${translateX}px) translateZ(${translateZ}px) rotateY(${rotateY}deg) scale(${escala})`,
                opacity: opacidade,
                zIndex: zIndex,
                filter: visualFilter,
                transition: estaArrastandoH ? 'none' : 'transform 0.35s cubic-bezier(0.2, 0.8, 0.2, 1), opacity 0.35s ease-out, filter 0.35s ease-out',
              }}
            >
              <CardMomento3D
                momento={momento}
                indiceMomento={idx}
                isAtivo={idx === indiceAtual}
                musicas={idx === indiceAtual ? musicasDoMomento : (momento.musica_sorteada ? [{
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
                musicaSelecionadaId={idx === indiceAtual ? musicaAtualId : momento.musica_sorteada?.id}
                tocando={idx === indiceAtual && tocando}
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
