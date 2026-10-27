import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { ListOrdered, Sparkles, ArrowLeft, Volume2, Pause, Play, Menu } from 'lucide-react';
import { SessaoPlayerExecucao, Musica, MusicaSorteada } from '../../compartilhado/tipos';
import clienteHttp from '../../compartilhado/api/cliente_http';
import { useTenant } from '../../compartilhado/contextos/ContextoTenant';
import { extrairIdYoutube } from '../../compartilhado/formatadores/midia';
import { extrairMensagemErro } from '../../compartilhado/utilitarios/mensagensErro';
import { feedbackTatil } from '../../compartilhado/utilitarios/dispositivoNativo';

import { PalcoCarrosseis } from './palco/PalcoCarrosseis';
import { MasonicControls } from './componentes/MasonicControls';
import { ModalComporMomento } from '../eventos/ModalComporMomento';
import { ModalInterludioFundo } from './ModalInterludioFundo';
import { normalizadorAudio } from '../../compartilhado/audio/normalizadorAudio';

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
 *
 * Interface em Palco de Carrosséis 3D: os momentos formam um carrossel horizontal e, dentro do
 * momento ativo, as faixas formam um carrossel vertical. O momento e a faixa ativos ficam sempre
 * no centro; os demais esmaecem progressivamente. Esta página concentra o ESTADO (sessão,
 * reprodução de áudio local/YouTube, preferências); `PalcoCarrosseis` é puramente visual.
 */
