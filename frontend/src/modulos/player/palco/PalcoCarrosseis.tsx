import React, { useState, useEffect, useRef } from 'react';
import { Star, Plus, X, Music, Volume2 } from 'lucide-react';
import { MomentoExecucao, MusicaSorteada } from '../../../compartilhado/tipos';
import { feedbackTatil } from '../../../compartilhado/utilitarios/dispositivoNativo';

interface PalcoCarrosseisProps {
  momentos: MomentoExecucao[];
  indiceMomento: number;
  tocando: boolean;
  progressoFaixa: number;
  tempoAtual?: number;
  duracaoTotal?: number;
  volumeExecucao?: number;
  surdinaAtiva?: boolean;
  rito?: string;
  onAbrirConfiguracoesSurdina?: () => void;
  onMudarMomento: (indice: number) => void;
  onTrocarFaixa: (indiceFaixa: number, tocar: boolean) => void;
  onAlternarPlayPause: () => void;
  onAlternarPreferencia?: (musicaId: string, preferida: boolean) => void;
  onAbrirUpload?: () => void;
  onAlterarVolume?: (novoVolume: number) => void;
}

const NUMEROS_ROMANOS = [
  'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X',
  'XI', 'XII', 'XIII', 'XIV', 'XV', 'XVI', 'XVII', 'XVIII', 'XIX', 'XX',
];
const paraRomano = (n: number) => NUMEROS_ROMANOS[n - 1] || String(n);

const formatarTempo = (segundos?: number) => {
  if (!segundos || isNaN(segundos) || segundos < 0) return '00:00';
  const min = Math.floor(segundos / 60);
  const seg = Math.floor(segundos % 60);
  return `${String(min).padStart(2, '0')}:${String(seg).padStart(2, '0')}`;
};

function calcularMomento3D(distancia: number, tamanho: number = 180) {
  const ad = Math.abs(distancia);
  const passo1 = Math.round(tamanho * 1.05);
  const passo2 = Math.round(tamanho * 0.44);
  const sinal = distancia < 0 ? -1 : 1;
  const x = sinal * (ad <= 1 ? ad * passo1 : passo1 + (ad - 1) * passo2);
  const y = Math.min(ad, 2) * 5;
  const z = -ad * 80;
  const rotY = -sinal * Math.min(ad, 1.8) * 24;
  const escala = Math.max(0.72, 1 - ad * 0.20);
  const opacidade = Math.max(0, Math.min(1, 1 - ad * 0.45));
  const zIndex = Math.round(200 - ad * 20);
  return { x, y, z, rotY, escala, opacidade, zIndex };
}

/** Símbolo Sagrado Maçônico Refinado Stitch: Esquadro facetado e Compasso com 'G' central em Ouro */
const SimboloEsquadroCompasso: React.FC<{ className?: string }> = ({ className = 'w-12 h-12' }) => (
  <svg
    className={`${className} text-[#DDB96B] drop-shadow-[0_0_8px_rgba(227,190,97,0.7)]`}
    fill="none"
    stroke="currentColor"
    strokeLinecap="round"
    strokeLinejoin="round"
    strokeWidth="2.6"
    viewBox="0 0 100 100"
  >
    {/* Compass Arms */}
    <line stroke="currentColor" x1="50" x2="16" y1="12" y2="82" />
    <line stroke="currentColor" x1="50" x2="84" y1="12" y2="82" />
    <circle cx="50" cy="12" fill="#FDF3D7" r="3.5" />
    {/* Square (Esquadro facetado com profundidade metálica) */}
    <polyline points="28,38 50,78 72,38" stroke="#EED184" strokeWidth="3" />
    <polyline points="21,34 50,86 79,34" stroke="#AB7F28" strokeWidth="1.8" />
    {/* Letter 'G' in Center */}
    <text
      dominantBaseline="middle"
      fill="#FDF3D7"
      fontFamily="'Cinzel', serif"
      fontSize="16"
      fontWeight="bold"
      stroke="none"
      textAnchor="middle"
      x="50"
      y="55"
    >
      G
    </text>
  </svg>
);

/** Logo Cursivo Nobre H-33 reproduzido fielmente ao design da captura de referência */
const LogoCursivoH33: React.FC = () => (
  <div className="flex items-center select-none" title="Vitrola H-33">
    <svg className="h-7 w-20 text-[#DDB96B] drop-shadow-[0_2px_8px_rgba(221,185,107,0.45)]" viewBox="0 0 95 34" fill="none">
      {/* Elegante 'H' caligráfico com laço superior */}
      <path
        d="M 12 7 C 7 7, 5 12, 8 18 C 11 23, 17 26, 20 26 C 22 26, 23 24, 21 19 L 16 9"
        stroke="currentColor"
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M 13 18 C 20 18, 30 16, 35 16" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
      <path
        d="M 27 7 L 22 29 C 21 32, 23 33, 27 31"
        stroke="currentColor"
        strokeWidth="2.4"
        strokeLinecap="round"
      />
      {/* Hífen */}
      <path d="M 40 19 L 48 19" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
      {/* 33 em serif ritual */}
      <text
        x="53"
        y="25"
        fontFamily="'Cinzel', serif"
        fontSize="19"
        fontWeight="900"
        fill="currentColor"
        letterSpacing="0.5"
      >
        33
      </text>
    </svg>
  </div>
);

