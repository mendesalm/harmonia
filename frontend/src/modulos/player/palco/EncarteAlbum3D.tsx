import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import {
  Star,
  Plus,
  X,
  Music,
  BookOpen,
  Disc3,
  ChevronRight,
  ChevronLeft,
  Volume2,
  Volume1,
  Compass,
  Sparkles,
  Play,
} from 'lucide-react';
import { MomentoExecucao } from '../../../compartilhado/tipos';
import { feedbackTatil } from '../../../compartilhado/utilitarios/dispositivoNativo';

export interface OrigemRectCapa {
  left: number;
  top: number;
  width: number;
  height: number;
}

interface EncarteAlbum3DProps {
  momento: MomentoExecucao;
  indiceMomento: number;
  totalMomentos: number;
  eRitoBrasileiro: boolean;
  ritoNome: string;
  idxFaixaAtiva: number;
  tocando: boolean;
  origemRect?: OrigemRectCapa | null;
  onFechar: () => void;
  onTrocarFaixa: (indiceFaixa: number, tocar: boolean) => void;
  onAlternarPreferencia?: (musicaId: string, preferida: boolean) => void;
  onAbrirComporMomento?: () => void;
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

/**
 * Símbolo Sagrado Maçônico (Esquadro facetado e Compasso com 'G' central em Ouro)
 * 100% idêntico ao medalhão da capa do álbum no Box 1.
 */
const SimboloEsquadroCompassoEncarte: React.FC<{ className?: string }> = ({
  className = 'w-12 h-12',
}) => (
  <svg
    className={`${className} text-[#DDB96B] drop-shadow-[0_0_8px_rgba(227,190,97,0.7)]`}
    fill="none"
    stroke="currentColor"
    strokeLinecap="round"
    strokeLinejoin="round"
    strokeWidth="2.6"
    viewBox="0 0 100 100"
  >
    <line stroke="currentColor" x1="50" x2="16" y1="12" y2="82" />
    <line stroke="currentColor" x1="50" x2="84" y1="12" y2="82" />
    <circle cx="50" cy="12" fill="#FDF3D7" r="3.5" />
    <polyline points="28,38 50,78 72,38" stroke="#EED184" strokeWidth="3" />
    <polyline points="21,34 50,86 79,34" stroke="#AB7F28" strokeWidth="1.8" />
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

/**
 * Recomendações Canônicas de Fallback Inteligente:
 * Utiliza a orientação oficial inserida pelo SuperAdmin (`observacao_ritual` / `MomentoCanonico.orientacao`)
 * ou gera a diretriz canônica maçônica correspondente à natureza do momento.
 */
function obterRecomendacaoCanonica(momento: MomentoExecucao): {
  orientacaoPrincipal: string;
  posturaAcustica: string;
  corteCerimonial: string;
  origemCanonica: boolean;
} {
  const obsBanco = (momento.observacao_ritual || '').trim();
  const nomeLower = (momento.evento_nome || '').toLowerCase();

  const posturaAcustica = momento.em_surdina
    ? 'PP • Surdina / Acompanhamento Sutil (25% a 30%) — A harmonia deve envolver o Templo sem jamais competir com a voz do Venerável Mestre ou Orador.'
    : 'MF • Execução Plena / Solene (75% a 90%) — Presença sonora majestosa preenchendo a acústica do Templo com imponência ritualística.';

  const corteCerimonial = momento.em_surdina
    ? 'Reduzir gradualmente em fade-out ao sinal do Mestre de Cerimônias ou golpe de malhete.'
    : 'Manter até a conclusão da evolução no pavimento ou comando de malhete do Venerável Mestre.';

  if (obsBanco.length > 0) {
    return {
      orientacaoPrincipal: obsBanco,
      posturaAcustica,
      corteCerimonial,
      origemCanonica: true,
    };
  }

  if (
    nomeLower.includes('pavilhao') ||
    nomeLower.includes('pavilhão') ||
    nomeLower.includes('bandeira')
  ) {
    return {
      orientacaoPrincipal:
        'Executar o Hino ou Marcha Solene com máxima reverência cívica e maçônica durante o ingresso e saudação ao Pavilhão Nacional. Aguardar a Guarda de Honra posicionar-se antes do disparo.',
      posturaAcustica: 'MF/FF • Execução Plena e Marcial — Volume firme e nítido em todo o Templo.',
      corteCerimonial:
        'Encerrar no término exato do Hino ou após o Pavilhão ocupar seu lugar de honra no Oriente.',
      origemCanonica: false,
    };
  }

  if (
    nomeLower.includes('abertura') ||
    nomeLower.includes('entrada') ||
    nomeLower.includes('cortejo')
  ) {
    return {
      orientacaoPrincipal:
        'Conduzir o ingresso solene dos Obreiros e Dignidades ao Templo com cadência compassada e elevada vibração espiritual, preparando a egrégora para o início dos trabalhos.',
      posturaAcustica,
      corteCerimonial:
        'Atenuar suavemente assim que todos os Irmãos ocuparem suas colunas e o Venerável Mestre assumir o Trono.',
      origemCanonica: false,
    };
  }

  if (
    nomeLower.includes('tronco') ||
    nomeLower.includes('bolsa') ||
    nomeLower.includes('benefic')
  ) {
    return {
      orientacaoPrincipal:
        'Acompanhar o giro ritualístico com melodia meditativa, serena e contínua, favorecendo a introspecção fraterna enquanto o Irmão Hospitaleiro ou Mestre de Cerimônias percorre as Colunas.',
      posturaAcustica: 'PP • Surdina Estrita — Fundo instrumental suave e contemplativo.',
      corteCerimonial:
        'Esvanecer suavemente quando o Oficial retornar entre Colunas para aguardar a ordem do Venerável Mestre.',
      origemCanonica: false,
    };
  }

  if (
    nomeLower.includes('palavra') ||
    nomeLower.includes('leitura') ||
    nomeLower.includes('balaustre') ||
    nomeLower.includes('balaústre')
  ) {
    return {
      orientacaoPrincipal:
        'Manter ambiência sutil apenas nos intervalos ou quando determinado pelo ritual, zelando pela clareza absoluta da palavra falada no Templo.',
      posturaAcustica: 'PP • Surdina / Reverência Acústica.',
      corteCerimonial: 'Silenciar imediatamente ao início da pronúncia ou leitura oficial.',
      origemCanonica: false,
    };
  }

  if (
    nomeLower.includes('encerramento') ||
    nomeLower.includes('saida') ||
    nomeLower.includes('saída') ||
    nomeLower.includes('cadeia')
  ) {
    return {
      orientacaoPrincipal:
        'Elevar a vibração fraterna no fecho dos trabalhos litúrgicos, mantendo a solenidade e a harmonia até a retirada completa do cortejo em paz e alegria.',
      posturaAcustica,
      corteCerimonial: 'Sustentar a peça até a saída dos Obreiros para o Átrio.',
      origemCanonica: false,
    };
  }

  return {
    orientacaoPrincipal:
      momento.evento_descricao ||
      'Conduza este momento litúrgico observando atentamente a cadência do Mestre de Cerimônias e os golpes de malhete das Luzes da Oficina, garantindo transições suaves de volume.',
    posturaAcustica,
    corteCerimonial,
    origemCanonica: false,
  };
}

/**
 * Cinemática 3D Real em 4 Estágios Físicos:
 * - 'na-origem': O encarte nasce exatamente nas coordenadas (left, top, width, height) da capa no Box 1.
 * - 'voando': O álbum fechado viaja do Box 1 até o centro do palco crescendo suavemente em 3D.
 * - 'aberto': A capa frontal dura gira -176° sobre a lombada esquerda (com verso real), revelando a Folha I.
 *   * Suporta SWIPE INTERATIVO EM TEMPO REAL (ou clique nos botões) para virar a Folha I (-174°) e revelar a Folha II!
 * - 'fechando-capa': A Folha I (se virada) e a Capa Frontal fecham de volta para 0°.
 * - 'pousando': O álbum fechado voa de volta para encaixar exatamente no Box 1 antes de desmontar.
 */
type FaseCinematica = 'na-origem' | 'voando' | 'aberto' | 'fechando-capa' | 'pousando';

export const EncarteAlbum3D: React.FC<EncarteAlbum3DProps> = ({
  momento,
  indiceMomento,
  totalMomentos,
  eRitoBrasileiro,
  ritoNome,
  idxFaixaAtiva,
  tocando,
  origemRect,
  onFechar,
  onTrocarFaixa,
  onAlternarPreferencia,
  onAbrirComporMomento,
}) => {
  const [fase, setFase] = useState<FaseCinematica>('na-origem');
  // 1 = Folha I (Recomendações ao Mestre) | 2 = Folha II (Trilhas LP do Momento)
  const [paginaAtiva, setPaginaAtiva] = useState<1 | 2>(1);

  // Estado de Swipe Interativo Contínuo para folhear as páginas com o dedo ou mouse
  const [arrastandoSwipe, setArrastandoSwipe] = useState(false);
  const [deltaSwipeX, setDeltaSwipeX] = useState(0);
  const swipeInicioXRef = useRef<number | null>(null);
  const swipeInicioYRef = useRef<number | null>(null);
  const swipeBloqueadoVerticalRef = useRef<boolean>(false);

  const [viewport, setViewport] = useState(() => ({
    vw: typeof window !== 'undefined' ? window.innerWidth : 390,
    vh: typeof window !== 'undefined' ? window.innerHeight : 780,
  }));

  useEffect(() => {
    const atualizar = () =>
      setViewport({ vw: window.innerWidth, vh: window.innerHeight });
    window.addEventListener('resize', atualizar);
    return () => window.removeEventListener('resize', atualizar);
  }, []);

  // Sequência de abertura física em 2 tempos: 1) Voo da origem ao centro -> 2) Abertura da capa dura
  useEffect(() => {
    let tVoo: number;
    let tAbreCapa: ReturnType<typeof setTimeout>;

    tVoo = requestAnimationFrame(() => {
      tVoo = requestAnimationFrame(() => {
        setFase('voando');
        tAbreCapa = setTimeout(() => {
          setFase('aberto');
        }, 420);
      });
    });

    return () => {
      cancelAnimationFrame(tVoo);
      clearTimeout(tAbreCapa);
    };
  }, []);

  /**
   * Sequência física reversa de fechamento:
   * 1) Se estiver na Página 2, desvira a Folha I e fecha a capa dura para 0° ('fechando-capa').
   * 2) Voa de volta exatamente para o `origemRect` no Box 1 ('pousando').
   * 3) Desmonta e restaura a visibilidade da capa original no Box 1.
   */
  const iniciarFechamento = (aposFecharCallback?: () => void) => {
    if (fase === 'fechando-capa' || fase === 'pousando') return;
    feedbackTatil.clique();
    setArrastandoSwipe(false);
    setDeltaSwipeX(0);
    setPaginaAtiva(1);
    setFase('fechando-capa');

    setTimeout(() => {
      setFase('pousando');
    }, 480);

    setTimeout(() => {
      onFechar();
      if (aposFecharCallback) aposFecharCallback();
    }, 920);
  };

  const virarFolha = (destino: 1 | 2) => {
    if (fase !== 'aberto' || destino === paginaAtiva) return;
    feedbackTatil.clique();
    setArrastandoSwipe(false);
    setDeltaSwipeX(0);
    setPaginaAtiva(destino);
  };

  /**
   * Gestos de Swipe Horizontal (Pointer Events + Touch Events) para alternar entre
   * a Folha I (Recomendações) e a Folha II (Lista de Músicas) acompanhando o dedo em 3D.
   */
  const iniciarGestoSwipe = (clientX: number, clientY: number) => {
    if (fase !== 'aberto') return;
    swipeInicioXRef.current = clientX;
    swipeInicioYRef.current = clientY;
    swipeBloqueadoVerticalRef.current = false;
    setDeltaSwipeX(0);
  };

  const moverGestoSwipe = (clientX: number, clientY: number) => {
    if (
      fase !== 'aberto' ||
      swipeInicioXRef.current === null ||
      swipeInicioYRef.current === null ||
      swipeBloqueadoVerticalRef.current
    ) {
      return;
    }

    const dx = clientX - swipeInicioXRef.current;
    const dy = clientY - swipeInicioYRef.current;

    // Se o usuário começou rolando a lista verticalmente, preserva o scroll vertical
    if (!arrastandoSwipe && Math.abs(dy) > 14 && Math.abs(dy) > Math.abs(dx)) {
      swipeBloqueadoVerticalRef.current = true;
      return;
    }

    if (!arrastandoSwipe && Math.abs(dx) > 10 && Math.abs(dx) > Math.abs(dy)) {
      setArrastandoSwipe(true);
    }

    if (arrastandoSwipe || Math.abs(dx) > 10) {
      setDeltaSwipeX(dx);
    }
  };

  const finalizarGestoSwipe = (clientX?: number, clientY?: number) => {
    if (swipeInicioXRef.current === null || swipeInicioYRef.current === null) return;

    const dx =
      clientX !== undefined ? clientX - swipeInicioXRef.current : deltaSwipeX;
    const dy =
      clientY !== undefined && swipeInicioYRef.current !== null
        ? clientY - swipeInicioYRef.current
        : 0;

    const bloqueadoV = swipeBloqueadoVerticalRef.current;
    swipeInicioXRef.current = null;
    swipeInicioYRef.current = null;
    swipeBloqueadoVerticalRef.current = false;
    setArrastandoSwipe(false);
    setDeltaSwipeX(0);

    if (bloqueadoV) return;

    // Limiar de 36px para confirmar a virada de página por swipe
    if (Math.abs(dx) >= 36 && Math.abs(dx) >= Math.abs(dy)) {
      if (dx < 0 && paginaAtiva === 1) {
        feedbackTatil.clique();
        setPaginaAtiva(2);
      } else if (dx > 0 && paginaAtiva === 2) {
        feedbackTatil.clique();
        setPaginaAtiva(1);
      }
    }
  };

  // Agrupa sempre as músicas preferenciais nas primeiras faixas do álbum (01, 02...)
  const faixasOriginais = momento.candidatas ?? [];
  const faixas = [...faixasOriginais].sort(
    (a, b) => Number(Boolean(b.preferida)) - Number(Boolean(a.preferida))
  );
  const totalPreferidasNoAlbum = faixas.filter((f) => f.preferida).length;
  const recomendacao = obterRecomendacaoCanonica(momento);

  // Dimensão quadrada do álbum em primeiro plano (ex.: 340px a 380px)
  const tamanhoAlvo = Math.round(
    Math.min(viewport.vw - 24, viewport.vh - 110, 376)
  );
  const centroAlvoX = viewport.vw / 2;
  const centroAlvoY = viewport.vh / 2 + 12;

  // Cálculo do delta FLIP a partir da posição exata da capa no Box 1
  const origemCentroX = origemRect
    ? origemRect.left + origemRect.width / 2
    : centroAlvoX;
  const origemCentroY = origemRect
    ? origemRect.top + origemRect.height / 2
    : centroAlvoY - 120;
  const escalaOrigem = origemRect
    ? origemRect.width / tamanhoAlvo
    : 0.62;

  const deltaOrigemX = Math.round(origemCentroX - centroAlvoX);
  const deltaOrigemY = Math.round(origemCentroY - centroAlvoY);

  const estaNaOrigemOuPousando = fase === 'na-origem' || fase === 'pousando';
  const capaEstaAberta = fase === 'aberto';
  const folha1EstaVirada = fase === 'aberto' && paginaAtiva === 2;

  // Ângulo contínuo da Folha I durante o swipe (0° = Folha I visível | -174° = Folha I virada exibindo Folha II)
  const calcularAnguloFolha1 = (): number => {
    const base = folha1EstaVirada ? -174 : 0;
    if (!arrastandoSwipe || fase !== 'aberto') return base;
    const variacaoGraus = (deltaSwipeX / Math.max(180, tamanhoAlvo * 0.65)) * 174;
    return Math.max(-174, Math.min(0, base + variacaoGraus));
  };
  const anguloFolha1 = calcularAnguloFolha1();

  // Estética idêntica à capa do álbum no Box 1
  const fundoCapa = eRitoBrasileiro
    ? 'linear-gradient(135deg, #460811 0%, #2d060c 50%, #120306 100%)'
    : 'linear-gradient(135deg, #0e1624 0%, #0b111a 50%, #070a10 100%)';

  const fundoVersoCapa = eRitoBrasileiro
    ? 'linear-gradient(135deg, #2d050b 0%, #190206 60%, #0c0103 100%)'
    : 'linear-gradient(135deg, #0a101b 0%, #060a11 60%, #030509 100%)';

  return createPortal(
    <div
      className="fixed inset-0 z-[95] select-none overflow-hidden"
      style={{
        backgroundColor: estaNaOrigemOuPousando
          ? 'rgba(2, 5, 14, 0)'
          : 'rgba(2, 5, 14, 0.74)',
        backdropFilter: estaNaOrigemOuPousando ? 'blur(0px)' : 'blur(4px)',
        WebkitBackdropFilter: estaNaOrigemOuPousando ? 'blur(0px)' : 'blur(4px)',
        transition: 'background-color 420ms ease, backdrop-filter 420ms ease',
      }}
      onClick={() => iniciarFechamento()}
    >
      {/* BARRA DE COMANDO FLUTUANTE ACIMA DO ENCARTE (APARECE QUANDO A CAPA SE ABRE) */}
      <div
        style={{
          position: 'fixed',
          width: tamanhoAlvo,
          left: Math.round(centroAlvoX - tamanhoAlvo / 2),
          top: Math.max(10, Math.round(centroAlvoY - tamanhoAlvo / 2 - 44)),
          opacity: capaEstaAberta ? 1 : 0,
          transform: capaEstaAberta ? 'translateY(0)' : 'translateY(10px)',
          pointerEvents: capaEstaAberta ? 'auto' : 'none',
          transition: 'opacity 280ms ease, transform 280ms ease',
          zIndex: 110,
        }}
        onClick={(e) => e.stopPropagation()}
        className="px-2.5 py-1.5 bg-[#050B17]/95 border border-[#DDB96B]/60 shadow-[0_8px_24px_rgba(0,0,0,0.9)] flex items-center justify-between"
      >
        <span className="font-cinzel font-bold text-[9.5px] text-[#FDE68A] tracking-widest uppercase truncate">
          ENCARTE • ÁLBUM {paraRomano(indiceMomento + 1)}/{paraRomano(totalMomentos)}
        </span>

        {/* Abas de Folheamento 3D */}
        <div className="flex items-center gap-1 bg-black/70 p-0.5 border border-[#DDB96B]/35">
          <button
            type="button"
            onClick={() => virarFolha(1)}
            className={`px-2 py-0.5 text-[8.5px] font-cinzel font-bold tracking-wider uppercase transition-all cursor-pointer flex items-center gap-1 ${
              paginaAtiva === 1
                ? 'bg-[#DDB96B] text-[#050B17] shadow-[0_0_8px_rgba(221,185,107,0.6)]'
                : 'text-[#DDB96B]/75 hover:text-[#FFF2CC]'
            }`}
          >
            <BookOpen className="w-2.5 h-2.5" />
            <span>Folha I • Guia</span>
          </button>
          <button
            type="button"
            onClick={() => virarFolha(2)}
            className={`px-2 py-0.5 text-[8.5px] font-cinzel font-bold tracking-wider uppercase transition-all cursor-pointer flex items-center gap-1 ${
              paginaAtiva === 2
                ? 'bg-[#DDB96B] text-[#050B17] shadow-[0_0_8px_rgba(221,185,107,0.6)]'
                : 'text-[#DDB96B]/75 hover:text-[#FFF2CC]'
            }`}
          >
            <Disc3 className="w-2.5 h-2.5" />
            <span>Folha II • Trilhas ({faixas.length})</span>
          </button>
        </div>

        <button
          type="button"
          onClick={() => iniciarFechamento()}
          className="p-1 text-[#DDB96B] hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          title="Fechar Encarte (Devolver ao Box 1)"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* =========================================================================
          CONTAINER 3D DO ÁLBUM FÍSICO (VOA EXATAMENTE DA POSIÇÃO DO BOX 1 ATÉ O CENTRO)
          Suporta Swipe Horizontal em tempo real para alternar entre Folha I e Folha II
          ========================================================================= */}
      <div
        onClick={(e) => e.stopPropagation()}
        onPointerDown={(e) => iniciarGestoSwipe(e.clientX, e.clientY)}
        onPointerMove={(e) => moverGestoSwipe(e.clientX, e.clientY)}
        onPointerUp={(e) => finalizarGestoSwipe(e.clientX, e.clientY)}
        onPointerCancel={() => finalizarGestoSwipe()}
        onTouchStart={(e) => {
          if (e.touches.length === 1) {
            iniciarGestoSwipe(e.touches[0].clientX, e.touches[0].clientY);
          }
        }}
        onTouchMove={(e) => {
          if (e.touches.length === 1) {
            moverGestoSwipe(e.touches[0].clientX, e.touches[0].clientY);
          }
        }}
        onTouchEnd={(e) => {
          const t = e.changedTouches[0];
          finalizarGestoSwipe(t?.clientX, t?.clientY);
        }}
        style={{
          position: 'fixed',
          width: tamanhoAlvo,
          height: tamanhoAlvo,
          left: Math.round(centroAlvoX - tamanhoAlvo / 2),
          top: Math.round(centroAlvoY - tamanhoAlvo / 2),
          perspective: '1800px',
          transformStyle: 'preserve-3d',
          touchAction: 'pan-y',
          transform: estaNaOrigemOuPousando
            ? `translate3d(${deltaOrigemX}px, ${deltaOrigemY}px, 0px) scale(${escalaOrigem})`
            : 'translate3d(0px, 0px, 0px) scale(1)',
          transition: 'transform 430ms cubic-bezier(0.22, 1, 0.36, 1)',
          zIndex: 100,
        }}
      >
        {/* LOMBADA METÁLICA DOURADA À ESQUERDA (EIXO DE DOBRA DO ENCARTE LP) */}
        <div
          className="absolute left-0 top-0 bottom-0 w-[6px] z-50 pointer-events-none"
          style={{
            background:
              'linear-gradient(90deg, #8a641d 0%, #FDE68A 45%, #785012 85%, #120902 100%)',
            boxShadow: '2px 0 12px rgba(0,0,0,0.9)',
          }}
        />

        {/* =======================================================================
            CAMADA BASE (FUNDO FIXO DIREITO): FOLHA II — LISTA DE MÚSICAS DO ÁLBUM
            Exibe no máximo 8 músicas selecionadas para a sessão, com as PREFERENCIAIS
            agrupadas nas primeiras faixas (01, 02...).
            ======================================================================= */}
        <div
          className="absolute inset-0 p-3.5 sm:p-4 flex flex-col justify-between overflow-hidden rounded-none"
          style={{
            background: fundoCapa,
            border: '1.5px solid rgba(227, 190, 97, 0.78)',
            boxShadow:
              '0 24px 60px rgba(0, 0, 0, 0.96), 0 0 28px rgba(227, 190, 97, 0.22), inset 16px 0 28px rgba(0,0,0,0.8)',
            zIndex: 10,
          }}
        >
          {/* Moldura dupla dourada idêntica à estética do álbum */}
          <div className="absolute inset-[3px] border border-[#DDB96B]/40 rounded-none pointer-events-none" />
          <div className="absolute inset-[6px] border border-dashed border-[#DDB96B]/25 rounded-none pointer-events-none" />

          {/* Marca d'água Maçônica */}
          <div className="absolute inset-0 flex items-center justify-center opacity-[0.05] pointer-events-none">
            <SimboloEsquadroCompassoEncarte className="w-52 h-52" />
          </div>

          {/* Sombra interna da página anterior sobre esta folha */}
          <div
            className="absolute inset-0 pointer-events-none transition-opacity duration-500"
            style={{
              background:
                'linear-gradient(90deg, rgba(0,0,0,0.65) 0%, rgba(0,0,0,0.2) 18%, transparent 45%)',
              opacity: folha1EstaVirada ? 1 : 0.85,
            }}
          />

          {/* Cabeçalho da Folha II */}
          <div className="relative z-10 w-full flex items-center justify-between border-b border-[#DDB96B]/25 pb-1.5">
            <div className="min-w-0 flex-1 pr-2">
              <span className="block font-cinzel font-bold text-[8px] text-[#FDE68A] tracking-widest uppercase">
                FOLHA II • SELEÇÃO DA SESSÃO (MÁX. 8 FAIXAS)
              </span>
              <h3 className="font-cinzel font-bold text-xs text-[#FFF2CC] uppercase tracking-wider truncate mt-0.5">
                {momento.evento_nome}
              </h3>
            </div>
            <div className="flex flex-col items-end shrink-0">
              <span className="font-mono text-[8px] px-1.5 py-0.5 bg-black/60 border border-[#DDB96B]/50 text-[#FDE68A] font-bold">
                {faixas.length}/8 LP
              </span>
              {totalPreferidasNoAlbum > 0 && (
                <span className="text-[7.5px] font-mono text-[#FDE68A] mt-0.5">
                  ★ {totalPreferidasNoAlbum} Preferencial(is)
                </span>
              )}
            </div>
          </div>

          {/* Lista de Músicas do Momento Litúrgico (Preferenciais agrupadas no topo) */}
          <div className="relative z-10 flex-1 min-h-0 my-1.5 overflow-y-auto pr-1 flex flex-col gap-1.5 custom-scrollbar">
            {faixas.map((faixa, i) => {
              // Localiza o índice real na lista original do momento para disparo na vitrola
              const indiceRealNoMomento = Math.max(
                0,
                faixasOriginais.findIndex((f) => f.id === faixa.id)
              );
              const estaNaAgulha = indiceRealNoMomento === idxFaixaAtiva;
              return (
                <div
                  key={`folha2-faixa-${faixa.id}-${i}`}
                  onClick={() => {
                    feedbackTatil.clique();
                    onTrocarFaixa(indiceRealNoMomento, true);
                  }}
                  className={`px-2.5 py-1.5 border flex items-center justify-between cursor-pointer transition-all ${
                    estaNaAgulha
                      ? 'bg-[#DDB96B]/25 border-[#DDB96B] text-white shadow-[0_0_12px_rgba(221,185,107,0.3)]'
                      : faixa.preferida
                      ? 'bg-black/60 border-[#DDB96B]/55 text-slate-100 hover:bg-black/75'
                      : 'bg-black/40 border-[#DDB96B]/20 text-slate-200 hover:bg-black/60 hover:border-[#DDB96B]/45'
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0 flex-1 pr-2">
                    <span
                      className={`font-mono text-[10px] w-4 shrink-0 ${
                        estaNaAgulha ? 'text-[#FDE68A] font-bold' : 'text-[#DDB96B]/75'
                      }`}
                    >
                      {String(i + 1).padStart(2, '0')}.
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <p
                          className={`font-cinzel text-[10.5px] font-bold truncate ${
                            estaNaAgulha ? 'text-[#FFF2CC]' : 'text-slate-100'
                          }`}
                        >
                          {faixa.titulo}
                        </p>
                        {faixa.preferida && (
                          <span className="shrink-0 px-1 py-0.2 bg-[#DDB96B]/25 border border-[#DDB96B]/60 text-[7.5px] font-mono text-[#FDE68A] uppercase font-bold">
                            ★ Pref
                          </span>
                        )}
                      </div>
                      <p className="font-serif italic text-[9px] text-[#DDB96B]/85 truncate">
                        {faixa.autor_artista || 'Acervo Litúrgico Maçônico'}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    {onAlternarPreferencia && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          feedbackTatil.clique();
                          onAlternarPreferencia(faixa.id, !faixa.preferida);
                        }}
                        className={`p-1 transition-all cursor-pointer border ${
                          faixa.preferida
                            ? 'text-[#FDE68A] border-[#DDB96B]/60 bg-[#DDB96B]/20'
                            : 'text-slate-500 border-transparent hover:text-[#FDE68A] hover:border-[#DDB96B]/40'
                        }`}
                        title={
                          faixa.preferida
                            ? 'Música Preferencial (★) — Toca prioritariamente na abertura da sessão'
                            : 'Tornar Preferencial (★) — Agrupa no início do disco e prioriza no sorteio'
                        }
                      >
                        <Star
                          className={`w-3.5 h-3.5 ${faixa.preferida ? 'fill-current' : ''}`}
                        />
                      </button>
                    )}

                    <span className="font-mono text-[8.5px] text-slate-300">
                      {formatarTempo(faixa.duracao_segundos)}
                    </span>

                    <span
                      className={`w-5 h-5 flex items-center justify-center border ${
                        estaNaAgulha && tocando
                          ? 'border-emerald-400 bg-emerald-500/20 text-emerald-300'
                          : 'border-[#DDB96B]/45 bg-black/60 text-[#DDB96B]'
                      }`}
                      title="Colocar na agulha e tocar"
                    >
                      <Play className="w-2.5 h-2.5 fill-current" />
                    </span>
                  </div>
                </div>
              );
            })}

            {faixas.length === 0 && (
              <div className="flex-1 flex flex-col items-center justify-center text-center py-4 px-3 bg-black/35 border border-dashed border-[#DDB96B]/30">
                <Music className="w-6 h-6 text-[#DDB96B]/55 mb-1" />
                <p className="font-cinzel text-[11px] text-[#FFF2CC]">
                  Sem Trilhas LP neste Momento
                </p>
                <p className="font-serif italic text-[10px] text-[#DDB96B]/80 mt-0.5">
                  Toque no botão abaixo para compor com músicas do acervo ou enviar nova faixa.
                </p>
              </div>
            )}
          </div>

          {/* Rodapé da Folha II: Adicionar Músicas + Swipe/Voltar para Folha I */}
          <div className="relative z-10 flex flex-col gap-1.5 border-t border-[#DDB96B]/25 pt-1.5">
            {onAbrirComporMomento && (
              <button
                type="button"
                onClick={() => {
                  iniciarFechamento(() => {
                    onAbrirComporMomento();
                  });
                }}
                className="w-full py-1.5 px-2.5 bg-black/65 hover:bg-[#DDB96B]/20 border border-[#DDB96B]/60 text-[9.5px] font-cinzel font-bold text-[#FDE68A] uppercase tracking-widest flex items-center justify-center gap-1.5 transition-all cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5 text-[#DDB96B]" />
                <span>
                  Adicionar / Gerenciar Acervo ({momento.total_musicas_disponiveis || faixas.length}{' '}
                  no total)
                </span>
              </button>
            )}

            <div className="flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={() => virarFolha(1)}
                className="flex-1 py-1 px-2.5 bg-black/60 hover:bg-[#DDB96B]/15 border border-[#DDB96B]/50 text-[#FDE68A] font-cinzel font-bold text-[9px] uppercase tracking-wider flex items-center justify-center gap-1 cursor-pointer transition-all"
              >
                <ChevronLeft className="w-3 h-3" />
                <span>Swipe / Voltar à Folha I (Guia)</span>
              </button>
              <button
                type="button"
                onClick={() => iniciarFechamento()}
                className="py-1 px-2.5 bg-[#DDB96B]/25 hover:bg-[#DDB96B]/35 border border-[#DDB96B]/60 text-[#FFF2CC] font-cinzel font-bold text-[9px] uppercase tracking-wider cursor-pointer transition-all"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>

        {/* =======================================================================
            CAMADA INTERMEDIÁRIA FOLHEÁVEL: FOLHA I — RECOMENDAÇÕES AO MESTRE
            Gira fisicamente em -174° sobre a lombada esquerda (ou acompanha o dedo no Swipe!)
            ======================================================================= */}
        <div
          className="absolute inset-0 rounded-none"
          style={{
            transformOrigin: 'left center',
            transformStyle: 'preserve-3d',
            transform: `translateZ(2px) rotateY(${anguloFolha1}deg)`,
            transition: arrastandoSwipe
              ? 'none'
              : 'transform 540ms cubic-bezier(0.32, 0.72, 0, 1)',
            zIndex: 25,
            pointerEvents: folha1EstaVirada && !arrastandoSwipe ? 'none' : 'auto',
          }}
        >
          {/* FRENTE DA FOLHA I: RECOMENDAÇÕES CANÔNICAS AO MESTRE DE HARMONIA */}
          <div
            className="absolute inset-0 p-3.5 sm:p-4 flex flex-col justify-between overflow-hidden rounded-none"
            style={{
              background: fundoCapa,
              border: '1.5px solid rgba(227, 190, 97, 0.8)',
              backfaceVisibility: 'hidden',
              WebkitBackfaceVisibility: 'hidden',
              boxShadow: folha1EstaVirada
                ? '-15px 0 35px rgba(0,0,0,0.85)'
                : 'inset 14px 0 26px rgba(0,0,0,0.75)',
            }}
          >
            {/* Moldura dupla dourada idêntica à capa do álbum */}
            <div className="absolute inset-[3px] border border-[#DDB96B]/40 rounded-none pointer-events-none" />
            <div className="absolute inset-[6px] border border-dashed border-[#DDB96B]/25 rounded-none pointer-events-none" />

            {/* Marca d'água Maçônica ao fundo */}
            <div className="absolute inset-0 flex items-center justify-center opacity-[0.06] pointer-events-none">
              <SimboloEsquadroCompassoEncarte className="w-52 h-52" />
            </div>

            {/* Topo da Folha I */}
            <div className="relative z-10 w-full flex items-center justify-between border-b border-[#DDB96B]/25 pb-1.5">
              <div className="min-w-0 flex-1 pr-2">
                <span className="block font-cinzel font-bold text-[8.5px] text-[#FDE68A] tracking-widest uppercase">
                  ÁLBUM {paraRomano(indiceMomento + 1)} • FOLHA I (GUIA DO MESTRE)
                </span>
                <h3 className="font-cinzel font-bold text-xs text-[#FFF2CC] uppercase tracking-wider truncate mt-0.5">
                  {momento.evento_nome}
                </h3>
              </div>
              <span className="font-mono text-[8px] px-1.5 py-0.5 bg-black/60 border border-[#DDB96B]/50 text-[#FDE68A] font-bold shrink-0">
                {momento.em_surdina ? 'PP • SURDINA' : 'MF • FORTE'}
              </span>
            </div>

            {/* Corpo da Folha I: Recomendação Canônica ao Mestre de Harmonia */}
            <div className="relative z-10 flex-1 min-h-0 my-1.5 overflow-y-auto pr-1 flex flex-col justify-between gap-1.5 custom-scrollbar">
              <div className="p-2.5 bg-black/45 border-l-2 border-[#DDB96B] border-y border-r border-[#DDB96B]/25 shadow-inner">
                <div className="flex items-center gap-1.5 mb-1">
                  <Compass className="w-3 h-3 text-[#FDE68A]" />
                  <span className="font-cinzel font-bold text-[9px] text-[#FDE68A] uppercase tracking-widest">
                    {recomendacao.origemCanonica
                      ? 'Recomendação Canônica do Momento'
                      : 'Diretriz Litúrgica ao Mestre de Harmonia'}
                  </span>
                </div>
                <p className="font-serif italic text-[11.5px] sm:text-xs text-[#FFF6DE] leading-relaxed">
                  “{recomendacao.orientacaoPrincipal}”
                </p>
                {momento.evento_descricao &&
                  momento.evento_descricao !== recomendacao.orientacaoPrincipal && (
                    <p className="text-[9.5px] text-[#DDB96B]/90 leading-snug pt-1 mt-1 border-t border-[#DDB96B]/20">
                      {momento.evento_descricao}
                    </p>
                  )}
              </div>

              <div className="grid grid-cols-1 gap-1.5">
                <div className="px-2.5 py-1.5 bg-black/40 border border-[#DDB96B]/25 flex items-start gap-2">
                  {momento.em_surdina ? (
                    <Volume1 className="w-3.5 h-3.5 text-[#FDE68A] shrink-0 mt-0.5" />
                  ) : (
                    <Volume2 className="w-3.5 h-3.5 text-[#FDE68A] shrink-0 mt-0.5" />
                  )}
                  <div className="min-w-0">
                    <span className="block text-[8px] font-cinzel font-bold uppercase tracking-wider text-[#FDE68A]">
                      Postura Acústica & Volume
                    </span>
                    <p className="text-[9.5px] text-slate-200 leading-tight mt-0.5">
                      {recomendacao.posturaAcustica}
                    </p>
                  </div>
                </div>

                <div className="px-2.5 py-1.5 bg-black/40 border border-[#DDB96B]/25 flex items-start gap-2">
                  <Sparkles className="w-3.5 h-3.5 text-[#DDB96B] shrink-0 mt-0.5" />
                  <div className="min-w-0">
                    <span className="block text-[8px] font-cinzel font-bold uppercase tracking-wider text-[#FDE68A]">
                      Sincronismo Ritualístico
                    </span>
                    <p className="text-[9.5px] text-slate-200 leading-tight mt-0.5">
                      {recomendacao.corteCerimonial}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Rodapé da Folha I: Botão / Indicação de Swipe para Virar a Folha */}
            <div className="relative z-10 pt-1.5 border-t border-[#DDB96B]/25 flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={() => iniciarFechamento()}
                className="py-1.5 px-2.5 bg-black/55 hover:bg-white/10 border border-[#DDB96B]/40 text-[9px] font-cinzel font-semibold text-slate-300 uppercase tracking-wider cursor-pointer transition-colors"
              >
                Fechar
              </button>
              <button
                type="button"
                onClick={() => virarFolha(2)}
                className="flex-1 py-1.5 px-3 bg-gradient-to-r from-[#B8862D] via-[#DDB96B] to-[#FDE68A] text-[#050B17] font-cinzel font-bold text-[9.5px] uppercase tracking-widest flex items-center justify-center gap-1.5 shadow-[0_0_14px_rgba(221,185,107,0.45)] hover:brightness-110 active:scale-[0.99] transition-all cursor-pointer"
              >
                <span>Swipe / Virar Folha • Músicas ({faixas.length})</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* VERSO REAL DA FOLHA I (VISÍVEL ENQUANTO A FOLHA GIRA EM 180°) */}
          <div
            className="absolute inset-0 p-4 flex flex-col items-center justify-between rounded-none"
            style={{
              background: fundoVersoCapa,
              border: '1.5px solid rgba(227, 190, 97, 0.65)',
              backfaceVisibility: 'hidden',
              WebkitBackfaceVisibility: 'hidden',
              transform: 'rotateY(180deg)',
              boxShadow: 'inset -18px 0 32px rgba(0,0,0,0.85)',
            }}
          >
            <div className="absolute inset-[3px] border border-[#DDB96B]/30 rounded-none pointer-events-none" />
            <div className="absolute inset-[6px] border border-dashed border-[#DDB96B]/20 rounded-none pointer-events-none" />
            <span className="font-cinzel text-[8px] text-[#DDB96B]/70 tracking-widest uppercase">
              {ritoNome} • ÁLBUM {paraRomano(indiceMomento + 1)}
            </span>
            <div className="w-16 h-16 rounded-full bg-black/50 border border-[#DDB96B]/40 flex items-center justify-center opacity-75">
              <SimboloEsquadroCompassoEncarte className="w-11 h-11" />
            </div>
            <span className="font-serif italic text-[9px] text-[#DDB96B]/70">
              Folha I • Orientações Litúrgicas
            </span>
          </div>
        </div>

        {/* =======================================================================
            CAMADA SUPERIOR: CAPA FRONTAL RÍGIDA DO ÁLBUM (FRENTE E VERSO REAIS)
            Começa fechada (0°) idêntica ao card do Box 1 e abre girando -176°!
            ======================================================================= */}
        <div
          className="absolute inset-0 rounded-none pointer-events-none"
          style={{
            transformOrigin: 'left center',
            transformStyle: 'preserve-3d',
            transform: capaEstaAberta
              ? 'translateZ(4px) rotateY(-176deg)'
              : 'translateZ(4px) rotateY(0deg)',
            transition: 'transform 540ms cubic-bezier(0.32, 0.72, 0, 1)',
            zIndex: 40,
          }}
        >
          {/* FACE EXTERNA DA CAPA (EXATAMENTE IGUAL À CAPA DO BOX 1) */}
          <div
            className="absolute inset-0 p-3.5 sm:p-4 flex flex-col justify-between overflow-hidden rounded-none"
            style={{
              background: fundoCapa,
              border: '1.5px solid rgba(227, 190, 97, 0.82)',
              backfaceVisibility: 'hidden',
              WebkitBackfaceVisibility: 'hidden',
              boxShadow: '0 0 25px rgba(227, 190, 97, 0.28), 0 16px 36px rgba(0,0,0,0.95)',
            }}
          >
            {/* Moldura dupla dourada ornamental idêntica ao Box 1 */}
            <div className="absolute inset-[3px] border border-[#DDB96B]/40 rounded-none pointer-events-none" />
            <div className="absolute inset-[6px] border border-dashed border-[#DDB96B]/25 rounded-none pointer-events-none" />

            {/* Top bar da capa */}
            <div className="w-full flex items-center justify-between text-[8.5px] sm:text-[9px] uppercase tracking-wider relative z-10 border-b border-[#DDB96B]/20 pb-1">
              <span className="font-cinzel font-bold text-[#FDE68A] tracking-widest">
                ÁLBUM {paraRomano(indiceMomento + 1)}
              </span>
              <span className="font-mono text-[8px] px-1.5 py-0.5 rounded bg-black/60 border border-[#DDB96B]/50 text-[#FDE68A] shadow-inner font-bold">
                {momento.em_surdina ? 'PP • SURDINA' : 'MF • FORTE'}
              </span>
            </div>

            {/* Centro da capa: Medalhão circular com Esquadro e Compasso */}
            <div className="my-auto flex flex-col items-center justify-center relative z-10 py-1">
              <div className="w-20 h-20 sm:w-22 sm:h-22 p-2 rounded-full bg-black/50 border border-[#DDB96B]/50 shadow-[inset_0_2px_8px_rgba(0,0,0,0.8)] flex items-center justify-center">
                <SimboloEsquadroCompassoEncarte className="w-14 h-14 sm:w-16 sm:h-16" />
              </div>
            </div>

            {/* Base da capa: Título + contagem de trilhas */}
            <div className="text-center relative z-10 border-t border-[#DDB96B]/20 pt-1">
              <p className="font-cinzel text-xs sm:text-sm font-bold text-[#FFF2CC] tracking-wider line-clamp-1 drop-shadow-sm uppercase">
                {momento.evento_nome}
              </p>
              <p className="font-serif italic text-[10px] sm:text-[11px] text-[#DDB96B] tracking-widest mt-0.5 font-normal">
                {faixas.length > 0 ? `${faixas.length} Trilhas LP Solenes` : 'Sem Trilhas LP'}
              </p>
            </div>
          </div>

          {/* FACE INTERNA (CONTRACAPA ESQUERDA VISÍVEL DURANTE E APÓS O GIRO DE 180°) */}
          <div
            className="absolute inset-0 p-4 flex flex-col items-center justify-between rounded-none"
            style={{
              background: fundoVersoCapa,
              border: '1.5px solid rgba(227, 190, 97, 0.7)',
              backfaceVisibility: 'hidden',
              WebkitBackfaceVisibility: 'hidden',
              transform: 'rotateY(180deg)',
              boxShadow: '-16px 12px 38px rgba(0,0,0,0.92), inset -18px 0 32px rgba(0,0,0,0.85)',
            }}
          >
            <div className="absolute inset-[3px] border border-[#DDB96B]/35 rounded-none pointer-events-none" />
            <div className="absolute inset-[6px] border border-dashed border-[#DDB96B]/20 rounded-none pointer-events-none" />

            <span className="font-cinzel font-bold text-[8.5px] text-[#FDE68A]/80 tracking-widest uppercase">
              CONTRACAPA • ÁLBUM {paraRomano(indiceMomento + 1)}
            </span>

            <div className="flex flex-col items-center gap-2 text-center">
              <div className="w-16 h-16 rounded-full bg-black/55 border border-[#DDB96B]/45 flex items-center justify-center">
                <SimboloEsquadroCompassoEncarte className="w-11 h-11" />
              </div>
              <p className="font-cinzel text-[10px] text-[#FFF2CC]/90 uppercase tracking-widest max-w-[200px]">
                {momento.evento_nome}
              </p>
            </div>

            <span className="font-serif italic text-[9px] text-[#DDB96B]/75">
              Acervo Litúrgico • Vitrola H-33
            </span>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};
