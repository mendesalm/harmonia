import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Play, Pause, SkipBack, Shuffle, Volume2, VolumeX,
  Sparkles, Music, Disc, ListMusic, Layers, ChevronRight, CheckCircle2,
  PlusCircle, UploadCloud, Youtube, Clock, SlidersHorizontal, Radio, ExternalLink
} from 'lucide-react';
import { Sessao, SessaoPlayerExecucao, MomentoExecucao, MusicaSorteada, Musica } from '../../compartilhado/tipos';
import clienteHttp from '../../compartilhado/api/cliente_http';
import { useTenant } from '../../compartilhado/contextos/ContextoTenant';
import { ModalUploadMusica } from '../musicas/ModalUploadMusica';
import { extrairIdYoutube, extrairEmbedSpotify } from '../../compartilhado/formatadores/midia';

declare global {
  interface Window {
    YT: any;
    onYouTubeIframeAPIReady: any;
  }
}

export const PaginaPlayerHarmonia: React.FC = () => {
  const { lojaAtiva } = useTenant();
  const [searchParams, setSearchParams] = useSearchParams();
  const sessaoParamId = searchParams.get('sessao');

  const [sessoes, setSessoes] = useState<Sessao[]>([]);
  const [sessaoSelecionadaId, setSessaoSelecionadaId] = useState<string>(sessaoParamId || '');
  const [dadosSessao, setDadosSessao] = useState<SessaoPlayerExecucao | null>(null);
  const [indiceAtual, setIndiceAtual] = useState(0);
  const [carregandoSessao, setCarregandoSessao] = useState(false);

  // Lista de todas as músicas disponíveis para o momento litúrgico ativo (para seleção manual)
  const [musicasDoMomento, setMusicasDoMomento] = useState<Musica[]>([]);
  const [carregandoMusicasMomento, setCarregandoMusicasMomento] = useState(false);

  // Refs para evitar stale closures em eventos assíncronos de término de música
  const dadosSessaoRef = useRef<SessaoPlayerExecucao | null>(null);
  dadosSessaoRef.current = dadosSessao;

  const indiceAtualRef = useRef<number>(0);
  indiceAtualRef.current = indiceAtual;

  // Modal de Upload Direto do Player
  const [modalUploadAberto, setModalUploadAberto] = useState(false);

  // Estados de Reprodução de Áudio (Inicialmente SEMPRE em PAUSA)
  const [tocando, setTocando] = useState(false);
  const [volume, setVolume] = useState(0.85);
  const [mudo, setMudo] = useState(false);
  const [tempoAtual, setTempoAtual] = useState(0);
  const [duracaoTotal, setDuracaoTotal] = useState(0);
  const [fadeAtivo, setFadeAtivo] = useState(false);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const ytPlayerRef = useRef<any>(null);
  const carrosselRef = useRef<HTMLDivElement | null>(null);

  // Carrega lista de sessões disponíveis
  useEffect(() => {
    const carregarSessoes = async () => {
      if (!lojaAtiva) return;
      try {
        const resp = await clienteHttp.get<Sessao[]>('/sessoes', {
          params: { organizacao_id: lojaAtiva.id, apenas_ativas: true }
        });
        setSessoes(resp.data);
        if (!sessaoSelecionadaId && resp.data.length > 0) {
          setSessaoSelecionadaId(resp.data[0].id);
        }
      } catch (err) {
        console.error('Erro ao carregar sessões para o player:', err);
      }
    };
    carregarSessoes();
  }, [lojaAtiva]);

  // Carrega esteira da sessão com músicas sorteadas
  const carregarEsteira = async () => {
    if (!sessaoSelecionadaId) {
      setDadosSessao(null);
      return;
    }

    try {
      setCarregandoSessao(true);
      const resp = await clienteHttp.get<SessaoPlayerExecucao>(`/player/sessao/${sessaoSelecionadaId}`);
      setDadosSessao(resp.data);
      setIndiceAtual(0);
      setTocando(false); // Inicialmente em pausa
    } catch (err) {
      console.error('Erro ao carregar esteira do player:', err);
    } finally {
      setCarregandoSessao(false);
    }
  };

  useEffect(() => {
    setIndiceAtual(0);
    setTocando(false);
    carregarEsteira();
  }, [sessaoSelecionadaId]);

  // Momento Litúrgico Ativo
  const momentoAtual: MomentoExecucao | undefined = dadosSessao?.esteira_ritualistica[indiceAtual];
  const musicaAtual: MusicaSorteada | null | undefined = momentoAtual?.musica_sorteada;

  const youtubeVideoId = musicaAtual?.tipo_midia === 'YOUTUBE' ? extrairIdYoutube(musicaAtual.link_externo) : null;
  const spotifyEmbedUrl = musicaAtual?.tipo_midia === 'SPOTIFY' ? extrairEmbedSpotify(musicaAtual.link_externo) : null;

  // Carrega lista completa de músicas da playlist do momento atual para o seletor manual
  useEffect(() => {
    const buscarMusicasMomento = async () => {
      if (!momentoAtual || !lojaAtiva) {
        setMusicasDoMomento([]);
        return;
      }

      try {
        setCarregandoMusicasMomento(true);
        const resp = await clienteHttp.get<Musica[]>('/musicas', {
          params: {
            evento_id: momentoAtual.evento_id,
            organizacao_id: lojaAtiva.id,
            apenas_ativas: true
          }
        });
        setMusicasDoMomento(resp.data);
      } catch (err) {
        console.error('Erro ao buscar músicas do momento litúrgico:', err);
      } finally {
        setCarregandoMusicasMomento(false);
      }
    };

    buscarMusicasMomento();
  }, [momentoAtual?.evento_id, lojaAtiva]);

  // Função para o Mestre selecionar manualmente uma faixa
  const selecionarMusicaManualmente = (musicaEscolhidaId: string) => {
    if (!dadosSessao || !momentoAtual) return;

    if (!musicaEscolhidaId) {
      // Opção de silêncio
      const novaEsteira = [...dadosSessao.esteira_ritualistica];
      novaEsteira[indiceAtual].musica_sorteada = null;
      setDadosSessao({ ...dadosSessao, esteira_ritualistica: novaEsteira });
      setTocando(false);
      setTempoAtual(0);
      setDuracaoTotal(0);
      return;
    }

    const escolhida = musicasDoMomento.find((m) => m.id === musicaEscolhidaId);
    if (!escolhida) return;

    const novaEsteira = [...dadosSessao.esteira_ritualistica];
    novaEsteira[indiceAtual].musica_sorteada = {
      id: escolhida.id,
      titulo: escolhida.titulo,
      autor_artista: escolhida.autor_artista,
      tipo_midia: escolhida.tipo_midia,
      caminho_arquivo: escolhida.caminho_arquivo,
      link_externo: escolhida.link_externo,
      duracao_segundos: escolhida.duracao_segundos,
    };

    setDadosSessao({ ...dadosSessao, esteira_ritualistica: novaEsteira });
    setTocando(false); // Mantém em pausa aguardando o comando
    setTempoAtual(0);
    setDuracaoTotal(escolhida.duracao_segundos || 0);
  };

  // REGRA: Ao terminar uma música, o sistema automaticamente seleciona o próximo evento (em pausa)
  const aoTerminarMusica = () => {
    const audio = audioRef.current;
    if (audio) {
      audio.pause();
    }

    const sessaoAtual = dadosSessaoRef.current;
    const idxAtual = indiceAtualRef.current;
    if (!sessaoAtual) return;

    if (idxAtual < sessaoAtual.esteira_ritualistica.length - 1) {
      setIndiceAtual(idxAtual + 1);
      setTocando(false); // O próximo evento fica preparado, porém em PAUSA aguardando a deixa
      setTempoAtual(0);
      setDuracaoTotal(0);
    } else {
      // Chegou ao último momento da sessão
      setTocando(false);
    }
  };

  // Ao trocar de momento ou música: PREPARA O ÁUDIO LOCAL, MAS MANTÉM EM PAUSA
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    setTocando(false); // REGRA: Ao acessar um evento, o player estará inicialmente em pausa
    setTempoAtual(0);

    if (musicaAtual && musicaAtual.tipo_midia === 'ARQUIVO_LOCAL' && musicaAtual.caminho_arquivo) {
      audio.src = musicaAtual.caminho_arquivo;
      audio.volume = mudo ? 0 : volume;
      audio.currentTime = 0;
      audio.pause();
      if (musicaAtual.duracao_segundos) setDuracaoTotal(musicaAtual.duracao_segundos);
    } else {
      audio.pause();
      audio.src = '';
      if (musicaAtual?.duracao_segundos) {
        setDuracaoTotal(musicaAtual.duracao_segundos);
      } else {
        setDuracaoTotal(0);
      }
    }
  }, [indiceAtual, musicaAtual?.id]);

  // Inicialização e controle invisível do YouTube IFrame Player
  useEffect(() => {
    if (musicaAtual?.tipo_midia !== 'YOUTUBE' || !youtubeVideoId) {
      if (ytPlayerRef.current) {
        try {
          ytPlayerRef.current.destroy();
        } catch {}
        ytPlayerRef.current = null;
      }
      return;
    }

    const inicializarYT = () => {
      if (!window.YT || !window.YT.Player) return;

      const container = document.getElementById('youtube-player-harmonia');
      if (!container) return;

      try {
        if (ytPlayerRef.current && typeof ytPlayerRef.current.loadVideoById === 'function') {
          ytPlayerRef.current.cueVideoById(youtubeVideoId);
          setTocando(false);
          setTempoAtual(0);
          return;
        }

        ytPlayerRef.current = new window.YT.Player('youtube-player-harmonia', {
          videoId: youtubeVideoId,
          playerVars: {
            autoplay: 0,
            controls: 0,
            rel: 0,
            modestbranding: 1,
            enablejsapi: 1,
          },
          events: {
            onReady: (event: any) => {
              event.target.pauseVideo();
              setTocando(false);
              const d = event.target.getDuration();
              if (d && d > 0) setDuracaoTotal(d);
            },
            onStateChange: (event: any) => {
              // 0 = YT.PlayerState.ENDED -> avança automaticamente para o próximo momento!
              if (event.data === 0) {
                aoTerminarMusica();
              } else if (event.data === 1) {
                setTocando(true);
                const d = event.target.getDuration();
                if (d && d > 0) setDuracaoTotal(d);
              } else if (event.data === 2) {
                setTocando(false);
              }
            },
          },
        });
      } catch (err) {
        console.warn('Erro ao inicializar YouTube Player:', err);
      }
    };

    const timer = setTimeout(() => {
      if (window.YT && window.YT.Player) {
        inicializarYT();
      } else {
        window.onYouTubeIframeAPIReady = inicializarYT;
      }
    }, 100);

    return () => clearTimeout(timer);
  }, [indiceAtual, youtubeVideoId]);

  // RASTREAMENTO CONTÍNUO DO ANDAMENTO DO YOUTUBE (Tempo atual e duração total)
  useEffect(() => {
    if (musicaAtual?.tipo_midia !== 'YOUTUBE' || !tocando) return;

    const intervalo = setInterval(() => {
      if (ytPlayerRef.current) {
        try {
          if (typeof ytPlayerRef.current.getCurrentTime === 'function') {
            const t = ytPlayerRef.current.getCurrentTime();
            setTempoAtual(t || 0);
          }
          if (typeof ytPlayerRef.current.getDuration === 'function') {
            const d = ytPlayerRef.current.getDuration();
            if (d && d > 0) setDuracaoTotal(d);
          }
        } catch (err) {
          console.warn('Erro ao ler tempo do YouTube:', err);
        }
      }
    }, 250);

    return () => clearInterval(intervalo);
  }, [musicaAtual?.tipo_midia, tocando, indiceAtual]);

  // Auto-scroll do Carrossel para centralizar o momento ativo
  useEffect(() => {
    if (carrosselRef.current && carrosselRef.current.children[indiceAtual]) {
      const cardAtivo = carrosselRef.current.children[indiceAtual] as HTMLElement;
      cardAtivo.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
        inline: 'center',
      });
    }
  }, [indiceAtual, dadosSessao]);

  // Manipulador de Clique na Barra de Progresso (busca tempo em áudio local e YouTube)
  const manipularCliqueProgresso = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const clique = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const novoTempo = clique * duracaoTotal;

    if (musicaAtual?.tipo_midia === 'ARQUIVO_LOCAL' && audioRef.current && duracaoTotal > 0) {
      audioRef.current.currentTime = novoTempo;
      setTempoAtual(novoTempo);
    } else if (musicaAtual?.tipo_midia === 'YOUTUBE' && ytPlayerRef.current && duracaoTotal > 0) {
      try {
        ytPlayerRef.current.seekTo(novoTempo, true);
        setTempoAtual(novoTempo);
      } catch (err) {
        console.warn('Erro ao buscar tempo no YouTube:', err);
      }
    }
  };

  // Funções de Controle de Play / Pause
  const alternarPlayPause = () => {
    if (!musicaAtual) return;

    if (musicaAtual.tipo_midia === 'ARQUIVO_LOCAL') {
      const audio = audioRef.current;
      if (!audio) return;

      if (tocando) {
        audio.pause();
        setTocando(false);
      } else {
        audio.play().then(() => setTocando(true)).catch((e) => {
          console.error('Erro ao reproduzir áudio:', e);
          setTocando(false);
        });
      }
    } else if (musicaAtual.tipo_midia === 'YOUTUBE') {
      if (ytPlayerRef.current && typeof ytPlayerRef.current.playVideo === 'function') {
        try {
          if (tocando) {
            ytPlayerRef.current.pauseVideo();
            setTocando(false);
          } else {
            ytPlayerRef.current.playVideo();
            setTocando(true);
          }
        } catch {
          setTocando(!tocando);
        }
      } else {
        setTocando(!tocando);
      }
    } else {
      setTocando(!tocando);
    }
  };

  const aplicarFadeOutEAvançar = () => {
    const audio = audioRef.current;
    if (!audio || !tocando || musicaAtual?.tipo_midia !== 'ARQUIVO_LOCAL') {
      avancarProximo();
      return;
    }

    setFadeAtivo(true);
    let volAtual = audio.volume;
    const intervalo = setInterval(() => {
      volAtual = Math.max(0, volAtual - 0.15);
      audio.volume = volAtual;
      if (volAtual <= 0.05) {
        clearInterval(intervalo);
        audio.pause();
        audio.volume = volume;
        setFadeAtivo(false);
        avancarProximo();
      }
    }, 150);
  };

  const avancarProximo = () => {
    if (!dadosSessao) return;
    if (indiceAtual < dadosSessao.esteira_ritualistica.length - 1) {
      setIndiceAtual(indiceAtual + 1);
      setTocando(false); // O próximo evento inicia em pausa
      setTempoAtual(0);
      setDuracaoTotal(0);
    }
  };

  const voltarAnterior = () => {
    if (indiceAtual > 0) {
      setIndiceAtual(indiceAtual - 1);
      setTocando(false); // O evento anterior inicia em pausa
      setTempoAtual(0);
      setDuracaoTotal(0);
    }
  };

  const resortearMusicaAtual = async () => {
    if (!momentoAtual || !lojaAtiva) return;

    try {
      const resp = await clienteHttp.get<MusicaSorteada>(`/player/sortear-musica/${momentoAtual.evento_id}`, {
        params: {
          organizacao_id: lojaAtiva.id,
          musica_atual_id: musicaAtual?.id
        }
      });

      if (resp.data && dadosSessao) {
        const novaEsteira = [...dadosSessao.esteira_ritualistica];
        novaEsteira[indiceAtual].musica_sorteada = resp.data;
        setDadosSessao({ ...dadosSessao, esteira_ritualistica: novaEsteira });
        setTocando(false); // Mantém em pausa após sortear outra
        setTempoAtual(0);
        setDuracaoTotal(resp.data.duracao_segundos || 0);
      }
    } catch (err) {
      console.error('Erro ao re-sortear música:', err);
    }
  };

  const formatarTempo = (segundos: number) => {
    if (isNaN(segundos) || segundos <= 0) return '0:00';
    const min = Math.floor(segundos / 60);
    const seg = Math.floor(segundos % 60);
    return `${min}:${seg < 10 ? '0' : ''}${seg}`;
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      {/* Elemento de Áudio HTML5 para Arquivos Locais */}
      <audio
        ref={audioRef}
        onTimeUpdate={() => setTempoAtual(audioRef.current?.currentTime || 0)}
        onLoadedMetadata={() => setDuracaoTotal(audioRef.current?.duration || 0)}
        onEnded={aoTerminarMusica}
        className="hidden"
      />

      {/* Container Oculto do YouTube Player (executa áudio de fundo sem mostrar vídeo) */}
      <div
        id="youtube-player-harmonia"
        style={{
          position: 'absolute',
          width: '1px',
          height: '1px',
          top: '-9999px',
          left: '-9999px',
          opacity: 0,
          pointerEvents: 'none'
        }}
      />

      {/* Barra Superior de Seleção do Ritual */}
      <div className="vidro-escuro rounded-3xl p-5 mb-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4 border border-white/10 shadow-xl">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-macaonico-cianoSigma/30 to-primaria-700/50 border border-macaonico-cianoSigma/40 flex items-center justify-center text-macaonico-cianoSigma shadow-lg shadow-cyan-500/10">
            <Layers className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[11px] font-bold text-macaonico-cianoSigma uppercase tracking-wider">
              Ritual Maçônico em Execução
            </span>
            <h1 className="text-xl font-bold text-white fonte-ritual">
              {dadosSessao?.sessao_nome || 'Selecione uma Sessão'}
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto">
          <select
            value={sessaoSelecionadaId}
            onChange={(e) => {
              setSessaoSelecionadaId(e.target.value);
              setSearchParams({ sessao: e.target.value });
            }}
            aria-label="Selecionar Ritual do Dia"
            className="w-full md:w-80 bg-primaria-800 border border-white/15 rounded-2xl px-4 py-2.5 text-sm font-semibold text-white focus:border-macaonico-cianoSigma outline-none cursor-pointer"
          >
            <option value="">-- Selecione o Ritual do Dia --</option>
            {sessoes.map((s) => (
              <option key={s.id} value={s.id}>
                {s.nome} ({s.rito} - Grau {s.grau})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Carrossel Ritualístico (Esteira de Momentos) */}
      <div className="mb-6 relative">
        <div className="flex items-center justify-between mb-2 px-1">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
            <ListMusic className="w-3.5 h-3.5 text-macaonico-cianoSigma" /> Esteira Ritualística
          </span>
          <span className="text-xs text-slate-400 font-medium">
            Momento {indiceAtual + 1} de {dadosSessao?.esteira_ritualistica.length || 0}
          </span>
        </div>

        <div
          ref={carrosselRef}
          className="flex gap-3 overflow-x-auto pb-3 pt-1 scroll-smooth scrollbar-none"
        >
          {carregandoSessao ? (
            <div className="py-8 text-center text-slate-400 w-full">Carregando esteira ritualística...</div>
          ) : !dadosSessao || dadosSessao.esteira_ritualistica.length === 0 ? (
            <div className="py-8 text-center text-slate-400 w-full vidro-escuro rounded-2xl">
              Nenhum momento configurado para esta sessão.
            </div>
          ) : (
            dadosSessao.esteira_ritualistica.map((momento, idx) => {
              const ativo = idx === indiceAtual;
              const concluido = idx < indiceAtual;

              return (
                <div
                  key={`${momento.evento_id}-${idx}`}
                  onClick={() => {
                    setIndiceAtual(idx);
                    setTocando(false); // Ao clicar em qualquer momento, acessa em PAUSA
                  }}
                  className={`shrink-0 w-64 p-4 rounded-2xl cursor-pointer transition-all border ${
                    ativo
                      ? 'bg-gradient-to-b from-primaria-800 to-primaria-900 border-macaonico-cianoSigma shadow-lg shadow-cyan-500/20 scale-[1.02]'
                      : concluido
                      ? 'bg-white/5 border-white/5 opacity-70 hover:opacity-90'
                      : 'bg-primaria-800/40 border-white/5 hover:border-white/20'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                        ativo
                          ? 'bg-macaonico-cianoSigma text-black'
                          : concluido
                          ? 'bg-emerald-500/20 text-emerald-300'
                          : 'bg-white/10 text-slate-400'
                      }`}
                    >
                      {idx + 1}º Momento
                    </span>

                    {concluido && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />}
                    {ativo && <Disc className={`w-3.5 h-3.5 text-macaonico-cianoSigma ${tocando ? 'animate-spin' : ''}`} />}
                  </div>

                  <h4 className="text-sm font-bold text-white truncate mb-1">
                    {momento.evento_nome}
                  </h4>

                  <p className="text-xs text-slate-400 truncate flex items-center gap-1">
                    <Music className="w-3 h-3 text-macaonico-cianoSigma shrink-0" />
                    {momento.musica_sorteada?.titulo || '(Silêncio Programado)'}
                  </p>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Palco Central do Now Playing (Interface de Áudio Pura e Minimalista) */}
      {momentoAtual && (
        <div className="vidro-destaque rounded-3xl p-6 lg:p-10 border border-white/15 relative overflow-hidden shadow-2xl">
          
          {/* Fundo Decorativo */}
          <div className="absolute -right-16 -bottom-16 w-80 h-80 bg-macaonico-cianoSigma/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -left-16 -top-16 w-80 h-80 bg-macaonico-dourado/10 rounded-full blur-3xl pointer-events-none" />

          <div className="relative z-10 max-w-4xl mx-auto flex flex-col items-center text-center">
            
            {/* Tag do Momento Litúrgico & Status de Reprodução */}
            <div className="flex items-center gap-2 mb-4 flex-wrap justify-center">
              <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/10 border border-white/15 text-xs font-bold text-macaonico-cianoSigma">
                <Sparkles className="w-3.5 h-3.5" />
                <span>{momentoAtual.posicao}º MOMENTO RITUALÍSTICO</span>
              </span>

              <span
                className={`text-[11px] font-bold px-3 py-1 rounded-full border flex items-center gap-1.5 ${
                  tocando
                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30 animate-pulse'
                    : 'bg-amber-500/15 text-amber-300 border-amber-500/30'
                }`}
              >
                <Clock className="w-3 h-3" />
                {tocando ? 'Executando em Templo' : 'Em Pausa • Aguardando Comando'}
              </span>
            </div>

            {/* Nome do Evento */}
            <h2 className="text-3xl lg:text-4xl font-black text-white fonte-ritual tracking-wide mb-3">
              {momentoAtual.evento_nome}
            </h2>

            {/* BARRA DE SELEÇÃO MANUAL DE MÚSICA DO MOMENTO */}
            <div className="w-full max-w-lg mb-6 bg-primaria-800/90 border border-white/15 rounded-2xl p-3 shadow-lg flex flex-col gap-1.5 text-left">
              <div className="flex items-center justify-between px-1">
                <label
                  htmlFor="seletor-musica-manual"
                  className="text-[11px] font-bold text-macaonico-cianoSigma uppercase tracking-wider flex items-center gap-1.5"
                >
                  <SlidersHorizontal className="w-3.5 h-3.5" />
                  Escolha Manual da Música ({musicasDoMomento.length} {musicasDoMomento.length === 1 ? 'faixa disponível' : 'faixas disponíveis'})
                </label>
                {musicaAtual && (
                  <span className="text-[10px] text-slate-400 font-medium">
                    {musicasDoMomento.some(m => m.id === musicaAtual.id) ? 'Trilha Selecionada' : 'Trilha do Acervo'}
                  </span>
                )}
              </div>

              <select
                id="seletor-musica-manual"
                value={musicaAtual?.id || ''}
                disabled={carregandoMusicasMomento}
                onChange={(e) => selecionarMusicaManualmente(e.target.value)}
                className="w-full bg-primaria-900/90 border border-white/15 rounded-xl px-3 py-2 text-xs font-semibold text-white focus:border-macaonico-cianoSigma outline-none cursor-pointer disabled:opacity-50"
              >
                {musicasDoMomento.length === 0 ? (
                  <option value="">(Nenhuma música cadastrada para este momento)</option>
                ) : (
                  <>
                    <option value="">-- Selecione uma música específica da playlist --</option>
                    {musicasDoMomento.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.titulo} {m.autor_artista ? `• ${m.autor_artista}` : ''} ({m.tipo_midia === 'ARQUIVO_LOCAL' ? 'MP3 Local' : m.tipo_midia})
                      </option>
                    ))}
                  </>
                )}
              </select>
            </div>

            {/* Reprodutor Compacto Oficial do Spotify (quando Spotify é selecionado) */}
            {musicaAtual?.tipo_midia === 'SPOTIFY' && spotifyEmbedUrl && (
              <div className="w-full max-w-lg mb-6 rounded-2xl overflow-hidden border border-white/15 shadow-xl bg-black/60 p-2">
                <iframe
                  title={musicaAtual.titulo}
                  src={spotifyEmbedUrl}
                  width="100%"
                  height="80"
                  frameBorder="0"
                  allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
                  loading="lazy"
                  className="rounded-xl"
                />
                <div className="flex items-center justify-between px-3 pt-2 text-[11px] text-slate-400">
                  <span className="flex items-center gap-1 text-green-400 font-semibold">
                    <Radio className="w-3 h-3" /> Spotify Web Player
                  </span>
                  <a
                    href={musicaAtual.link_externo}
                    target="_blank"
                    rel="noreferrer"
                    className="text-slate-300 hover:text-green-400 transition-colors flex items-center gap-1"
                  >
                    Abrir no Spotify App <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </div>
            )}

            {/* Título, Artista e Badge do Formato de Áudio */}
            <div className="mb-4">
              {musicaAtual ? (
                <>
                  <div className="flex items-center justify-center gap-2 mb-1 flex-wrap">
                    <p className="text-xl lg:text-2xl font-bold text-macaonico-cianoSigma">
                      {musicaAtual.titulo}
                    </p>

                    {musicaAtual.tipo_midia === 'YOUTUBE' && (
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-red-500/15 text-red-300 border border-red-500/30">
                        <Youtube className="w-3 h-3 text-red-400" /> Áudio YouTube
                      </span>
                    )}

                    {musicaAtual.tipo_midia === 'ARQUIVO_LOCAL' && (
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                        <Disc className="w-3 h-3 text-emerald-400" /> MP3 Local
                      </span>
                    )}

                    {musicaAtual.tipo_midia === 'SPOTIFY' && (
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-green-500/15 text-green-300 border border-green-500/30">
                        <Radio className="w-3 h-3 text-green-400" /> Spotify Áudio
                      </span>
                    )}
                  </div>

                  <p className="text-sm text-slate-300">
                    {musicaAtual.autor_artista || 'Compositor Tradicional Maçônico'}
                  </p>
                </>
              ) : (
                <div className="flex flex-col items-center gap-2">
                  <p className="text-lg text-slate-400 italic">
                    (Silêncio Programado / Nenhuma música selecionada para este momento)
                  </p>
                  <button
                    onClick={() => setModalUploadAberto(true)}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl bg-macaonico-cianoSigma/15 hover:bg-macaonico-cianoSigma/25 text-macaonico-cianoSigma border border-macaonico-cianoSigma/30 text-xs font-bold transition-all cursor-pointer mt-2"
                  >
                    <PlusCircle className="w-4 h-4" />
                    <span>Catalogar Música para {momentoAtual.evento_nome}</span>
                  </button>
                </div>
              )}
            </div>

            {/* Equalizador Visual do Templo (Animação Suave durante a Execução) */}
            {tocando && (
              <div className="flex items-end justify-center gap-1.5 h-6 mb-4">
                {[0.6, 1, 0.4, 0.8, 0.5, 0.9, 0.3, 0.7, 1, 0.5, 0.8, 0.4].map((h, i) => (
                  <span
                    key={i}
                    className="w-1 bg-gradient-to-t from-macaonico-cianoSigma to-macaonico-dourado rounded-full animate-pulse"
                    style={{
                      height: `${h * 100}%`,
                      animationDuration: `${0.4 + (i % 4) * 0.2}s`,
                    }}
                  />
                ))}
              </div>
            )}

            {/* BARRA DE ANDAMENTO E PROGRESSO DA MÚSICA (Nativo MP3 + YouTube) */}
            {musicaAtual && (musicaAtual.tipo_midia === 'ARQUIVO_LOCAL' || musicaAtual.tipo_midia === 'YOUTUBE') && (
              <div className="w-full max-w-xl mb-6">
                <div
                  role="progressbar"
                  aria-valuenow={tempoAtual}
                  aria-valuemin={0}
                  aria-valuemax={duracaoTotal}
                  className="relative w-full h-2.5 bg-white/10 hover:bg-white/15 rounded-full overflow-hidden mb-2 cursor-pointer transition-colors group"
                  onClick={manipularCliqueProgresso}
                  title="Clique para avançar ou retroceder a música"
                >
                  <div
                    className="h-full bg-gradient-to-r from-macaonico-cianoSigma via-cyan-400 to-macaonico-dourado transition-all duration-100 rounded-full"
                    style={{ width: `${duracaoTotal > 0 ? Math.min(100, (tempoAtual / duracaoTotal) * 100) : 0}%` }}
                  />
                </div>
                <div className="flex items-center justify-between text-xs text-slate-400 font-mono px-1">
                  <span className="text-macaonico-cianoSigma font-semibold">{formatarTempo(tempoAtual)}</span>
                  <span>{duracaoTotal > 0 ? formatarTempo(duracaoTotal) : '--:--'}</span>
                </div>
              </div>
            )}

            {/* Controles Principais do Mestre de Harmonia */}
            <div className="flex items-center justify-center gap-4 sm:gap-6 flex-wrap mb-8">
              
              {/* Voltar Momento */}
              <button
                onClick={voltarAnterior}
                disabled={indiceAtual === 0}
                className="p-3.5 rounded-2xl bg-white/5 hover:bg-white/15 text-white disabled:opacity-30 transition-all cursor-pointer border border-white/10"
                title="Momento Anterior (Pausado)"
              >
                <SkipBack className="w-5 h-5" />
              </button>

              {/* Botão Play / Pause */}
              <button
                onClick={alternarPlayPause}
                disabled={!musicaAtual}
                className={`w-16 h-16 rounded-3xl flex items-center justify-center shadow-xl transition-all cursor-pointer disabled:opacity-40 ${
                  tocando
                    ? 'bg-macaonico-cianoSigma text-black shadow-cyan-500/30 hover:scale-105'
                    : 'bg-white hover:bg-slate-200 text-black shadow-white/20 hover:scale-105'
                }`}
              >
                {tocando ? <Pause className="w-7 h-7 fill-current" /> : <Play className="w-7 h-7 fill-current ml-1" />}
              </button>

              {/* Avançar / Fade Out */}
              <button
                onClick={aplicarFadeOutEAvançar}
                disabled={!dadosSessao || indiceAtual >= dadosSessao.esteira_ritualistica.length - 1}
                className="flex items-center gap-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-black font-bold px-5 py-3.5 rounded-2xl shadow-lg shadow-amber-500/20 transition-all cursor-pointer disabled:opacity-30"
                title="Suavizar áudio e avançar para o próximo momento litúrgico (em pausa)"
              >
                <span>{fadeAtivo ? 'Suavizando...' : 'Próximo Momento'}</span>
                <ChevronRight className="w-5 h-5" />
              </button>

              {/* Botão Re-sortear Música */}
              <button
                onClick={resortearMusicaAtual}
                disabled={momentoAtual.total_musicas_disponiveis <= 1}
                className="flex items-center gap-2 p-3.5 rounded-2xl bg-white/5 hover:bg-white/15 text-white border border-white/10 disabled:opacity-30 transition-all cursor-pointer"
                title="Sortear outra música aleatória desta playlist (inicia pausada)"
              >
                <Shuffle className="w-5 h-5 text-macaonico-cianoSigma" />
                <span className="text-xs font-semibold hidden sm:inline">Sortear Outra</span>
              </button>

              {/* Botão Catalogar Nova Música */}
              <button
                onClick={() => setModalUploadAberto(true)}
                className="flex items-center gap-2 p-3.5 rounded-2xl bg-white/5 hover:bg-white/15 text-white border border-white/10 transition-all cursor-pointer"
                title="Fazer Upload ou Vincular Streaming neste momento"
              >
                <UploadCloud className="w-5 h-5 text-macaonico-cianoSigma" />
                <span className="text-xs font-semibold hidden sm:inline">+ Adicionar Música</span>
              </button>
            </div>

            {/* Controle de Volume (para áudios locais) */}
            {musicaAtual?.tipo_midia === 'ARQUIVO_LOCAL' && (
              <div className="flex items-center gap-3 w-full max-w-xs bg-primaria-800/80 border border-white/10 rounded-2xl px-4 py-2">
                <button
                  onClick={() => setMudo(!mudo)}
                  className="text-slate-400 hover:text-white"
                >
                  {mudo || volume === 0 ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4 text-macaonico-cianoSigma" />}
                </button>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.01"
                  value={mudo ? 0 : volume}
                  onChange={(e) => {
                    const val = parseFloat(e.target.value);
                    setVolume(val);
                    setMudo(false);
                    if (audioRef.current) audioRef.current.volume = val;
                  }}
                  className="w-full h-1.5 bg-white/20 rounded-lg appearance-none cursor-pointer accent-macaonico-cianoSigma"
                />
                <span className="text-xs font-mono text-slate-400 w-8">
                  {Math.round((mudo ? 0 : volume) * 100)}%
                </span>
              </div>
            )}

          </div>
        </div>
      )}

      {/* Modal de Upload de Música aberto diretamente no Momento Atual */}
      {modalUploadAberto && momentoAtual && (
        <ModalUploadMusica
          eventoIdPreSelecionado={momentoAtual.evento_id}
          onFechar={() => setModalUploadAberto(false)}
          onSalvo={carregarEsteira}
        />
      )}
    </div>
  );
};
