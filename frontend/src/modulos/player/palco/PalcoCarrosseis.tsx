import React, { useEffect, useRef, useState } from 'react';
import { Disc3, Plus, Star, Volume1, Volume2 } from 'lucide-react';
import { MomentoExecucao, MusicaSorteada } from '../../../compartilhado/tipos';
import { feedbackTatil } from '../../../compartilhado/utilitarios/dispositivoNativo';
import { useGestoPalco } from '../hooks/useGestoPalco';
import { DiscoFaixa } from './DiscoFaixa';
import { Equalizador } from './Equalizador';
import {
  MEDIDAS_PALCO as M,
  calcularFaixa,
  calcularMomento,
  interpolar,
  limitar,
} from './geometria';

/** Curva e duração das transições quando o dedo/mouse não está arrastando. */
const TRANSICAO_MOMENTO = 'transform 0.55s cubic-bezier(0.22, 0.9, 0.25, 1), opacity 0.45s ease-out';
const TRANSICAO_FAIXA =
  'transform 0.5s cubic-bezier(0.22, 0.9, 0.25, 1), opacity 0.4s ease-out, height 0.45s ease-out, margin-top 0.45s ease-out';
/** Distância máxima (em itens) renderizada: virtualização para sessões com muitos momentos/faixas. */
const ALCANCE_RENDER = 3.2;
/** Disco base (px de projeto) no card ativo ampliado; escala para baixo nos cards compactos. */
const DISCO_BASE = 104;
const LARGURA_CARD_FAIXA = M.larguraMoldura - 32;

const dois = (n: number) => String(n).padStart(2, '0');

/** Observa o tamanho do elemento (ResizeObserver) para adaptar a escala do palco. */
function useTamanho(ref: React.RefObject<HTMLElement>) {
  const [tamanho, setTamanho] = useState({ largura: 0, altura: 0 });
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new ResizeObserver(([entrada]) => {
      const { width, height } = entrada.contentRect;
      setTamanho({ largura: width, altura: height });
    });
    obs.observe(el);
    return () => obs.disconnect();
  }, [ref]);
  return tamanho;
}

interface PalcoCarrosseisProps {
  momentos: MomentoExecucao[];
  indiceMomento: number;
  tocando: boolean;
  /** Progresso da faixa atual entre 0 e 1 (para o braço de vitrola). */
  progressoFaixa: number;
  volumeExecucao?: number;
  surdinaAtiva?: boolean;
  /** Vai para um momento pelo índice absoluto. */
  onMudarMomento: (indice: number) => void;
  /** Seleciona a faixa pelo índice dentro do momento ativo. `tocar` indica se deve iniciar/continuar a reprodução. */
  onTrocarFaixa: (indiceFaixa: number, tocar: boolean) => void;
  onAlternarPlayPause: () => void;
  onAlternarPreferencia: (musicaId: string, preferida: boolean) => void;
  onAbrirUpload: () => void;
}

/**
 * Palco de Carrosséis 3D do Player.
 *
 *  - Carrossel HORIZONTAL de momentos: o ativo fica no centro; os vizinhos recuam em
 *    perspectiva e vão ficando transparentes conforme se afastam (2 de cada lado no desktop).
 *  - Carrossel VERTICAL de faixas dentro da moldura do momento ativo: a faixa ativa fica no
 *    centro da pilha 3D e as demais esmaecem progressivamente.
 *  - Arraste (toque/mouse), roda do mouse e setas do teclado: ver `useGestoPalco`.
 *
 * O componente é puramente visual/controlado: o estado (momento, faixa, reprodução) vive na página.
 */
