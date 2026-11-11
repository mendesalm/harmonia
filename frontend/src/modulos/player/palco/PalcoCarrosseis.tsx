import React, { useState, useEffect, useRef } from 'react';
import { Volume2, AlertTriangle, Sparkles } from 'lucide-react';
import { MomentoExecucao } from '../../../compartilhado/tipos';
import { feedbackTatil } from '../../../compartilhado/utilitarios/dispositivoNativo';
import { EncarteAlbum3D, OrigemRectCapa } from './EncarteAlbum3D';

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
  onAlternarSurdina?: (musicaId: string, surdina: boolean) => void;
  onAbrirUpload?: () => void;
  onAlterarVolume?: (novoVolume: number) => void;
  onReativarMomento?: (eventoId: string) => void;
  segundosRestantesSuprimido?: number | null;
  onAvancarProximo?: () => void;
}

const NUMEROS_ROMANOS = [
  'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X',
  'XI', 'XII', 'XIII', 'XIV', 'XV', 'XVI', 'XVII', 'XVIII', 'XIX', 'XX',
];
const paraRomano = (n: number) => NUMEROS_ROMANOS[n - 1] || String(n);

/**
 * Geometria do deck (px, no palco fixo de 290x262):
 * pivô do braço em (250, 30), centro do prato em (120, 140).
 */
const PIVO_BRACO = { x: 250, y: 30 };
const CENTRO_PRATO = { x: 120, y: 140 };
/** Distância efetiva do pivô até a ponta da agulha (haste + cabeçote) e desvio angular da agulha. */
const COMPRIMENTO_BRACO = 157.7;
const DESVIO_AGULHA_GRAUS = 2.9;
/** Raio do primeiro sulco (próximo à borda do vinil de 116px) e do sulco final (junto ao selo de ~50px). */
const RAIO_SULCO_EXTERNO = 108;
const RAIO_SULCO_INTERNO = 54;

/** Estados e durações da animação de troca física do disco de vinil entre momentos (~2s total). */
type FaseDisco = 'assentado' | 'saindo' | 'entrando';
const DURACAO_SAIDA_DISCO_MS = 1000;
const DURACAO_ENTRADA_DISCO_MS = 1000;

/**
 * Calcula, pela Lei dos Cossenos, o ângulo de rotação do braço para que a agulha
 * pouse a `raio` px do centro do vinil.
 */
function calcularAnguloPorRaio(raio: number): number {
  const dx = PIVO_BRACO.x - CENTRO_PRATO.x;
  const dy = CENTRO_PRATO.y - PIVO_BRACO.y;
  const distancia = Math.hypot(dx, dy);
  const anguloCentro = (Math.atan2(dx, dy) * 180) / Math.PI;
  const cosPhi = Math.max(
    -1,
    Math.min(
      1,
      (distancia * distancia + COMPRIMENTO_BRACO * COMPRIMENTO_BRACO - raio * raio) /
        (2 * distancia * COMPRIMENTO_BRACO),
    ),
  );
  const phi = (Math.acos(cosPhi) * 180) / Math.PI;
  return anguloCentro - phi - DESVIO_AGULHA_GRAUS;
}

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

