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
  onAlternarPreferencia?: (eventoId: string, musicaId: string, atual: boolean) => void;
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
  onAlternarPreferencia,
  onAbrirUpload,
}) => {
  const [offsetXDrag, setOffsetXDrag] = useState(0);
  const [estaArrastandoH, setEstaArrastandoH] = useState(false);
  const startXRef = useRef(0);
  const currentDragXRef = useRef(0);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const ultimoWheelHRef = useRef(0);

  // Handlers do Clique & Arraste Horizontal 3D (Desktop Web & Mobile Touch)
  const handlePointerDown = (e: React.PointerEvent) => {
    if ((e.target as HTMLElement).closest('button, a, .vertical-tracks-container')) return;

    setEstaArrastandoH(true);
    startXRef.current = e.clientX;
    currentDragXRef.current = 0;
    try {
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    } catch {}
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
    try {
      (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {}

    const deltaX = currentDragXRef.current;
    setOffsetXDrag(0);

    const passos = Math.round(deltaX / 80);
    if (passos !== 0) {
      const novoIndice = Math.max(0, Math.min(momentos.length - 1, indiceAtual + passos));
      if (novoIndice !== indiceAtual) {
        onMudarMomento(novoIndice);
      }
    }
  };

  // Suporte a Mouse Wheel Horizontal / Shift+Wheel para momentos no Desktop
  const handleWheelStage = (e: React.WheelEvent) => {
    if ((e.target as HTMLElement).closest('.vertical-tracks-container')) return;

    const deltaH = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : (e.shiftKey ? e.deltaY : 0);
    if (Math.abs(deltaH) > 20) {
      const agora = Date.now();
      if (agora - ultimoWheelHRef.current < 200) return;
      ultimoWheelHRef.current = agora;

      const direcao = deltaH > 0 ? 1 : -1;
      const novoIndice = Math.max(0, Math.min(momentos.length - 1, indiceAtual + direcao));
      if (novoIndice !== indiceAtual) {
        onMudarMomento(novoIndice);
      }
    }
  };

  if (!momentos || momentos.length === 0) {
    return (
      <div className="w-full py-12 text-center font-mono text-slate-400 vidro-escuro rounded-3xl">
        [ NENHUM MOMENTO LITÚRGICO CONFIGURADO ]
      </div>
    );
  }

  // Movimento visual
  const deltaDragItems = offsetXDrag / 200;

  // Prepara e ordena os cards para que os secundários fiquem atrás no DOM e o ativo fique SEMPRE no topo absoluto
  const listaCardsProcessada = momentos
    .map((momento, idx) => {
      const distancia = idx - indiceAtual;
      const deltaCont = distancia + deltaDragItems;
      return { momento, idx, distancia, deltaCont };
    })
    .filter((item) => Math.abs(item.deltaCont) <= 2.2);

  listaCardsProcessada.sort((a, b) => Math.abs(b.deltaCont) - Math.abs(a.deltaCont));

  return (
    <div 
      className="relative w-full flex flex-col items-center select-none shrink-0"
      onWheel={handleWheelStage}
    >
      
      {/* Botões Laterais Sutis de Navegação 3D */}
      <button
        onClick={() => indiceAtual > 0 && onMudarMomento(indiceAtual - 1)}
        disabled={indiceAtual === 0}
        aria-label="Momento anterior"
        className="absolute left-1 sm:left-3 top-1/2 -translate-y-1/2 z-40 p-2 sm:p-2.5 rounded-full bg-[#040a17]/95 hover:bg-[#00E5FF]/20 text-[#00E5FF] border border-cyan-500/40 backdrop-blur-md disabled:opacity-20 transition-all cursor-pointer shadow-lg active:scale-95"
      >
        <ChevronLeft className="w-4 h-4 sm:w-5 sm:h-5" />
      </button>

      <button
        onClick={() => indiceAtual < momentos.length - 1 && onMudarMomento(indiceAtual + 1)}
        disabled={indiceAtual >= momentos.length - 1}
        aria-label="Próximo momento"
        className="absolute right-1 sm:right-3 top-1/2 -translate-y-1/2 z-40 p-2 sm:p-2.5 rounded-full bg-[#040a17]/95 hover:bg-[#00E5FF]/20 text-[#00E5FF] border border-cyan-500/40 backdrop-blur-md disabled:opacity-20 transition-all cursor-pointer shadow-lg active:scale-95"
      >
        <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5" />
      </button>

      {/* PALCO 3D AMPLO COM MAIOR ESPALHAMENTO HORIZONTAL PANORÂMICO */}
      <div
        ref={containerRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        className={`relative w-full h-[320px] sm:h-[345px] md:h-[360px] flex items-center justify-center preserve-3d perspective-1200 overflow-visible touch-none ${
          estaArrastandoH ? 'cursor-grabbing' : 'cursor-grab'
        }`}
        title="Clique e arraste horizontalmente para girar os momentos"
      >
        {listaCardsProcessada.map(({ momento, idx, deltaCont }) => {
          const isAtivo = Math.abs(deltaCont) < 0.4;

          const anguloRad = (deltaCont * 34 * Math.PI) / 180;
          const translateX = Math.sin(anguloRad) * 360;
          const translateZ = isAtivo ? 45 : (Math.cos(anguloRad) - 1) * 180 - 55;
          const rotateY = deltaCont * 25;
          const escala = isAtivo ? 1.0 : Math.max(0.83, 1 - Math.abs(deltaCont) * 0.08);
          
          // Limita a visibilidade para apenas o ativo e os dois imediatamente ao lado
          const distanciaAbs = Math.abs(deltaCont);
          let opacidade = 0;
          if (isAtivo) {
            opacidade = 1.0;
          } else if (distanciaAbs <= 1.5) {
            // Suaviza a opacidade até 40% na borda adjacente
            opacidade = Math.max(0.40, 0.85 - distanciaAbs * 0.35);
          }
          
          const zIndex = isAtivo ? 300 : Math.round(100 - distanciaAbs * 30);
          const visualFilter = isAtivo ? 'none' : 'brightness(0.82)';

          // Lista completa de faixas candidatas daquele momento
          const listaMusicasMomento: Musica[] = (idx === indiceAtual && musicasDoMomento.length > 0)
            ? musicasDoMomento
            : ((momento.candidatas && momento.candidatas.length > 0)
                ? momento.candidatas.map(c => ({
                    id: c.id,
                    organizacao_id: '',
                    titulo: c.titulo,
                    autor_artista: c.autor_artista || undefined,
                    tipo_midia: c.tipo_midia as 'ARQUIVO_LOCAL' | 'YOUTUBE' | 'SPOTIFY',
                    caminho_arquivo: c.caminho_arquivo || undefined,
                    link_externo: c.link_externo || undefined,
                    duracao_segundos: c.duracao_segundos || undefined,
                    preferida: c.preferida || false,
                    metadados: {},
                    ativo: true,
                    eventos: [],
                    criado_em: '',
                    atualizado_em: ''
                  }))
                : (momento.musica_sorteada ? [{
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
                  }] : []));

          return (
            <div
              key={`${momento.evento_id}-${idx}`}
              onClick={() => {
                if (!estaArrastandoH && idx !== indiceAtual) {
                  onMudarMomento(idx);
                }
              }}
              className={`absolute preserve-3d transition-transform ease-out cursor-pointer ${opacidade > 0 ? 'pointer-events-auto' : 'pointer-events-none hidden sm:block'}`}
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
                musicas={listaMusicasMomento}
                musicaSelecionadaId={idx === indiceAtual ? musicaAtualId : momento.musica_sorteada?.id}
                tocando={idx === indiceAtual && tocando}
                onSelecionarMusica={onSelecionarMusica}
                onAlternarPreferencia={onAlternarPreferencia}
                onAbrirUpload={onAbrirUpload}
              />
            </div>
          );
        })}
      </div>

    </div>
  );
};
