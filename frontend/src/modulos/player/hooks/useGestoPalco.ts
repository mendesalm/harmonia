import { useCallback, useRef, useState } from 'react';
import type { KeyboardEvent, PointerEvent as PointerEventReact, WheelEvent } from 'react';

type Eixo = 'x' | 'y' | null;

/** Quais direções ainda têm itens (evita "passar do fim" e aplica resistência elástica). */
export interface BordasGesto {
  xAnterior: boolean;
  xProximo: boolean;
  yAnterior: boolean;
  yProximo: boolean;
}

interface OpcoesGestoPalco {
  /** Distância em px de arraste equivalente a 1 item (por eixo). */
  passoX: number;
  passoY: number;
  /** Chamados ao concluir o gesto com o número de itens a avançar (negativo = voltar). */
  aoPassoX: (delta: number) => void;
  aoPassoY: (delta: number) => void;
  bordas: BordasGesto;
  habilitado?: boolean;
}

/** Movimento mínimo (px) para decidir o eixo do gesto; antes disso o toque ainda é um "clique". */
const LIMIAR_EIXO_PX = 8;
/** Máximo de itens que um único arremesso (fling) pode atravessar. */
const MAX_ITENS_POR_GESTO = 2;
/** Intervalo mínimo entre passos disparados pela roda do mouse. */
const INTERVALO_RODA_MS = 170;
/** Quanto da velocidade final (px/ms) projeta o gesto além do ponto solto. */
const INERCIA_MS = 170;
/** Fração do deslocamento mantida ao arrastar além da borda (resistência elástica). */
const RESISTENCIA_BORDA = 0.25;

/**
 * Hook de gestos do Palco de Carrosséis (mobile e desktop).
 *
 * - Um único ponteiro (toque ou mouse) controla DOIS carrosséis: após ~8px de movimento o
 *   eixo é travado — horizontal troca o MOMENTO, vertical troca a FAIXA.
 * - Expõe o deslocamento fracionário em itens (`offsetX`/`offsetY`) para que os cards
 *   acompanhem o dedo em tempo real; ao soltar, aplica inércia e "snap" no item mais próximo.
 * - Suporta roda do mouse (vertical = faixa; horizontal/Shift = momento) e setas do teclado.
 * - Suprime o `click` que o navegador dispara logo após um arraste (evita seleção acidental).
 */
