import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { ListOrdered } from 'lucide-react';
import { SessaoPlayerExecucao, Musica } from '../../compartilhado/tipos';
import clienteHttp from '../../compartilhado/api/cliente_http';
import { useTenant } from '../../compartilhado/contextos/ContextoTenant';
import { extrairIdYoutube } from '../../compartilhado/formatadores/midia';

import { MasonicTimeline } from './componentes/MasonicTimeline';
import { MasonicTrackList } from './componentes/MasonicTrackList';
import { MasonicControls } from './componentes/MasonicControls';
import { ModalUploadMusica } from '../musicas/ModalUploadMusica';

declare global {
  interface Window {
    YT: any;
    onYouTubeIframeAPIReady: any;
  }
}

interface SessaoLojaResumo {
  id: string;
  nome_personalizado: string;
}

/**
 * Console do Player Sequencial Ritualístico (Mobile-First & Desktop).
 * Proporciona condução ágil dos momentos da sessão com linha do tempo superior,
 * lista central rolável de faixas e controles táteis ergonômicos na base.
 */
export const PaginaPlayerHarmonia: React.FC = () => {
  const navigate = useNavigate();
  const { lojaAtiva } = useTenant();
  const [searchParams, setSearchParams] = useSearchParams();
  const sessaoParamId = searchParams.get('sessao');

  const [sessoes, setSessoes] = useState<SessaoLojaResumo[]>([]);
  const [sessaoSelecionadaId, setSessaoSelecionadaId] = useState<string>(sessaoParamId || '');
  const [dadosSessao, setDadosSessao] = useState<SessaoPlayerExecucao | null>(null);
  const [carregandoSessao, setCarregandoSessao] = useState(false);

  const [indiceAtual, setIndiceAtual] = useState(0);
  const [modalUploadAberto, setModalUploadAberto] = useState(false);
  const [musicasDoMomento, setMusicasDoMomento] = useState<Musica[]>([]);

  // Estado de reprodução de áudio
  const [tocando, setTocando] = useState(false);
  const [tempoAtual, setTempoAtual] = useState(0);
  const [duracaoTotal, setDuracaoTotal] = useState(0);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const ytPlayerRef = useRef<any>(null);

  useEffect(() => {
    const tag = document.createElement('script');
    tag.src = 'https://www.youtube.com/iframe_api';
    const firstScriptTag = document.getElementsByTagName('script')[0];
    if (firstScriptTag && firstScriptTag.parentNode) {
      firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);
    }
  }, []);

  useEffect(() => {
    if (lojaAtiva?.id) {
      carregarSessoes(lojaAtiva.id);
    }
  }, [lojaAtiva?.id]);

  useEffect(() => {
    if (sessaoParamId && sessaoParamId !== sessaoSelecionadaId) {
      setSessaoSelecionadaId(sessaoParamId);
    }
  }, [sessaoParamId]);

  useEffect(() => {
    if (sessaoSelecionadaId) {
      carregarEsteira(sessaoSelecionadaId);
    } else if (sessoes.length > 0) {
      const primeiraId = sessoes[0].id;
      setSessaoSelecionadaId(primeiraId);
      setSearchParams({ sessao: primeiraId }, { replace: true });
    }
  }, [sessaoSelecionadaId, sessoes]);

  const carregarSessoes = async (lojaId: string) => {
    try {
      const res = await clienteHttp.get<SessaoLojaResumo[]>(`/sessoes/loja/${lojaId}`);
      setSessoes(res.data);
    } catch (e) {
      console.error('Erro ao carregar sessões da loja no player:', e);
    }
  };

  const carregarEsteira = async (idSessao: string) => {
    try {
      setCarregandoSessao(true);
      const res = await clienteHttp.get<SessaoPlayerExecucao>(`/player/sessao/${idSessao}`);
      setDadosSessao(res.data);
      if (res.data.esteira_ritualistica.length > 0) {
        setIndiceAtual(0);
      }
    } catch (e) {
      console.error('Erro ao carregar esteira da sessão:', e);
    } finally {
      setCarregandoSessao(false);
    }
  };

  useEffect(() => {
    if (!dadosSessao || !dadosSessao.esteira_ritualistica[indiceAtual]) return;
    const momento = dadosSessao.esteira_ritualistica[indiceAtual];
    // Preenche imediatamente com as candidatas já retornadas pela esteira enquanto busca a lista completa
    if (momento.candidatas && momento.candidatas.length > 0) {
      setMusicasDoMomento(momento.candidatas);
    }
    carregarMusicasDoMomento(momento.evento_id, momento.candidatas || []);
  }, [indiceAtual, dadosSessao]);

  const carregarMusicasDoMomento = async (eventoId: string, fallbackCandidatas: Musica[]) => {
    try {
      const res = await clienteHttp.get<Musica[]>(`/musicas?evento_id=${eventoId}`);
      if (res.data && res.data.length > 0) {
        setMusicasDoMomento(res.data);
      } else {
        setMusicasDoMomento(fallbackCandidatas);
      }
    } catch {
      setMusicasDoMomento(fallbackCandidatas);
    }
  };

  const momentoAtual = dadosSessao?.esteira_ritualistica[indiceAtual];
  const musicaAtual = momentoAtual?.musica_sorteada;

  // Sincroniza a fonte de áudio ao trocar a música ativa
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    setTocando(false);
    setTempoAtual(0);
    setDuracaoTotal(0);

    if (musicaAtual) {
      if (musicaAtual.tipo_midia === 'ARQUIVO_LOCAL' && musicaAtual.caminho_arquivo) {
        let caminho = musicaAtual.caminho_arquivo;
        if (!caminho.startsWith('http') && !caminho.startsWith('/')) {
          caminho = '/' + caminho;
        }
        audio.src = caminho;
        audio.volume = 1.0;
        audio.currentTime = 0;
        audio.pause();
        if (musicaAtual.duracao_segundos) setDuracaoTotal(musicaAtual.duracao_segundos);
      } else {
        audio.pause();
        audio.src = '';
        if (musicaAtual.duracao_segundos) setDuracaoTotal(musicaAtual.duracao_segundos);
      }
    } else {
      audio.pause();
      audio.src = '';
    }
  }, [musicaAtual]);

  const alternarPlayPause = () => {
    if (!musicaAtual) return;

    if (musicaAtual.tipo_midia === 'ARQUIVO_LOCAL') {
      const audio = audioRef.current;
      if (!audio) return;
      if (tocando) {
        audio.pause();
        setTocando(false);
      } else {
        audio.play().then(() => setTocando(true)).catch(() => setTocando(false));
      }
    } else if (musicaAtual.tipo_midia === 'YOUTUBE' && ytPlayerRef.current) {
      if (tocando) {
        ytPlayerRef.current.pauseVideo();
      } else {
        ytPlayerRef.current.playVideo();
      }
    }
  };

  const aoTerminarMusica = () => {
    const audio = audioRef.current;
    if (audio) audio.pause();
    setTocando(false);
    setTempoAtual(0);
    avancarProximo();
  };

  const avancarProximo = () => {
    if (!dadosSessao) return;
    if (indiceAtual < dadosSessao.esteira_ritualistica.length - 1) {
      setIndiceAtual(indiceAtual + 1);
    }
  };

  const voltarAnterior = () => {
    if (indiceAtual > 0) {
      setIndiceAtual(indiceAtual - 1);
    }
  };

  const pularFaixa = () => {
    if (!musicaAtual || musicasDoMomento.length <= 1) return;
    const idx = musicasDoMomento.findIndex((m) => m.id === musicaAtual.id);
    const proxIdx = (idx + 1) % musicasDoMomento.length;
    selecionarMusicaDaLista(proxIdx);
  };

  const voltarFaixa = () => {
    if (!musicaAtual || musicasDoMomento.length <= 1) return;
    const idx = musicasDoMomento.findIndex((m) => m.id === musicaAtual.id);
    const prevIdx = idx <= 0 ? musicasDoMomento.length - 1 : idx - 1;
    selecionarMusicaDaLista(prevIdx);
  };

  const selecionarMusicaDaLista = (idx: number) => {
    if (!dadosSessao || !musicasDoMomento[idx]) return;
    const musicaEscolhida = musicasDoMomento[idx];

    // Se clicou na música que já está selecionada, apenas alterna Play/Pause
    if (musicaAtual?.id === musicaEscolhida.id) {
      alternarPlayPause();
      return;
    }

    const novaSessao = { ...dadosSessao };
    novaSessao.esteira_ritualistica[indiceAtual].musica_sorteada = musicaEscolhida;
    setDadosSessao(novaSessao);

    setTimeout(() => {
      setTocando(true);
      if (musicaEscolhida.tipo_midia === 'ARQUIVO_LOCAL' && audioRef.current) {
        audioRef.current.play().catch(() => {});
      } else if (ytPlayerRef.current) {
        ytPlayerRef.current.playVideo();
      }
    }, 100);
  };

  const onSeek = (novoTempo: number) => {
    if (musicaAtual?.tipo_midia === 'ARQUIVO_LOCAL' && audioRef.current) {
      audioRef.current.currentTime = novoTempo;
      setTempoAtual(novoTempo);
    } else if (musicaAtual?.tipo_midia === 'YOUTUBE' && ytPlayerRef.current) {
      try {
        ytPlayerRef.current.seekTo(novoTempo, true);
        setTempoAtual(novoTempo);
      } catch {}
    }
  };

  const indiceTrackAtivo = musicasDoMomento.findIndex((m) => m.id === musicaAtual?.id);
  const safeIndiceTrack = indiceTrackAtivo >= 0 ? indiceTrackAtivo : 0;
  const progressoPercentual = duracaoTotal > 0 ? (tempoAtual / duracaoTotal) * 100 : 0;

  return (
    <div className="h-full w-full flex flex-col bg-macaonico-surface overflow-hidden text-slate-100 relative">
      {/* Textura global sutil */}
      <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/black-scales.png')] opacity-20 pointer-events-none z-0"></div>

      {/* Áudio HTML5 nativo */}
      <audio
        ref={audioRef}
        onTimeUpdate={() => {
          const cur = audioRef.current?.currentTime || 0;
          setTempoAtual(cur);
          const dur = audioRef.current?.duration;
          if (dur && !isNaN(dur) && dur > 0 && dur !== duracaoTotal) {
            setDuracaoTotal(dur);
          }
        }}
        onLoadedMetadata={() => {
          const dur = audioRef.current?.duration;
          if (dur && !isNaN(dur) && dur > 0) setDuracaoTotal(dur);
        }}
        onEnded={aoTerminarMusica}
      />

      {/* Barra superior compacta de seleção de Sessão */}
      <div className="relative z-20 flex items-center justify-between gap-2 px-3 sm:px-6 py-2 bg-[#070e1c]/90 border-b border-macaonico-dourado/20 shrink-0">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <ListOrdered className="w-4 h-4 text-macaonico-dourado shrink-0" />
          <select
            value={sessaoSelecionadaId}
            onChange={(e) => {
              const novoId = e.target.value;
              setSessaoSelecionadaId(novoId);
              setSearchParams({ sessao: novoId });
            }}
            aria-label="Selecionar Sessão Ritualística"
            className="bg-sigma-surface/90 text-slate-100 text-xs sm:text-sm font-medium border border-macaonico-dourado/30 rounded-lg px-2.5 py-1.5 w-full max-w-xs focus:outline-none focus:border-macaonico-dourado truncate"
          >
            {sessoes.length === 0 && <option value="">Nenhum roteiro cadastrado</option>}
            {sessoes.map((s) => (
              <option key={s.id} value={s.id}>
                {s.nome_personalizado}
              </option>
            ))}
          </select>
        </div>

        {dadosSessao && dadosSessao.esteira_ritualistica.length > 0 && (
          <span className="text-[11px] sm:text-xs font-cinzel text-macaonico-dourado/90 shrink-0 bg-macaonico-dourado/10 border border-macaonico-dourado/30 px-2.5 py-1 rounded-full">
            Momento {indiceAtual + 1}/{dadosSessao.esteira_ritualistica.length}
          </span>
        )}
      </div>

      {/* Eixo Superior: Linha do Tempo de Momentos */}
      {dadosSessao && dadosSessao.esteira_ritualistica.length > 0 ? (
        <MasonicTimeline
          momentos={dadosSessao.esteira_ritualistica}
          indiceAtual={indiceAtual}
          tocando={tocando}
          onMudarMomento={setIndiceAtual}
        />
      ) : (
        !carregandoSessao && (
          <div className="flex-1 flex flex-col items-center justify-center p-6 text-center z-10">
            <ListOrdered className="w-12 h-12 text-macaonico-dourado/50 mb-3" />
            <h2 className="text-lg font-cinzel text-macaonico-dourado font-bold">
              Nenhum Roteiro Selecionado
            </h2>
            <p className="text-xs sm:text-sm text-slate-400 max-w-md mt-1 mb-4">
              Importe um template padrão do Rito na aba de Sessões para iniciar a condução musical.
            </p>
            <button
              onClick={() => navigate('/sessoes')}
              className="bg-macaonico-dourado text-black font-bold px-5 py-2.5 rounded-xl text-sm hover:bg-yellow-400 transition-colors"
            >
              Ir para Sessões
            </button>
          </div>
        )
      )}

      {/* Eixo Central: Lista de Faixas do Momento Atual */}
      {dadosSessao && dadosSessao.esteira_ritualistica.length > 0 && (
        <div className="flex-1 min-h-0 overflow-hidden relative flex flex-col">
          <MasonicTrackList
            musicas={musicasDoMomento}
            indiceAtivo={safeIndiceTrack}
            tocando={tocando}
            onSelecionarMusica={selecionarMusicaDaLista}
            onAbrirUpload={() => setModalUploadAberto(true)}
            progressoPercentual={progressoPercentual}
          />
        </div>
      )}

      {/* Eixo Inferior: Controles Táteis */}
      <div className="shrink-0 bg-macaonico-surface relative z-30">
        <MasonicControls
          tocando={tocando}
          onPlayPause={alternarPlayPause}
          onPrevTrack={voltarFaixa}
          onNextTrack={pularFaixa}
          onPrevMoment={voltarAnterior}
          onNextMoment={avancarProximo}
          tempoAtual={tempoAtual}
          duracaoTotal={duracaoTotal}
          onSeek={onSeek}
        />
      </div>

      {/* Iframe Oculto para reprodução YouTube */}
      {musicaAtual?.tipo_midia === 'YOUTUBE' && musicaAtual.link_externo && (
        <div className="hidden">
          <iframe
            id="yt-player-hidden"
            title="Reprodutor YouTube Harmonia"
            src={`https://www.youtube.com/embed/${extrairIdYoutube(musicaAtual.link_externo)}?enablejsapi=1&autoplay=0&controls=0`}
            allow="autoplay"
          ></iframe>
        </div>
      )}

      {/* Modal de Upload Rápido */}
      {modalUploadAberto && dadosSessao && (
        <ModalUploadMusica
          eventoIdPreSelecionado={dadosSessao.esteira_ritualistica[indiceAtual]?.evento_id}
          onFechar={() => setModalUploadAberto(false)}
          onSalvo={async () => {
            const momento = dadosSessao.esteira_ritualistica[indiceAtual];
            if (momento) {
              const resp = await clienteHttp.get<Musica[]>('/musicas', {
                params: { evento_id: momento.evento_id },
              });
              setMusicasDoMomento(resp.data);
            }
          }}
        />
      )}
    </div>
  );
};
