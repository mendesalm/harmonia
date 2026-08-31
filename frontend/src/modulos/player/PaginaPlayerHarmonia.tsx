import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Play, Pause, SkipBack, Shuffle, Volume2, VolumeX,
  Sparkles, Music, Disc, ListMusic, Layers, ChevronRight, CheckCircle2,
  PlusCircle, UploadCloud, Youtube, Clock, SlidersHorizontal, Radio, ExternalLink,
  Bluetooth, BatteryCharging, Wifi, ChevronDown
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
  const [seletorSessaoAberto, setSeletorSessaoAberto] = useState(false);

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

  // Rastreamento contínuo do andamento do YouTube
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
        setTocando(false);
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

  // Cálculo da porcentagem do anel radial de progresso (SVG circular)
  const progressoPercentual = duracaoTotal > 0 ? Math.min(1, Math.max(0, tempoAtual / duracaoTotal)) : 0;
  const raioCirculo = 88;
  const circunferencia = 2 * Math.PI * raioCirculo;
  const strokeDashoffset = circunferencia - (progressoPercentual * circunferencia);

  // Manipulador de clique no anel circular
  const manipularCliqueRadial = (e: React.MouseEvent<SVGSVGElement>) => {
    if (duracaoTotal <= 0) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    const x = e.clientX - centerX;
    const y = e.clientY - centerY;
    
    // Calcula ângulo a partir do topo (-90 graus)
    let angulo = Math.atan2(y, x) * (180 / Math.PI) + 90;
    if (angulo < 0) angulo += 360;

    const novaFracao = angulo / 360;
    const novoTempo = novaFracao * duracaoTotal;

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

  // Duração total estimada da playlist do momento
  const tempoTotalMomentoFormatado = React.useMemo(() => {
    const totalSeg = musicasDoMomento.reduce((acc, m) => acc + (m.duracao_segundos || 180), 0);
    const min = Math.floor(totalSeg / 60);
    const seg = Math.floor(totalSeg % 60);
    return `${min < 10 ? '0' : ''}${min}:${seg < 10 ? '0' : ''}${seg}`;
  }, [musicasDoMomento]);

  return (
    <div className="min-h-screen bg-[#040811] text-slate-100 flex flex-col items-center justify-start pb-16 pt-2 px-3 selection:bg-cyan-500 selection:text-black">
      
      {/* Elemento de Áudio HTML5 para Arquivos Locais */}
      <audio
        ref={audioRef}
        onTimeUpdate={() => setTempoAtual(audioRef.current?.currentTime || 0)}
        onLoadedMetadata={() => setDuracaoTotal(audioRef.current?.duration || 0)}
        onEnded={aoTerminarMusica}
        className="hidden"
      />

      {/* Container Oculto do YouTube Player */}
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

      {/* Container Principal Mobile/Deck (HUD Cyber-Maçônico) */}
      <div className="w-full max-w-md sm:max-w-lg flex flex-col gap-4">

        {/* 1. BARRA SUPERIOR HUD // STATUS DO SISTEMA */}
        <div className="flex items-center justify-between px-2 pt-1 text-[11px] font-mono tracking-widest text-[#00E5FF]">
          <div className="flex items-center gap-2">
            <span className="inline-block w-2.5 h-2.5 bg-[#00E5FF] rotate-45 shadow-[0_0_8px_#00E5FF]" />
            <span className="font-bold">SYS.ONLINE // HARMONIA</span>
          </div>

          <div className="flex items-center gap-3 text-slate-400">
            <span className="text-[10px] text-slate-500 hidden sm:inline">RITO {dadosSessao?.sessao_nome?.split('-')[1] || 'REAA'}</span>
            <Bluetooth className="w-3.5 h-3.5 text-cyan-400/80" />
            <BatteryCharging className="w-4 h-4 text-[#00E5FF]" />
          </div>
        </div>

        {/* Seletor Rápido de Sessão / Ritual (Menu Suspenso Compacto) */}
        <div className="relative">
          <button
            onClick={() => setSeletorSessaoAberto(!seletorSessaoAberto)}
            className="w-full bg-[#091424]/90 hover:bg-[#0d1d33] border border-cyan-500/20 hover:border-cyan-500/40 rounded-2xl px-4 py-2.5 flex items-center justify-between transition-all shadow-[0_0_15px_rgba(0,229,255,0.06)]"
          >
            <div className="flex items-center gap-2.5 truncate">
              <Layers className="w-4 h-4 text-[#00E5FF] shrink-0" />
              <span className="text-xs font-bold text-white font-mono uppercase truncate">
                {dadosSessao?.sessao_nome || 'Selecione uma Sessão'}
              </span>
            </div>
            <ChevronDown className={`w-4 h-4 text-cyan-400 transition-transform ${seletorSessaoAberto ? 'rotate-180' : ''}`} />
          </button>

          {seletorSessaoAberto && (
            <div className="absolute top-full left-0 right-0 mt-1.5 z-40 bg-[#07111f] border border-cyan-500/30 rounded-2xl shadow-2xl p-2 max-h-56 overflow-y-auto backdrop-blur-xl">
              {sessoes.map((s) => (
                <button
                  key={s.id}
                  onClick={() => {
                    setSessaoSelecionadaId(s.id);
                    setSearchParams({ sessao: s.id });
                    setSeletorSessaoAberto(false);
                  }}
                  className={`w-full text-left px-3 py-2 rounded-xl text-xs font-mono transition-colors flex items-center justify-between ${
                    s.id === sessaoSelecionadaId
                      ? 'bg-cyan-500/20 text-[#00E5FF] font-bold border border-cyan-500/30'
                      : 'text-slate-300 hover:bg-white/5'
                  }`}
                >
                  <span className="truncate">{s.nome}</span>
                  <span className="text-[10px] text-slate-400 shrink-0 ml-2">{s.rito} - G{s.grau}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* 2. CARD LITÚRGICO CYBER-MAÇÔNICO (HERO + TRACKLIST INTEGRADA) */}
        {momentoAtual && (
          <div className="rounded-[28px] bg-[#070e1b] border border-cyan-500/35 p-3 sm:p-4 shadow-[0_0_35px_rgba(0,229,255,0.14)] flex flex-col gap-3 relative overflow-hidden backdrop-blur-md">
            
            {/* Linha de reflexo decorativa no topo do card */}
            <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-[#00E5FF] to-transparent opacity-50" />

            {/* HERO BANNER: ARTE LÍQUIDA / TEXTURA CYBER COM TÍTULO DO MOMENTO */}
            <div className="relative w-full h-32 sm:h-36 rounded-2xl overflow-hidden p-4 flex flex-col justify-end border border-cyan-500/20 shadow-inner">
              
              {/* Fundo com Gradiente Líquido & Ondas de Energia */}
              <div 
                className="absolute inset-0 bg-gradient-to-br from-[#02182b] via-[#04324f] to-[#011424] opacity-95"
              />
              
              {/* Efeito de Ondas Fluídicas / SVG Mesh */}
              <svg className="absolute inset-0 w-full h-full opacity-40 mix-blend-screen pointer-events-none" xmlns="http://www.w3.org/2000/svg">
                <defs>
                  <linearGradient id="cyberGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#00E5FF" stopOpacity="0.8" />
                    <stop offset="50%" stopColor="#005b82" stopOpacity="0.3" />
                    <stop offset="100%" stopColor="#00E5FF" stopOpacity="0.9" />
                  </linearGradient>
                </defs>
                <path d="M-100,50 Q100,120 300,40 T700,70 L700,200 L-100,200 Z" fill="url(#cyberGrad)" />
                <path d="M-50,80 Q150,20 350,90 T750,40 L750,200 L-50,200 Z" fill="#00E5FF" opacity="0.15" />
              </svg>

              {/* Conteúdo Tipográfico Superior (Display Font) */}
              <div className="relative z-10">
                <span className="text-[10px] font-mono tracking-widest text-cyan-300/90 uppercase font-semibold mb-1 block">
                  {String(momentoAtual.posicao).padStart(2, '0')} // MOMENTO RITUALÍSTICO
                </span>

                <h2 className="text-lg sm:text-xl font-black text-white font-mono uppercase tracking-wider leading-tight drop-shadow-md truncate">
                  {momentoAtual.evento_nome}
                </h2>

                <div className="flex items-center gap-2 mt-2 font-mono text-[11px] font-bold text-[#00E5FF] tracking-wider">
                  <span>{musicasDoMomento.length} {musicasDoMomento.length === 1 ? 'TRACK' : 'TRACKS'}</span>
                  <span className="text-cyan-500/60">//</span>
                  <span>{tempoTotalMomentoFormatado}</span>
                </div>
              </div>
            </div>

            {/* TRACKLIST: LISTA DE FAIXAS LITÚRGICAS DISPONÍVEIS */}
            <div className="flex flex-col gap-1.5 max-h-52 overflow-y-auto pr-1">
              {musicasDoMomento.length === 0 ? (
                <div className="py-5 px-3 rounded-2xl bg-white/[0.03] border border-white/5 text-center flex flex-col items-center gap-2">
                  <p className="text-xs font-mono text-slate-400 italic">
                    [ SILÊNCIO PROGRAMADO / NENHUMA FAIXA CATALOGADA ]
                  </p>
                  <button
                    onClick={() => setModalUploadAberto(true)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-cyan-500/15 hover:bg-cyan-500/25 text-[#00E5FF] border border-cyan-500/30 text-[11px] font-mono font-bold transition-all cursor-pointer"
                  >
                    <PlusCircle className="w-3.5 h-3.5" />
                    <span>+ CATALOGAR FAIXA</span>
                  </button>
                </div>
              ) : (
                musicasDoMomento.map((musica, index) => {
                  const estaAtiva = musicaAtual?.id === musica.id;
                  const numeroFaixa = String(index + 1).padStart(2, '0');

                  return (
                    <div
                      key={musica.id}
                      onClick={() => selecionarMusicaManualmente(musica.id)}
                      className={`p-2.5 sm:p-3 rounded-2xl cursor-pointer transition-all flex items-center justify-between border ${
                        estaAtiva
                          ? 'bg-cyan-500/15 border-cyan-500/50 shadow-[0_0_15px_rgba(0,229,255,0.1)] text-[#00E5FF]'
                          : 'bg-white/[0.02] border-white/5 hover:bg-white/[0.06] text-slate-300'
                      }`}
                    >
                      <div className="flex flex-col min-w-0 pr-2">
                        <div className="flex items-center gap-2">
                          <span className={`text-xs font-mono font-black ${estaAtiva ? 'text-[#00E5FF]' : 'text-slate-400'}`}>
                            {numeroFaixa} // {musica.titulo.toUpperCase()}
                          </span>
                        </div>

                        <span className="text-[11px] font-mono text-slate-400 truncate mt-0.5">
                          {musica.autor_artista || 'Compositor Tradicional'}
                        </span>
                      </div>

                      <div className="shrink-0 flex items-center gap-2">
                        {estaAtiva ? (
                          /* Equalizador Visual Animado na Faixa Ativa */
                          <div className="flex items-end gap-0.5 h-4 px-2 py-0.5 rounded-lg bg-cyan-500/20 border border-cyan-500/30">
                            {[0.6, 1, 0.4, 0.9].map((alt, i) => (
                              <span
                                key={i}
                                className={`w-1 rounded-full bg-[#00E5FF] ${tocando ? 'animate-pulse' : 'h-1.5'}`}
                                style={{
                                  height: tocando ? `${alt * 100}%` : '40%',
                                  animationDuration: `${0.3 + (i % 3) * 0.2}s`
                                }}
                              />
                            ))}
                          </div>
                        ) : (
                          <span className="text-[11px] font-mono text-slate-500">
                            {formatarTempo(musica.duracao_segundos || 180)}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

          </div>
        )}

        {/* 3. RADIAL DIAL PLAYER (DISCO CENTRAL COM ANEL DE PROGRESSO NEON) */}
        <div className="flex flex-col items-center justify-center py-4 relative">
          
          {/* Luz difusa de fundo */}
          <div className="absolute w-44 h-44 bg-[#00E5FF]/10 rounded-full blur-3xl pointer-events-none" />

          <div className="relative w-56 h-56 flex items-center justify-center">
            
            {/* SVG Circular Radial Progress Ring */}
            <svg
              className="w-full h-full -rotate-90 cursor-pointer drop-shadow-[0_0_12px_rgba(0,229,255,0.4)]"
              viewBox="0 0 200 200"
              onClick={manipularCliqueRadial}
            >
              {/* Trilho base escuro */}
              <circle
                cx="100"
                cy="100"
                r={raioCirculo}
                className="stroke-slate-800/80"
                strokeWidth="6"
                fill="transparent"
              />

              {/* Arco de Progresso Ativo em Neon Cyan */}
              <circle
                cx="100"
                cy="100"
                r={raioCirculo}
                className="stroke-[#00E5FF] transition-all duration-150"
                strokeWidth="6"
                strokeDasharray={circunferencia}
                strokeDashoffset={strokeDashoffset}
                strokeLinecap="round"
                fill="transparent"
              />
            </svg>

            {/* Botão Central de Play / Pause (Disco Cyber) */}
            <button
              onClick={alternarPlayPause}
              disabled={!musicaAtual}
              className={`absolute w-28 h-28 rounded-full flex items-center justify-center transition-all cursor-pointer disabled:opacity-40 border ${
                tocando
                  ? 'bg-gradient-to-b from-[#08182b] to-[#040e1c] border-[#00E5FF] shadow-[0_0_30px_rgba(0,229,255,0.5)] text-[#00E5FF]'
                  : 'bg-gradient-to-b from-[#091523] to-[#030914] border-cyan-500/40 hover:border-[#00E5FF] shadow-[0_0_20px_rgba(0,229,255,0.2)] text-white hover:text-[#00E5FF]'
              }`}
              title={tocando ? "Pausar Execução" : "Iniciar Reprodução"}
            >
              {/* Efeito de anel interno */}
              <div className="absolute inset-2 rounded-full border border-cyan-500/20" />
              
              {tocando ? (
                <Pause className="w-10 h-10 fill-current drop-shadow-[0_0_8px_#00E5FF]" />
              ) : (
                <Play className="w-10 h-10 fill-current ml-1 drop-shadow-[0_0_8px_#00E5FF]" />
              )}
            </button>
          </div>

          {/* Leitura de Tempo & Status Maçônico */}
          <div className="flex flex-col items-center gap-1 mt-1 font-mono text-center">
            <div className="flex items-center gap-2 text-xs">
              <span className="text-[#00E5FF] font-bold tracking-widest">{formatarTempo(tempoAtual)}</span>
              <span className="text-slate-600">//</span>
              <span className="text-slate-400">{formatarTempo(duracaoTotal)}</span>
            </div>

            <span className={`text-[10px] font-bold tracking-widest uppercase px-2.5 py-0.5 rounded-full border ${
              tocando
                ? 'text-emerald-300 bg-emerald-500/10 border-emerald-500/30 animate-pulse'
                : 'text-amber-300 bg-amber-500/10 border-amber-500/30'
            }`}>
              {tocando ? '● EXECUTANDO EM TEMPLO' : '○ EM PAUSA // AGUARDANDO COMANDO'}
            </span>
          </div>
        </div>

        {/* 4. DOCK DE CONTROLES DO MESTRE & ESTEIRA RITUALÍSTICA */}
        <div className="rounded-3xl bg-[#070e1b] border border-cyan-500/20 p-4 shadow-xl flex flex-col gap-3">
          
          {/* Botões de Ação Ritualística */}
          <div className="flex items-center justify-between gap-2">
            
            {/* Voltar Momento */}
            <button
              onClick={voltarAnterior}
              disabled={indiceAtual === 0}
              className="p-3 rounded-2xl bg-white/[0.04] hover:bg-white/[0.08] text-slate-300 hover:text-white disabled:opacity-30 border border-white/5 transition-all cursor-pointer font-mono text-xs flex items-center gap-1.5"
              title="Momento Anterior"
            >
              <SkipBack className="w-4 h-4 text-cyan-400" />
              <span className="hidden sm:inline">ANTERIOR</span>
            </button>

            {/* Suavizar e Avançar (Fade Out) */}
            <button
              onClick={aplicarFadeOutEAvançar}
              disabled={!dadosSessao || indiceAtual >= dadosSessao.esteira_ritualistica.length - 1}
              className="flex-1 py-3 px-4 rounded-2xl bg-gradient-to-r from-amber-500/90 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-black font-mono font-black text-xs transition-all shadow-[0_0_20px_rgba(245,158,11,0.25)] cursor-pointer flex items-center justify-center gap-1.5 disabled:opacity-30"
              title="Fade out e avanço para o próximo momento litúrgico"
            >
              <span>{fadeAtivo ? 'FADE OUT...' : 'PRÓXIMO MOMENTO'}</span>
              <ChevronRight className="w-4 h-4" />
            </button>

            {/* Sortear Outra Faixa */}
            <button
              onClick={resortearMusicaAtual}
              disabled={(momentoAtual?.total_musicas_disponiveis ?? 0) <= 1}
              className="p-3 rounded-2xl bg-white/[0.04] hover:bg-white/[0.08] text-slate-300 hover:text-white disabled:opacity-30 border border-white/5 transition-all cursor-pointer font-mono text-xs flex items-center gap-1.5"
              title="Sortear outra faixa aleatória"
            >
              <Shuffle className="w-4 h-4 text-[#00E5FF]" />
              <span className="hidden sm:inline">SORTEAR</span>
            </button>

            {/* Adicionar Faixa */}
            <button
              onClick={() => setModalUploadAberto(true)}
              className="p-3 rounded-2xl bg-white/[0.04] hover:bg-white/[0.08] text-[#00E5FF] border border-cyan-500/20 transition-all cursor-pointer font-mono text-xs flex items-center gap-1.5"
              title="Upload / Converter YouTube 320k"
            >
              <UploadCloud className="w-4 h-4" />
              <span className="hidden sm:inline">+ ADD</span>
            </button>
          </div>

          {/* Esteira de Navegação por Momentos (Tags Horizontais) */}
          {dadosSessao && (
            <div className="flex gap-2 overflow-x-auto pb-1 pt-1 scrollbar-none">
              {dadosSessao.esteira_ritualistica.map((m, idx) => {
                const ativo = idx === indiceAtual;
                const concluido = idx < indiceAtual;
                return (
                  <button
                    key={`${m.evento_id}-${idx}`}
                    onClick={() => {
                      setIndiceAtual(idx);
                      setTocando(false);
                    }}
                    className={`shrink-0 px-3 py-1.5 rounded-xl font-mono text-[10px] font-bold border transition-all ${
                      ativo
                        ? 'bg-[#00E5FF] text-black border-[#00E5FF] shadow-[0_0_12px_rgba(0,229,255,0.4)]'
                        : concluido
                        ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20'
                        : 'bg-white/[0.03] text-slate-400 border-white/5 hover:bg-white/[0.08]'
                    }`}
                  >
                    {String(idx + 1).padStart(2, '0')} // {m.evento_nome.split(' ')[0].toUpperCase()}
                  </button>
                );
              })}
            </div>
          )}

          {/* Controle de Volume */}
          <div className="flex items-center justify-between gap-3 pt-2 border-t border-white/5">
            <button
              onClick={() => setMudo(!mudo)}
              className="text-slate-400 hover:text-[#00E5FF] transition-colors"
            >
              {mudo || volume === 0 ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4 text-[#00E5FF]" />}
            </button>

            <div className="relative flex-1 flex items-center">
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
                className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-[#00E5FF]"
              />
            </div>

            <span className="text-[10px] font-mono text-slate-400 w-9 text-right">
              {Math.round((mudo ? 0 : volume) * 100)}%
            </span>
          </div>

        </div>

      </div>

      {/* Modal de Upload / Conversor YouTube para MP3 320k */}
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
