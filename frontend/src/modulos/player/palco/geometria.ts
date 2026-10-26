/**
 * Geometria 3D do Palco de Carrosséis do Player Harmonia.
 *
 * Funções PURAS (sem React/DOM) que convertem a "distância fracionária" de um item até o
 * centro do carrossel em transformações CSS 3D e em transparência progressiva.
 * Distância 0 = item ativo (centro); ±1 = vizinho imediato; ±2 = segundo vizinho etc.
 * Como a distância é fracionária durante o arraste, o movimento acompanha o dedo em tempo real.
 *
 * As medidas estão em "pixels de projeto"; o componente aplica uma escala uniforme para
 * adaptar o palco a qualquer tamanho de tela.
 */

/** Medidas de projeto do palco (px). */
export const MEDIDAS_PALCO = {
  larguraMoldura: 306,
  alturaMoldura: 432,
  alturaCabecalho: 56,
  /** Card ativo ampliado em +33% de altura (de 150px para 200px) para destaque do disco e vitrola. */
  alturaCardAtivo: 200,
  alturaCardCompacto: 62,
  /** Deslocamento horizontal do 1º vizinho de momento. */
  passoMomento: 216,
  /** Deslocamento vertical do 1º e 2º vizinho de faixa. */
  passoFaixa1: 122,
  passoFaixa2: 42,
} as const;

/** Opacidade de momentos por distância inteira: centro, 1º, 2º vizinho (depois zera). */
const OPACIDADE_MOMENTOS = [1, 0.55, 0.22] as const;
/** Opacidade de faixas por distância inteira: centro, 1ª, 2ª vizinha (depois zera). */
const OPACIDADE_FAIXAS = [1, 0.6, 0.28] as const;

export function limitar(valor: number, minimo: number, maximo: number): number {
  return Math.min(maximo, Math.max(minimo, valor));
}

export function interpolar(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

/**
 * Transparência progressiva: interpola linearmente entre os pontos de opacidade de cada
 * distância inteira e chega a 0 uma unidade depois do último ponto.
 */
export function opacidadePorDistancia(distancia: number, pontos: readonly number[]): number {
  const d = Math.abs(distancia);
  const serie = [...pontos, 0];
  const i = Math.floor(d);
  if (i >= serie.length - 1) return 0;
  return interpolar(serie[i], serie[i + 1], d - i);
}

/**
 * Posição ao longo de um eixo com espaçamento decrescente: o 1º vizinho fica a `passo1`
 * do centro e os seguintes se aproximam (`passo2`), criando o efeito de pilha em perspectiva.
 * Preserva o sinal e é contínua em |d| = 1.
 */
export function posicaoComprimida(distancia: number, passo1: number, passo2: number): number {
  const sinal = distancia < 0 ? -1 : 1;
  const d = Math.abs(distancia);
  const modulo = d <= 1 ? d * passo1 : passo1 + (d - 1) * passo2;
  return sinal * modulo;
}

/** 1 no centro, 0 a partir de `alcance` unidades de distância (usado para esmaecer conteúdo). */
export function intensidadeCentral(distancia: number, alcance = 0.7): number {
  return limitar(1 - Math.abs(distancia) / alcance, 0, 1);
}

export interface TransformacaoMomento {
  x: number;
  y: number;
  z: number;
  rotY: number;
  escala: number;
  opacidade: number;
  zIndex: number;
  intensidade: number;
}

/** Transformação de uma moldura de MOMENTO (carrossel horizontal). */
export function calcularMomento(distancia: number): TransformacaoMomento {
  const ad = Math.abs(distancia);
  const lim = Math.min(ad, 2.4);
  return {
    x: posicaoComprimida(distancia, MEDIDAS_PALCO.passoMomento, MEDIDAS_PALCO.passoMomento * 0.55),
    // Vizinhos "afundam" levemente, ecoando o alinhamento inferior do conceito visual
    y: lim * 26,
    z: -ad * 90,
    // Faces dos vizinhos voltadas para o centro (borda interna recua)
    rotY: -Math.sign(distancia) * Math.min(ad, 2) * 26,
    escala: Math.max(0.46, 1 - ad * 0.34),
    opacidade: opacidadePorDistancia(distancia, OPACIDADE_MOMENTOS),
    zIndex: Math.round(200 - ad * 20),
    intensidade: intensidadeCentral(distancia),
  };
}

export interface TransformacaoFaixa {
  y: number;
  z: number;
  rotX: number;
  escala: number;
  opacidade: number;
  zIndex: number;
  intensidade: number;
  altura: number;
}

/** Transformação de um card de FAIXA (carrossel vertical em pilha 3D). */
export function calcularFaixa(distancia: number): TransformacaoFaixa {
  const ad = Math.abs(distancia);
  const intensidade = intensidadeCentral(distancia, 0.9);
  return {
    y: posicaoComprimida(distancia, MEDIDAS_PALCO.passoFaixa1, MEDIDAS_PALCO.passoFaixa2),
    z: -ad * 70,
    // Cards acima/abaixo inclinam para trás, formando a pilha em perspectiva
    rotX: -distancia * 20,
    escala: Math.max(0.62, 1 - ad * 0.13),
    opacidade: opacidadePorDistancia(distancia, OPACIDADE_FAIXAS),
    zIndex: Math.round(100 - ad * 10),
    intensidade,
    altura: interpolar(MEDIDAS_PALCO.alturaCardCompacto, MEDIDAS_PALCO.alturaCardAtivo, intensidade),
  };
}
