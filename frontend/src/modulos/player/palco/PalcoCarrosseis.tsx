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

function calcularMomento3D(distancia: number) {
  const ad = Math.abs(distancia);
  const passo1 = 180;
  const passo2 = 75;
  const sinal = distancia < 0 ? -1 : 1;
  const x = sinal * (ad <= 1 ? ad * passo1 : passo1 + (ad - 1) * passo2);
  const y = Math.min(ad, 2) * 6;
  const z = -ad * 85;
  const rotY = -sinal * Math.min(ad, 1.8) * 24;
  const escala = Math.max(0.7, 1 - ad * 0.22);
  const opacidade = Math.max(0, Math.min(1, 1 - ad * 0.45));
  const zIndex = Math.round(200 - ad * 20);
  return { x, y, z, rotY, escala, opacidade, zIndex };
}

/** Símbolo Sagrado Maçônico: Esquadro e Compasso com o 'G' central gravado em Ouro */
const SimboloEsquadroCompasso: React.FC = () => (
  <svg className="w-8 h-8 text-[#DDB96B] drop-shadow" viewBox="0 0 100 100" fill="none" stroke="currentColor">
    <circle cx="50" cy="18" r="4.5" fill="#DDB96B" stroke="#785012" strokeWidth="1.5" />
    <line x1="50" y1="18" x2="22" y2="82" stroke="#DDB96B" strokeWidth="4" strokeLinecap="round" />
    <line x1="50" y1="18" x2="78" y2="82" stroke="#DDB96B" strokeWidth="4" strokeLinecap="round" />
    <path d="M 35 58 A 22 22 0 0 0 65 58" fill="none" stroke="#DDB96B" strokeWidth="2" strokeDasharray="3,2" />
    <path d="M 20 42 L 50 76 L 80 42" fill="none" stroke="#FDE68A" strokeWidth="4.5" strokeLinecap="square" />
    <text
      x="50"
      y="54"
      fontFamily="'Cinzel', serif"
      fontSize="18"
      fontWeight="900"
      fill="#DDB96B"
      textAnchor="middle"
      dominantBaseline="central"
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
  const musicaAtiva = momentoAtivo?.musica_sorteada ?? faixasAtivas[0];
  const idxFaixaAtiva = Math.max(
    0,
    faixasAtivas.findIndex((f) => f.id === musicaAtiva?.id)
  );

  // Animação dinâmica do bargraph VU meter
  useEffect(() => {
    if (!tocando) {
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
  }, [tocando, volumeExecucao]);

  // Ângulo dinâmico do braço de precisão H-33
  // Repouso: 0deg | Leitura: 14deg a 24deg (não recua durante pause!)
  const anguloBraco =
    !tocando && progressoFaixa === 0
      ? 0
      : 14 + Math.min(1, Math.max(0, progressoFaixa)) * 3.8;

  // Lógica de gestos do carrossel
  const PASSO_X = 180;
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

  // Gradientes e fundos baseados no Rito ativo
  const fundoCapa = eRitoBrasileiro
    ? 'radial-gradient(circle at 35% 30%, #5A0A18 0%, #38050D 65%, #1C0206 100%)'
    : 'linear-gradient(145deg, rgba(14, 28, 54, 0.96) 0%, rgba(10, 20, 40, 0.98) 55%, rgba(7, 15, 30, 1) 100%)';

  const bercoEmblema = eRitoBrasileiro ? '#150205' : '#0A1428';

  return (
    <div className="w-full flex-1 min-h-0 flex flex-col items-center justify-center p-1 sm:p-2 select-none overflow-y-auto">
      {/* CONTAINER CENTRAL UNIFICADO COM LARGURA RIGOROSA (MAX-W-[360px] SM:MAX-W-[380px]) */}
      <div className="w-full max-w-[360px] sm:max-w-[380px] flex flex-col items-center gap-2">
        {/* =========================================================================
            BOX 1 (SUPERIOR INDEPENDENTE): ACERVO LITÚRGICO • CARROSSEL 3D
            ========================================================================= */}
        <section className="w-full rounded-3xl bg-gradient-to-b from-[#0A1428] via-[#070F1E] to-[#040812] border border-[#1E325C]/80 shadow-[0_12px_32px_rgba(0,0,0,0.7)] p-2.5 sm:p-3 flex flex-col items-center">
          {/* PALCO 3D DO CARROSSEL DE ÁLBUNS */}
          <div
            className="relative w-full h-[180px] sm:h-[190px] overflow-hidden select-none cursor-grab active:cursor-grabbing flex items-center justify-center rounded-2xl bg-gradient-to-b from-[#050B17] via-[#040812] to-[#02050E]"
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
                const t = calcularMomento3D(distancia);
                const ativo = Math.abs(distancia) < 0.45;
                const totalFaixas = momento.candidatas?.length || 0;

                return (
                  <div
                    key={`album-card-${momento.evento_id}-${i}`}
                    onClick={() => lidarCliqueCard(i)}
                    style={{
                      position: 'absolute',
                      width: 175,
                      height: 175,
                      borderRadius: 0,
                      border: 'none', // Estritamente sem borda dourada conforme solicitado!
                      transform: `translate3d(${t.x}px, ${t.y}px, ${t.z}px) rotateY(${t.rotY}deg) scale(${t.escala})`,
                      opacity: t.opacidade,
                      zIndex: t.zIndex,
                      transition: arrastando
                        ? 'none'
                        : 'transform 0.45s cubic-bezier(0.22, 0.9, 0.25, 1), opacity 0.4s ease-out',
                      transformStyle: 'preserve-3d',
                      background: fundoCapa,
                      boxShadow: ativo
                        ? '0 0 25px rgba(221, 185, 107, 0.20), 0 16px 36px rgba(0,0,0,0.95)'
                        : '0 12px 30px rgba(0,0,0,0.85)',
                      filter: ativo ? 'none' : 'brightness(0.72)',
                      cursor: 'pointer',
                    }}
                    className="p-3 flex flex-col justify-between cursor-pointer select-none"
                  >
                    {/* Top bar da capa: Identificador e Dinâmica */}
                    <div className="w-full flex items-center justify-between text-[7.5px] font-cinzel border-b border-[#DDB96B]/30 pb-1 pointer-events-none">
                      <span className="font-bold text-[#FDE68A] tracking-wider">
                        ÁLBUM {paraRomano(i + 1)}
                      </span>
                      <span className="px-1.5 py-0.5 rounded-none font-mono font-bold bg-[#DDB96B]/15 text-[#FDE68A] border border-[#DDB96B]/30">
                        {momento.em_surdina ? 'pp • SURDINA' : 'mf • FORTE'}
                      </span>
                    </div>

                    {/* Centro da capa: Berço escuro com Esquadro e Compasso com 'G' em Ouro */}
                    <div className="my-auto flex flex-col items-center justify-center pointer-events-none">
                      <div
                        style={{ background: bercoEmblema }}
                        className="w-16 h-16 rounded-none border border-[#DDB96B]/70 flex items-center justify-center shadow-lg relative"
                      >
                        <div className="scale-110">
                          <SimboloEsquadroCompasso />
                        </div>
                      </div>
                    </div>

                    {/* Base da capa: Título em serifa dourada + contagem de trilhas */}
                    <div className="w-full flex flex-col items-center text-center border-t border-[#DDB96B]/30 pt-1 pointer-events-none">
                      <h3 className="font-cinzel text-[10px] font-bold text-white leading-tight line-clamp-1 w-full drop-shadow">
                        {momento.evento_nome}
                      </h3>
                      <span className="text-[7.5px] font-mono text-[#FDE68A] font-semibold mt-0.5 flex items-center justify-center gap-1">
                        {totalFaixas} Trilhas LP
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* =========================================================================
            PAGINAÇÃO NO VÃO CENTRAL (PÍLULA DOURADA ALONGADA + PONTOS)
            ========================================================================= */}
        <div className="flex items-center justify-center gap-1.5 py-0.5 select-none">
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

        {/* =========================================================================
            BOX 2 (INFERIOR INDEPENDENTE): VITROLA H-33 DECK
            ========================================================================= */}
        <div className="relative w-full rounded-3xl bg-gradient-to-b from-[#0E1C36] via-[#0A1428] to-[#070F1E] border-2 border-[#DDB96B]/40 shadow-[0_16px_40px_-10px_rgba(0,0,0,0.85),0_0_25px_-5px_rgba(14,28,54,0.45)] p-3 sm:p-3.5 flex flex-col items-center">
          {/* HEADER DO DECK: LOGO CURSIVO H-33 + DISPLAY LED DIGITAL AO LADO */}
          <div className="w-full flex items-center justify-between gap-2 pb-2 mb-1.5 border-b border-[#DDB96B]/25">
            {/* Logo Cursivo H-33 */}
            <LogoCursivoH33 />

            {/* Display LED Digital com cantos arredondados à direita */}
            <div className="flex-1 max-w-[220px] sm:max-w-[240px] px-2 py-1 rounded-xl flex flex-col gap-0.5 border border-[#1E325C] shadow-inner bg-[#02050E]">
              {/* Linha 1: Tempo + Bargraph VU Level */}
              <div className="w-full flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <span className="text-[7px] text-[#00E5FF] font-mono uppercase tracking-wider">
                    TEMPO
                  </span>
                  <span className="text-[11px] font-mono font-bold text-[#00E5FF] tracking-wider leading-none">
                    {formatarTempo(tempoAtual)}
                  </span>
                </div>

                <div className="w-px h-3 bg-[#1E325C]" />

                <div className="flex items-center gap-1.5">
                  <span className="text-[7px] text-[#00E5FF] font-mono uppercase tracking-wider">
                    VU LEVEL
                  </span>
                  <div className="flex items-end gap-0.5 h-2.5 w-16 sm:w-20">
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
                          className={`w-[2.5px] h-full rounded-[1px] transition-colors duration-100 ${corBg}`}
                        />
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Linha 2: Trilha ativa e Artista */}
              <div className="w-full pt-0.5 border-t border-[#1E325C]/70 flex items-center gap-1 overflow-hidden">
                <span className="text-[7.5px] font-mono font-bold text-[#00E5FF]/80 flex-shrink-0 uppercase">
                  TRK {String(idxFaixaAtiva + 1).padStart(2, '0')}:
                </span>
                <span className="text-[8.5px] font-mono font-bold text-[#FDE68A] truncate tracking-wide leading-tight">
                  {musicaAtiva?.titulo || 'Sem trilha designada'}
                  {musicaAtiva?.autor_artista ? ` • ${musicaAtiva.autor_artista}` : ''}
                </span>
              </div>
            </div>
          </div>

          {/* ÁREA DO DECK: ÍCONE DE EQUALIZADOR + VINIL REPOSICIONADO + BRAÇO AUDIÓFILO */}
          <div
            className="relative w-full h-[225px] flex items-center justify-center my-0.5"
            style={{ overflow: 'visible' }}
          >
            {/* Ícone Gráfico de Equalizador / Faders no canto superior esquerdo do deck */}
            <button
              type="button"
              onClick={() => {
                feedbackTatil.clique();
                onAbrirConfiguracoesSurdina?.();
              }}
              className="absolute left-2 top-2 p-1.5 rounded-lg text-[#DDB96B] hover:text-white hover:bg-white/10 active:scale-95 transition-all cursor-pointer z-20 group"
              title="Ajustar Equalização / Surdina"
            >
              <svg
                className="w-6 h-6 drop-shadow-[0_0_6px_rgba(221,185,107,0.4)] group-hover:scale-110 transition-transform"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.2"
                strokeLinecap="round"
              >
                <line x1="4" y1="6" x2="20" y2="6" />
                <line x1="10" y1="4" x2="10" y2="8" strokeWidth="2.8" />
                <line x1="4" y1="12" x2="20" y2="12" />
                <line x1="16" y1="10" x2="16" y2="14" strokeWidth="2.8" />
                <line x1="4" y1="18" x2="20" y2="18" />
                <line x1="8" y1="16" x2="8" y2="20" strokeWidth="2.8" />
              </svg>
            </button>

            {/* PRATO METÁLICO E VINIL (+8% À DIREITA) */}
            <div className="relative w-[195px] h-[195px] sm:w-[205px] sm:h-[205px] rounded-full bg-[#050B17] border-4 border-[#1E325C] shadow-inner flex items-center justify-center flex-shrink-0 z-20 ml-[68px] sm:ml-[78px]">
              {/* Spindle Central Dourado */}
              <div className="absolute w-3 h-3 rounded-full bg-[#DDB96B] shadow-lg z-30 flex items-center justify-center">
                <div className="w-1 h-1 rounded-full bg-black" />
              </div>

              {/* DISCO DE VINIL ACETINADO */}
              <div
                style={{
                  background:
                    'radial-gradient(circle, #070F1E 0%, #070F1E 16%, #080808 17%, #1a1a1a 20%, #050505 24%, #181818 28%, #050505 33%, #1f1f1f 38%, #040404 43%, #171717 49%, #050505 55%, #1c1c1c 61%, #040404 67%, #161616 74%, #040404 81%, #121212 89%, #020202 100%)',
                  boxShadow:
                    'inset 0 0 15px rgba(0,0,0,0.95), 0 14px 35px rgba(0,0,0,0.85), 0 0 0 1px rgba(221, 185, 107, 0.35)',
                }}
                className={`relative w-[185px] h-[185px] sm:w-[195px] sm:h-[195px] rounded-full flex items-center justify-center z-30 cursor-pointer shadow-2xl ${
                  tocando ? 'animate-[spin_2.2s_linear_infinite]' : ''
                }`}
                onClick={() => setModalTracklistAberto(true)}
                title="Toque no vinil para abrir a lista de faixas"
              >
                {/* Brilho Cônico do Vinil */}
                <div
                  style={{
                    background:
                      'conic-gradient(from 45deg, rgba(255, 255, 255, 0.14) 0deg, transparent 55deg, rgba(255, 255, 255, 0.08) 110deg, transparent 175deg, rgba(255, 255, 255, 0.15) 235deg, transparent 295deg, rgba(255, 255, 255, 0.1) 360deg)',
                  }}
                  className="absolute inset-0 rounded-full pointer-events-none"
                />

                {/* SELO CENTRAL DO DISCO (BORDÔ SE RITO BRASILEIRO, DEEP BLUE DEMAIS RITOS) */}
                <div
                  style={{
                    background: fundoCapa,
                    boxShadow: '0 10px 25px rgba(0,0,0,0.9), inset 0 0 12px rgba(0,0,0,0.85)',
                  }}
                  className="relative w-18 h-18 sm:w-20 sm:h-20 rounded-full border-2 border-[#DDB96B] flex flex-col items-center justify-center p-1 text-center shadow-md"
                >
                  <span className="text-[5.5px] font-cinzel font-black text-[#FDE68A] tracking-wider">
                    H-33
                  </span>
                  <span className="text-[7px] sm:text-[7.5px] font-bold text-white font-cinzel leading-tight line-clamp-2 max-w-[65px] sm:max-w-[70px] drop-shadow">
                    {momentoAtivo.evento_nome}
                  </span>
                  <span className="text-[5.5px] text-[#DDB96B] font-mono uppercase mt-0.5">
                    ÁLBUM {paraRomano(indiceMomento + 1)} • RITO BR.
                  </span>
                  <div className="w-2 h-2 rounded-full bg-[#050B17] border border-[#DDB96B]/60 mt-0.5" />
                </div>
              </div>
            </div>

            {/* BRAÇO AUDIÓFILO PRECISION H-33 (PIVÔ FIXADO À DIREITA) */}
            <div className="relative w-[95px] h-[210px] flex-shrink-0 pointer-events-none z-50 -ml-12 sm:-ml-12">
              <svg className="w-full h-full drop-shadow-2xl" viewBox="0 0 95 210" style={{ overflow: 'visible' }}>
                <defs>
                  <linearGradient id="metalOuroH33Deck" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#FDE68A" />
                    <stop offset="50%" stopColor="#DDB96B" />
                    <stop offset="100%" stopColor="#785012" />
                  </linearGradient>
                  <filter id="sombraBracoH33Deck" x="-30%" y="-30%" width="160%" height="160%">
                    <feDropShadow dx="3" dy="5" stdDeviation="4" floodColor="#000" floodOpacity="0.95" />
                  </filter>
                </defs>

                {/* Base Fixa do Pivô */}
                <g>
                  <circle cx="50" cy="30" r="20" fill="#0A1428" stroke="#DDB96B" strokeWidth="2" />
                  <circle cx="50" cy="30" r="12" fill="#0E1C36" stroke="#FDE68A" strokeWidth="1" />
                  <rect x="42" y="180" width="16" height="8" rx="2" fill="#0A1428" stroke="#DDB96B" strokeWidth="1.2" />
                  <circle cx="50" cy="184" r="2.5" fill="#DDB96B" />
                  <path d="M 46 178 L 46 182 M 54 178 L 54 182" stroke="#DDB96B" strokeWidth="1.5" strokeLinecap="round" />
                </g>

                {/* Parte Móvel do Braço */}
                <g
                  filter="url(#sombraBracoH33Deck)"
                  style={{
                    transformOrigin: '50px 30px',
                    transform: `rotate(${anguloBraco}deg)`,
                    transition: 'transform 0.45s cubic-bezier(0.25, 1, 0.5, 1)',
                  }}
                >
                  <rect x="41" y="4" width="18" height="14" rx="2" fill="#0E1C36" stroke="#DDB96B" strokeWidth="1.8" />
                  <circle cx="50" cy="11" r="4" fill="url(#metalOuroH33Deck)" />
                  <circle cx="50" cy="30" r="8" fill="url(#metalOuroH33Deck)" stroke="#070F1E" strokeWidth="1" />
                  <path d="M 50 30 C 56 70, 44 125, 50 170" fill="none" stroke="url(#metalOuroH33Deck)" strokeWidth="4" strokeLinecap="round" />
                  <path d="M 50 170 L 46 184" fill="none" stroke="url(#metalOuroH33Deck)" strokeWidth="4.5" strokeLinecap="round" />
                  <rect x="36" y="180" width="16" height="11" rx="2" fill="#0A1428" stroke="#DDB96B" strokeWidth="2" transform="rotate(15 44 185)" />
                  <circle cx="43" cy="193" r="2.2" fill="#DDB96B" />
                </g>
              </svg>
            </div>
          </div>

          {/* CONTROLE DE VOLUME EM LINHA COM MARCAÇÕES PRÉ-ENTALHADAS (pp e mp) */}
          <div className="w-full mt-1 pt-2 border-t border-[#DDB96B]/20 flex flex-col gap-1 px-1">
            <div className="w-full flex items-center justify-between gap-3">
              <span className="text-[10px] font-cinzel text-[#DDB96B] font-bold flex items-center gap-1 flex-shrink-0">
                <Volume2 className="w-3.5 h-3.5" />
                <span>Volume</span>
              </span>
              <div className="flex-1 relative flex flex-col justify-center">
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={volumeExecucao}
                  onChange={(e) => onAlterarVolume?.(Number(e.target.value))}
                  className="w-full h-1.5 bg-[#0A1428] border border-[#1E325C] rounded-lg appearance-none cursor-pointer accent-[#DDB96B]"
                />

                {/* Escala Pré-Entalhada na Vitrola: Marcações Gravadas em Ouro de pp e mp */}
                <div className="relative w-full h-4 text-[8px] font-mono select-none px-0.5 mt-0.5">
                  <span className="absolute left-0 text-[7px] text-slate-500 font-mono top-1">0</span>

                  {/* Ponto Pré-Entalhado pp (Pianíssimo) em 28% */}
                  <div
                    className="absolute left-[28%] -translate-x-1/2 flex flex-col items-center cursor-pointer group"
                    onClick={() => {
                      feedbackTatil.clique();
                      onAlterarVolume?.(28);
                    }}
                    title="Calibrar para Pianíssimo (28%)"
                  >
                    <div className="w-0.5 h-1.5 bg-[#DDB96B]/80 group-hover:bg-[#FDE68A]" />
                    <span className="text-[8px] font-cinzel font-black text-[#FDE68A] drop-shadow group-hover:text-white tracking-tighter">
                      pp
                    </span>
                  </div>

                  {/* Ponto Pré-Entalhado mp (Mezzo-piano) em 60% */}
                  <div
                    className="absolute left-[60%] -translate-x-1/2 flex flex-col items-center cursor-pointer group"
                    onClick={() => {
                      feedbackTatil.clique();
                      onAlterarVolume?.(60);
                    }}
                    title="Calibrar para Mezzo-piano (60%)"
                  >
                    <div className="w-0.5 h-1.5 bg-[#DDB96B]/90 group-hover:bg-[#FDE68A]" />
                    <span className="text-[8px] font-cinzel font-black text-[#FDE68A] drop-shadow group-hover:text-white tracking-tighter">
                      mp
                    </span>
                  </div>

                  <span className="absolute right-0 text-[7px] text-slate-500 font-mono top-1">100</span>
                </div>
              </div>
              <span className="font-mono text-white text-[10px] font-bold flex-shrink-0 w-8 text-right">
                {volumeExecucao}%
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