export const PalcoCarrosseis: React.FC<PalcoCarrosseisProps> = ({
  momentos,
  indiceMomento,
  tocando,
  progressoFaixa,
  volumeExecucao,
  surdinaAtiva,
  onMudarMomento,
  onTrocarFaixa,
  onAlternarPlayPause,
  onAlternarPreferencia,
  onAbrirUpload,
}) => {
  const refPalco = useRef<HTMLDivElement>(null);
  const { largura, altura } = useTamanho(refPalco);

  // Escala uniforme: aproveita toda a altura disponível no celular sem comprimir a moldura
  const escala =
    largura > 0 && altura > 0
      ? limitar(Math.min((altura - 4) / M.alturaMoldura, largura / (M.larguraMoldura * 1.05)), 0.65, 1.2)
      : 0.92;

  const momentoAtivo = momentos[indiceMomento];
  const faixasAtivas = momentoAtivo?.candidatas ?? [];
  const idxFaixaAtiva = Math.max(
    0,
    faixasAtivas.findIndex((f) => f.id === momentoAtivo?.musica_sorteada?.id)
  );

  const { offsetX, offsetY, arrastando, propsPalco } = useGestoPalco({
    passoX: M.passoMomento * escala,
    passoY: M.passoFaixa1 * escala,
    bordas: {
      xAnterior: indiceMomento > 0,
      xProximo: indiceMomento < momentos.length - 1,
      yAnterior: idxFaixaAtiva > 0,
      yProximo: idxFaixaAtiva < faixasAtivas.length - 1,
    },
    aoPassoX: (delta) => {
      const novo = limitar(indiceMomento + delta, 0, momentos.length - 1);
      if (novo !== indiceMomento) {
        feedbackTatil.clique();
        onMudarMomento(novo);
      }
    },
    aoPassoY: (delta) => {
      const novo = limitar(idxFaixaAtiva + delta, 0, faixasAtivas.length - 1);
      if (novo !== idxFaixaAtiva) {
        feedbackTatil.clique();
        // Navegar pelas faixas preserva o estado: se estava tocando, continua tocando a nova faixa
        onTrocarFaixa(novo, tocando);
      }
    },
  });

  const aoClicarFaixa = (indice: number) => {
    feedbackTatil.clique();
    if (indice === idxFaixaAtiva) onAlternarPlayPause();
    else onTrocarFaixa(indice, true);
  };

  if (!momentoAtivo) return null;

  return (
    <div
      ref={refPalco}
      {...propsPalco}
      role="group"
      aria-roledescription="carrossel"
      aria-label="Momentos ritualísticos e faixas da sessão. Use as setas do teclado ou arraste para navegar."
      className="relative flex-1 min-h-0 w-full overflow-hidden select-none outline-none focus-visible:ring-1 focus-visible:ring-cyan-400/40"
      style={{ touchAction: 'none', cursor: arrastando ? 'grabbing' : 'grab' }}
    >
      {/* Texto para leitores de tela acompanhando a mudança de momento/faixa */}
      <p className="sr-only" aria-live="polite">
        Momento {indiceMomento + 1} de {momentos.length}: {momentoAtivo.evento_nome}.
        {momentoAtivo.musica_sorteada ? ` Faixa: ${momentoAtivo.musica_sorteada.titulo}.` : ' Sem faixas.'}
      </p>

      {/* Halo ciano que respira atrás do palco */}
      <div
        className="harmonia-aurora pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full"
        style={{
          width: 460 * escala,
          height: 460 * escala,
          background:
            'radial-gradient(circle, rgba(0,229,255,0.17) 0%, rgba(0,229,255,0.05) 45%, transparent 70%)',
        }}
      />

      <div
        className="absolute inset-0 flex items-center justify-center"
        style={{ perspective: '1300px', perspectiveOrigin: '50% 42%' }}
      >
        <div
          className="relative preserve-3d"
          style={{
            width: M.larguraMoldura,
            height: M.alturaMoldura,
            transform: `scale(${escala})`,
            transformStyle: 'preserve-3d',
          }}
        >
          {momentos.map((momento, idx) => {
            const distancia = idx - (indiceMomento + offsetX);
            if (Math.abs(distancia) > ALCANCE_RENDER) return null;
            const t = calcularMomento(distancia);
            const ativo = idx === indiceMomento;

            return (
              <div
                key={`${momento.evento_id}-${idx}`}
                className="absolute left-0 top-0"
                style={{
                  width: M.larguraMoldura,
                  height: M.alturaMoldura,
                  transform: `translate3d(${t.x}px, ${t.y}px, ${t.z}px) rotateY(${t.rotY}deg) scale(${t.escala})`,
                  opacity: t.opacidade,
                  zIndex: t.zIndex,
                  transition: arrastando ? 'none' : TRANSICAO_MOMENTO,
                  pointerEvents: t.opacidade < 0.05 ? 'none' : 'auto',
                  willChange: 'transform, opacity',
                }}
              >
                <MolduraMomento
                  momento={momento}
                  indice={idx}
                  total={momentos.length}
                  ativo={ativo}
                  intensidade={t.intensidade}
                  tocando={ativo && tocando}
                  progressoFaixa={ativo ? progressoFaixa : 0}
                  volumeExecucao={volumeExecucao}
                  surdinaAtiva={surdinaAtiva}
                  offsetFaixa={ativo ? offsetY : 0}
                  arrastando={arrastando}
                  onIr={() => {
                    feedbackTatil.clique();
                    onMudarMomento(idx);
                  }}
                  onClicarFaixa={aoClicarFaixa}
                  onAlternarPreferencia={onAlternarPreferencia}
                  onAbrirUpload={onAbrirUpload}
                />
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

/* ------------------------------------------------------------------------- */

interface MolduraMomentoProps {
  momento: MomentoExecucao;
  indice: number;
  total: number;
  ativo: boolean;
  /** 1 quando centralizado, 0 quando afastado (controla o cross-fade entre as duas faces). */
  intensidade: number;
  tocando: boolean;
  progressoFaixa: number;
  volumeExecucao?: number;
  surdinaAtiva?: boolean;
  offsetFaixa: number;
  arrastando: boolean;
  onIr: () => void;
  onClicarFaixa: (indiceFaixa: number) => void;
  onAlternarPreferencia: (musicaId: string, preferida: boolean) => void;
  onAbrirUpload: () => void;
}

/**
 * Moldura de um momento. Possui duas faces sobrepostas que trocam por opacidade:
 *  - face de VIZINHO (só o número e a contagem de faixas; o nome fica no tooltip/aria-label,
 *    pois não cabe dentro do retângulo reduzido);
 *  - face ATIVA (título do momento + pilha vertical 3D de faixas).
 */
const MolduraMomento: React.FC<MolduraMomentoProps> = ({
  momento,
  indice,
  total,
  ativo,
  intensidade,
  tocando,
  progressoFaixa,
  volumeExecucao,
  surdinaAtiva,
  offsetFaixa,
  arrastando,
  onIr,
  onClicarFaixa,
  onAlternarPreferencia,
  onAbrirUpload,
}) => {
  const faixas = momento.candidatas ?? [];
  const idxAtiva = Math.max(0, faixas.findIndex((f) => f.id === momento.musica_sorteada?.id));
  const rotulo = `${dois(indice + 1)} de ${dois(total)} — ${momento.evento_nome}`;

  return (
    <div
      className={`relative h-full w-full overflow-hidden rounded-[26px] border-2 transition-colors duration-500 ${
        ativo ? 'border-[#00E5FF]' : 'border-cyan-400/40'
      } ${ativo && tocando ? 'harmonia-moldura-ativa-tocando' : ''}`}
      style={{
        background: 'linear-gradient(180deg, #071a2e 0%, #050d1b 100%)',
        boxShadow: ativo
          ? '0 18px 44px rgba(0,0,0,0.95), 0 0 28px rgba(0,229,255,0.3)'
          : '0 10px 24px rgba(0,0,0,0.8)',
      }}
    >
      {/* Face de vizinho */}
      <button
        type="button"
        onClick={onIr}
        aria-label={rotulo}
        title={momento.evento_nome}
        tabIndex={-1}
        className="absolute inset-0 flex flex-col items-center justify-center gap-3"
        style={{ opacity: 1 - intensidade, pointerEvents: intensidade > 0.5 ? 'none' : 'auto' }}
      >
        <span className="font-mono text-5xl font-extrabold text-cyan-300/80 drop-shadow-[0_0_14px_rgba(0,229,255,0.45)]">
          {dois(indice + 1)}
        </span>
        <Disc3 className="h-9 w-9 text-cyan-300/50" aria-hidden="true" />
        <span className="font-mono text-[11px] font-bold uppercase tracking-widest text-cyan-200/60">
          {faixas.length} {faixas.length === 1 ? 'faixa' : 'faixas'}
        </span>
      </button>

      {/* Face ativa (só é montada perto do centro) */}
      {intensidade > 0.02 && (
        <div className="absolute inset-0" style={{ opacity: intensidade }}>
          {/* Cabeçalho: título do momento */}
          <div
            key={momento.evento_id}
            className="harmonia-entrar absolute inset-x-0 top-0 flex flex-col items-center justify-center border-b border-cyan-400/20 px-4 text-center"
            style={{ height: M.alturaCabecalho }}
          >
            <h3 className="line-clamp-2 text-[13px] font-extrabold uppercase leading-tight tracking-wide text-white drop-shadow-[0_0_10px_rgba(255,255,255,0.35)]">
              {momento.evento_nome}
            </h3>
            <span className="mt-0.5 font-mono text-[10px] font-bold tracking-widest text-cyan-300/90">
              {faixas.length} {faixas.length === 1 ? 'FAIXA' : 'FAIXAS'} • {indice + 1}/{total}
            </span>
          </div>

          {/* Pilha vertical 3D de faixas, com esmaecimento nas bordas */}
          <div
            className="absolute inset-x-0 bottom-0 overflow-hidden"
            style={{
              top: M.alturaCabecalho,
              perspective: '900px',
              perspectiveOrigin: '50% 50%',
              WebkitMaskImage:
                'linear-gradient(to bottom, transparent 0, #000 13%, #000 87%, transparent 100%)',
              maskImage: 'linear-gradient(to bottom, transparent 0, #000 13%, #000 87%, transparent 100%)',
            }}
          >
            {faixas.length === 0 ? (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-center">
                <Disc3 className="h-12 w-12 text-cyan-300/30" aria-hidden="true" />
                <p className="font-mono text-xs italic text-slate-400">[ SILÊNCIO PROGRAMADO ]</p>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onAbrirUpload();
                  }}
                  className="rounded-xl border border-cyan-400/30 bg-cyan-400/10 px-4 py-2 text-xs font-bold text-cyan-300 transition-colors hover:bg-cyan-400/20"
                >
                  + Catalogar Música
                </button>
              </div>
            ) : (
              faixas.map((faixa, i) => {
                const dv = i - (idxAtiva + offsetFaixa);
                if (Math.abs(dv) > ALCANCE_RENDER) return null;
                return (
                  <CardFaixa
                    key={faixa.id}
                    faixa={faixa}
                    distancia={dv}
                    ativa={i === idxAtiva}
                    tocando={tocando && i === idxAtiva}
                    progresso={i === idxAtiva ? progressoFaixa : 0}
                    volumeExecucao={volumeExecucao}
                    surdinaAtiva={surdinaAtiva}
                    arrastando={arrastando}
                    onClicar={() => onClicarFaixa(i)}
                    onAlternarPreferencia={onAlternarPreferencia}
                  />
                );
              })
            )}
          </div>

          {/* Atalho para catalogar mais músicas neste momento */}
          {faixas.length > 0 && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onAbrirUpload();
              }}
              aria-label="Catalogar nova música para este momento"
              title="Catalogar nova música para este momento"
              className="absolute bottom-2.5 right-3 z-10 flex h-7 w-7 items-center justify-center rounded-full border border-cyan-400/30 bg-cyan-400/10 text-cyan-300 transition-all hover:scale-110 hover:bg-cyan-400/25"
            >
              <Plus className="h-4 w-4" />
            </button>
          )}
        </div>
      )}
    </div>
  );
};

/* ------------------------------------------------------------------------- */

interface CardFaixaProps {
  faixa: MusicaSorteada;
  /** Distância fracionária até o centro da pilha (0 = ativa). */
  distancia: number;
  ativa: boolean;
  tocando: boolean;
  progresso: number;
  volumeExecucao?: number;
  surdinaAtiva?: boolean;
  arrastando: boolean;
  onClicar: () => void;
  onAlternarPreferencia: (musicaId: string, preferida: boolean) => void;
}

/**
 * Card de uma faixa na pilha vertical. A transição entre o formato COMPACTO (vizinha) e o
 * COMPLETO (ativa) é contínua: disco, textos e altura são interpolados pela `intensidade`,
 * acompanhando o arraste em tempo real.
 */
const CardFaixa: React.FC<CardFaixaProps> = ({
  faixa,
  distancia,
  ativa,
  tocando,
  progresso,
  volumeExecucao,
  surdinaAtiva,
  arrastando,
  onClicar,
  onAlternarPreferencia,
}) => {
  const f = calcularFaixa(distancia);
  const preferida = Boolean(faixa.preferida);
  const duracao = faixa.duracao_segundos
    ? `${Math.floor(faixa.duracao_segundos / 60)}:${String(faixa.duracao_segundos % 60).padStart(2, '0')}`
    : null;

  // Disco: do canto esquerdo (compacto) ao topo central (completo)
  const escalaDisco = interpolar(0.4, 1, f.intensidade);
  const centroX = interpolar(32, LARGURA_CARD_FAIXA / 2 - 4, f.intensidade);
  const centroY = interpolar(f.altura / 2, 12 + DISCO_BASE / 2, f.intensidade);

  return (
    <div
      className="absolute left-1/2 top-1/2"
      style={{
        width: LARGURA_CARD_FAIXA,
        height: f.altura,
        marginLeft: -LARGURA_CARD_FAIXA / 2,
        marginTop: -f.altura / 2,
        transform: `translate3d(0, ${f.y}px, ${f.z}px) rotateX(${f.rotX}deg) scale(${f.escala})`,
        opacity: f.opacidade,
        zIndex: f.zIndex,
        transition: arrastando ? 'none' : TRANSICAO_FAIXA,
        pointerEvents: f.opacidade < 0.05 ? 'none' : 'auto',
        willChange: 'transform, opacity',
      }}
    >
      <div
        role="button"
        tabIndex={-1}
        aria-label={`${faixa.titulo}${faixa.autor_artista ? `, ${faixa.autor_artista}` : ''}${preferida ? ', preferida' : ''}`}
        aria-current={ativa}
        onClick={onClicar}
        className={`relative h-full w-full cursor-pointer overflow-hidden rounded-[22px] border transition-colors duration-500 ${
          ativa
            ? 'border-[#00E5FF]/70 shadow-[0_0_26px_rgba(0,229,255,0.28)]'
            : 'border-cyan-400/20 hover:border-cyan-400/45'
        }`}
        style={{ background: ativa ? '#0a1b30' : '#07121f' }}
      >
        {/* Disco (preferida = bordas e centro dourados) + Braço de Vitrola proporcional na faixa ativa */}
        <div
          className="absolute left-0 top-0"
          style={{
            width: DISCO_BASE,
            height: DISCO_BASE,
            transform: `translate(${centroX - DISCO_BASE / 2}px, ${centroY - DISCO_BASE / 2}px) scale(${escalaDisco})`,
            transition: arrastando ? 'none' : 'transform 0.5s cubic-bezier(0.22, 0.9, 0.25, 1)',
          }}
        >
          <DiscoFaixa
            preferida={preferida}
            girando={tocando}
            tamanho={DISCO_BASE}
            mostrarBraco={f.intensidade > 0.65}
            progresso={progresso}
          />
        </div>

        {/* Indicador de Volume de Execução no card da música */}
        {volumeExecucao !== undefined && (
          <div
            className={`absolute left-2.5 top-2.5 z-10 flex items-center gap-1 px-2 py-0.5 rounded-full border text-[10px] font-mono font-bold transition-all shadow-sm ${
              surdinaAtiva
                ? 'bg-amber-500/25 text-amber-300 border-amber-400/40 shadow-[0_0_10px_rgba(245,158,11,0.25)]'
                : 'bg-[#06182c]/85 text-[#00E5FF] border-cyan-400/40 shadow-[0_0_8px_rgba(0,229,255,0.2)]'
            }`}
            style={{ opacity: f.intensidade, pointerEvents: 'none' }}
            title={`Volume de execução: ${volumeExecucao}% ${surdinaAtiva ? '(Modo Surdina)' : ''}`}
          >
            {surdinaAtiva ? (
              <Volume1 className="w-3.5 h-3.5 text-amber-300 animate-pulse" />
            ) : (
              <Volume2 className="w-3.5 h-3.5 text-[#00E5FF]" />
            )}
            <span>{volumeExecucao}%</span>
            {surdinaAtiva && (
              <span className="text-[8px] font-sans font-extrabold uppercase tracking-wider text-amber-300/80">
                SURDINA
              </span>
            )}
          </div>
        )}

        {/* Texto compacto (faixa vizinha) */}
        <div
          className="absolute inset-y-0 right-3 flex flex-col justify-center"
          style={{ left: 62, opacity: 1 - f.intensidade }}
        >
          <span className="truncate text-[12px] font-semibold text-slate-200">{faixa.titulo}</span>
          <span className="truncate text-[10px] text-slate-400">{faixa.autor_artista || 'Acervo Harmonia'}</span>
        </div>

        {/* Texto completo (faixa ativa) */}
        <div
          className="absolute inset-x-3 text-center"
          style={{ top: 12 + DISCO_BASE + 12, opacity: f.intensidade }}
        >
          <div className="flex items-center justify-center gap-1.5 min-w-0">
            <p className="truncate text-[16px] font-bold leading-tight text-cyan-200">{faixa.titulo}</p>
            {faixa.surdina && (
              <span
                className="shrink-0 text-[9px] font-mono font-bold px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-400/40"
                title="Música configurada com perfil Surdina permanente"
              >
                SURDINA
              </span>
            )}
          </div>
          <p className="mt-1 truncate text-[12px] font-semibold text-white">
            {faixa.autor_artista || 'Acervo Harmonia'}
            {duracao ? <span className="font-normal text-slate-400"> • {duracao}</span> : null}
            {volumeExecucao !== undefined && (
              <span
                className={`font-mono text-[11px] font-bold ml-1.5 ${
                  surdinaAtiva ? 'text-amber-300' : 'text-cyan-300'
                }`}
              >
                • Vol: {volumeExecucao}%
              </span>
            )}
          </p>
        </div>
        <div className="absolute inset-x-0 bottom-3.5" style={{ opacity: f.intensidade }}>
          <Equalizador tocando={tocando} altura={22} />
        </div>

        {/* Estrela de preferência (várias faixas podem ser preferidas; o sorteio ocorre entre elas) */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            feedbackTatil.acaoMedia();
            onAlternarPreferencia(faixa.id, !preferida);
          }}
          aria-pressed={preferida}
          aria-label={preferida ? 'Remover das preferidas' : 'Marcar como preferida'}
          title={preferida ? 'Preferida: entra no sorteio deste momento' : 'Marcar como preferida'}
          className="absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-full transition-colors hover:bg-white/10"
          style={{ opacity: f.intensidade, pointerEvents: f.intensidade > 0.6 ? 'auto' : 'none' }}
        >
          <Star
            key={String(preferida)}
            className={`h-[18px] w-[18px] ${
              preferida ? 'harmonia-estrela-marcada text-[#DDB96B]' : 'text-slate-500'
            }`}
            fill={preferida ? 'currentColor' : 'none'}
            strokeWidth={2.2}
          />
        </button>
      </div>
    </div>
  );
};