/** Símbolo Sagrado Maçônico Refinado Stitch: Esquadro facetado e Compasso com 'G' central (Ouro ou Prata/Cinza se desativado) */
const SimboloEsquadroCompasso: React.FC<{ className?: string; desativado?: boolean }> = ({
  className = 'w-12 h-12',
  desativado = false,
}) => (
  <svg
    className={`${className} ${
      desativado
        ? 'text-zinc-400 drop-shadow-[0_0_6px_rgba(161,161,170,0.35)]'
        : 'text-[#DDB96B] drop-shadow-[0_0_8px_rgba(227,190,97,0.7)]'
    }`}
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
    <circle cx="50" cy="12" fill={desativado ? '#e4e4e7' : '#FDF3D7'} r="3.5" />
    {/* Square (Esquadro facetado com profundidade metálica) */}
    <polyline points="28,38 50,78 72,38" stroke={desativado ? '#a1a1aa' : '#EED184'} strokeWidth="3" />
    <polyline points="21,34 50,86 79,34" stroke={desativado ? '#71717a' : '#AB7F28'} strokeWidth="1.8" />
    {/* Letter 'G' in Center */}
    <text
      dominantBaseline="middle"
      fill={desativado ? '#f4f4f5' : '#FDF3D7'}
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
  onAlternarSurdina,
  onAbrirUpload,
  onAlternarPlayPause,
  onAlterarVolume,
  onReativarMomento,
  segundosRestantesSuprimido,
  onAvancarProximo,
}) => {
  const [modalTracklistAberto, setModalTracklistAberto] = useState(false);
  const [origemRectCapa, setOrigemRectCapa] = useState<OrigemRectCapa | null>(null);
  const capaAtivaElRef = useRef<HTMLDivElement | null>(null);
  const [offsetXFracionario, setOffsetXFracionario] = useState(0);
  const [arrastando, setArrastando] = useState(false);
  const [vuAtivos, setVuAtivos] = useState<number[]>([]);

  // Estados para segurar a capa do disco por 3 segundos para reativar
  const [holdingMomentId, setHoldingMomentId] = useState<string | null>(null);
  const [holdProgress, setHoldProgress] = useState<number>(0);
  const holdIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const holdStartTimeRef = useRef<number>(0);
  const holdTriggeredRef = useRef<boolean>(false);

  const cancelarHold = () => {
    if (holdIntervalRef.current) {
      clearInterval(holdIntervalRef.current);
      holdIntervalRef.current = null;
    }
    if (holdTriggeredRef.current) {
      setTimeout(() => {
        setHoldingMomentId(null);
        setHoldProgress(0);
        holdTriggeredRef.current = false;
      }, 500);
      return;
    }
    setHoldingMomentId(null);
    setHoldProgress(0);
  };

  const iniciarHold = (momentoId: string) => {
    cancelarHold();
    holdTriggeredRef.current = false;
    setHoldingMomentId(momentoId);
    setHoldProgress(0);
    holdStartTimeRef.current = performance.now();
    try {
      feedbackTatil.clique();
    } catch (_) {}

    const DURACAO_HOLD_MS = 3000;
    const INTERVALO_MS = 40;
    let ultimoTick = 0;

    holdIntervalRef.current = setInterval(() => {
      const decorrido = performance.now() - holdStartTimeRef.current;
      const prog = Math.min(100, Math.round((decorrido / DURACAO_HOLD_MS) * 100));
      setHoldProgress(prog);

      // Ticks táteis a cada 1 segundo (1s e 2s)
      const segundosPassados = Math.floor(decorrido / 1000);
      if (segundosPassados > ultimoTick && segundosPassados < 3) {
        ultimoTick = segundosPassados;
        try {
          feedbackTatil.clique();
        } catch (_) {}
      }

      if (decorrido >= DURACAO_HOLD_MS) {
        if (holdIntervalRef.current) {
          clearInterval(holdIntervalRef.current);
          holdIntervalRef.current = null;
        }
        holdTriggeredRef.current = true;
        setHoldProgress(100);
        try {
          feedbackTatil.confirmacao();
        } catch (_) {}
        try {
          onReativarMomento?.(momentoId);
        } catch (err) {
          console.error('Erro ao disparar onReativarMomento:', err);
        }
        setTimeout(() => {
          cancelarHold();
        }, 500);
      }
    }, INTERVALO_MS);
  };

  useEffect(() => {
    return () => {
      if (holdIntervalRef.current) clearInterval(holdIntervalRef.current);
    };
  }, []);

  // Regra de cores litúrgicas: Bordô nobre para Rito Brasileiro, Deep Blue para os demais
  const eRitoBrasileiro = (rito || '').toUpperCase().includes('BRASILEIRO');

  const momentoAtivo = momentos[indiceMomento];
  const faixasAtivas = momentoAtivo?.candidatas ?? [];
  const temAlbumNoMomento = faixasAtivas.length > 0;
  const musicaAtiva = momentoAtivo?.musica_sorteada ?? faixasAtivas[0];
  const idxFaixaAtiva = temAlbumNoMomento
    ? Math.max(0, faixasAtivas.findIndex((f) => f.id === musicaAtiva?.id))
    : -1;

  /**
   * Troca de vinil entre momentos (simula a vitrola real):
   * 1) 'saindo': o braço retorna ao descanso, o vinil é levantado e faz flip recolhendo-se para cima (capa);
   * 2) o momento exibido no deck é trocado;
   * 3) 'entrando': animação inversa — o vinil desce e assenta no prato, com o braço ainda em repouso.
   * O deck exibe `indiceDeck` (que fica defasado em relação a `indiceMomento` durante a troca).
   */
  const [indiceDeck, setIndiceDeck] = useState(indiceMomento);
  const [faseDisco, setFaseDisco] = useState<FaseDisco>('assentado');
  const indiceDeckRef = useRef(indiceMomento);
  const faseDiscoRef = useRef<FaseDisco>('assentado');
  const indiceAlvoRef = useRef(indiceMomento);
  const momentosRef = useRef(momentos);
  const temporizadorDiscoRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  momentosRef.current = momentos;

  const definirFaseDisco = (fase: FaseDisco) => {
    faseDiscoRef.current = fase;
    setFaseDisco(fase);
  };

  useEffect(() => {
    indiceAlvoRef.current = indiceMomento;
    // Já está (ou está indo) para este momento sem necessidade de nova troca
    if (indiceMomento === indiceDeckRef.current && faseDiscoRef.current === 'assentado') return;
    // Uma saída em andamento já usará o alvo mais recente ao terminar
    if (faseDiscoRef.current === 'saindo') return;

    if (temporizadorDiscoRef.current) clearTimeout(temporizadorDiscoRef.current);

    const temDisco = (indice: number) => (momentosRef.current[indice]?.candidatas?.length ?? 0) > 0;

    /** Troca o momento exibido no deck e, se houver álbum, executa a entrada do novo vinil. */
    const trocarEEntrar = () => {
      const alvo = indiceAlvoRef.current;
      indiceDeckRef.current = alvo;
      setIndiceDeck(alvo);
      if (temDisco(alvo)) {
        definirFaseDisco('entrando');
        temporizadorDiscoRef.current = setTimeout(
          () => definirFaseDisco('assentado'),
          DURACAO_ENTRADA_DISCO_MS,
        );
      } else {
        definirFaseDisco('assentado');
      }
    };

    if (temDisco(indiceDeckRef.current)) {
      definirFaseDisco('saindo');
      temporizadorDiscoRef.current = setTimeout(trocarEEntrar, DURACAO_SAIDA_DISCO_MS);
    } else {
      trocarEEntrar();
    }
  }, [indiceMomento]);

  // Limpa o temporizador da animação ao desmontar o palco
  useEffect(() => {
    return () => {
      if (temporizadorDiscoRef.current) clearTimeout(temporizadorDiscoRef.current);
    };
  }, []);

  // Dados do momento exibido no deck (podem diferir do momento ativo durante a troca de vinil)
  const momentoDeck = momentos[indiceDeck] ?? momentoAtivo;
  const temAlbumNoDeck = (momentoDeck?.candidatas?.length ?? 0) > 0;
  const discoEmTroca = faseDisco !== 'assentado';

  // Temporizador e contador de cliques no braço da vitrola (1 clique = avançar, 2 cliques = retroceder)
  const clickTimerRef = useRef<NodeJS.Timeout | null>(null);
  const clickContadorRef = useRef<number>(0);

  useEffect(() => {
    return () => {
      if (clickTimerRef.current) {
        clearTimeout(clickTimerRef.current);
      }
    };
  }, []);

  /**
   * Manipulador de cliques no braço da vitrola:
   * - 1 clique (click simples): Avança para a próxima faixa (circular)
   * - 2 cliques (duplo clique): Retrocede para a faixa anterior (circular)
   */
  const lidarCliqueBraco = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (discoEmTroca || !temAlbumNoMomento || faixasAtivas.length <= 1) return;

    clickContadorRef.current += 1;

    if (clickContadorRef.current === 1) {
      clickTimerRef.current = setTimeout(() => {
        // 1 Clique confirmado: Avança para a próxima faixa
        const total = faixasAtivas.length;
        const proxima = (idxFaixaAtiva + 1) % total;
        feedbackTatil.clique();
        onTrocarFaixa(proxima, true);
        clickContadorRef.current = 0;
        clickTimerRef.current = null;
      }, 260);
    } else if (clickContadorRef.current >= 2) {
      // 2 Cliques confirmados (Duplo Clique): Retrocede para a faixa anterior
      if (clickTimerRef.current) {
        clearTimeout(clickTimerRef.current);
        clickTimerRef.current = null;
      }
      clickContadorRef.current = 0;
      const total = faixasAtivas.length;
      const anterior = (idxFaixaAtiva - 1 + total) % total;
      feedbackTatil.acaoForte();
      onTrocarFaixa(anterior, true);
    }
  };

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

  // Ângulo do braço (graus, sentido horário a partir da vertical) simulando um vinil real:
  // os sulcos formam uma espiral de passo constante, logo a agulha avança LINEARMENTE em raio
  // com o tempo decorrido. O trajeto (borda externa → sulco final junto ao selo) é dividido em
  // partes iguais entre as faixas do momento (1 faixa = 100%, 2 faixas = 50% cada, etc.).
  // - Parado (sem play e progresso 0) ou em troca física de disco: braço no descanso (0°).
  // - Pausado no meio da faixa: braço permanece sobre o sulco atual.
  const calcularAnguloExecucao = () => {
    if (discoEmTroca || !temAlbumNoMomento || (!tocando && progressoFaixa === 0)) return 0;
    const total = Math.max(1, faixasAtivas.length);
    const indice = Math.max(0, Math.min(total - 1, idxFaixaAtiva));
    const progressoFaixaLimitado = Math.min(1, Math.max(0, progressoFaixa));
    // Fração percorrida do disco inteiro (0 = borda externa, 1 = sulco final)
    const fracaoDisco = (indice + progressoFaixaLimitado) / total;
    const raioAgulha = RAIO_SULCO_EXTERNO - fracaoDisco * (RAIO_SULCO_EXTERNO - RAIO_SULCO_INTERNO);
    return calcularAnguloPorRaio(raioAgulha);
  };
  const anguloBraco = calcularAnguloExecucao();

  // Palco fixo do deck (vinil + braço): dimensões lógicas constantes em px, escalonadas
  // por CSS para caber em qualquer viewport. Assim a geometria relativa vinil↔braço
  // (pivô a +142px/-129px do eixo) é idêntica no desktop e no móvel.
  const DECK_LARGURA = 290;
  const DECK_ALTURA = 262;
  const deckAreaRef = useRef<HTMLDivElement>(null);
  const [escalaDeck, setEscalaDeck] = useState(1);

  useEffect(() => {
    const el = deckAreaRef.current;
    if (!el) return;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        if (width > 0 && height > 0) {
          setEscalaDeck(Math.min(1, width / DECK_LARGURA, height / DECK_ALTURA));
        }
      }
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

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

  // Lógica de gestos e cliques do carrossel 3D
  const pointerIdRef = useRef<number | null>(null);
  const inicioXRef = useRef(0);
  const lastXRef = useRef(0);
  const lastTimeRef = useRef(0);
  const pointerDownTimeRef = useRef(0);
  const velocidadeXRef = useRef(0);
  const arrastouMaisQueCliqueRef = useRef(false);
  const capturouPointerRef = useRef(false);
  const cardIndexClicadoRef = useRef<number | null>(null);
  const ultimoCliqueTempoRef = useRef(0);

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
    capturouPointerRef.current = false;
    setArrastando(true);
  };

  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!arrastando) return;
    const dx = e.clientX - inicioXRef.current;
    const limiar = holdIntervalRef.current ? 25 : 6;
    if (!arrastouMaisQueCliqueRef.current && Math.abs(dx) > limiar) {
      arrastouMaisQueCliqueRef.current = true;
      cardIndexClicadoRef.current = null;
      cancelarHold();
      if (!capturouPointerRef.current) {
        try {
          e.currentTarget.setPointerCapture(e.pointerId);
          capturouPointerRef.current = true;
        } catch {
          /* ignore */
        }
      }
    }

    if (!arrastouMaisQueCliqueRef.current) return;

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
    if (holdTriggeredRef.current) {
      cancelarHold();
      return;
    }
    const duracao = performance.now() - pointerDownTimeRef.current;

    if (capturouPointerRef.current && pointerIdRef.current !== null) {
      try {
        e.currentTarget.releasePointerCapture(pointerIdRef.current);
      } catch {
        /* ignore */
      }
      capturouPointerRef.current = false;
    }
    pointerIdRef.current = null;

    // Se for clique rápido sem arrasto:
    if (!arrastouMaisQueCliqueRef.current && duracao < 650) {
      setOffsetXFracionario(0);
      const idxClicado = cardIndexClicadoRef.current;
      cardIndexClicadoRef.current = null;
      if (idxClicado !== null) {
        lidarCliqueCard(idxClicado);
      }
      return;
    }

    cardIndexClicadoRef.current = null;

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

  /**
   * Ao clicar na capa do álbum:
   * - Se for o card ativo: captura as coordenadas exatas da capa no Box 1 e abre o Encarte 3D Folheável
   * - Se for um card vizinho: centraliza e foca o momento correspondente
   */
  const lidarCliqueCard = (idx: number) => {
    if (holdTriggeredRef.current) {
      holdTriggeredRef.current = false;
      return;
    }

    const agora = performance.now();
    if (agora - ultimoCliqueTempoRef.current < 250) return;
    ultimoCliqueTempoRef.current = agora;

    feedbackTatil.clique();
    if (idx === indiceMomento) {
      if (momentos[idx]?.suprimido) {
        // Momento desativado: não abre o encarte, apenas foca na instrução de reativação
        return;
      }
      if (capaAtivaElRef.current) {
        const r = capaAtivaElRef.current.getBoundingClientRect();
        setOrigemRectCapa({
          left: r.left,
          top: r.top,
          width: r.width,
          height: r.height,
        });
      }
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
                    ref={(el) => {
                      if (i === indiceMomento) {
                        capaAtivaElRef.current = el;
                      }
                    }}
                    onPointerDown={(e) => {
                      if (momento.suprimido) {
                        iniciarHold(momento.evento_id);
                      }
                      cardIndexClicadoRef.current = i;
                    }}
                    onPointerUp={cancelarHold}
                    onPointerCancel={cancelarHold}
                    onPointerLeave={cancelarHold}
                    onClick={(e) => {
                      e.stopPropagation();
                      lidarCliqueCard(i);
                    }}
                    title={
                      ativo
                        ? momento.suprimido
                          ? 'Aviso: Momento Desativado. Segure a capa por 3 segundos para reativar.'
                          : 'Clique para abrir o encarte litúrgico deste álbum (recomendações e músicas)'
                        : `ÁLBUM ${paraRomano(i + 1)} • ${momento.evento_nome}`
                    }
                    style={{
                      position: 'absolute',
                      width: tamanhoCapa,
                      height: tamanhoCapa,
                      borderRadius: 0, // Estritamente quadrada com cantos retos nas proporções de 65%!
                      border: momento.suprimido
                        ? '2px solid #71717a'
                        : '1.5px solid rgba(227, 190, 97, 0.75)',
                      transform: `translate3d(${t.x}px, ${t.y}px, ${t.z}px) rotateY(${t.rotY}deg) scale(${t.escala})`,
                      opacity: modalTracklistAberto && i === indiceMomento ? 0 : t.opacidade,
                      zIndex: t.zIndex,
                      transition: arrastando
                        ? 'none'
                        : 'transform 0.45s cubic-bezier(0.22, 0.9, 0.25, 1), opacity 0.2s ease-out',
                      transformStyle: 'preserve-3d',
                      background: momento.suprimido
                        ? 'linear-gradient(145deg, #3f3f46 0%, #27272a 45%, #18181b 100%)'
                        : fundoCapa,
                      boxShadow: ativo
                        ? momento.suprimido
                          ? '0 0 25px rgba(161, 161, 170, 0.45), 0 16px 36px rgba(0,0,0,0.95)'
                          : '0 0 25px rgba(227, 190, 97, 0.28), 0 16px 36px rgba(0,0,0,0.95)'
                        : '0 12px 30px rgba(0,0,0,0.85)',
                      cursor: 'pointer',
                    }}
                    className={`p-3 sm:p-3.5 flex flex-col justify-between cursor-pointer select-none relative overflow-hidden rounded-none ${
                      momento.suprimido ? 'grayscale contrast-95' : ''
                    }`}
                  >
                    {/* Moldura dupla ornamental refinada: Cinza para desativado, Ouro para ativo */}
                    <div className={`absolute inset-[3px] border ${momento.suprimido ? 'border-zinc-500/60' : 'border-[#DDB96B]/40'} rounded-none pointer-events-none`} />
                    <div className={`absolute inset-[6px] border border-dashed ${momento.suprimido ? 'border-zinc-600/50' : 'border-[#DDB96B]/25'} rounded-none pointer-events-none`} />

                    {/* Top bar da capa: Identificador e Dinâmica */}
                    <div className={`w-full flex items-center justify-between text-[8px] sm:text-[9px] uppercase tracking-wider relative z-10 border-b ${momento.suprimido ? 'border-zinc-600/40' : 'border-[#DDB96B]/20'} pb-1 pointer-events-none`}>
                      <span className={`font-cinzel font-bold ${momento.suprimido ? 'text-zinc-300' : 'text-[#FDE68A]'} tracking-widest`}>
                        ÁLBUM {paraRomano(i + 1)}
                      </span>
                      {momento.suprimido ? (
                        <span className="font-mono text-[7px] sm:text-[7.5px] px-1.5 py-0.5 rounded bg-zinc-700/90 border border-zinc-500 text-zinc-200 font-bold tracking-wider">
                          DESATIVADO
                        </span>
                      ) : (
                        <span className="font-mono text-[7.5px] px-1.5 py-0.5 rounded bg-black/60 border border-[#DDB96B]/50 text-[#FDE68A] shadow-inner font-bold">
                          {momento.em_surdina ? 'PP • SURDINA' : 'MF • FORTE'}
                        </span>
                      )}
                    </div>

                    {/* Centro da capa: Medalhão circular com Esquadro e Compasso com 'G' (Prata/Cinza para desativado) */}
                    <div className="my-auto flex flex-col items-center justify-center relative z-10 py-0.5 pointer-events-none">
                      <div className={`w-14 h-14 sm:w-16 sm:h-16 p-1.5 rounded-full ${momento.suprimido ? 'bg-zinc-800/90 border-zinc-500 shadow-[inset_0_2px_8px_rgba(0,0,0,0.9)]' : 'bg-black/50 border-[#DDB96B]/50 shadow-[inset_0_2px_8px_rgba(0,0,0,0.8)]'} border flex items-center justify-center relative`}>
                        <SimboloEsquadroCompasso desativado={Boolean(momento.suprimido)} className="w-10 h-10 sm:w-11 sm:h-11" />
                      </div>
                    </div>

                    {/* Base da capa: Título em serifa sem corte + contagem de trilhas solenes */}
                    <div className={`text-center relative z-10 border-t ${momento.suprimido ? 'border-zinc-600/40' : 'border-[#DDB96B]/20'} pt-1 px-1 pointer-events-none`}>
                      <p className={`font-cinzel text-[9.5px] sm:text-[11px] font-bold ${momento.suprimido ? 'text-zinc-200' : 'text-[#FFF2CC]'} tracking-wide leading-tight drop-shadow-sm uppercase break-words`}>
                        {momento.evento_nome}
                      </p>
                      <p className={`font-serif italic text-[8.5px] sm:text-[9.5px] ${momento.suprimido ? 'text-zinc-400 font-semibold' : 'text-[#DDB96B]'} tracking-widest mt-0.5 font-normal`}>
                        {momento.suprimido ? 'Momento Desativado' : (totalFaixas > 0 ? `${totalFaixas} Trilhas LP Solenes` : 'Sem Trilhas LP')}
                      </p>
                    </div>

                    {/* NOTA DE AVISO E INSTRUÇÃO RITUALÍSTICA DE REATIVAÇÃO */}
                    {momento.suprimido && (
                      <div className="absolute inset-x-2 top-7 z-20 bg-zinc-950/95 border border-zinc-500 rounded p-1.5 text-center shadow-2xl backdrop-blur-sm pointer-events-none">
                        <div className="flex items-center justify-center gap-1 text-[8px] sm:text-[8.5px] font-bold text-zinc-200 uppercase tracking-wider">
                          <AlertTriangle className="w-3 h-3 text-zinc-300 shrink-0" />
                          <span>Momento Desativado</span>
                        </div>
                        <p className="text-[7px] sm:text-[7.5px] text-zinc-300 font-sans leading-tight mt-0.5 break-words">
                          {momento.evento_descricao || "Momento litúrgico desativado por padrão na configuração."}
                        </p>
                        <div className="mt-1 pt-1 border-t border-zinc-700 text-[7px] sm:text-[7.5px] font-mono font-bold text-zinc-200 uppercase tracking-wide">
                          Segure a capa por 3 segundos para reativar nessa sessão
                        </div>
                      </div>
                    )}

                    {/* MEDIDOR VISUAL DE PROGRESSO AO SEGURAR POR 3 SEGUNDOS */}
                    {holdingMomentId === momento.evento_id && (
                      <div className="absolute inset-0 z-40 bg-zinc-950/90 backdrop-blur-[2px] flex flex-col items-center justify-center p-2 text-center pointer-events-none">
                        <div className="relative w-16 h-16 sm:w-18 sm:h-18 flex items-center justify-center">
                          <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
                            <path
                              className="text-zinc-700"
                              strokeWidth="3.2"
                              stroke="currentColor"
                              fill="none"
                              d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                            />
                            <path
                              className="text-zinc-100 transition-all duration-75"
                              strokeDasharray={`${holdProgress}, 100`}
                              strokeWidth="3.5"
                              strokeLinecap="round"
                              stroke="currentColor"
                              fill="none"
                              d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                            />
                          </svg>
                          <div className="absolute flex flex-col items-center justify-center">
                            <span className="font-mono text-xs sm:text-sm font-bold text-white">
                              {Math.max(1, Math.ceil((3000 - (holdProgress * 30)) / 1000))}s
                            </span>
                            <span className="text-[6.5px] font-mono text-zinc-300">{holdProgress}%</span>
                          </div>
                        </div>
                        <p className="font-cinzel text-[9.5px] sm:text-[10px] font-bold text-zinc-100 uppercase tracking-wider mt-1">
                          {holdProgress >= 100 ? 'Reativando Momento!' : 'Segure Firme...'}
                        </p>
                        <p className="text-[7px] text-zinc-300 font-mono mt-0.5">
                          Solte para cancelar
                        </p>
                      </div>
                    )}
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
                    ? momentos[i]?.suprimido
                      ? 'w-7 h-1.5 rounded-full bg-gradient-to-r from-zinc-500 to-zinc-400 shadow-[0_0_8px_rgba(161,161,170,0.6)]'
                      : 'w-7 h-1.5 rounded-full bg-gradient-to-r from-[#DDB96B] to-[#FDE68A] shadow-[0_0_8px_rgba(221,185,107,0.8)]'
                    : momentos[i]?.suprimido
                    ? 'w-1.5 h-1.5 rounded-full bg-zinc-600 hover:bg-zinc-400'
                    : 'w-1.5 h-1.5 rounded-full bg-[#1E325C] hover:bg-[#64748b]'
                }`}
                title={`Álbum ${i + 1}${momentos[i]?.suprimido ? ' (Desativado)' : ''}`}
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
                className={`h-1 rounded-full transition-all duration-200 ${
                  momentos[indiceMomento]?.suprimido
                    ? 'bg-gradient-to-r from-zinc-600 via-zinc-400 to-zinc-300 shadow-[0_0_8px_rgba(161,161,170,0.7)]'
                    : 'bg-gradient-to-r from-[#B8862D] via-[#DDB96B] to-[#FDE68A] shadow-[0_0_8px_rgba(221,185,107,0.7)]'
                }`}
                style={{
                  width: `${Math.max(4, ((indiceMomento + 1) / momentos.length) * 100)}%`,
                }}
              />
              <div
                className={`absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-4 h-2 rounded-full border border-[#050B17] transition-all duration-200 pointer-events-none group-hover:scale-110 ${
                  momentos[indiceMomento]?.suprimido
                    ? 'bg-gradient-to-r from-zinc-400 to-zinc-200 shadow-[0_0_8px_rgba(161,161,170,0.9)]'
                    : 'bg-gradient-to-r from-[#DDB96B] to-[#FDE68A] shadow-[0_0_8px_rgba(221,185,107,0.9)]'
                }`}
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

            {/* Display LED Digital com cantos arredondados Stitch ampliado */}
            <div className="flex-1 px-3 py-1 sm:py-1.5 rounded-xl flex flex-col gap-1 border border-[#1E325C] shadow-inner bg-[#02050E]">
              {/* Linha 1: Tempo + Bargraph VU Level */}
              <div className="w-full flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className={`text-[8px] sm:text-[9px] font-mono uppercase tracking-wider font-semibold ${momentoDeck.suprimido ? 'text-slate-400' : 'text-[#00E5FF]'}`}>
                    {momentoDeck.suprimido ? 'STATUS' : 'TEMPO'}
                  </span>
                  <span className={`text-xs sm:text-[13px] font-mono font-bold tracking-wider leading-none ${momentoDeck.suprimido ? 'text-slate-400' : 'text-[#00E5FF]'}`}>
                    {momentoDeck.suprimido ? 'DESATIVADO' : (temAlbumNoMomento ? formatarTempo(tempoAtual) : '--:--')}
                  </span>
                </div>

                <div className="w-px h-3.5 bg-[#1E325C]" />

                <div className="flex items-center gap-2">
                  <span className="text-[8px] sm:text-[9px] text-[#00E5FF] font-mono uppercase tracking-wider font-semibold">
                    VU
                  </span>
                  <div className="flex items-end gap-0.5 h-3 w-20 sm:w-24">
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
              <div className="w-full pt-1 border-t border-[#1E325C]/70 flex items-center gap-1.5 overflow-hidden">
                <span className={`text-[8px] sm:text-[9px] font-mono font-bold flex-shrink-0 uppercase ${momentoDeck.suprimido ? 'text-zinc-400' : 'text-[#00E5FF]'}`}>
                  {momentoDeck.suprimido ? 'AVISO:' : (temAlbumNoMomento ? `TRK ${String(idxFaixaAtiva + 1).padStart(2, '0')}:` : 'TRK --:')}
                </span>
                <span className={`text-[9.5px] sm:text-[11px] font-mono font-bold truncate tracking-wide leading-tight ${momentoDeck.suprimido ? 'text-zinc-200' : 'text-[#FDE68A]'}`}>
                  {momentoDeck.suprimido
                    ? 'Momento desativado click para reativar nessa sessão'
                    : temAlbumNoMomento
                    ? `${musicaAtiva?.titulo || 'Trilha selecionada'}${
                        musicaAtiva?.autor_artista ? ` • ${musicaAtiva.autor_artista}` : ''
                      }`
                    : 'Nenhum álbum neste momento litúrgico'}
                </span>
              </div>
            </div>
          </div>

          {/* ÁREA DO DECK: PRATO COM DISCO VINYL-GROOVES + BRAÇO MECÂNICO DE LATÃO AUDIÓFILO */}
          <div
            ref={deckAreaRef}
            className="relative w-full flex-1 min-h-[160px] flex items-center justify-center my-0.5"
            style={{ overflow: 'visible' }}
          >
            {/* Palco fixo 290x250 (eixo do prato em 100,155) escalonado de forma uniforme */}
            <div
              className="relative shrink-0"
              style={{
                width: DECK_LARGURA,
                height: DECK_ALTURA,
                transform: `scale(${escalaDeck})`,
                transformOrigin: 'center center',
              }}
            >
            {/* Platter Recessed Shadow Well */}
            <div className="absolute w-[242px] h-[242px] rounded-full bg-black/95 shadow-[inset_0_4px_16px_rgba(0,0,0,0.95)] border border-[#1a2333]" style={{ left: -1, top: 19 }} />

            {momentoDeck.suprimido ? (
              /* ESTADO DE MOMENTO DESATIVADO NO PRATO DA VITROLA */
              <div
                className="absolute w-[232px] h-[232px] rounded-full flex flex-col items-center justify-center z-20 border-2 border-zinc-500 p-3 text-center"
                style={{
                  left: 4,
                  top: 24,
                  background: 'radial-gradient(circle, #3f3f46 0%, #27272a 60%, #18181b 100%)',
                  boxShadow: 'inset 0 0 30px rgba(0,0,0,0.95), 0 10px 25px rgba(0,0,0,0.8)',
                }}
              >
                <span className="font-mono text-[7px] sm:text-[7.5px] uppercase font-bold text-zinc-300 bg-zinc-800/95 border border-zinc-500 px-2.5 py-0.5 rounded-full tracking-wider mb-1">
                  MOMENTO DESATIVADO
                </span>

                <span className="font-cinzel text-[10px] sm:text-[11.5px] font-bold text-zinc-100 uppercase tracking-wider break-words px-2 text-center leading-tight">
                  {momentoDeck.evento_nome}
                </span>

                <p className="text-[7.5px] sm:text-[8px] text-zinc-300 font-sans break-words my-1 max-w-[185px] leading-tight text-center">
                  {momentoDeck.evento_descricao || "Momento litúrgico desativado por padrão na configuração."}
                </p>

                <div className="text-[7.5px] sm:text-[8px] font-semibold text-zinc-200 tracking-wide mb-1.5 px-1 text-center">
                  Momento desativado click para reativar nessa sessão
                </div>

                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    try {
                      feedbackTatil.confirmacao();
                    } catch (_) {}
                    onReativarMomento?.(momentoDeck.evento_id);
                  }}
                  className="px-3 py-1 rounded-lg bg-zinc-700/90 hover:bg-zinc-600 border border-zinc-400 text-white font-cinzel text-[8.5px] sm:text-[9.5px] font-bold uppercase tracking-wider shadow-lg active:scale-95 transition-all cursor-pointer"
                >
                  ⚡ Reativar nessa Sessão
                </button>

                {segundosRestantesSuprimido !== null && segundosRestantesSuprimido !== undefined && (
                  <div className="flex items-center gap-1.5 mt-1.5 text-[7px] sm:text-[7.5px] text-zinc-400 font-mono">
                    <span>Avançando em {segundosRestantesSuprimido}s</span>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onAvancarProximo?.();
                      }}
                      className="text-zinc-300 hover:text-white underline font-sans ml-1 cursor-pointer"
                    >
                      Avançar agora &rarr;
                    </button>
                  </div>
                )}
              </div>
            ) : temAlbumNoDeck ? (
              /* CONTAINER 3D DE TROCA DO VINIL: Levanta, faz flip e recolhe para a capa superior na saída, e inverso na entrada */
              <div
                className={`absolute w-[232px] h-[232px] z-20 ${
                  faseDisco === 'saindo'
                    ? 'vinil-saindo pointer-events-none'
                    : faseDisco === 'entrando'
                    ? 'vinil-entrando pointer-events-none'
                    : ''
                }`}
                style={{ left: 4, top: 24, perspective: '900px', transformStyle: 'preserve-3d' }}
              >
                {/* DISCO DE VINIL STITCH: Clique no disco alterna Play/Stop */}
                <div
                  className={`w-full h-full rounded-full vinyl-grooves shadow-[0_18px_45px_rgba(0,0,0,0.85),inset_0_1px_2px_rgba(255,255,255,0.1)] flex items-center justify-center cursor-pointer select-none active:scale-[0.98] transition-transform ${
                    tocando && !discoEmTroca ? 'spin-slow' : 'spin-paused'
                  }`}
                  onClick={() => {
                    if (discoEmTroca) return;
                    feedbackTatil.clique();
                    onAlternarPlayPause();
                  }}
                  title={tocando ? "Clique no vinil para pausar (Stop)" : "Clique no vinil para tocar (Play)"}
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
                    className="w-[91px] h-[91px] sm:w-[99px] sm:h-[99px] rounded-full border-2 border-[#DDB96B]/90 shadow-2xl flex flex-col items-center justify-center text-center p-1 relative z-10"
                  >
                    <span className="font-cinzel text-[7px] text-[#DDB96B] tracking-widest font-bold">
                      H • 33
                    </span>
                    <span className="font-cinzel text-[6px] sm:text-[6.5px] text-[#FFF2CC] uppercase font-semibold leading-tight mt-0.5 line-clamp-1 max-w-[62px] drop-shadow">
                      {momentoDeck.evento_nome}
                    </span>
                    <span className="font-serif italic text-[5.5px] text-[#DDB96B]/90 mt-0.5">
                      ÁLBUM {paraRomano(indiceDeck + 1)} • {eRitoBrasileiro ? 'RITO BR.' : 'RITO REAA'}
                    </span>
                    {/* Spindle Center Hole */}
                    <div className="w-2.5 h-2.5 rounded-full bg-gradient-to-b from-neutral-900 to-black border border-[#FDE68A]/80 mt-0.5 shadow-inner flex items-center justify-center">
                      <div className="w-1 h-1 rounded-full bg-neutral-300" />
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              /* PRATO VAZIO SEM VINIL */
              <div
                onClick={() => {
                  feedbackTatil.clique();
                  if (onAbrirUpload) onAbrirUpload();
                  else setModalTracklistAberto(true);
                }}
                className="absolute w-[232px] h-[232px] rounded-full flex flex-col items-center justify-center z-20 cursor-pointer border border-[#1E325C]/70 shadow-inner group"
                style={{
                  left: 4,
                  top: 24,
                  background: 'radial-gradient(circle, #081122 0%, #050B17 65%, #02050E 100%)',
                  boxShadow: 'inset 0 0 25px rgba(0,0,0,0.95)',
                }}
                title="Momento sem álbum cadastrado. Toque para compor trilhas."
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

            {/* BRAÇO MECÂNICO AUDIÓFILO DE LATÃO DOURADO (PRECISION TONEARM ASSEMBLY) */}
            <div
              className="absolute w-24 h-48 pointer-events-none z-30"
              style={{ left: 192, top: 8 }}
              data-purpose="precision-tonearm"
            >
              {/* Suporte de Repouso Fixo no Chassi (Tonearm Rest Clip) - Alinhado no eixo da haste reta (X = 58px) */}
              <div
                className="absolute left-[52px] top-[112px] w-3 h-5 flex flex-col items-center justify-center opacity-70"
                title="Suporte de descanso"
              >
                <div className="w-2.5 h-1 bg-gradient-to-r from-[#805a17] to-[#d4af37] rounded-sm" />
                <div className="w-1 h-3.5 bg-neutral-800 border-x border-[#DDB96B]/40" />
              </div>

              {/* Conjunto Giratório Completo com Pivô Central Unificado (Centro em 58px, 22px) */}
              <div
                className="relative w-full h-full"
                style={{
                  transformOrigin: '58px 22px',
                  transform: `rotate(${anguloBraco}deg)`,
                  transition: 'transform 0.45s cubic-bezier(0.25, 1, 0.5, 1)',
                }}
              >
                {/* Base Torneada e Rolamento Central do Gimbal (centro exato em 58px, 22px) */}
                <div className="absolute left-[38px] top-[2px] w-10 h-10 rounded-full brass-knob border-2 border-[#FDE68A] flex items-center justify-center shadow-2xl">
                  {/* Anel de Graduação Usinado do Rolamento */}
                  <div className="w-6 h-6 rounded-full border border-[#785012] bg-gradient-to-br from-[#caa037] via-[#fcedaf] to-[#735012] flex items-center justify-center shadow-inner">
                    {/* Gema / Pivô Central Torneado de Alta Relojoaria */}
                    <div className="w-2.5 h-2.5 rounded-full bg-gradient-to-b from-[#fff1ba] to-[#ab7f28] border border-[#523a10] shadow-sm" />
                  </div>
                </div>

                {/* Contrapeso Traseiro (Counterweight) usinado atrás do pivô */}
                <div className="absolute left-[51px] -top-1.5 w-3.5 h-4.5 bg-gradient-to-b from-[#d4af37] via-[#fff0b3] to-[#805a17] border border-[#523a10] rounded-sm shadow-md" />

                {/* Tubo Reto Metálico Nobre de Latão Dourado nascendo diretamente do Centro do Pivô */}
                <svg
                  className="w-full h-full filter drop-shadow-[2px_5px_7px_rgba(0,0,0,0.85)]"
                  fill="none"
                  viewBox="0 0 96 192"
                  style={{ overflow: 'visible' }}
                >
                  <defs>
                    <linearGradient id="brassGradientStitch" gradientUnits="userSpaceOnUse" x1="52" y1="20" x2="64" y2="160">
                      <stop offset="0%" stopColor="#FFF0B3" />
                      <stop offset="35%" stopColor="#E4C46F" />
                      <stop offset="65%" stopColor="#D4AF37" />
                      <stop offset="85%" stopColor="#805A17" />
                      <stop offset="100%" stopColor="#FFD966" />
                    </linearGradient>
                  </defs>
                  {/* Haste metálica reta do braço partindo de (58, 22) até a junção do cabeçote em (58, 148) */}
                  <path
                    d="M 58 22 L 58 148 L 54 158"
                    stroke="url(#brassGradientStitch)"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="3.6"
                  />
                  {/* Filete de reflexo especular de alta relojoaria */}
                  <path
                    d="M 57.4 24 L 57.4 146"
                    stroke="#FFFDF0"
                    strokeOpacity="0.55"
                    strokeLinecap="round"
                    strokeWidth="1.1"
                  />
                </svg>

                {/* Cápsula Audiófila Headshell com Agulha e LED Âmbar pousando com precisão no vinil */}
                <div
                  className="absolute left-[45px] top-[152px] w-4.5 h-7 bg-gradient-to-br from-[#1a1c22] via-[#2c2e3a] to-[#0c0d12] border border-[#FDE68A] rounded-sm shadow-xl flex flex-col items-center justify-between p-0.5"
                  style={{ transform: 'rotate(16deg)' }}
                >
                  <div className="w-3 h-0.5 bg-gradient-to-r from-[#caa037] to-[#fff1ba] rounded-full" />
                  <div className="w-1.5 h-2 bg-[#ffb938] rounded-full shadow-[0_0_6px_#ffb938]" />
                  <div className="w-0.5 h-1 bg-[#fff] rounded-full opacity-80" />
                </div>

                {/* Área de Toque / Hitbox: 1 clique = Avançar Faixa | 2 cliques = Retroceder Faixa */}
                <div
                  className="absolute left-[28px] top-[125px] w-18 h-24 pointer-events-auto cursor-pointer active:scale-95 touch-manipulation select-none z-40 flex items-center justify-center group transition-transform"
                  onClick={lidarCliqueBraco}
                  title="1 clique: Avançar faixa • 2 cliques: Retroceder faixa"
                >
                  <div className="w-10 h-10 rounded-full border border-yellow-400/0 group-hover:border-yellow-400/40 group-active:border-yellow-400/80 transition-all flex items-center justify-center">
                    <div className="w-2.5 h-2.5 rounded-full bg-yellow-400/0 group-hover:bg-yellow-400/30 group-active:bg-yellow-400/60 animate-pulse" />
                  </div>
                </div>
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
          ENCARTE 3D FOLHEÁVEL DO ÁLBUM LITÚRGICO (RECOMENDAÇÕES + TRILHAS LP)
          ========================================================================= */}
      {modalTracklistAberto && (
        <EncarteAlbum3D
          momento={momentoAtivo}
          indiceMomento={indiceMomento}
          totalMomentos={momentos.length}
          eRitoBrasileiro={eRitoBrasileiro}
          ritoNome={eRitoBrasileiro ? 'Rito Brasileiro' : rito}
          idxFaixaAtiva={idxFaixaAtiva}
          tocando={tocando}
          origemRect={origemRectCapa}
          onFechar={() => setModalTracklistAberto(false)}
          onTrocarFaixa={onTrocarFaixa}
          onAlternarPreferencia={onAlternarPreferencia}
          onAlternarSurdina={onAlternarSurdina}
          onAbrirComporMomento={onAbrirUpload}
        />
      )}
    </div>
  );
};
