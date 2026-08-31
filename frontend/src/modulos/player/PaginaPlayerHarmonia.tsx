import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Play, Pause, SkipBack, Shuffle, Volume2, VolumeX,
  ChevronRight, UploadCloud, Settings, Disc
} from 'lucide-react';
import { Sessao, SessaoPlayerExecucao, MomentoExecucao, MusicaSorteada, Musica } from '../../compartilhado/tipos';
import clienteHttp from '../../compartilhado/api/cliente_http';
import { useTenant } from '../../compartilhado/contextos/ContextoTenant';
import { ModalUploadMusica } from '../musicas/ModalUploadMusica';
import { ModalConfiguracoesPlayer } from './componentes/ModalConfiguracoesPlayer';
import { extrairIdYoutube } from '../../compartilhado/formatadores/midia';
import { Carrossel3DMomentos } from './componentes/Carrossel3DMomentos';

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

  // Lista de todas as músicas disponíveis para o momento litúrgico ativo
  const [musicasDoMomento, setMusicasDoMomento] = useState<Musica[]>([]);
  const [carregandoMusicasMomento, setCarregandoMusicasMomento] = useState(false);

  const dadosSessaoRef = useRef<SessaoPlayerExecucao | null>(null);
  dadosSessaoRef.current = dadosSessao;

  const indiceAtualRef = useRef<number>(0);
  indiceAtualRef.current = indiceAtual;

  // Modais
  const [modalUploadAberto, setModalUploadAberto] = useState(false);
  const [modalConfigAberto, setModalConfigAberto] = useState(false);

  // Estados de Reprodução de Áudio (Inicialmente SEMPRE em PAUSA)
  const [tocando, setTocando] = useState(false);
  const [volume, setVolume] = useState(0.85);
  const [mudo, setMudo] = useState(false);
  const [tempoAtual, setTempoAtual] = useState(0);
  const [duracaoTotal, setDuracaoTotal] = useState(0);
  const [fadeAtivo, setFadeAtivo] = useState(false);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const ytPlayerRef = useRef<any>(null);

  // Carrega lista de sessões disponíveis
  useEffect(() => {
    const carregarSessoes = async () => {
      if (!lojaAtiva) return;
      try {
        const resp = await clienteHttp.get<Sessao[]>('/sessoes', {
          params: { organizacao_id: lojaAtiva.id, apenas_ativas: true }
        });
        
        // Filtra pelo Rito Praticado da Loja
        const sessoesFiltradas = resp.data.filter(s => s.rito === lojaAtiva.rito_padrao);
        setSessoes(sessoesFiltradas);
        
        if (!sessaoSelecionadaId && sessoesFiltradas.length > 0) {
          // Busca a default (Ordinária de Aprendiz)
          const sessaoDefault = sessoesFiltradas.find(s => 
            s.nome.toLowerCase().includes('ordinária') && s.nome.toLowerCase().includes('aprendiz')
          );
          setSessaoSelecionadaId(sessaoDefault ? sessaoDefault.id : sessoesFiltradas[0].id);
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
      if (!dadosSessao) setCarregandoSessao(true);
      const ts = new Date().getTime();
      const resp = await clienteHttp.get<SessaoPlayerExecucao>(`/player/sessao/${sessaoSelecionadaId}?t=${ts}`);
      setDadosSessao(resp.data);
      // Não reseta o indice e nem o tocando se já havia uma sessão carregada
      if (!dadosSessao) {
        setIndiceAtual(0);
        setTocando(false);
      }
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

  // Carrega lista completa de músicas da playlist do momento atual
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
        
        // Mescla a flag 'preferida' das candidatas do momento atual (vindas da sessão)
        // para dentro dos objetos completos retornados por /musicas
        const candidatas = momentoAtual.candidatas || [];
        const musicasComPreferencia = resp.data.map((musica: any) => {
          const candidata = candidatas.find(c => c.id === musica.id);
          return {
            ...musica,
            preferida: candidata ? !!candidata.preferida : false
          };
        });
        
        setMusicasDoMomento(musicasComPreferencia);
      } catch (err) {
        console.error('Erro ao buscar músicas do momento litúrgico:', err);
      } finally {
        setCarregandoMusicasMomento(false);
      }
    };

    buscarMusicasMomento();
  }, [momentoAtual?.evento_id, lojaAtiva]);

  const alternarPreferencia = async (eventoId: string, musicaId: string, preferidaAtual: boolean) => {
    try {
      const novoStatus = !preferidaAtual;
      console.log(`Enviando PATCH para /player/momento/${eventoId}/musica/${musicaId}/preferencia?preferida=${novoStatus}`);
      const r = await clienteHttp.patch(`/player/momento/${eventoId}/musica/${musicaId}/preferencia`, null, {
        params: { preferida: novoStatus }
      });
      console.log('Resposta PATCH:', r.data);
      if (r.data.linhas_afetadas === 0) {
        alert("Erro fatal: Nenhuma linha atualizada no banco!");
      }
      // Recarrega a esteira para refletir a nova configuração
      carregarEsteira();
    } catch (err: any) {
      alert(`Erro na API PATCH: ${err.message || 'Erro desconhecido'}`);
      console.error('Erro ao alternar preferência:', err);
    }
  };

  // Função para o Mestre selecionar manualmente uma faixa pelo carrossel vertical 3D
  const selecionarMusicaManualmente = (musicaEscolhidaId: string) => {
    if (!dadosSessao || !momentoAtual) return;

    if (!musicaEscolhidaId) {
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
    setTocando(false);
    setTempoAtual(0);
    setDuracaoTotal(escolhida.duracao_segundos || 0);
  };

  // Ao terminar uma música, seleciona o próximo evento (em pausa)
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
      setTocando(false);
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

    setTocando(false);
    setTempoAtual(0);

    if (musicaAtual && musicaAtual.tipo_midia === 'ARQUIVO_LOCAL' && musicaAtual.caminho_arquivo) {
      let caminho = musicaAtual.caminho_arquivo;
      if (!caminho.startsWith('http') && !caminho.startsWith('/')) {
        caminho = '/' + caminho; // Garante caminho absoluto na raiz do domínio (proxy)
      }
      audio.src = caminho;
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

  // Inicialização e controle do YouTube Player
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
      setTocando(false);
      setTempoAtual(0);
      setDuracaoTotal(0);
    }
  };

  const voltarAnterior = () => {
    if (indiceAtual > 0) {
      setIndiceAtual(indiceAtual - 1);
      setTocando(false);
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

  const progressoPercentual = duracaoTotal > 0 ? Math.min(100, Math.max(0, (tempoAtual / duracaoTotal) * 100)) : 0;

  return (
    <div className="h-full w-full overflow-hidden bg-[#040811] text-slate-100 flex flex-col items-center justify-between p-2 sm:p-3 selection:bg-cyan-500 selection:text-black">
      
      {/* Elemento de Áudio HTML5 para Arquivos Locais */}
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
          if (dur && !isNaN(dur) && dur > 0) {
            setDuracaoTotal(dur);
          }
        }}
        onDurationChange={() => {
          const dur = audioRef.current?.duration;
          if (dur && !isNaN(dur) && dur > 0) {
            setDuracaoTotal(dur);
          }
        }}
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

      {/* Container Principal Panorâmico HUD */}
      <div className="w-full max-w-lg sm:max-w-2xl md:max-w-4xl lg:max-w-5xl h-full flex flex-col justify-between py-0.5 gap-1.5">

        {/* 1. BARRA SUPERIOR UNIFICADA // STATUS & CONFIGURAÇÕES */}
        <div className="flex items-center justify-between px-3 py-1.5 bg-[#07111f]/90 border border-cyan-500/20 rounded-2xl shrink-0 shadow-lg backdrop-blur-md">
          <div className="flex items-center gap-2 truncate">
            <span className="w-2.5 h-2.5 bg-[#00E5FF] rotate-45 shadow-[0_0_8px_#00E5FF] shrink-0" />
            <div className="flex flex-col min-w-0">
              <select
                value={sessaoSelecionadaId}
                onChange={(e) => setSessaoSelecionadaId(e.target.value)}
                className="bg-transparent border-none outline-none text-xs sm:text-sm font-black font-mono tracking-wider text-white truncate uppercase cursor-pointer hover:text-cyan-300 appearance-none focus:ring-0"
              >
                <option value="" disabled className="text-black">SELECIONE UMA SESSÃO</option>
                {sessoes.map(s => (
                  <option key={s.id} value={s.id} className="bg-[#07111f] text-white">
                    {s.nome}
                  </option>
                ))}
              </select>
              <span className="text-[9px] font-mono text-cyan-400 truncate mt-0.5">
                RITO {dadosSessao?.rito || lojaAtiva?.rito_padrao || 'REAA'} // GRAU {dadosSessao?.grau || 1}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <button
              onClick={() => setModalUploadAberto(true)}
              className="p-1.5 rounded-xl bg-white/[0.04] hover:bg-cyan-500/20 text-[#00E5FF] border border-cyan-500/30 transition-all text-[10px] font-mono font-bold flex items-center gap-1 cursor-pointer"
              title="Catalogar / Upload"
            >
              <UploadCloud className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">+ Faixa</span>
            </button>

            <button
              onClick={() => setModalConfigAberto(true)}
              className="p-1.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.1] text-slate-300 hover:text-white border border-white/5 transition-all cursor-pointer"
              title="Configurações e Troca de Sessão"
            >
              <Settings className="w-4 h-4 text-cyan-400" />
            </button>
          </div>
        </div>

        {/* 2. PALCO 3D COM CARROSSEL HORIZONTAL EM SEMICÍRCULO PANORÂMICO */}
        {dadosSessao && (
          <div className="flex-1 flex flex-col items-center justify-center min-h-0 py-0.5">
            <Carrossel3DMomentos
              momentos={dadosSessao.esteira_ritualistica}
              indiceAtual={indiceAtual}
              musicasDoMomento={musicasDoMomento}
              musicaAtualId={musicaAtual?.id}
              tocando={tocando}
              onMudarMomento={(novoIndice) => {
                setIndiceAtual(novoIndice);
                setTocando(false);
              }}
              onSelecionarMusica={selecionarMusicaManualmente}
              onAlternarPreferencia={alternarPreferencia}
              onAbrirUpload={() => setModalUploadAberto(true)}
            />

            {/* NAVEGAÇÃO DE MINIATURAS (THUMBNAILS) PARA O MESTRE */}
            <div className="w-full max-w-full overflow-x-auto flex items-center gap-2 px-2 py-2 snap-x hide-scrollbar mt-1 border-t border-white/5">
              {dadosSessao.esteira_ritualistica.map((momento, idx) => (
                <button
                  key={momento.evento_id}
                  onClick={() => {
                     setIndiceAtual(idx);
                     setTocando(false);
                  }}
                  className={`shrink-0 w-28 p-1.5 rounded-lg border flex flex-col items-center justify-center snap-center transition-all cursor-pointer ${
                    idx === indiceAtual
                      ? 'bg-[#0b1c33] border-cyan-500/80 shadow-[0_0_10px_rgba(0,229,255,0.2)]'
                      : 'bg-white/[0.02] border-white/10 hover:border-cyan-500/30 hover:bg-white/[0.05]'
                  }`}
                  title={momento.evento_nome}
                >
                  <span className={`text-[9px] font-mono font-bold truncate w-full text-center ${idx === indiceAtual ? 'text-[#00E5FF]' : 'text-slate-400'}`}>
                     {String(idx + 1).padStart(2, '0')} //
                  </span>
                  <span className={`text-[8px] font-mono truncate w-full text-center ${idx === indiceAtual ? 'text-white' : 'text-slate-500'}`}>
                     {momento.evento_nome}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* 3. DOCK UNIFICADO DE CONTROLE // PLAYER HUD COMPACTO */}
        <div className="max-w-2xl mx-auto w-full rounded-2xl bg-[#060e1d] border border-cyan-500/30 p-2.5 sm:p-3 shadow-2xl flex flex-col gap-2 shrink-0">
          
          {/* Barra de Progresso Linear de Precisão & Timestamps */}
          <div className="flex flex-col gap-1 px-1">
            {/* Display Dinâmico do Título Acima da Barra (Substituindo a tag Em Execução) */}
            <div className="flex flex-col items-center justify-center w-full pb-1 h-8">
              {!musicaAtual ? (
                <button
                  onClick={() => setModalUploadAberto(true)}
                  className="px-3 py-1 bg-cyan-500/20 text-[#00E5FF] border border-cyan-500/40 rounded-lg text-[10px] font-mono font-bold hover:bg-cyan-500/30 transition-all pointer-events-auto cursor-pointer flex items-center gap-1.5 shadow-[0_0_10px_rgba(0,229,255,0.15)]"
                >
                  <UploadCloud className="w-3 h-3" />
                  + CATALOGAR FAIXA PARA ESTE MOMENTO
                </button>
              ) : (
                  <>
                    <div className="flex items-center gap-2 max-w-full px-2">
                      {tocando && (
                        <div className="flex gap-0.5 items-center shrink-0 h-4">
                          <div className="w-1 h-3 bg-emerald-400 rounded-sm animate-[bounce_1s_infinite_100ms]" />
                          <div className="w-1 h-4 bg-emerald-400 rounded-sm animate-[bounce_1s_infinite_300ms]" />
                          <div className="w-1 h-2 bg-emerald-400 rounded-sm animate-[bounce_1s_infinite_500ms]" />
                          <div className="w-1 h-3.5 bg-emerald-400 rounded-sm animate-[bounce_1s_infinite_200ms]" />
                        </div>
                      )}
                      <span className={`text-[11px] sm:text-xs font-bold uppercase truncate text-center ${tocando ? 'text-emerald-300' : 'text-slate-300'}`}>
                        {musicaAtual.titulo}
                      </span>
                    </div>
                    <span className="text-[9px] sm:text-[10px] text-slate-500 truncate max-w-[70%] text-center">
                      {musicaAtual.autor_artista || 'Compositor Tradicional'}
                    </span>
                  </>
              )}
            </div>

            <div
              role="progressbar"
              aria-valuenow={tempoAtual}
              aria-valuemin={0}
              aria-valuemax={duracaoTotal}
              className="relative w-full h-1.5 bg-slate-800 rounded-full overflow-hidden cursor-pointer group transition-all mt-1"
              onClick={(e) => {
                if (duracaoTotal <= 0) return;
                const rect = e.currentTarget.getBoundingClientRect();
                const cliqueFracao = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
                const novoTempo = cliqueFracao * duracaoTotal;
                if (musicaAtual?.tipo_midia === 'ARQUIVO_LOCAL' && audioRef.current) {
                  audioRef.current.currentTime = novoTempo;
                  setTempoAtual(novoTempo);
                } else if (musicaAtual?.tipo_midia === 'YOUTUBE' && ytPlayerRef.current) {
                  try {
                    ytPlayerRef.current.seekTo(novoTempo, true);
                    setTempoAtual(novoTempo);
                  } catch {}
                }
              }}
              title="Clique para seek na faixa"
            >
              <div
                className="h-full bg-gradient-to-r from-[#00E5FF] to-cyan-300 rounded-full transition-all duration-100 shadow-[0_0_10px_#00E5FF]"
                style={{ width: `${progressoPercentual}%` }}
              />
            </div>

            <div className="flex items-center justify-between text-[10px] font-mono text-slate-400">
              <span className="text-[#00E5FF] font-bold">{formatarTempo(tempoAtual)}</span>
              <span>{duracaoTotal > 0 ? formatarTempo(duracaoTotal) : '--:--'}</span>
            </div>
          </div>

          {/* Linha Principal de Controles Litúrgicos */}
          <div className="flex items-center justify-between gap-2 pt-1 border-t border-white/5">
            
            {/* Voltar Momento */}
            <button
              onClick={voltarAnterior}
              disabled={indiceAtual === 0}
              className="p-2 sm:p-2.5 rounded-xl bg-[#091526] hover:bg-[#0f2442] text-slate-300 hover:text-white disabled:opacity-30 border border-white/5 transition-all cursor-pointer font-mono text-[11px] flex items-center gap-1 shadow-md active:scale-95 shrink-0"
              title="Momento Anterior"
            >
              <SkipBack className="w-4 h-4 text-cyan-400" />
              <span className="hidden sm:inline">ANTERIOR</span>
            </button>

            {/* AGRUPAMENTO CENTRAL: Sortear, Play/Pause, Volume */}
            <div className="flex items-center justify-center gap-3 sm:gap-5 flex-1">
              
              {/* Sortear Outra Faixa */}
              <button
                onClick={resortearMusicaAtual}
                disabled={(momentoAtual?.total_musicas_disponiveis ?? 0) <= 1}
                className="p-2 rounded-xl bg-white/[0.03] hover:bg-white/[0.08] text-slate-300 hover:text-white disabled:opacity-30 transition-all cursor-pointer shadow-sm active:scale-95"
                title="Sortear outra faixa aleatória"
              >
                <Shuffle className="w-4 h-4 text-[#00E5FF]" />
              </button>

              {/* BOTÃO CENTRAL PLAY / PAUSE 3D COMPACTO */}
              <button
                onClick={alternarPlayPause}
                disabled={!musicaAtual}
                className={`w-12 h-12 sm:w-14 sm:h-14 rounded-full flex items-center justify-center transition-all duration-200 cursor-pointer disabled:opacity-40 shrink-0 ${
                  tocando
                    ? 'bg-gradient-to-b from-[#0e2744] via-[#061527] to-[#020710] border-2 border-[#00E5FF] shadow-[0_0_30px_rgba(0,229,255,0.7),inset_0_0_15px_rgba(0,229,255,0.4)] text-[#00E5FF]'
                    : 'bg-gradient-to-b from-[#0b1d33] via-[#05111f] to-[#02050b] border border-cyan-500/40 hover:border-[#00E5FF] shadow-[0_10px_25px_rgba(0,0,0,0.9),0_0_15px_rgba(0,229,255,0.25)] text-white hover:text-[#00E5FF] active:scale-95'
                }`}
                title={tocando ? "Pausar" : "Executar"}
              >
                {tocando ? (
                  <Pause className="w-6 h-6 fill-current drop-shadow-[0_0_8px_#00E5FF]" />
                ) : (
                  <Play className="w-6 h-6 fill-current ml-0.5 drop-shadow-[0_0_8px_#00E5FF]" />
                )}
              </button>

              {/* Controle de Volume no Centro */}
              <div className="flex items-center gap-1.5 shrink-0 bg-[#091526] px-2 py-1.5 rounded-xl border border-white/5">
                <button
                  onClick={() => setMudo(!mudo)}
                  className="text-slate-400 hover:text-[#00E5FF] transition-colors"
                  title={mudo ? "Desmutar" : "Mutar"}
                >
                  {mudo || volume === 0 ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4 text-[#00E5FF]" />}
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
                  className="w-12 sm:w-16 h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-[#00E5FF]"
                />
              </div>
            </div>

            {/* Suavizar e Avançar (Próximo Discreto, simétrico ao Anterior) */}
            <button
              onClick={aplicarFadeOutEAvançar}
              disabled={!dadosSessao || indiceAtual >= dadosSessao.esteira_ritualistica.length - 1}
              className="p-2 sm:p-2.5 rounded-xl bg-[#091526] hover:bg-[#0f2442] text-slate-300 hover:text-white disabled:opacity-30 border border-white/5 transition-all cursor-pointer font-mono text-[11px] flex items-center gap-1 shadow-md active:scale-95 shrink-0"
              title="Próximo Momento"
            >
              <span className="hidden sm:inline">{fadeAtivo ? 'FADE OUT...' : 'PRÓXIMO'}</span>
              <ChevronRight className="w-4 h-4 text-cyan-400" />
            </button>
          </div>

        </div>

      </div>

      {/* Modal de Configurações e Troca de Sessão */}
      <ModalConfiguracoesPlayer
        aberto={modalConfigAberto}
        onFechar={() => setModalConfigAberto(false)}
        sessoes={sessoes}
        sessaoSelecionadaId={sessaoSelecionadaId}
        onSelecionarSessao={(id) => {
          setSessaoSelecionadaId(id);
          setSearchParams({ sessao: id });
          setModalConfigAberto(false);
        }}
        onAbrirUpload={() => {
          setModalConfigAberto(false);
          setModalUploadAberto(true);
        }}
      />

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