export function useGestoPalco({
  passoX,
  passoY,
  aoPassoX,
  aoPassoY,
  bordas,
  habilitado = true,
}: OpcoesGestoPalco) {
  const [offsetX, setOffsetX] = useState(0);
  const [offsetY, setOffsetY] = useState(0);
  const [arrastando, setArrastando] = useState(false);

  const inicioRef = useRef<{ x: number; y: number; id: number } | null>(null);
  const eixoRef = useRef<Eixo>(null);
  const amostraRef = useRef<{ x: number; y: number; t: number; vx: number; vy: number }>({
    x: 0, y: 0, t: 0, vx: 0, vy: 0,
  });
  const offsetAtualRef = useRef(0);
  const arrastouRef = useRef(false);
  const ultimaRodaRef = useRef(0);

  /** Aplica resistência elástica quando não há mais itens naquela direção. */
  const aplicarBordas = useCallback(
    (offset: number, eixo: 'x' | 'y') => {
      const podeVoltar = eixo === 'x' ? bordas.xAnterior : bordas.yAnterior;
      const podeAvancar = eixo === 'x' ? bordas.xProximo : bordas.yProximo;
      let resultado = Math.max(-1.2, Math.min(1.2, offset));
      if (resultado < 0 && !podeVoltar) resultado *= RESISTENCIA_BORDA;
      if (resultado > 0 && !podeAvancar) resultado *= RESISTENCIA_BORDA;
      return resultado;
    },
    [bordas.xAnterior, bordas.xProximo, bordas.yAnterior, bordas.yProximo]
  );

  const aoPressionar = (e: PointerEventReact<HTMLElement>) => {
    if (!habilitado) return;
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    inicioRef.current = { x: e.clientX, y: e.clientY, id: e.pointerId };
    eixoRef.current = null;
    offsetAtualRef.current = 0;
    amostraRef.current = { x: e.clientX, y: e.clientY, t: e.timeStamp, vx: 0, vy: 0 };
  };

  const aoMover = (e: PointerEventReact<HTMLElement>) => {
    const inicio = inicioRef.current;
    if (!inicio || !habilitado) return;

    const dx = e.clientX - inicio.x;
    const dy = e.clientY - inicio.y;

    if (!eixoRef.current) {
      if (Math.max(Math.abs(dx), Math.abs(dy)) < LIMIAR_EIXO_PX) return;
      eixoRef.current = Math.abs(dx) > Math.abs(dy) ? 'x' : 'y';
      try {
        e.currentTarget.setPointerCapture(inicio.id);
      } catch {
        /* captura indisponível: o arraste segue funcionando dentro do elemento */
      }
      setArrastando(true);
    }

    // Velocidade instantânea (px/ms) para a inércia ao soltar
    const dt = Math.max(1, e.timeStamp - amostraRef.current.t);
    amostraRef.current = {
      x: e.clientX,
      y: e.clientY,
      t: e.timeStamp,
      vx: (e.clientX - amostraRef.current.x) / dt,
      vy: (e.clientY - amostraRef.current.y) / dt,
    };

    if (eixoRef.current === 'x') {
      // Arrastar para a esquerda (dx < 0) avança para o próximo momento
      const off = aplicarBordas(-dx / passoX, 'x');
      offsetAtualRef.current = off;
      setOffsetX(off);
      setOffsetY(0);
    } else {
      // Arrastar para cima (dy < 0) avança para a próxima faixa
      const off = aplicarBordas(-dy / passoY, 'y');
      offsetAtualRef.current = off;
      setOffsetY(off);
      setOffsetX(0);
    }
  };

  const finalizarGesto = (e: PointerEventReact<HTMLElement>) => {
    const inicio = inicioRef.current;
    const eixo = eixoRef.current;
    inicioRef.current = null;
    eixoRef.current = null;
    if (!inicio) return;

    try {
      e.currentTarget.releasePointerCapture(inicio.id);
    } catch {
      /* já liberada */
    }

    if (!eixo) return; // foi apenas um toque: deixa o click seguir para o card

    const passo = eixo === 'x' ? passoX : passoY;
    const velocidade = eixo === 'x' ? amostraRef.current.vx : amostraRef.current.vy;
    // Projeta a inércia: velocidade negativa (para esquerda/cima) avança itens
    const projetado = offsetAtualRef.current - (velocidade * INERCIA_MS) / passo;
    let passos = Math.round(projetado);
    passos = Math.max(-MAX_ITENS_POR_GESTO, Math.min(MAX_ITENS_POR_GESTO, passos));

    setArrastando(false);
    setOffsetX(0);
    setOffsetY(0);
    offsetAtualRef.current = 0;

    // O navegador dispara `click` logo após o `pointerup`; marca para ignorá-lo
    arrastouRef.current = true;
    window.setTimeout(() => {
      arrastouRef.current = false;
    }, 60);

    if (passos !== 0) {
      if (eixo === 'x') aoPassoX(passos);
      else aoPassoY(passos);
    }
  };

  const aoRolar = (e: WheelEvent<HTMLElement>) => {
    if (!habilitado) return;
    const agora = Date.now();
    if (agora - ultimaRodaRef.current < INTERVALO_RODA_MS) return;

    const horizontal = Math.abs(e.deltaX) > Math.abs(e.deltaY) || e.shiftKey;
    const delta = horizontal ? e.deltaX || e.deltaY : e.deltaY;
    if (Math.abs(delta) < 8) return;

    ultimaRodaRef.current = agora;
    const sentido = delta > 0 ? 1 : -1;
    if (horizontal) aoPassoX(sentido);
    else aoPassoY(sentido);
  };

  const aoTeclar = (e: KeyboardEvent<HTMLElement>) => {
    if (!habilitado) return;
    switch (e.key) {
      case 'ArrowRight':
        aoPassoX(1);
        break;
      case 'ArrowLeft':
        aoPassoX(-1);
        break;
      case 'ArrowDown':
        aoPassoY(1);
        break;
      case 'ArrowUp':
        aoPassoY(-1);
        break;
      default:
        return;
    }
    e.preventDefault();
  };

  const suprimirCliqueAposArraste = (e: React.MouseEvent) => {
    if (arrastouRef.current) {
      e.stopPropagation();
      e.preventDefault();
    }
  };

  return {
    offsetX,
    offsetY,
    arrastando,
    propsPalco: {
      onPointerDown: aoPressionar,
      onPointerMove: aoMover,
      onPointerUp: finalizarGesto,
      onPointerCancel: finalizarGesto,
      onClickCapture: suprimirCliqueAposArraste,
      onWheel: aoRolar,
      onKeyDown: aoTeclar,
      tabIndex: 0,
    },
  };
}
