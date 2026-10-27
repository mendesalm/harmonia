import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Rewind,
  FastForward,
  Compass,
  HelpCircle,
  Volume1,
  Volume2,
  VolumeX,
  Volume,
  Minus,
  Plus,
  X,
  BookOpen,
  Music,
  Sliders,
} from 'lucide-react';
import { feedbackTatil } from '../../../compartilhado/utilitarios/dispositivoNativo';
import { MomentoExecucao } from '../../../compartilhado/tipos';

interface MasonicControlsProps {
  tocando: boolean;
  onPlayPause: () => void;
  onPrevTrack?: () => void;
  onNextTrack?: () => void;
  onPrevMoment?: () => void;
  onNextMoment?: () => void;
  tempoAtual: number;
  duracaoTotal: number;
  onSeek: (novoTempo: number) => void;
  momentoAtual?: MomentoExecucao | null;
  proximoMomento?: MomentoExecucao | null;
  surdinaAtiva: boolean;
  onAlternarSurdina: () => void;
  percentualSurdina: number;
  onAlterarPercentualSurdina: (novoPercentual: number) => void;
  musicaAtualSurdina?: boolean;
  onAlternarMusicaSurdinaPermanente?: (musicaId: string, surdina: boolean) => void;
  onAlternarMomentoSurdinaPermanente?: (emSurdina: boolean) => void;
  volumeGeral: number;
  onAjustarVolumeRelativo: (delta: number) => void;
  onAlterarVolumeGeral: (novoVolume: number) => void;
  modalSurdinaAbertoControlado?: boolean;
  onAlternarModalSurdinaControlado?: (aberto: boolean) => void;
}

/**
 * Painel inferior de controles de reprodução do Player Harmonia.
 * - Pílula moderna tátil: Volume Down (alto-falante esquerdo), Botão central Play/Pause circular 76x76 com anéis concêntricos dourados, Volume Up (alto-falante direito).
 * - Linha de apoio: Orientação, Surdina configurável e Informação do Próximo Evento (ícone de ajuda/interrogação).
 */