/**
 * Palco de Carrosséis 3D — Consola H-33:
 * - Box Superior Independente: Acervo Litúrgico (1 Momento = 1 Álbum LP)
 *   * Se for Rito Brasileiro: Bordô nobre (#5A0A18 -> #220308).
 *   * Demais Ritos: Deep Blue Sovereign (#0E1C36 -> #070F1E).
 *   * Estritamente sem borda dourada nas capas dos álbuns.
 * - Indicador de Paginação Central no vão entre os dois boxes.
 * - Box Inferior Independente: Vitrola H-33 com logo cursivo H-33, display LED digital integrado ao lado do logo,
 *   ícone de equalização gráfica, vinil grooved com selo do momento, braço audiófilo e fader com entalhes pp/mp.
 */
export const PalcoCarrosseis: React.FC<PalcoCarrosseisProps> = ({
  momentos,
  indiceMomento,
  tocando,
  progressoFaixa,
  tempoAtual = 0,
  volumeExecucao = 60,
  surdinaAtiva = false,
  rito = 'BRASILEIRO',
  onAbrirConfiguracoesSurdina,
  onMudarMomento,
  onTrocarFaixa,
  onAlternarPreferencia,
  onAbrirUpload,
  onAlterarVolume,
}) => {
  const [modalTracklistAberto, setModalTracklistAberto] = useState(false);
  const [offsetXFracionario, setOffsetXFracionario] = useState(0);
  const [arrastando, setArrastando] = useState(false);
  const [vuAtivos, setVuAtivos] = useState<number[]>([]);

  // Regra de cores litúrgicas: Bordô nobre para Rito Brasileiro, Deep Blue para os demais
  const eRitoBrasileiro = (rito || '').toUpperCase().includes('BRASILEIRO');

  // Gestos de swipe no carrossel
  const inicioXRef = useRef(0);
  const lastXRef = useRef(0);
  const lastTimeRef = useRef(0);
  const velocidadeXRef = useRef(0);
  const arrastouMaisQueCliqueRef = useRef(false);
  const pointerDownTimeRef = useRef(0);
  const pointerIdRef = useRef<number | null>(null);

  const momentoAtivo = momentos[indiceMomento];
  const faixasAtivas = momentoAtivo?.candidatas ?? [];
  const temAlbumNoMomento = faixasAtivas.length > 0;
  const musicaAtiva = momentoAtivo?.musica_sorteada ?? faixasAtivas[0];
  const idxFaixaAtiva = temAlbumNoMomento
    ? Math.max(0, faixasAtivas.findIndex((f) => f.id === musicaAtiva?.id))
    : -1;

  // Animação dinâmica do bargraph VU meter
  useEffect(() => {
    if (!tocando || !temAlbumNoMomento) {
      setVuAtivos([]);
      return;
    }
    const interval = setInterval(() => {
      const vol = Math.max(10, volumeExecucao);
      const baseAtivas = Math.round((vol / 100) * 10);
      const flutuacao = Math.floor(Math.random() * 3);
      const total = Math.min(12, Math.max(2, baseAtivas + flutuacao));
      setVuAtivos(Array.from({ length: total }, (_, i) => i));
    }, 180);
    return () => clearInterval(interval);
  }, [tocando, volumeExecucao, temAlbumNoMomento]);

  // Ângulo dinâmico do braço de precisão H-33
  // Repouso: 0deg | Leitura: 14deg a 24deg (não recua durante pause!)
  // Se o momento não tiver nenhum álbum cadastrado, o braço permanece estritamente em repouso no suporte (0deg)
  const anguloBraco =
    !temAlbumNoMomento || (!tocando && progressoFaixa === 0)
      ? 0
      : 14 + Math.min(1, Math.max(0, progressoFaixa)) * 3.8;

  const palcoBoxRef = useRef<HTMLDivElement>(null);
  const [larguraBox, setLarguraBox] = useState(360);

  useEffect(() => {
    if (!palcoBoxRef.current) return;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        if (entry.contentRect.width > 0) {
          setLarguraBox(entry.contentRect.width);
        }
      }
    });
    observer.observe(palcoBoxRef.current);
    return () => observer.disconnect();
  }, []);

  // Regra do usuário: O tamanho da capa dos discos é rigorosamente 65% do box que o contém
  const tamanhoCapa = Math.round(larguraBox * 0.65);
  const PASSO_X = Math.round(tamanhoCapa * 1.05);
  const RESISTENCIA_BORDA = 0.25;

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    pointerIdRef.current = e.pointerId;
    inicioXRef.current = e.clientX;
    lastXRef.current = e.clientX;
    lastTimeRef.current = performance.now();
    pointerDownTimeRef.current = performance.now();
    velocidadeXRef.current = 0;
    arrastouMaisQueCliqueRef.current = false;
    setArrastando(true);
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      /* ignore */
    }
  };

  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!arrastando) return;
    const dx = e.clientX - inicioXRef.current;
    if (!arrastouMaisQueCliqueRef.current && Math.abs(dx) > 6) {
      arrastouMaisQueCliqueRef.current = true;
    }

    const now = performance.now();
    const dt = now - lastTimeRef.current;
    if (dt > 8) {
      velocidadeXRef.current = (e.clientX - lastXRef.current) / dt;
      lastXRef.current = e.clientX;
      lastTimeRef.current = now;
    }

    let off = -dx / PASSO_X;
    if (indiceMomento === 0 && off < 0) off *= RESISTENCIA_BORDA;
    else if (indiceMomento === momentos.length - 1 && off > 0) off *= RESISTENCIA_BORDA;

    setOffsetXFracionario(off);
  };

  const finalizarGesto = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!arrastando) return;
    setArrastando(false);
    const duracao = performance.now() - pointerDownTimeRef.current;

    try {
      if (pointerIdRef.current !== null) {
        e.currentTarget.releasePointerCapture(pointerIdRef.current);
        pointerIdRef.current = null;
      }
    } catch {
      /* ignore */
    }

    // Clique sem arraste
    if (!arrastouMaisQueCliqueRef.current && duracao < 650) {
      setOffsetXFracionario(0);
      return;
    }

    // Inércia de projeção com controle fino de 1 momento por vez
    const projecao = offsetXFracionario - (velocidadeXRef.current * 60) / PASSO_X;
    let passos = Math.round(projecao);
    passos = Math.max(-1, Math.min(1, passos));

    if (passos === 0 && Math.abs(offsetXFracionario) > 0.24) {
      passos = offsetXFracionario > 0 ? 1 : -1;
    }

    const novoIndice = Math.max(0, Math.min(momentos.length - 1, indiceMomento + passos));
    setOffsetXFracionario(0);

    if (novoIndice !== indiceMomento) {
      feedbackTatil.clique();
      onMudarMomento(novoIndice);
    }
  };

  const lidarCliqueCard = (idx: number) => {
    if (arrastouMaisQueCliqueRef.current) return;
    feedbackTatil.clique();
    if (idx === indiceMomento) {
      setModalTracklistAberto(true);
    } else {
      onMudarMomento(idx);
    }
  };

  if (!momentoAtivo) return null;

  // Gradientes e fundos nobres Stitch baseados no Rito ativo
  const fundoCapa = eRitoBrasileiro
    ? 'linear-gradient(135deg, #460811 0%, #2d060c 50%, #120306 100%)'
    : 'linear-gradient(135deg, #0e1624 0%, #0b111a 50%, #070a10 100%)';

  return (
    <div className="w-full flex-1 min-h-0 flex flex-col items-center justify-between p-1 sm:p-2 select-none overflow-hidden">
      {/* CONTAINER CENTRAL UNIFICADO COM LARGURA RIGOROSA (MAX-W-[360px] SM:MAX-W-[380px]) DISTRIBUÍDO NA ALTURA DISPONÍVEL */}
      <div className="w-full max-w-[360px] sm:max-w-[380px] h-full flex flex-col justify-between gap-1 sm:gap-1.5">
        {/* =========================================================================
            BOX 1 (SUPERIOR INDEPENDENTE): ACERVO LITÚRGICO • CARROSSEL 3D STITCH
            ========================================================================= */}
        <section
          ref={palcoBoxRef}
          className="w-full flex-[4.5_4.5_0%] min-h-[220px] rounded-2xl sm:rounded-3xl bg-gradient-to-b from-[#0A1428] via-[#070F1E] to-[#040812] border border-[#1E325C]/80 shadow-[0_10px_28px_rgba(0,0,0,0.7)] p-2 sm:p-2.5 flex flex-col items-center justify-center"
        >
          {/* PALCO 3D DO CARROSSEL DE ÁLBUNS */}
          <div
            className="relative w-full h-full min-h-[210px] overflow-hidden select-none cursor-grab active:cursor-grabbing flex items-center justify-center rounded-xl sm:rounded-2xl bg-gradient-to-b from-[#050B17] via-[#040812] to-[#02050E]"
            style={{ perspective: 1100, touchAction: 'none' }}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={finalizarGesto}
            onPointerCancel={finalizarGesto}
          >
            <div
              className="relative w-full h-full flex items-center justify-center"
              style={{ transformStyle: 'preserve-3d' }}
            >
              {momentos.map((momento, i) => {
                const distancia = i - (indiceMomento + offsetXFracionario);
                if (Math.abs(distancia) > 2.8) return null;
                const t = calcularMomento3D(distancia, tamanhoCapa);
                const ativo = Math.abs(distancia) < 0.45;
                const totalFaixas = momento.candidatas?.length || 0;

                return (
                  <div
                    key={`album-card-${momento.evento_id}-${i}`}
                    onClick={() => lidarCliqueCard(i)}
                    style={{
                      position: 'absolute',
                      width: tamanhoCapa,
                      height: tamanhoCapa,
                      borderRadius: 0, // Estritamente quadrada com cantos retos nas proporções de 65%!
                      border: '1.5px solid rgba(227, 190, 97, 0.75)',
                      transform: `translate3d(${t.x}px, ${t.y}px, ${t.z}px) rotateY(${t.rotY}deg) scale(${t.escala})`,
                      opacity: t.opacidade,
                      zIndex: t.zIndex,
                      transition: arrastando
                        ? 'none'
                        : 'transform 0.45s cubic-bezier(0.22, 0.9, 0.25, 1), opacity 0.4s ease-out',
                      transformStyle: 'preserve-3d',
                      background: fundoCapa,
                      boxShadow: ativo
                        ? '0 0 25px rgba(227, 190, 97, 0.28), 0 16px 36px rgba(0,0,0,0.95)'
                        : '0 12px 30px rgba(0,0,0,0.85)',
                      filter: ativo ? 'none' : 'brightness(0.72)',
                      cursor: 'pointer',
                    }}
                    className="p-3 sm:p-3.5 flex flex-col justify-between cursor-pointer select-none relative overflow-hidden rounded-none"
                  >
                    {/* Moldura dupla dourada ornamental refinada do Stitch (estritamente quadrada) */}
                    <div className="absolute inset-[3px] border border-[#DDB96B]/40 rounded-none pointer-events-none" />
                    <div className="absolute inset-[6px] border border-dashed border-[#DDB96B]/25 rounded-none pointer-events-none" />

                    {/* Top bar da capa: Identificador e Dinâmica */}
                    <div className="w-full flex items-center justify-between text-[8px] sm:text-[9px] uppercase tracking-wider relative z-10 border-b border-[#DDB96B]/20 pb-1 pointer-events-none">
                      <span className="font-cinzel font-bold text-[#FDE68A] tracking-widest">
                        ÁLBUM {paraRomano(i + 1)}
                      </span>
                      <span className="font-mono text-[7.5px] px-1.5 py-0.5 rounded bg-black/60 border border-[#DDB96B]/50 text-[#FDE68A] shadow-inner font-bold">
                        {momento.em_surdina ? 'PP • SURDINA' : 'MF • FORTE'}
                      </span>
                    </div>

                    {/* Centro da capa: Medalhão circular com Esquadro e Compasso com 'G' em Ouro */}
                    <div className="my-auto flex flex-col items-center justify-center relative z-10 py-1 pointer-events-none">
                      <div className="w-16 h-16 sm:w-18 sm:h-18 p-1.5 rounded-full bg-black/50 border border-[#DDB96B]/50 shadow-[inset_0_2px_8px_rgba(0,0,0,0.8)] flex items-center justify-center relative">
                        <SimboloEsquadroCompasso className="w-11 h-11 sm:w-12 sm:h-12" />
                      </div>
                    </div>

                    {/* Base da capa: Título em serifa dourada + contagem de trilhas solenes */}
                    <div className="text-center relative z-10 border-t border-[#DDB96B]/20 pt-1 pointer-events-none">
                      <p className="font-cinzel text-[11px] sm:text-xs font-bold text-[#FFF2CC] tracking-wider line-clamp-1 drop-shadow-sm uppercase">
                        {momento.evento_nome}
                      </p>
                      <p className="font-serif italic text-[9.5px] sm:text-[10px] text-[#DDB96B] tracking-widest mt-0.5 font-normal">
                        {totalFaixas > 0 ? `${totalFaixas} Trilhas LP Solenes` : 'Sem Trilhas LP'}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* =========================================================================
            BARRA DE PROGRESSO DOS ÁLBUNS NO VÃO CENTRAL (NUNCA EXTRAPOLA A TELA)
            ========================================================================= */}
        {momentos.length <= 8 ? (
          <div className="flex items-center justify-center gap-1.5 py-0.5 select-none max-w-[280px] self-center">
            {momentos.map((_, i) => (
              <button
                key={`indicador-gap-${i}`}
                type="button"
                onClick={() => {
                  feedbackTatil.clique();
                  onMudarMomento(i);
                }}
                className={`transition-all duration-300 cursor-pointer ${
                  i === indiceMomento
                    ? 'w-7 h-1.5 rounded-full bg-gradient-to-r from-[#DDB96B] to-[#FDE68A] shadow-[0_0_8px_rgba(221,185,107,0.8)]'
                    : 'w-1.5 h-1.5 rounded-full bg-[#1E325C] hover:bg-[#64748b]'
                }`}
                title={`Álbum ${i + 1}`}
              />
            ))}
          </div>
        ) : (
          <div className="w-full max-w-[280px] sm:max-w-[310px] flex flex-col items-center gap-0.5 select-none py-0.5 self-center">
            <div className="w-full flex items-center justify-between text-[8px] font-cinzel font-bold text-[#DDB96B]/80 px-1 tracking-widest uppercase">
              <span>ÁLBUM {paraRomano(indiceMomento + 1)}</span>
              <span className="text-[7.5px] font-mono text-slate-400">
                {indiceMomento + 1} / {momentos.length}
              </span>
            </div>
            <div
              className="relative w-full h-2 bg-[#050B17] rounded-full border border-[#1E325C] shadow-inner flex items-center cursor-pointer px-0.5 group"
              onClick={(e) => {
                const rect = e.currentTarget.getBoundingClientRect();
                const clickX = e.clientX - rect.left;
                const pct = Math.max(0, Math.min(1, clickX / rect.width));
                const novoIdx = Math.min(momentos.length - 1, Math.floor(pct * momentos.length));
                feedbackTatil.clique();
                onMudarMomento(novoIdx);
              }}
              title="Clique para navegar entre os álbuns da esteira"
            >
              <div
                className="h-1 rounded-full bg-gradient-to-r from-[#B8862D] via-[#DDB96B] to-[#FDE68A] shadow-[0_0_8px_rgba(221,185,107,0.7)] transition-all duration-200"
                style={{
                  width: `${Math.max(4, ((indiceMomento + 1) / momentos.length) * 100)}%`,
                }}
              />
              <div
                className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-4 h-2 rounded-full bg-gradient-to-r from-[#DDB96B] to-[#FDE68A] border border-[#050B17] shadow-[0_0_8px_rgba(221,185,107,0.9)] transition-all duration-200 pointer-events-none group-hover:scale-110"
                style={{
                  left: `${Math.max(3, Math.min(97, ((indiceMomento + 0.5) / momentos.length) * 100))}%`,
                }}
              />
            </div>
          </div>
        )}

        {/* =========================================================================
            BOX 2 (INFERIOR INDEPENDENTE): VITROLA H-33 DECK STITCH
            ========================================================================= */}
        <div className="relative w-full flex-[5_5_0%] min-h-[210px] rounded-2xl sm:rounded-3xl bg-gradient-to-b from-[#0C1422] to-[#070B13] border-2 border-[#DDB96B]/50 shadow-2xl p-2.5 sm:p-3 flex flex-col justify-between items-center overflow-hidden">
          {/* Moldura interna chanfrada dourada Stitch */}
          <div className="absolute inset-[3px] rounded-[13px] sm:rounded-[21px] border border-[#DDB96B]/20 pointer-events-none" />

          {/* HEADER DO DECK: BOTÃO EQUALIZADOR + DISPLAY TELEMETRIA + STATUS ESTREITO RITO */}
          <div className="w-full flex items-center justify-between gap-1.5 pb-1.5 mb-0.5 border-b border-[#DDB96B]/20 shrink-0 relative z-20">
            {/* Quick Toggle Equalizador / Surdina */}
            <button
              type="button"
              onClick={() => {
                feedbackTatil.clique();
                onAbrirConfiguracoesSurdina?.();
              }}
              className="p-1 rounded-lg bg-black/50 border border-[#DDB96B]/40 text-[#DDB96B] hover:text-[#FFF2CC] active:scale-95 transition-all shadow cursor-pointer group shrink-0"
              title="Ajustar Equalização / Surdina"
            >
              <svg className="w-4 h-4 drop-shadow-[0_0_6px_rgba(221,185,107,0.4)]" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <line strokeLinecap="round" x1="4" x2="4" y1="21" y2="14" />
                <line strokeLinecap="round" x1="4" x2="4" y1="10" y2="3" />
                <line strokeLinecap="round" x1="12" x2="12" y1="21" y2="12" />
                <line strokeLinecap="round" x1="12" x2="12" y1="8" y2="3" />
                <line strokeLinecap="round" x1="20" x2="20" y1="21" y2="16" />
                <line strokeLinecap="round" x1="20" x2="20" y1="12" y2="3" />
                <circle cx="4" cy="12" fill="#E3BE61" r="2" />
                <circle cx="12" cy="10" fill="#E3BE61" r="2" />
                <circle cx="20" cy="14" fill="#E3BE61" r="2" />
              </svg>
            </button>

            {/* Display LED Digital com cantos arredondados Stitch */}
            <div className="flex-1 max-w-[215px] sm:max-w-[235px] px-2 py-0.5 rounded-xl flex flex-col gap-0.5 border border-[#1E325C] shadow-inner bg-[#02050E]">
              {/* Linha 1: Tempo + Bargraph VU Level */}
              <div className="w-full flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <span className="text-[7px] text-[#00E5FF] font-mono uppercase tracking-wider">
                    TEMPO
                  </span>
                  <span className="text-[11px] font-mono font-bold text-[#00E5FF] tracking-wider leading-none">
                    {temAlbumNoMomento ? formatarTempo(tempoAtual) : '--:--'}
                  </span>
                </div>

                <div className="w-px h-3 bg-[#1E325C]" />

                <div className="flex items-center gap-1.5">
                  <span className="text-[7px] text-[#00E5FF] font-mono uppercase tracking-wider">
                    VU
                  </span>
                  <div className="flex items-end gap-0.5 h-2.5 w-14 sm:w-16">
                    {Array.from({ length: 12 }, (_, i) => {
                      const ativo = vuAtivos.includes(i);
                      let corBg = 'bg-[#061A28]';
                      if (ativo) {
                        if (i < 5) corBg = 'bg-[#00E5FF] shadow-[0_0_4px_#00E5FF]';
                        else if (i < 8) corBg = 'bg-[#DDB96B] shadow-[0_0_4px_#DDB96B]';
                        else corBg = 'bg-[#ef4444] shadow-[0_0_4px_#ef4444]';
                      }
                      return (
                        <div
                          key={`vu-bar-deck-${i}`}
                          className={`w-[2px] h-full rounded-[1px] transition-colors duration-100 ${corBg}`}
                        />
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Linha 2: Trilha ativa e Artista */}
              <div className="w-full pt-0.5 border-t border-[#1E325C]/70 flex items-center gap-1 overflow-hidden">
                <span className="text-[7.5px] font-mono font-bold text-[#00E5FF]/80 flex-shrink-0 uppercase">
                  {temAlbumNoMomento ? `TRK ${String(idxFaixaAtiva + 1).padStart(2, '0')}:` : 'TRK --:'}
                </span>
                <span className="text-[8.5px] font-mono font-bold text-[#FDE68A] truncate tracking-wide leading-tight">
                  {temAlbumNoMomento
                    ? `${musicaAtiva?.titulo || 'Trilha selecionada'}${
                        musicaAtiva?.autor_artista ? ` • ${musicaAtiva.autor_artista}` : ''
                      }`
                    : 'Nenhum álbum neste momento litúrgico'}
                </span>
              </div>
            </div>

            {/* Lâmpada de Rito Estrito */}
            <div className="flex items-center gap-1.5 bg-black/60 px-2 py-0.5 rounded-full border border-[#DDB96B]/30 text-[8.5px] font-mono text-[#DDB96B] shrink-0">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_5px_#34d399] animate-pulse" />
              <span className="hidden sm:inline">ESTRITO RITO</span>
              <span className="sm:hidden">RITO</span>
            </div>
          </div>

          {/* ÁREA DO DECK: PRATO COM DISCO VINYL-GROOVES + BRAÇO MECÂNICO DE LATÃO AUDIÓFILO */}
          <div
            className="relative w-full flex-1 min-h-[160px] flex items-center justify-center my-0.5"
            style={{ overflow: 'visible' }}
          >
            {/* Platter Recessed Shadow Well */}
            <div className="absolute w-[184px] h-[184px] sm:w-[196px] sm:h-[196px] rounded-full bg-black/95 shadow-[inset_0_4px_16px_rgba(0,0,0,0.95)] border border-[#1a2333] ml-[-20px] sm:ml-[-25px]" />

            {temAlbumNoMomento ? (
              /* DISCO DE VINIL STITCH COM RANHURAS HI-FI REALISTAS */
              <div
                className={`relative w-[178px] h-[178px] sm:w-[188px] sm:h-[188px] rounded-full vinyl-grooves shadow-[0_18px_45px_rgba(0,0,0,0.85),inset_0_1px_2px_rgba(255,255,255,0.1)] flex items-center justify-center cursor-pointer select-none z-20 ml-[-20px] sm:ml-[-25px] ${
                  tocando ? 'spin-slow' : 'spin-paused'
                }`}
                onClick={() => setModalTracklistAberto(true)}
                title="Toque no vinil para abrir a lista de faixas"
              >
                {/* Anéis concêntricos de brilho da borda chanfrada */}
                <div className="absolute inset-0 rounded-full border border-neutral-700/60 pointer-events-none" />
                <div className="absolute inset-[3px] rounded-full border border-neutral-800/80 pointer-events-none" />

                {/* Selo Central do Vinil */}
                <div
                  style={{
                    background: eRitoBrasileiro
                      ? 'radial-gradient(circle, #38050d 0%, #1e0307 70%, #0d0103 100%)'
                      : 'radial-gradient(circle, #0c1626 0%, #050a12 70%, #03060a 100%)',
                  }}
                  className="w-[74px] h-[74px] sm:w-[80px] sm:h-[80px] rounded-full border-2 border-[#DDB96B]/90 shadow-2xl flex flex-col items-center justify-center text-center p-1 relative z-10"
                >
                  <span className="font-cinzel text-[7px] text-[#DDB96B] tracking-widest font-bold">
                    H • 33
                  </span>
                  <span className="font-cinzel text-[6px] sm:text-[6.5px] text-[#FFF2CC] uppercase font-semibold leading-tight mt-0.5 line-clamp-1 max-w-[62px] drop-shadow">
                    {momentoAtivo.evento_nome}
                  </span>
                  <span className="font-serif italic text-[5.5px] text-[#DDB96B]/90 mt-0.5">
                    ÁLBUM {paraRomano(indiceMomento + 1)} • {eRitoBrasileiro ? 'RITO BR.' : 'RITO REAA'}
                  </span>
                  {/* Spindle Center Hole */}
                  <div className="w-2.5 h-2.5 rounded-full bg-gradient-to-b from-neutral-900 to-black border border-[#FDE68A]/80 mt-0.5 shadow-inner flex items-center justify-center">
                    <div className="w-1 h-1 rounded-full bg-neutral-300" />
                  </div>
                </div>
              </div>
            ) : (
              /* PRATO VAZIO SEM VINIL */
              <div
                onClick={() => setModalTracklistAberto(true)}
                className="relative w-[178px] h-[178px] sm:w-[188px] sm:h-[188px] rounded-full flex flex-col items-center justify-center z-20 cursor-pointer border border-[#1E325C]/70 shadow-inner group ml-[-20px] sm:ml-[-25px]"
                style={{
                  background: 'radial-gradient(circle, #081122 0%, #050B17 65%, #02050E 100%)',
                  boxShadow: 'inset 0 0 25px rgba(0,0,0,0.95)',
                }}
                title="Momento sem álbum cadastrado. Toque para adicionar trilhas."
              >
                <div className="w-32 h-32 rounded-full border border-dashed border-[#1E325C]/50 flex items-center justify-center pointer-events-none">
                  <div className="w-20 h-20 rounded-full border border-dashed border-[#1E325C]/35 flex flex-col items-center justify-center p-2 text-center pointer-events-none">
                    <span className="text-[7px] font-cinzel text-slate-500 uppercase tracking-widest leading-none">
                      Prato Vazio
                    </span>
                    <span className="text-[6.5px] text-[#DDB96B]/80 font-mono mt-1 font-semibold group-hover:text-yellow-300 transition-colors">
                      + Compor
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* BRAÇO MECÂNICO AUDIÓFILO DE LATÃO DOURADO (STITCH TONEARM SYSTEM) */}
            <div className="absolute right-1 top-1 w-20 h-48 pointer-events-none z-30 flex flex-col items-center">
              {/* Base Fixa / Gimbal Knob */}
              <div className="w-10 h-10 rounded-full brass-knob border-2 border-[#FDE68A] flex items-center justify-center shadow-xl relative">
                {/* Centro do Parafuso de Precisão */}
                <div className="w-4 h-4 rounded-full bg-gradient-to-b from-neutral-800 to-black border border-[#DDB96B] flex items-center justify-center">
                  <div className="w-2 h-[1px] bg-[#FDE68A]" />
                </div>
                {/* Anti-skating counterweight stub */}
                <div className="absolute -top-1 right-1.5 w-2.5 h-4 bg-gradient-to-r from-[#ab7f28] to-[#e3be61] rounded-sm shadow" />
              </div>

              {/* Tubo Curvo em S Móvel articulado a partir do centro do Gimbal */}
              <div
                className="relative w-12 h-36 -mt-2 -mr-3"
                style={{
                  transformOrigin: '20px 0px',
                  transform: `rotate(${anguloBraco}deg)`,
                  transition: 'transform 0.45s cubic-bezier(0.25, 1, 0.5, 1)',
                }}
              >
                <svg
                  className="w-full h-full filter drop-shadow-[2px_4px_6px_rgba(0,0,0,0.8)]"
                  fill="none"
                  viewBox="0 0 50 140"
                  style={{ overflow: 'visible' }}
                >
                  <path
                    d="M 26 0 C 26 30, 36 50, 32 90 C 30 115, 20 120, 16 135"
                    stroke="url(#brassGradientStitch)"
                    strokeLinecap="round"
                    strokeWidth="3.2"
                  />
                  <defs>
                    <linearGradient id="brassGradientStitch" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#FFF0B3" />
                      <stop offset="40%" stopColor="#D4AF37" />
                      <stop offset="80%" stopColor="#805A17" />
                      <stop offset="100%" stopColor="#FFD966" />
                    </linearGradient>
                  </defs>
                </svg>

                {/* Cápsula Audiófila com agulha e LED âmbar */}
                <div className="absolute -bottom-1 left-2 w-4 h-6 bg-gradient-to-br from-[#1c1d22] via-[#2d2e38] to-[#0c0d11] border border-[#DDB96B] rounded-sm transform -rotate-12 shadow-md flex flex-col items-center justify-between p-0.5">
                  <span className="w-2.5 h-0.5 bg-[#DDB96B] rounded-full" />
                  <span className="w-1 h-1.5 bg-[#ffb938] rounded-full shadow-[0_0_4px_#ffb938]" />
                </div>
              </div>
            </div>
          </div>

          {/* CONTROLE DE VOLUME EM LINHA COM MARCAÇÕES PRÉ-ENTALHADAS STITCH */}
          <div className="w-full mt-1 px-1 pt-1.5 border-t border-[#DDB96B]/20 flex flex-col gap-0.5 relative z-20">
            <div className="flex items-center justify-between mb-0.5 text-[9px] font-mono text-[#DDB96B]">
              <div className="flex items-center gap-1 font-cinzel font-bold text-[#FDE68A]">
                <Volume2 className="w-3.5 h-3.5 inline text-[#DDB96B]" />
                <span>VOLUME</span>
              </div>
              <span className="font-mono text-white font-bold">{volumeExecucao}%</span>
            </div>

            <div className="relative flex items-center">
              <input
                type="range"
                min="0"
                max="100"
                value={volumeExecucao}
                onChange={(e) => onAlterarVolume?.(Number(e.target.value))}
                className="w-full h-1.5 bg-black rounded-lg appearance-none cursor-pointer border border-neutral-700/80 focus:outline-none fader-volume-stitch"
                title="Fader de Volume Master da Vitrola"
              />
            </div>

            {/* Escala Pré-Entalhada Litúrgica (0 -> PP -> MP -> MF -> 100) */}
            <div className="flex justify-between text-[8px] font-serif text-[#DDB96B]/80 px-0.5 mt-0.5 tracking-wider select-none">
              <span
                className="text-[7.5px] font-mono text-slate-500 cursor-pointer hover:text-white transition-colors"
                onClick={() => onAlterarVolume?.(0)}
                title="Mudo (0%)"
              >
                0
              </span>
              <span
                className="font-bold text-[#FDE68A] cursor-pointer hover:text-white transition-colors flex items-center gap-0.5"
                onClick={() => {
                  feedbackTatil.clique();
                  onAlterarVolume?.(28);
                }}
                title="Calibrar para Pianíssimo / Sórdida (28%)"
              >
                PP <span className="text-[7px] font-sans font-normal opacity-70">(Sórdida)</span>
              </span>
              <span
                className="font-bold text-[#FDE68A] cursor-pointer hover:text-white transition-colors"
                onClick={() => {
                  feedbackTatil.clique();
                  onAlterarVolume?.(60);
                }}
                title="Calibrar para Mezzo-piano (60%)"
              >
                MP
              </span>
              <span
                className="font-bold text-[#FDE68A] cursor-pointer hover:text-white transition-colors flex items-center gap-0.5"
                onClick={() => {
                  feedbackTatil.clique();
                  onAlterarVolume?.(85);
                }}
                title="Calibrar para Mezzo-forte / Plena (85%)"
              >
                MF <span className="text-[7px] font-sans font-normal opacity-70">(Plena)</span>
              </span>
              <span
                className="text-[7.5px] font-mono text-slate-500 cursor-pointer hover:text-white transition-colors"
                onClick={() => onAlterarVolume?.(100)}
                title="Volume Máximo (100%)"
              >
                100
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* =========================================================================
          MODAL DINÂMICO DE LISTA DE MÚSICAS DO ÁLBUM LITÚRGICO
          ========================================================= */}
      {modalTracklistAberto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
          <div className="relative w-full max-w-sm rounded-3xl bg-gradient-to-b from-[#0E1C36] via-[#0A1428] to-[#070F1E] border-2 border-[#DDB96B]/50 shadow-[0_0_50px_rgba(0,0,0,0.95)] p-4 flex flex-col gap-3">
            {/* Topo do Modal: Capa Quadrada e Identificação */}
            <div className="flex items-center justify-between border-b border-[#DDB96B]/30 pb-2.5">
              <div className="flex items-center gap-3">
                {/* Capa do Álbum: Estritamente quadrada e sem borda dourada */}
                <div
                  style={{ background: fundoCapa }}
                  className="w-13 h-13 rounded-none flex items-center justify-center flex-shrink-0 shadow-lg"
                >
                  <SimboloEsquadroCompasso />
                </div>
                <div className="flex flex-col min-w-0 text-left">
                  <span className="text-[9px] font-mono text-[#FDE68A] font-bold uppercase tracking-wider">
                    ÁLBUM {paraRomano(indiceMomento + 1)} • {rito.toUpperCase()}
                  </span>
                  <h2 className="text-xs font-cinzel font-bold text-white leading-tight truncate">
                    {momentoAtivo.evento_nome}
                  </h2>
                  <span className="text-[9px] text-[#DDB96B]/80 truncate">
                    {momentoAtivo.evento_descricao || 'Trilhas Litúrgicas Selecionadas'}
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setModalTracklistAberto(false)}
                className="p-1.5 rounded-full text-slate-400 hover:text-white hover:bg-white/10 active:scale-95 transition-all cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex items-center justify-between text-[9px] text-[#DDB96B]/80 font-mono px-1">
              <span>Toque na trilha para tocar no vinil:</span>
              <span className="text-slate-400">{faixasAtivas.length} Trilhas</span>
            </div>

            {/* Lista de Faixas Dinâmica */}
            <div className="flex flex-col gap-1.5 max-h-[250px] overflow-y-auto pr-1">
              {faixasAtivas.map((faixa, i) => {
                const estaAtiva = i === idxFaixaAtiva;
                return (
                  <div
                    key={`modal-faixa-${faixa.id}-${i}`}
                    onClick={() => {
                      feedbackTatil.clique();
                      onTrocarFaixa(i, true);
                      setModalTracklistAberto(false);
                    }}
                    className={`px-3 py-2 rounded-xl text-left flex items-center justify-between cursor-pointer transition-all border ${
                      estaAtiva
                        ? 'bg-[#DDB96B]/20 border-[#DDB96B] text-white shadow-md'
                        : 'bg-white/5 border-transparent text-slate-300 hover:bg-white/10 hover:border-[#1E325C]'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 truncate flex-1 min-w-0 pr-2">
                      <span className={`font-mono text-xs ${estaAtiva ? 'text-[#FDE68A] font-bold' : 'text-slate-400'}`}>
                        {i + 1}.
                      </span>
                      <div className="flex flex-col truncate min-w-0">
                        <span className={`text-xs font-cinzel font-semibold truncate ${estaAtiva ? 'text-white' : 'text-slate-200'}`}>
                          {faixa.titulo}
                        </span>
                        <span className="text-[9px] text-[#DDB96B]/80 truncate">
                          {faixa.autor_artista || 'Autor Maçônico'}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {onAlternarPreferencia && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            feedbackTatil.clique();
                            onAlternarPreferencia(faixa.id, !faixa.preferida);
                          }}
                          className={`p-1 rounded hover:bg-white/10 transition-colors ${
                            faixa.preferida ? 'text-[#DDB96B]' : 'text-slate-500 hover:text-slate-300'
                          }`}
                          title={faixa.preferida ? 'Trilha favorita' : 'Marcar como favorita'}
                        >
                          <Star className="w-3.5 h-3.5 fill-current" />
                        </button>
                      )}
                      <span className={`text-[9px] font-mono ${estaAtiva ? 'text-[#FDE68A] font-bold' : 'text-slate-400'}`}>
                        {formatarTempo(faixa.duracao_segundos)}
                      </span>
                      {estaAtiva && <span className="text-emerald-400 text-xs">●</span>}
                    </div>
                  </div>
                );
              })}

              {faixasAtivas.length === 0 && (
                <div className="py-6 text-center text-slate-400 text-xs flex flex-col items-center gap-2">
                  <Music className="w-8 h-8 text-slate-600" />
                  <span>Nenhuma trilha cadastrada para este momento.</span>
                </div>
              )}
            </div>

            {/* Ações do Modal */}
            <div className="flex flex-col gap-2 pt-1 border-t border-[#DDB96B]/20">
              {onAbrirUpload && (
                <button
                  type="button"
                  onClick={() => {
                    setModalTracklistAberto(false);
                    onAbrirUpload();
                  }}
                  className="w-full py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-[#1E325C] text-[11px] font-cinzel text-slate-300 flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5 text-[#DDB96B]" />
                  <span>Adicionar / Compor mais músicas</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => setModalTracklistAberto(false)}
                className="w-full py-2 rounded-xl bg-gradient-to-r from-[#DDB96B]/20 via-[#FDE68A]/25 to-[#DDB96B]/20 hover:brightness-125 border border-[#DDB96B]/50 text-xs font-cinzel font-bold text-[#FDE68A] transition-all cursor-pointer"
              >
                Fechar Acervo Litúrgico
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