export const PaginaPlayerHarmonia: React.FC = () => {
  const navigate = useNavigate();
  const { lojaAtiva } = useTenant();
  const [searchParams, setSearchParams] = useSearchParams();
  const sessaoParamId = searchParams.get('sessao');
  const estiloParam = (searchParams.get('estilo') || 'UNIVERSAL').toUpperCase();

  const [sessoes, setSessoes] = useState<SessaoLojaResumo[]>([]);
  const [sessaoSelecionadaId, setSessaoSelecionadaId] = useState<string>(sessaoParamId || '');
  const [dadosSessao, setDadosSessao] = useState<SessaoPlayerExecucao | null>(null);
  const [carregandoSessao, setCarregandoSessao] = useState(false);

  const [indiceAtual, setIndiceAtual] = useState(0);
  const [modalUploadAberto, setModalUploadAberto] = useState(false);
  const [modalInterludioAberto, setModalInterludioAberto] = useState(false);
  const [modalSurdinaCalibragemAberto, setModalSurdinaCalibragemAberto] = useState(false);
  const [avisoErro, setAvisoErro] = useState<string | null>(null);

  // Estado do Modo Interlúdio / Trilha de Fundo
  const [modoInterludioAtivo, setModoInterludioAtivo] = useState(false);
  const [musicaFundoAtiva, setMusicaFundoAtiva] = useState<Musica | null>(null);
  const [estadoAntesDoInterludio, setEstadoAntesDoInterludio] = useState<{
    estavaTocando: boolean;
    tempoPosicao: number;
    indiceMomento: number;
  } | null>(null);

  // Estado de reprodução de áudio
  const [tocando, setTocando] = useState(false);
  const [tempoAtual, setTempoAtual] = useState(0);
  const [duracaoTotal, setDuracaoTotal] = useState(0);
  // Funções seguras de leitura/gravação local
  const lerNumeroStorage = (chave: string, padrao: number, min: number, max: number): number => {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const salvo = localStorage.getItem(chave);
        if (salvo !== null) {
          const n = Number(salvo);
          if (!isNaN(n) && n >= min && n <= max) return n;
        }
      }
    } catch {
      /* storage desabilitado ou restrito */
    }
    return padrao;
  };

  // Surdina: limita o volume (ativada automaticamente em momentos de surdina/interlúdio)
  const [surdinaAtiva, setSurdinaAtiva] = useState(false);
  // Percentual configurável de volume de surdina (padrão 25%, adaptável para 3%, 5%, etc., persistido localmente)
  const [percentualSurdina, setPercentualSurdina] = useState<number>(() =>
    lerNumeroStorage('harmonia_volume_surdina', 25, 1, 100)
  );

  const atualizarPercentualSurdina = (novoPercentual: number) => {
    const seguro = Math.max(1, Math.min(100, Math.round(novoPercentual)));
    setPercentualSurdina(seguro);
    try {
      localStorage.setItem('harmonia_volume_surdina', String(seguro));
    } catch {
      /* storage desabilitado */
    }
  };

  // Volume mestre geral (0 a 100%, padrão 100%)
  const [volumeGeral, setVolumeGeral] = useState<number>(() =>
    lerNumeroStorage('harmonia_volume_geral', 100, 0, 100)
  );

  const alterarVolumeGeral = (novoVolume: number) => {
    const seguro = Math.max(0, Math.min(100, Math.round(novoVolume)));
    setVolumeGeral(seguro);
    try {
      localStorage.setItem('harmonia_volume_geral', String(seguro));
    } catch {
      /* storage desabilitado */
    }
  };

  const ajustarVolumeRelativo = (delta: number) => {
    alterarVolumeGeral(volumeGeral + delta);
    feedbackTatil.clique();
  };

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const ytPlayerRef = useRef<any>(null);
  /** O player do YouTube já disparou `onReady` (só então play/pause/seek são seguros). */
  const ytProntoRef = useRef(false);
  /** Intenção de iniciar a reprodução assim que a próxima faixa carregar (tocar ao selecionar). */
  const tocarAoCarregarRef = useRef(false);
  /** Mesma intenção repassada ao player do YouTube (consumida no `onReady`). */
  const reproduzirYtRef = useRef(false);
  /** Sempre aponta para o callback mais recente de "fim da faixa" (evita closures obsoletas no YouTube). */
  const aoTerminarRef = useRef<() => void>(() => {});

  useEffect(() => {
    const tag = document.createElement('script');
    tag.src = 'https://www.youtube.com/iframe_api';
    const firstScriptTag = document.getElementsByTagName('script')[0];
    if (firstScriptTag && firstScriptTag.parentNode) {
      firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);
    }
  }, []);

  // Aviso (toast) transitório para erros de ações do usuário
  useEffect(() => {
    if (!avisoErro) return;
    const t = window.setTimeout(() => setAvisoErro(null), 4500);
    return () => window.clearTimeout(t);
  }, [avisoErro]);

  useEffect(() => {
    if (lojaAtiva?.id) {
      carregarSessoes(lojaAtiva.id);
    }
  }, [lojaAtiva?.id]);

  useEffect(() => {
    if (!sessaoParamId) {
      navigate('/preparar-sessao', { replace: true });
      return;
    }
    if (sessaoParamId !== sessaoSelecionadaId) {
      setSessaoSelecionadaId(sessaoParamId);
    }
  }, [sessaoParamId]);

  useEffect(() => {
    if (sessaoSelecionadaId) {
      carregarEsteira(sessaoSelecionadaId);
    }
  }, [sessaoSelecionadaId, estiloParam]);

  const carregarSessoes = async (lojaId: string) => {
    try {
      const res = await clienteHttp.get<SessaoLojaResumo[]>(`/sessoes/loja/${lojaId}`);
      setSessoes(res.data);
    } catch (e) {
      console.error('Erro ao carregar sessões da loja no player:', e);
    }
  };

  /**
   * Carrega a esteira da sessão. Com `preservar`, mantém o momento atual e a faixa já escolhida
   * em cada momento (usado após catalogar uma música, sem "embaralhar" o que o Mestre já definiu).
   */
  const carregarEsteira = async (idSessao: string, preservar = false) => {
    try {
      if (!preservar) setCarregandoSessao(true);
      const params = estiloParam ? { estilo: estiloParam } : undefined;
      const res = await clienteHttp.get<SessaoPlayerExecucao>(`/player/sessao/${idSessao}`, { params });
      const nova = res.data;

      setDadosSessao((anterior) => {
        if (!preservar || !anterior || anterior.sessao_id !== nova.sessao_id) return nova;
        const esteira = nova.esteira_ritualistica.map((momento) => {
          const antigo = anterior.esteira_ritualistica.find((m) => m.evento_id === momento.evento_id);
          const idEscolhido = antigo?.musica_sorteada?.id;
          const mantida = idEscolhido ? momento.candidatas.find((c) => c.id === idEscolhido) : undefined;
          return mantida ? { ...momento, musica_sorteada: mantida } : momento;
        });
        return { ...nova, esteira_ritualistica: esteira };
      });

      if (!preservar && nova.esteira_ritualistica.length > 0) {
        setIndiceAtual(0);
      }
    } catch (e) {
      console.error('Erro ao carregar esteira da sessão:', e);
      setAvisoErro(extrairMensagemErro(e, 'Não foi possível carregar a esteira da sessão.'));
    } finally {
      setCarregandoSessao(false);
    }
  };

  const momentoAtual = dadosSessao?.esteira_ritualistica[indiceAtual];
  // Determina a música efetiva (seja do Modo Interlúdio ou da Esteira Ritualística)
  const musicaAtivaEfetiva = modoInterludioAtivo ? musicaFundoAtiva : momentoAtual?.musica_sorteada;
  const musicaAtual = musicaAtivaEfetiva;

  // Ativa automaticamente a Surdina com base na classificação do Momento ritualístico ou Modo Interlúdio
  useEffect(() => {
    if (modoInterludioAtivo) {
      setSurdinaAtiva(true);
      return;
    }
    if (momentoAtual) {
      setSurdinaAtiva(Boolean(momentoAtual.em_surdina));
    }
  }, [indiceAtual, modoInterludioAtivo, momentoAtual?.em_surdina]);

  // Aplica o volume com normalização dinâmica e estabilização de ganho (elimina oscilações)
  useEffect(() => {
    const fatorSurdina = surdinaAtiva ? percentualSurdina / 100 : 1.0;
    const volFinalFloat = Math.max(0, Math.min(1, (volumeGeral / 100) * fatorSurdina));
    const volFinalInt = Math.round(volFinalFloat * 100);

    if (audioRef.current) {
      normalizadorAudio.inicializar(audioRef.current);
      normalizadorAudio.aplicarVolume(volFinalFloat, audioRef.current);
    }
    if (ytPlayerRef.current && typeof ytPlayerRef.current.setVolume === 'function') {
      try {
        ytPlayerRef.current.setVolume(volFinalInt);
      } catch {
        /* ignora se player ainda não está pronto */
      }
    }
  }, [surdinaAtiva, percentualSurdina, volumeGeral]);

  // Sincroniza a fonte de áudio ao trocar a música ativa
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    // Consome a intenção de "tocar ao carregar" definida pela ação do usuário (toque no card, botões de faixa)
    const tocarAgora = tocarAoCarregarRef.current;
    tocarAoCarregarRef.current = false;
    reproduzirYtRef.current = tocarAgora;

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
        const fatorSurdina = surdinaAtiva ? percentualSurdina / 100 : 1.0;
        const volFinalFloat = Math.max(0, Math.min(1, (volumeGeral / 100) * fatorSurdina));
        normalizadorAudio.inicializar(audio);
        normalizadorAudio.aplicarVolume(volFinalFloat, audio);
        audio.currentTime = 0;
        audio.pause();
        if (musicaAtual.duracao_segundos) setDuracaoTotal(musicaAtual.duracao_segundos);
        if (tocarAgora) {
          normalizadorAudio.retomarContexto();
          audio.play().then(() => setTocando(true)).catch(() => setTocando(false));
        }
      } else {
        // Mídia externa (YouTube): o áudio nativo fica mudo e o IFrame API assume
        audio.pause();
        audio.src = '';
        if (musicaAtual.duracao_segundos) setDuracaoTotal(musicaAtual.duracao_segundos);
      }
    } else {
      audio.pause();
      audio.src = '';
    }
  }, [musicaAtual?.id, modoInterludioAtivo]);

  // Inicialização e controle do YouTube Player API
  useEffect(() => {
    let timerProgresso: any = null;

    const pararTimerProgresso = () => {
      if (timerProgresso) {
        clearInterval(timerProgresso);
        timerProgresso = null;
      }
    };

    const iniciarTimerProgresso = () => {
      pararTimerProgresso();
      timerProgresso = setInterval(() => {
        const player = ytPlayerRef.current;
        if (player && typeof player.getCurrentTime === 'function') {
          try {
            const cur = player.getCurrentTime();
            if (typeof cur === 'number' && !isNaN(cur)) setTempoAtual(cur);
            const dur = typeof player.getDuration === 'function' ? player.getDuration() : 0;
            if (typeof dur === 'number' && !isNaN(dur) && dur > 0) {
              setDuracaoTotal((antiga) => (antiga > 0 ? antiga : dur));
            }
          } catch {
            /* player ainda inicializando */
          }
        }
      }, 500);
    };

    const destruirPlayerYt = () => {
      ytProntoRef.current = false;
      if (ytPlayerRef.current && typeof ytPlayerRef.current.destroy === 'function') {
        try {
          ytPlayerRef.current.destroy();
        } catch {
          /* ignora */
        }
      }
      ytPlayerRef.current = null;
    };

    // Ao trocar de faixa (ou ao sair de uma faixa do YouTube), encerra o player anterior
    destruirPlayerYt();

    if (musicaAtual?.tipo_midia !== 'YOUTUBE' || !musicaAtual.link_externo) return;
    const ytVideoId = extrairIdYoutube(musicaAtual.link_externo);
    if (!ytVideoId) return;

    const inicializarPlayerYT = () => {
      const container = document.getElementById('yt-player-container');
      if (!container || !(window as any).YT || !(window as any).YT.Player) return;

      // Recria o elemento que o YouTube substitui pelo iframe
      container.innerHTML = '<div id="yt-player-target"></div>';
      ytProntoRef.current = false;

      try {
        ytPlayerRef.current = new (window as any).YT.Player('yt-player-target', {
          videoId: ytVideoId,
          playerVars: {
            autoplay: reproduzirYtRef.current ? 1 : 0,
            controls: 0,
            enablejsapi: 1,
            origin: window.location.origin,
          },
          events: {
            onReady: (event: any) => {
              ytProntoRef.current = true;
              try {
                const fatorSurdina = surdinaAtiva ? percentualSurdina / 100 : 1.0;
                const volFinalInt = Math.round(Math.max(0, Math.min(100, volumeGeral * fatorSurdina)));
                event.target.setVolume(volFinalInt);
              } catch {
                /* ignora */
              }
              if (reproduzirYtRef.current) {
                event.target.playVideo();
                setTocando(true);
                iniciarTimerProgresso();
              }
              const dur = event.target.getDuration();
              if (dur && dur > 0) setDuracaoTotal(dur);
            },
            onStateChange: (event: any) => {
              // 0 = ENDED, 1 = PLAYING, 2 = PAUSED
              if (event.data === 0) {
                pararTimerProgresso();
                aoTerminarRef.current();
              } else if (event.data === 1) {
                setTocando(true);
                iniciarTimerProgresso();
                const dur = event.target.getDuration();
                if (dur && dur > 0) setDuracaoTotal(dur);
              } else if (event.data === 2) {
                setTocando(false);
                pararTimerProgresso();
              }
            },
            onError: (err: any) => {
              console.warn('Erro na reprodução YouTube:', err);
              setTocando(false);
              setAvisoErro('Não foi possível reproduzir este vídeo do YouTube (pode estar indisponível ou bloqueado para incorporação).');
            },
          },
        });
      } catch (e) {
        console.debug('Aviso ao inicializar YT Player:', e);
      }
    };

    if ((window as any).YT && (window as any).YT.Player) {
      inicializarPlayerYT();
    } else {
      (window as any).onYouTubeIframeAPIReady = inicializarPlayerYT;
    }

    return () => {
      pararTimerProgresso();
    };
  }, [musicaAtual?.id, musicaAtual?.link_externo]);

  // Função para ativar trilha de fundo memorizando o ponto da esteira
  const ativarTrilhaFundo = (musicaFundo: Musica) => {
    const audio = audioRef.current;
    // Se não estava em modo interlúdio, memoriza o estado da esteira
    if (!modoInterludioAtivo) {
      setEstadoAntesDoInterludio({
        estavaTocando: tocando,
        tempoPosicao: audio?.currentTime || 0,
        indiceMomento: indiceAtual,
      });
    }

    setModoInterludioAtivo(true);
    setMusicaFundoAtiva(musicaFundo);

    if (audio) {
      let caminho = musicaFundo.caminho_arquivo || '';
      if (caminho && !caminho.startsWith('http') && !caminho.startsWith('/')) {
        caminho = '/' + caminho;
      }
      audio.src = caminho;
      audio.currentTime = 0;
      audio.play().then(() => setTocando(true)).catch(() => setTocando(false));
    }
  };

  // Função para retornar à esteira litúrgica restaurando o momento e a posição
  const retornarParaEsteira = () => {
    const audio = audioRef.current;
    if (audio) {
      audio.pause();
    }
    setTocando(false);

    const estadoAnterior = estadoAntesDoInterludio;
    setModoInterludioAtivo(false);
    setMusicaFundoAtiva(null);
    setEstadoAntesDoInterludio(null);

    // Se tínhamos um momento e faixa da esteira ritualística
    if (estadoAnterior && dadosSessao) {
      setIndiceAtual(estadoAnterior.indiceMomento);
      const musicaEsteira = dadosSessao.esteira_ritualistica[estadoAnterior.indiceMomento]?.musica_sorteada;
      if (musicaEsteira && musicaEsteira.caminho_arquivo && audio) {
        let caminho = musicaEsteira.caminho_arquivo;
        if (!caminho.startsWith('http') && !caminho.startsWith('/')) {
          caminho = '/' + caminho;
        }
        audio.src = caminho;
        audio.currentTime = estadoAnterior.tempoPosicao;
        if (estadoAnterior.estavaTocando) {
          audio.play().then(() => setTocando(true)).catch(() => {});
        }
      }
    }
  };

  const alternarPlayPauseFundo = () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (tocando) {
      audio.pause();
      setTocando(false);
    } else {
      normalizadorAudio.retomarContexto();
      audio.play().then(() => setTocando(true)).catch(() => setTocando(false));
    }
  };

  const alternarPlayPause = () => {
    if (!musicaAtual) return;

    if (musicaAtual.tipo_midia === 'ARQUIVO_LOCAL') {
      const audio = audioRef.current;
      if (!audio) return;
      if (tocando) {
        audio.pause();
        setTocando(false);
      } else {
        normalizadorAudio.retomarContexto();
        audio.play().then(() => setTocando(true)).catch(() => setTocando(false));
      }
    } else if (musicaAtual.tipo_midia === 'YOUTUBE') {
      const player = ytPlayerRef.current;
      if (player && ytProntoRef.current) {
        if (tocando) {
          player.pauseVideo?.();
          setTocando(false);
        } else {
          player.playVideo?.();
          setTocando(true);
        }
      } else {
        // O IFrame ainda está carregando: registra a intenção e o `onReady` inicia a reprodução
        reproduzirYtRef.current = !tocando;
        setTocando(!tocando);
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
  aoTerminarRef.current = aoTerminarMusica;

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

  /** Substitui (de forma imutável) a faixa escolhida de um momento da esteira. */
  const definirMusicaDoMomento = (indiceMomento: number, musica: MusicaSorteada) => {
    setDadosSessao((anterior) => {
      if (!anterior) return anterior;
      const esteira = anterior.esteira_ritualistica.map((m, i) =>
        i === indiceMomento ? { ...m, musica_sorteada: musica } : m
      );
      return { ...anterior, esteira_ritualistica: esteira };
    });
  };

  /** Seleciona uma faixa do momento ativo; `tocar` define se a reprodução já começa/continua. */
  const trocarFaixaDoMomento = (indiceFaixa: number, tocar: boolean) => {
    const nova = momentoAtual?.candidatas[indiceFaixa];
    if (!nova || musicaAtual?.id === nova.id) return;
    tocarAoCarregarRef.current = tocar;
    definirMusicaDoMomento(indiceAtual, nova);
  };

  /** Botões "Faixa" do painel de controles: navegam na lista circular tocando a nova faixa. */
  const navegarFaixa = (sentido: 1 | -1) => {
    const faixas = momentoAtual?.candidatas ?? [];
    if (faixas.length <= 1 || !musicaAtual) return;
    const idx = faixas.findIndex((m) => m.id === musicaAtual.id);
    const proximo = (idx + sentido + faixas.length) % faixas.length;
    trocarFaixaDoMomento(proximo, true);
  };

  /**
   * Marca/desmarca uma música como preferida do momento atual (várias podem ser preferidas;
   * o sorteio ocorre somente entre elas). Se o usuário marcar uma faixa como preferida e a
   * faixa atualmente ativa não era preferida (ou o player está parado), posiciona imediatamente
   * a preferida no centro do carrossel vertical.
   */
  const alternarPreferencia = async (musicaId: string, preferida: boolean) => {
    if (!sessaoSelecionadaId || !momentoAtual) return;
    const indiceMomento = indiceAtual;
    const eventoId = momentoAtual.evento_id;

    const aplicar = (valor: boolean) =>
      setDadosSessao((anterior) => {
        if (!anterior) return anterior;
        const esteira = anterior.esteira_ritualistica.map((m, i) => {
          if (i !== indiceMomento) return m;
          const novasCandidatas = m.candidatas.map((c) =>
            c.id === musicaId ? { ...c, preferida: valor } : c
          );
          const faixaAlvo = novasCandidatas.find((c) => c.id === musicaId) ?? null;

          let novaSorteada =
            m.musica_sorteada && m.musica_sorteada.id === musicaId
              ? { ...m.musica_sorteada, preferida: valor }
              : m.musica_sorteada;

          // Se acabou de marcar como preferida e a ativa não era preferida (ou player parado), prioriza a preferida
          if (valor && faixaAlvo && (!tocando || !novaSorteada?.preferida)) {
            novaSorteada = faixaAlvo;
          } else if (!valor && !tocando && novaSorteada?.id === musicaId) {
            // Se desmarcou a ativa e existem outras preferidas no momento, seleciona uma das preferidas restantes
            const outrasPreferidas = novasCandidatas.filter((c) => c.preferida);
            if (outrasPreferidas.length > 0) {
              novaSorteada = outrasPreferidas[0];
            }
          }

          return {
            ...m,
            candidatas: novasCandidatas,
            musica_sorteada: novaSorteada,
          };
        });
        return { ...anterior, esteira_ritualistica: esteira };
      });

    aplicar(preferida);
    try {
      await clienteHttp.patch(
        `/player/sessao/${sessaoSelecionadaId}/momento/${eventoId}/musica/${musicaId}/preferencia`,
        null,
        { params: { preferida } }
      );
      feedbackTatil.sucesso();
    } catch (e) {
      aplicar(!preferida);
      feedbackTatil.erro();
      setAvisoErro(extrairMensagemErro(e, 'Não foi possível atualizar a preferência da música.'));
    }
  };

  /**
   * Salva a configuração permanente de uma música como Surdina (ou desfaz),
   * persistindo no backend para que seja lembrada em todas as próximas sessões.
   */
  const alternarMusicaSurdinaPermanente = async (musicaId: string, surdina: boolean) => {
    // Atualização otimista local
    setDadosSessao((anterior) => {
      if (!anterior) return anterior;
      const esteira = anterior.esteira_ritualistica.map((m) => ({
        ...m,
        candidatas: m.candidatas.map((c) => (c.id === musicaId ? { ...c, surdina } : c)),
        musica_sorteada:
          m.musica_sorteada?.id === musicaId
            ? { ...m.musica_sorteada, surdina }
            : m.musica_sorteada,
      }));
      return { ...anterior, esteira_ritualistica: esteira };
    });

    if (surdina) {
      setSurdinaAtiva(true);
    }

    try {
      await clienteHttp.patch(`/musicas/${musicaId}/surdina`, null, {
        params: { surdina },
      });
      feedbackTatil.sucesso();
    } catch (e) {
      // Desfaz em caso de falha
      setDadosSessao((anterior) => {
        if (!anterior) return anterior;
        const esteira = anterior.esteira_ritualistica.map((m) => ({
          ...m,
          candidatas: m.candidatas.map((c) => (c.id === musicaId ? { ...c, surdina: !surdina } : c)),
          musica_sorteada:
            m.musica_sorteada?.id === musicaId
              ? { ...m.musica_sorteada, surdina: !surdina }
              : m.musica_sorteada,
        }));
        return { ...anterior, esteira_ritualistica: esteira };
      });
      feedbackTatil.erro();
      setAvisoErro(extrairMensagemErro(e, 'Não foi possível salvar a configuração de surdina da música.'));
    }
  };

  const alternarSurdinaMomentoPermanente = async (emSurdina: boolean) => {
    if (!sessaoSelecionadaId || !momentoAtual) return;
    setSurdinaAtiva(emSurdina);
    const eventoId = momentoAtual.evento_id;

    setDadosSessao((antiga) => {
      if (!antiga) return antiga;
      const esteira = antiga.esteira_ritualistica.map((m) =>
        m.evento_id === eventoId ? { ...m, em_surdina: emSurdina } : m
      );
      return { ...antiga, esteira_ritualistica: esteira };
    });

    try {
      await clienteHttp.patch(
        `/player/sessao/${sessaoSelecionadaId}/momento/${eventoId}/surdina?em_surdina=${emSurdina}`
      );
    } catch (e) {
      console.error('Erro ao salvar surdina do momento:', e);
      setAvisoErro('Não foi possível salvar a configuração de surdina deste momento.');
      setDadosSessao((antiga) => {
        if (!antiga) return antiga;
        const esteira = antiga.esteira_ritualistica.map((m) =>
          m.evento_id === eventoId ? { ...m, em_surdina: !emSurdina } : m
        );
        return { ...antiga, esteira_ritualistica: esteira };
      });
      setSurdinaAtiva(!emSurdina);
    }
  };

  const onSeek = (novoTempo: number) => {
    if (musicaAtual?.tipo_midia === 'ARQUIVO_LOCAL' && audioRef.current) {
      audioRef.current.currentTime = novoTempo;
      setTempoAtual(novoTempo);
    } else if (musicaAtual?.tipo_midia === 'YOUTUBE' && ytPlayerRef.current && ytProntoRef.current) {
      try {
        ytPlayerRef.current.seekTo(novoTempo, true);
        setTempoAtual(novoTempo);
      } catch {
        /* ignora seek antes do player estar pronto */
      }
    }
  };

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

      {/* Cabeçalho da Aplicação com Menu Sanduíche à esquerda e Título da Sessão centralizado */}
      <header className="relative z-30 flex items-center justify-between px-3 sm:px-4 py-2.5 bg-[#050A14]/95 backdrop-blur-md border-b border-macaonico-dourado/20 shrink-0 shadow-sm">
        {/* Lado Esquerdo: Menu Sanduíche */}
        <div className="flex items-center w-10 sm:w-16">
          <button
            type="button"
            onClick={() => {
              feedbackTatil.clique();
              window.dispatchEvent(new CustomEvent('harmonia:abrir-menu'));
            }}
            className="p-1.5 -ml-1 text-macaonico-dourado hover:text-[#FDE68A] hover:bg-white/5 rounded-lg transition-all active:scale-95 cursor-pointer flex items-center justify-center"
            title="Abrir Menu de Navegação"
            aria-label="Menu Sanduíche"
          >
            <Menu className="w-5 h-5 sm:w-6 sm:h-6" />
          </button>
        </div>

        {/* Centro: Título da Sessão Ritualística Centralizado */}
        <div className="flex-1 min-w-0 text-center px-1">
          <h1 className="font-cinzel font-bold text-xs sm:text-sm text-macaonico-dourado tracking-[0.14em] sm:tracking-[0.18em] uppercase truncate drop-shadow-[0_1px_3px_rgba(0,0,0,0.85)]">
            {dadosSessao?.sessao_nome || 'SESSÃO MAGNA DE INICIAÇÃO'}
          </h1>
        </div>

        {/* Lado Direito: Espaçador simétrico para garantir alinhamento central */}
        <div className="flex items-center justify-end w-10 sm:w-16" />
      </header>

      {/* Banner ativo do Modo Interlúdio / Fundo com botão de retorno */}
      {modoInterludioAtivo && musicaFundoAtiva && (
        <div className="relative z-20 bg-gradient-to-r from-yellow-950/80 via-black to-yellow-950/80 border-b border-macaonico-dourado/40 px-3 sm:px-6 py-2 flex items-center justify-between gap-3 shrink-0 shadow-lg animate-in slide-in-from-top duration-200">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-7 h-7 rounded-lg bg-macaonico-dourado/20 border border-macaonico-dourado/40 flex items-center justify-center shrink-0 text-macaonico-dourado">
              <Volume2 className="w-4 h-4 animate-pulse" />
            </div>
            <div className="min-w-0">
              <span className="text-[10px] text-macaonico-dourado uppercase tracking-wider font-bold block">
                Modo Interlúdio / Fundo Ativo
              </span>
              <p className="text-xs font-semibold text-white truncate">
                {musicaFundoAtiva.titulo}
                {musicaFundoAtiva.autor_artista ? ` • ${musicaFundoAtiva.autor_artista}` : ''}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={alternarPlayPauseFundo}
              className="p-1.5 rounded-lg bg-white/10 text-white hover:bg-white/20 transition-colors"
              title={tocando ? 'Pausar' : 'Tocar'}
            >
              {tocando ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 fill-current" />}
            </button>

            <button
              type="button"
              onClick={retornarParaEsteira}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-macaonico-dourado hover:bg-yellow-400 text-black font-bold text-xs shadow-md transition-all"
              title="Retomar a esteira ritualística de onde parou"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Retomar Esteira</span>
            </button>
          </div>
        </div>
      )}

      {/* Palco de Carrosséis 3D: momentos (horizontal) e faixas (vertical) */}
      {dadosSessao && dadosSessao.esteira_ritualistica.length > 0 ? (
        <div className="relative z-10 flex-1 min-h-0 flex flex-col">
          <PalcoCarrosseis
            momentos={dadosSessao.esteira_ritualistica}
            indiceMomento={indiceAtual}
            tocando={tocando && !modoInterludioAtivo}
            progressoFaixa={duracaoTotal > 0 ? tempoAtual / duracaoTotal : 0}
            tempoAtual={tempoAtual}
            duracaoTotal={duracaoTotal}
            volumeExecucao={
              surdinaAtiva
                ? Math.max(1, Math.round((volumeGeral * percentualSurdina) / 100))
                : volumeGeral
            }
            surdinaAtiva={surdinaAtiva}
            onAbrirConfiguracoesSurdina={() => setModalSurdinaCalibragemAberto(true)}
            onMudarMomento={setIndiceAtual}
            onTrocarFaixa={trocarFaixaDoMomento}
            onAlternarPlayPause={alternarPlayPause}
            onAlternarPreferencia={alternarPreferencia}
            onAbrirUpload={() => setModalUploadAberto(true)}
            onAlterarVolume={alterarVolumeGeral}
          />
        </div>
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

      {/* Eixo Inferior: Barra de progresso, controles táteis e botões de apoio com modais */}
      <div className="shrink-0 bg-macaonico-surface relative z-30">
        <MasonicControls
          tocando={tocando}
          onPlayPause={alternarPlayPause}
          onPrevTrack={() => navegarFaixa(-1)}
          onNextTrack={() => navegarFaixa(1)}
          onPrevMoment={indiceAtual > 0 ? voltarAnterior : undefined}
          onNextMoment={dadosSessao && indiceAtual < dadosSessao.esteira_ritualistica.length - 1 ? avancarProximo : undefined}
          tempoAtual={tempoAtual}
          duracaoTotal={duracaoTotal}
          onSeek={onSeek}
          momentoAtual={momentoAtual ?? null}
          proximoMomento={dadosSessao?.esteira_ritualistica[indiceAtual + 1] ?? null}
          surdinaAtiva={surdinaAtiva}
          onAlternarSurdina={() => setSurdinaAtiva((v) => !v)}
          percentualSurdina={percentualSurdina}
          onAlterarPercentualSurdina={atualizarPercentualSurdina}
          musicaAtualSurdina={Boolean(musicaAtual?.surdina)}
          onAlternarMusicaSurdinaPermanente={alternarMusicaSurdinaPermanente}
          onAlternarMomentoSurdinaPermanente={alternarSurdinaMomentoPermanente}
          volumeGeral={volumeGeral}
          onAjustarVolumeRelativo={ajustarVolumeRelativo}
          onAlterarVolumeGeral={alterarVolumeGeral}
          modalSurdinaAbertoControlado={modalSurdinaCalibragemAberto}
          onAlternarModalSurdinaControlado={setModalSurdinaCalibragemAberto}
        />
      </div>

      {/* Reprodutor YouTube Iframe mantido em off-screen ativo (sem display:none para permitir reprodução de áudio sem bloqueio do navegador) */}
      <div
        id="yt-player-container"
        style={{
          position: 'fixed',
          bottom: '10px',
          right: '10px',
          width: '64px',
          height: '64px',
          opacity: 0.01,
          pointerEvents: 'none',
          zIndex: 0,
        }}
      />

      {/* Modal de Composição de Músicas do Momento (Busca no Acervo + Upload) */}
      {modalUploadAberto && dadosSessao && (
        <ModalComporMomento
          eventoId={dadosSessao.esteira_ritualistica[indiceAtual]?.evento_id}
          nomeMomento={dadosSessao.esteira_ritualistica[indiceAtual]?.evento_nome}
          sessaoId={sessaoSelecionadaId || undefined}
          onFechar={() => setModalUploadAberto(false)}
          onSalvo={async () => {
            // Recarrega as candidatas (já filtradas pela Loja) preservando as escolhas atuais
            if (sessaoSelecionadaId) await carregarEsteira(sessaoSelecionadaId, true);
          }}
        />
      )}

      {/* Modal / Gaveta de Interlúdio / Trilha de Fundo */}
      <ModalInterludioFundo
        aberto={modalInterludioAberto}
        onFechar={() => setModalInterludioAberto(false)}
        onSelecionarTrilhaFundo={(musica) => {
          ativarTrilhaFundo(musica);
        }}
        musicaFundoAtiva={musicaFundoAtiva}
        tocandoFundo={modoInterludioAtivo && tocando}
        onAlternarPlayPauseFundo={alternarPlayPauseFundo}
        onRetomarEsteira={retornarParaEsteira}
      />

      {/* Aviso transitório de erro */}
      {avisoErro && (
        <div
          role="alert"
          className="harmonia-aviso fixed bottom-24 left-1/2 z-50 max-w-[90vw] -translate-x-1/2 rounded-xl border border-red-400/40 bg-red-950/90 px-4 py-2.5 text-xs font-medium text-red-100 shadow-xl backdrop-blur"
        >
          {avisoErro}
        </div>
      )}
    </div>
  );
};