export const MasonicControls: React.FC<MasonicControlsProps> = ({
  tocando,
  onPlayPause,
  onPrevTrack,
  onNextTrack,
  onPrevMoment,
  onNextMoment,
  tempoAtual,
  duracaoTotal,
  onSeek,
  momentoAtual,
  proximoMomento,
  surdinaAtiva,
  onAlternarSurdina,
  percentualSurdina,
  onAlterarPercentualSurdina,
  musicaAtualSurdina = false,
  onAlternarMusicaSurdinaPermanente,
  onAlternarMomentoSurdinaPermanente,
  volumeGeral,
  onAjustarVolumeRelativo,
  onAlterarVolumeGeral,
  modalSurdinaAbertoControlado,
  onAlternarModalSurdinaControlado,
}) => {
  const [modalOrientacaoAberto, setModalOrientacaoAberto] = useState(false);
  const [modalProximoAberto, setModalProximoAberto] = useState(false);
  const [modalSurdinaAbertoInterno, setModalSurdinaAbertoInterno] = useState(false);
  const [sliderVolumeAberto, setSliderVolumeAberto] = useState(false);

  const modalSurdinaAberto =
    modalSurdinaAbertoControlado !== undefined ? modalSurdinaAbertoControlado : modalSurdinaAbertoInterno;
  const setModalSurdinaAberto = (aberto: boolean) => {
    if (onAlternarModalSurdinaControlado) {
      onAlternarModalSurdinaControlado(aberto);
    } else {
      setModalSurdinaAbertoInterno(aberto);
    }
  };

  const formatarTempo = (secs: number) => {
    if (!secs || isNaN(secs)) return '00:00';
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const progressoPercentual = duracaoTotal > 0 ? (tempoAtual / duracaoTotal) * 100 : 0;
  const temMaisDeUmaFaixa = (momentoAtual?.candidatas?.length ?? 0) > 1;

  const orientacaoAtual =
    momentoAtual?.observacao_ritual?.trim() ||
    momentoAtual?.evento_descricao?.trim() ||
    'Executar a peça com volume equilibrado, atento ao comando do Venerável Mestre ou Mestre de Cerimônias.';

  const orientacaoProximo =
    proximoMomento?.observacao_ritual?.trim() ||
    proximoMomento?.evento_descricao?.trim() ||
    'Momento litúrgico seguinte na esteira ritualística.';

  return (
    <div className="w-full bg-[#050811] border-t border-macaonico-dourado/25 pt-1 pb-1.5 sm:pt-1.5 sm:pb-2 px-2 sm:px-4 flex flex-col items-center relative z-20 shrink-0">
      {/* Linha decorativa superior */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-1/3 h-px bg-gradient-to-r from-transparent via-macaonico-dourado/50 to-transparent pointer-events-none"></div>

      <div className="w-full max-w-3xl mx-auto flex flex-col items-center">
        {/* Barra de Progresso (Seek Bar) */}
        <div className="w-full max-w-[420px] px-2 sm:px-4 mb-0.5 sm:mb-1">
          <div className="flex items-center justify-between text-[10px] sm:text-[11px] font-inter text-macaonico-inactive font-medium px-1">
            <span>{formatarTempo(tempoAtual)}</span>
            <span>{duracaoTotal > 0 ? formatarTempo(duracaoTotal) : '--:--'}</span>
          </div>

          <div
            className="relative w-full py-1.5 cursor-pointer group select-none"
            onClick={(e) => {
              if (duracaoTotal <= 0) return;
              const rect = e.currentTarget.getBoundingClientRect();
              const clickX = e.clientX - rect.left;
              const percent = Math.max(0, Math.min(1, clickX / rect.width));
              onSeek(percent * duracaoTotal);
            }}
          >
            {/* Feixe dourado */}
            <div className="relative w-full h-2 bg-sigma-elevated/80 rounded-full overflow-hidden border border-macaonico-dourado/25">
              <div
                className="absolute top-0 left-0 h-full bg-gold-gradient shadow-[0_0_12px_rgba(221,185,107,0.65)] transition-all duration-100 ease-linear rounded-r-full"
                style={{ width: `${progressoPercentual}%` }}
              ></div>
            </div>

            {/* Marcador circular luminoso (Thumb) */}
            <div
              className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 rounded-full bg-[#070F1E] border-2 border-macaonico-dourado shadow-[0_0_14px_rgba(221,185,107,0.9)] flex items-center justify-center transition-all duration-100 ease-linear pointer-events-none group-hover:scale-125"
              style={{
                width: 14,
                height: 14,
                left: `${Math.max(2, Math.min(98, progressoPercentual))}%`,
              }}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-macaonico-dourado" />
            </div>
          </div>
        </div>

        {/* Painel Principal de Controles Táteis (Momento/Faixa Ant. + Play/Pause circular 76x76 + Faixa/Momento Próx.) */}
        <div
          className="relative w-full max-w-[390px] sm:max-w-[430px] flex items-center justify-center shrink-0 my-0.5 select-none"
          style={{ height: 78 }}
        >
          {/* Barra contínua em formato pílula atrás do botão central */}
          <div
            className="absolute inset-x-0 bg-[#070F1E] rounded-full border border-[#DDB96B]/35 flex items-center justify-between z-0 shadow-[0_4px_20px_rgba(0,0,0,0.5),inset_0_0_15px_rgba(221,185,107,0.06)]"
            style={{ height: 50 }}
          >
            {/* Metade Esquerda (Anterior) */}
            <div
              className="flex items-center justify-evenly h-full pl-2 pr-1"
              style={{ width: 'calc(50% - 38px)' }}
            >
              <button
                type="button"
                disabled={!onPrevMoment}
                onClick={() => {
                  if (!onPrevMoment) return;
                  feedbackTatil.clique();
                  onPrevMoment();
                }}
                className={`text-[#DDB96B]/85 hover:text-[#DDB96B] transition-all flex flex-col items-center justify-center py-1 px-1.5 active:scale-95 ${
                  onPrevMoment ? 'opacity-100 cursor-pointer' : 'opacity-25 pointer-events-none'
                }`}
                title="Momento Litúrgico Anterior"
                aria-label="Momento Anterior"
              >
                <Rewind className="w-4 h-4 sm:w-5 sm:h-5 drop-shadow-[0_0_6px_rgba(221,185,107,0.3)]" fill="currentColor" />
                <span className="text-[8px] sm:text-[9px] font-cinzel mt-0.5 tracking-wider opacity-80 leading-none">
                  Momento
                </span>
              </button>

              <button
                type="button"
                disabled={!temMaisDeUmaFaixa}
                onClick={() => {
                  if (!temMaisDeUmaFaixa) return;
                  feedbackTatil.clique();
                  onPrevTrack?.();
                }}
                className={`text-[#DDB96B]/85 hover:text-[#DDB96B] transition-all flex flex-col items-center justify-center py-1 px-1.5 active:scale-95 ${
                  temMaisDeUmaFaixa ? 'opacity-100 cursor-pointer' : 'opacity-25 pointer-events-none'
                }`}
                title={temMaisDeUmaFaixa ? "Música/Faixa Anterior" : "Apenas 1 faixa neste momento"}
                aria-label="Faixa Anterior"
              >
                <SkipBack className="w-4 h-4 sm:w-5 sm:h-5 drop-shadow-[0_0_6px_rgba(221,185,107,0.3)]" fill="currentColor" />
                <span className="text-[8px] sm:text-[9px] font-cinzel mt-0.5 tracking-wider opacity-80 leading-none">
                  Faixa
                </span>
              </button>
            </div>

            {/* Espaço central reservado para o botão circular de Play/Pause */}
            <div style={{ width: 76 }} />

            {/* Metade Direita (Próximo) */}
            <div
              className="flex items-center justify-evenly h-full pl-1 pr-2"
              style={{ width: 'calc(50% - 38px)' }}
            >
              <button
                type="button"
                disabled={!temMaisDeUmaFaixa}
                onClick={() => {
                  if (!temMaisDeUmaFaixa) return;
                  feedbackTatil.clique();
                  onNextTrack?.();
                }}
                className={`text-[#DDB96B]/85 hover:text-[#DDB96B] transition-all flex flex-col items-center justify-center py-1 px-1.5 active:scale-95 ${
                  temMaisDeUmaFaixa ? 'opacity-100 cursor-pointer' : 'opacity-25 pointer-events-none'
                }`}
                title={temMaisDeUmaFaixa ? "Próxima Música/Faixa" : "Apenas 1 faixa neste momento"}
                aria-label="Próxima Faixa"
              >
                <SkipForward className="w-4 h-4 sm:w-5 sm:h-5 drop-shadow-[0_0_6px_rgba(221,185,107,0.3)]" fill="currentColor" />
                <span className="text-[8px] sm:text-[9px] font-cinzel mt-0.5 tracking-wider opacity-80 leading-none">
                  Faixa
                </span>
              </button>

              <button
                type="button"
                disabled={!onNextMoment}
                onClick={() => {
                  if (!onNextMoment) return;
                  feedbackTatil.clique();
                  onNextMoment();
                }}
                className={`text-[#DDB96B]/85 hover:text-[#DDB96B] transition-all flex flex-col items-center justify-center py-1 px-1.5 active:scale-95 ${
                  onNextMoment ? 'opacity-100 cursor-pointer' : 'opacity-25 pointer-events-none'
                }`}
                title="Próximo Momento Litúrgico"
                aria-label="Próximo Momento"
              >
                <FastForward className="w-4 h-4 sm:w-5 sm:h-5 drop-shadow-[0_0_6px_rgba(221,185,107,0.3)]" fill="currentColor" />
                <span className="text-[8px] sm:text-[9px] font-cinzel mt-0.5 tracking-wider opacity-80 leading-none">
                  Momento
                </span>
              </button>
            </div>
          </div>

          {/* Botão Central Circular Play/Pause (76x76px) com Anéis Dourados Concêntricos */}
          <button
            type="button"
            onClick={() => {
              feedbackTatil.acaoMedia();
              onPlayPause();
            }}
            style={{
              width: 76,
              height: 76,
              minWidth: 76,
              minHeight: 76,
              maxWidth: 76,
              maxHeight: 76,
              borderRadius: '9999px',
              flexShrink: 0,
            }}
            className={`relative z-10 border-2 rounded-full flex items-center justify-center transition-all duration-200 active:scale-95 shadow-xl bg-[#070F1E]
              ${
                tocando
                  ? 'border-[#DDB96B] shadow-[0_0_25px_rgba(221,185,107,0.45)]'
                  : 'border-[#DDB96B]/80 hover:border-[#DDB96B] shadow-[0_0_15px_rgba(0,0,0,0.7)]'
              }
            `}
            title={tocando ? 'Pausar música ritualística' : 'Tocar música ritualística'}
            aria-label={tocando ? 'Pausar' : 'Tocar'}
          >
            {/* Anel dourado fino concêntrico interno */}
            <div
              className="absolute rounded-full border border-[#DDB96B]/50 pointer-events-none"
              style={{ inset: 4, borderRadius: '9999px' }}
            />

            {/* Ícone Play/Pause dourado maciço */}
            <div className="flex items-center justify-center">
              {tocando ? (
                <Pause
                  className="w-8 h-8 text-[#DDB96B] fill-[#DDB96B] drop-shadow-[0_0_8px_rgba(221,185,107,0.7)]"
                />
              ) : (
                <Play
                  className="w-8 h-8 text-[#DDB96B] fill-[#DDB96B] ml-1 drop-shadow-[0_0_8px_rgba(221,185,107,0.7)]"
                />
              )}
            </div>
          </button>
        </div>

        {/* Linha Compacta de Botões de Apoio: Orientação, Surdina e Informação do Próximo */}
        <div className="w-full max-w-[340px] sm:max-w-[380px] flex items-center justify-between gap-1.5 sm:gap-2 mt-1 px-1 shrink-0">
          {/* Botão 1: Orientação ao Mestre de Harmonia */}
          <button
            type="button"
            onClick={() => {
              feedbackTatil.clique();
              setModalOrientacaoAberto(true);
            }}
            className="flex-1 flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-xl bg-blue-950/50 hover:bg-blue-900/60 border border-blue-500/35 text-blue-300 transition-all shadow-sm active:scale-95 truncate"
            title="Abrir orientação ritualística do momento atual"
          >
            <Compass className="w-3.5 h-3.5 shrink-0" />
            <span className="text-[10px] sm:text-xs font-semibold tracking-wide truncate">
              Orientação
            </span>
          </button>

          {/* Botão 2: Surdina (limitação configurável de volume) */}
          <div className="flex-1 flex items-center rounded-xl overflow-hidden border shadow-sm transition-all">
            <button
              type="button"
              onClick={() => {
                feedbackTatil.acaoMedia();
                onAlternarSurdina();
              }}
              className={`flex-1 flex items-center justify-center gap-1 py-1.5 pl-2 pr-1 transition-all active:scale-95 truncate ${
                surdinaAtiva
                  ? 'bg-amber-500/25 text-amber-300 font-bold border-r border-amber-400/40'
                  : 'bg-white/5 text-slate-300 hover:text-white hover:bg-white/10 border-r border-white/10'
              }`}
              title={
                surdinaAtiva
                  ? `Surdina ATIVA (volume em ${percentualSurdina}%). Toque para desligar.`
                  : `Surdina DESLIGADA. Toque para limitar a ${percentualSurdina}%.`
              }
            >
              {surdinaAtiva ? (
                <Volume1 className="w-3.5 h-3.5 shrink-0 text-amber-300 animate-pulse" />
              ) : (
                <Volume2 className="w-3.5 h-3.5 shrink-0 text-slate-400" />
              )}
              <span className="text-[10px] sm:text-xs tracking-wide truncate">
                {surdinaAtiva ? `Surdina ${percentualSurdina}%` : 'Surdina Off'}
              </span>
            </button>

            {/* Atalho de calibragem da Surdina */}
            <button
              type="button"
              onClick={() => {
                feedbackTatil.clique();
                setModalSurdinaAberto(true);
              }}
              className={`p-1.5 transition-colors shrink-0 ${
                surdinaAtiva
                  ? 'bg-amber-500/30 text-amber-300 hover:bg-amber-500/40'
                  : 'bg-white/5 text-slate-400 hover:text-white hover:bg-white/10'
              }`}
              title="Calibrar percentual do volume de Surdina"
            >
              <Sliders className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Botão 3: Informação do Próximo Evento Litúrgico (Ícone de Interrogação / Ajuda) */}
          <button
            type="button"
            onClick={() => {
              feedbackTatil.clique();
              setModalProximoAberto(true);
            }}
            disabled={!proximoMomento}
            className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-xl border transition-all shadow-sm active:scale-95 truncate ${
              proximoMomento
                ? 'bg-macaonico-dourado/15 hover:bg-macaonico-dourado/25 border-macaonico-dourado/40 text-macaonico-dourado'
                : 'bg-white/5 border-white/10 text-slate-500 opacity-50 cursor-not-allowed'
            }`}
            title={proximoMomento ? 'Consultar informações do próximo evento ritualístico' : 'Último momento da esteira'}
          >
            <HelpCircle className="w-3.5 h-3.5 shrink-0" />
            <span className="text-[10px] sm:text-xs font-semibold tracking-wide truncate">
              Próximo?
            </span>
          </button>

          {/* Indicador sutil de Nível de Volume Master (clique para abrir controle fino) */}
          <button
            type="button"
            onClick={() => setSliderVolumeAberto((v) => !v)}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/15 text-[10px] font-mono font-bold text-slate-300 hover:text-macaonico-dourado transition-all shrink-0 active:scale-95"
            title="Toque para abrir controle deslizante do volume master"
          >
            <Sliders className="w-3.5 h-3.5 text-macaonico-dourado/80 shrink-0" />
            <span>{volumeGeral}%</span>
          </button>
        </div>

        {/* Popover / Slider expansível de Volume Geral */}
        {sliderVolumeAberto && (
          <div className="w-full max-w-[390px] sm:max-w-[430px] mt-1.5 p-2.5 rounded-xl bg-[#091224] border border-macaonico-dourado/30 flex items-center gap-3 animate-in fade-in zoom-in-95 duration-150">
            <Volume className="w-4 h-4 text-macaonico-dourado shrink-0" />
            <input
              type="range"
              min={0}
              max={100}
              step={1}
              value={volumeGeral}
              onChange={(e) => onAlterarVolumeGeral(Number(e.target.value))}
              className="w-full accent-macaonico-dourado h-1.5 bg-slate-700 rounded-lg cursor-pointer"
            />
            <span className="text-xs font-mono font-bold text-macaonico-dourado w-9 text-right shrink-0">
              {volumeGeral}%
            </span>
            <button
              type="button"
              onClick={() => setSliderVolumeAberto(false)}
              className="p-1 text-slate-400 hover:text-white"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>

      {/* Modal 1: Orientação ao Mestre de Harmonia */}
      {modalOrientacaoAberto &&
        createPortal(
          <div
            style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 10000 }}
            className="flex items-center justify-center p-3 sm:p-5 bg-black/80 backdrop-blur-md animate-in fade-in duration-200"
          >
            <div className="bg-[#0A1428] border border-blue-500/35 rounded-2xl w-full max-w-md max-h-[85dvh] flex flex-col shadow-[0_25px_60px_rgba(0,0,0,0.95)] overflow-hidden">
              {/* Topo do Modal */}
              <div className="flex items-center justify-between p-4 border-b border-blue-500/20 bg-[#0E1C36] shrink-0">
                <div className="flex items-center gap-2.5 min-w-0 pr-2">
                  <div className="w-8 h-8 rounded-lg bg-blue-500/15 border border-blue-500/30 flex items-center justify-center text-blue-300 shrink-0">
                    <Compass className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-xs font-mono uppercase tracking-wider text-blue-300 font-bold">
                      Orientação Litúrgica
                    </h3>
                    <p className="text-sm font-bold text-white truncate">
                      {momentoAtual ? `#${momentoAtual.posicao} • ${momentoAtual.evento_nome}` : 'Momento Litúrgico'}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setModalOrientacaoAberto(false)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors shrink-0"
                  title="Fechar"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Corpo com a Orientação */}
              <div className="p-4 sm:p-5 overflow-y-auto space-y-4 text-xs sm:text-sm text-slate-200 leading-relaxed min-h-0">
                <div className="rounded-xl bg-[#070F1E] border border-blue-500/20 p-3.5 space-y-2">
                  <span className="text-[10px] font-mono uppercase tracking-wider text-blue-300 font-bold block">
                    Instrução ao Mestre de Harmonia
                  </span>
                  <p className="whitespace-pre-line text-slate-200">
                    {orientacaoAtual}
                  </p>
                </div>

                {momentoAtual?.evento_descricao && (
                  <div className="rounded-xl bg-white/5 border border-white/10 p-3 space-y-1">
                    <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 font-bold block">
                      Descrição do Rito
                    </span>
                    <p className="text-xs text-slate-300 leading-normal">
                      {momentoAtual.evento_descricao}
                    </p>
                  </div>
                )}

                {/* Banner de status e calibragem da Surdina */}
                <div className="rounded-xl bg-amber-500/10 border border-amber-400/30 p-3 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2 min-w-0">
                    <Volume1 className="w-4 h-4 text-amber-300 shrink-0" />
                    <span className="text-xs text-slate-200 truncate">
                      Surdina calibrada em {percentualSurdina}% do volume:
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => setModalSurdinaAberto(true)}
                      className="px-2 py-1 rounded-lg text-xs font-semibold bg-white/10 text-amber-300 hover:bg-white/20"
                      title="Calibrar volume"
                    >
                      Ajustar
                    </button>
                    <button
                      type="button"
                      onClick={onAlternarSurdina}
                      className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                        surdinaAtiva
                          ? 'bg-amber-400 text-black shadow-sm'
                          : 'bg-white/10 text-slate-300 hover:text-white'
                      }`}
                    >
                      {surdinaAtiva ? 'Ativa' : 'Desativada'}
                    </button>
                  </div>
                </div>
              </div>

              {/* Rodapé com botão Fechar */}
              <div className="p-3 bg-[#0E1C36]/80 border-t border-blue-500/20 flex justify-end shrink-0">
                <button
                  type="button"
                  onClick={() => setModalOrientacaoAberto(false)}
                  className="px-4 py-2 rounded-xl bg-blue-600/25 hover:bg-blue-600/35 border border-blue-500/40 text-blue-200 font-bold text-xs transition-colors"
                >
                  Fechar
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}

      {/* Modal 2: Informação do Próximo Evento Litúrgico */}
      {modalProximoAberto &&
        proximoMomento &&
        createPortal(
          <div
            style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 10000 }}
            className="flex items-center justify-center p-3 sm:p-5 bg-black/80 backdrop-blur-md animate-in fade-in duration-200"
          >
            <div className="bg-[#0b1220] border border-macaonico-dourado/40 rounded-2xl w-full max-w-md max-h-[85dvh] flex flex-col shadow-[0_25px_60px_rgba(0,0,0,0.95)] overflow-hidden">
              {/* Topo do Modal */}
              <div className="flex items-center justify-between p-4 border-b border-macaonico-dourado/20 bg-[#0e1728] shrink-0">
                <div className="flex items-center gap-2.5 min-w-0 pr-2">
                  <div className="w-8 h-8 rounded-lg bg-macaonico-dourado/15 border border-macaonico-dourado/30 flex items-center justify-center text-macaonico-dourado shrink-0">
                    <BookOpen className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-xs font-mono uppercase tracking-wider text-macaonico-dourado font-bold">
                      Informações do Próximo Evento
                    </h3>
                    <p className="text-sm font-bold text-white truncate">
                      #{proximoMomento.posicao} • {proximoMomento.evento_nome}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setModalProximoAberto(false)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors shrink-0"
                  title="Fechar"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Corpo com Informações do Próximo Momento */}
              <div className="p-4 sm:p-5 overflow-y-auto space-y-3.5 text-xs sm:text-sm text-slate-200 leading-relaxed min-h-0">
                <div className="rounded-xl bg-[#060c18] border border-macaonico-dourado/25 p-3.5 space-y-1.5">
                  <span className="text-[10px] font-mono uppercase tracking-wider text-macaonico-dourado font-bold block">
                    Instrução Ritualística
                  </span>
                  <p className="whitespace-pre-line text-slate-200">
                    {orientacaoProximo}
                  </p>
                </div>

                {proximoMomento.musica_sorteada && (
                  <div className="rounded-xl bg-white/5 border border-white/10 p-3 flex items-center gap-2.5">
                    <Music className="w-4 h-4 text-macaonico-dourado shrink-0" />
                    <div className="min-w-0 flex-1">
                      <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 font-bold block">
                        Faixa Sorteada Pronta
                      </span>
                      <p className="text-xs font-semibold text-white truncate">
                        {proximoMomento.musica_sorteada.titulo}
                        {proximoMomento.musica_sorteada.autor_artista ? ` • ${proximoMomento.musica_sorteada.autor_artista}` : ''}
                      </p>
                    </div>
                  </div>
                )}

                <div className="text-[11px] text-slate-400 italic">
                  Total de faixas elegíveis para este momento: {proximoMomento.total_musicas_disponiveis}.
                </div>
              </div>

              {/* Rodapé com botões de Ação */}
              <div className="p-3 bg-[#0e1728]/70 border-t border-macaonico-dourado/20 flex items-center justify-between gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => setModalProximoAberto(false)}
                  className="px-3.5 py-2 rounded-xl text-xs text-slate-400 hover:text-white transition-colors"
                >
                  Fechar
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setModalProximoAberto(false);
                    onNextMoment();
                  }}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-macaonico-dourado hover:bg-yellow-400 text-black font-bold text-xs transition-colors shadow-md"
                >
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span>Avançar para Este Momento</span>
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}

      {/* Modal 3: Calibragem do Volume de Surdina para a Aparelhagem da Loja */}
      {modalSurdinaAberto &&
        createPortal(
          <div
            style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 10000 }}
            className="flex items-center justify-center p-3 sm:p-5 bg-black/80 backdrop-blur-md animate-in fade-in duration-200"
          >
            <div className="bg-[#0f172a] border border-amber-400/40 rounded-2xl w-full max-w-sm flex flex-col shadow-[0_25px_60px_rgba(0,0,0,0.95)] overflow-hidden">
              {/* Topo do Modal */}
              <div className="flex items-center justify-between p-4 border-b border-amber-400/20 bg-[#1e293b] shrink-0">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-amber-400/15 border border-amber-400/30 flex items-center justify-center text-amber-300 shrink-0">
                    <Sliders className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-xs font-mono uppercase tracking-wider text-amber-300 font-bold">
                      Calibragem de Surdina
                    </h3>
                    <p className="text-xs text-slate-300">
                      Volume de fundo para oratória
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setModalSurdinaAberto(false)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors shrink-0"
                  title="Fechar"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Corpo com Slider e Presets de Volume */}
              <div className="p-4 sm:p-5 space-y-4">
                <p className="text-xs text-slate-300 leading-relaxed">
                  Defina o percentual de atenuação acústica ideal para o templo e potência dos seus amplificadores:
                </p>

                {/* Display Numérico Gigante do Volume */}
                <div className="flex flex-col items-center justify-center p-4 rounded-xl bg-black/40 border border-amber-400/30 text-center">
                  <span className="text-4xl font-extrabold text-amber-300 font-mono tracking-tight drop-shadow-[0_0_12px_rgba(251,191,36,0.4)]">
                    {percentualSurdina}%
                  </span>
                  <span className="text-[10px] font-mono uppercase tracking-widest text-slate-400 mt-1">
                    Volume Efetivo em Surdina
                  </span>
                </div>

                {/* Slider Gradual de 1% a 50% */}
                <div className="space-y-1.5">
                  <div className="flex justify-between text-[10px] font-mono text-slate-400">
                    <span>1% (Super Leve)</span>
                    <span>25% (Padrão)</span>
                    <span>50%</span>
                  </div>
                  <input
                    type="range"
                    min={1}
                    max={50}
                    step={1}
                    value={percentualSurdina}
                    onChange={(e) => onAlterarPercentualSurdina(Number(e.target.value))}
                    className="w-full accent-amber-400 h-2 bg-slate-700 rounded-lg cursor-pointer"
                  />
                </div>

                {/* Presets Rápidos: 3%, 5%, 10%, 15%, 25% */}
                <div className="space-y-1">
                  <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 block">
                    Predefinições Rápidas:
                  </span>
                  <div className="grid grid-cols-5 gap-1.5">
                    {[3, 5, 10, 15, 25].map((val) => (
                      <button
                        key={val}
                        type="button"
                        onClick={() => {
                          feedbackTatil.clique();
                          onAlterarPercentualSurdina(val);
                        }}
                        className={`py-1.5 rounded-lg text-xs font-mono font-bold transition-all ${
                          percentualSurdina === val
                            ? 'bg-amber-400 text-black shadow-md'
                            : 'bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10'
                        }`}
                      >
                        {val}%
                      </button>
                    ))}
                  </div>
                </div>

                {/* Configuração Permanente para o Momento Litúrgico */}
                {momentoAtual && onAlternarMomentoSurdinaPermanente && (
                  <div className="pt-2 border-t border-white/10 space-y-1.5">
                    <span className="text-[10px] font-mono uppercase tracking-wider text-amber-300 font-bold block">
                      Memorização para este Roteiro
                    </span>
                    <label className="flex items-start gap-2.5 p-2.5 rounded-xl bg-black/40 border border-white/10 cursor-pointer hover:border-amber-400/40 transition-colors">
                      <input
                        type="checkbox"
                        checked={Boolean(momentoAtual.em_surdina)}
                        onChange={(e) => {
                          feedbackTatil.acaoMedia();
                          onAlternarMomentoSurdinaPermanente(e.target.checked);
                        }}
                        className="mt-0.5 accent-amber-400 h-4 w-4 rounded cursor-pointer shrink-0"
                      />
                      <div className="min-w-0 flex-1">
                        <span className="text-xs font-semibold text-white block">
                          Definir momento "{momentoAtual.evento_nome}" como Surdina
                        </span>
                        <span className="text-[11px] text-slate-400 block leading-tight mt-0.5">
                          Sempre que este momento ritualístico for executado, o volume iniciará automaticamente em Surdina ({percentualSurdina}%), independentemente de qual música for sorteada.
                        </span>
                      </div>
                    </label>
                  </div>
                )}
              </div>

              {/* Rodapé com botão Fechar */}
              <div className="p-3 bg-[#1e293b]/70 border-t border-amber-400/20 flex justify-end shrink-0">
                <button
                  type="button"
                  onClick={() => setModalSurdinaAberto(false)}
                  className="px-4 py-2 rounded-xl bg-amber-400 text-black font-bold text-xs transition-colors shadow-sm hover:bg-amber-300"
                >
                  Concluir Calibragem
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
};
