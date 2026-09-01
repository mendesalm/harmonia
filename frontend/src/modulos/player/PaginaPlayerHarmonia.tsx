import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Sessao, SessaoPlayerExecucao, Musica } from '../../compartilhado/tipos';
import clienteHttp from '../../compartilhado/api/cliente_http';
import { extrairIdYoutube } from '../../compartilhado/formatadores/midia';

import { MasonicTimeline } from './componentes/MasonicTimeline';
import { MasonicTrackList } from './componentes/MasonicTrackList';
import { MasonicControls } from './componentes/MasonicControls';

declare global {
  interface Window {
    YT: any;
    onYouTubeIframeAPIReady: any;
  }
}

export const PaginaPlayerHarmonia: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const sessaoParamId = searchParams.get('sessao');

  const [sessoes, setSessoes] = useState<Sessao[]>([]);
  const [sessaoSelecionadaId, setSessaoSelecionadaId] = useState<string>(sessaoParamId || '');
  const [dadosSessao, setDadosSessao] = useState<SessaoPlayerExecucao | null>(null);
  
  const [indiceAtual, setIndiceAtual] = useState(0);
  const [musicasDoMomento, setMusicasDoMomento] = useState<Musica[]>([]);
  
  // Audio state
  const [tocando, setTocando] = useState(false);
  const [tempoAtual, setTempoAtual] = useState(0);
  const [duracaoTotal, setDuracaoTotal] = useState(0);
  
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const ytPlayerRef = useRef<any>(null);
  
  const dadosSessaoRef = useRef<SessaoPlayerExecucao | null>(null);
  dadosSessaoRef.current = dadosSessao;

  useEffect(() => {
    carregarSessoes();
    const tag = document.createElement('script');
    tag.src = "https://www.youtube.com/iframe_api";
    const firstScriptTag = document.getElementsByTagName('script')[0];
    if (firstScriptTag && firstScriptTag.parentNode) {
      firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);
    }
  }, []);

  useEffect(() => {
    if (sessaoSelecionadaId) {
      carregarEsteira(sessaoSelecionadaId);
    } else if (sessoes.length > 0) {
      setSessaoSelecionadaId(sessoes[0].id);
      setSearchParams({ sessao: sessoes[0].id });
    }
  }, [sessaoSelecionadaId, sessoes]);

  const carregarSessoes = async () => {
    try {
      const res = await clienteHttp.get('/sessoes');
      setSessoes(res.data);
    } catch (e) {}
  };

  const carregarEsteira = async (idSessao: string) => {
    try {
      const res = await clienteHttp.get(`/player/sessao/${idSessao}`);
      setDadosSessao(res.data);
      if (res.data.esteira_ritualistica.length > 0) {
        setIndiceAtual(0);
      }
    } catch (e) {}
  };

  useEffect(() => {
    if (!dadosSessao || !dadosSessao.esteira_ritualistica[indiceAtual]) return;
    const eventoId = dadosSessao.esteira_ritualistica[indiceAtual].evento_id;
    carregarMusicasDoMomento(eventoId);
  }, [indiceAtual, dadosSessao]);

  const carregarMusicasDoMomento = async (eventoId: string) => {
    try {
      const res = await clienteHttp.get(`/musicas?evento_id=${eventoId}`);
      // Ensure the currently selected music is at the top or in the list
      setMusicasDoMomento(res.data);
    } catch (e) {}
  };

  const momentoAtual = dadosSessao?.esteira_ritualistica[indiceAtual];
  const musicaAtual = momentoAtual?.musica_sorteada;

  // Sync Audio source when active track changes
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
    
    // Auto-advance is now implicit if they let it finish
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
    // Para simplificar, "Pular Faixa" seleciona a próxima da lista deste momento
    if (!musicaAtual || musicasDoMomento.length <= 1) return;
    const idx = musicasDoMomento.findIndex(m => m.id === musicaAtual.id);
    const proxIdx = (idx + 1) % musicasDoMomento.length;
    selecionarMusicaDaLista(proxIdx);
  };

  const voltarFaixa = () => {
    if (!musicaAtual || musicasDoMomento.length <= 1) return;
    const idx = musicasDoMomento.findIndex(m => m.id === musicaAtual.id);
    const prevIdx = idx <= 0 ? musicasDoMomento.length - 1 : idx - 1;
    selecionarMusicaDaLista(prevIdx);
  };

  const selecionarMusicaDaLista = (idx: number) => {
    if (!dadosSessao || !musicasDoMomento[idx]) return;
    const novaSessao = { ...dadosSessao };
    novaSessao.esteira_ritualistica[indiceAtual].musica_sorteada = musicasDoMomento[idx];
    setDadosSessao(novaSessao);
    // When they manually select a track, auto-play it
    setTimeout(() => {
      setTocando(true);
      if (musicasDoMomento[idx].tipo_midia === 'ARQUIVO_LOCAL' && audioRef.current) {
        audioRef.current.play().catch(()=>{});
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

  // Find the index of the currently active track in the full list
  const indiceTrackAtivo = musicasDoMomento.findIndex(m => m.id === musicaAtual?.id);
  const safeIndiceTrack = indiceTrackAtivo >= 0 ? indiceTrackAtivo : 0;
  
  const progressoPercentual = duracaoTotal > 0 ? (tempoAtual / duracaoTotal) * 100 : 0;

  return (
    <div className="h-full w-full flex flex-col bg-macaonico-surface overflow-hidden text-slate-100 relative p-1 pb-0">
      
      {/* Outer Golden Border to match the design */}
      <div className="absolute inset-1 border-[1.5px] border-macaonico-dourado/40 pointer-events-none z-50 rounded-sm">
         {/* Corner Decorations */}
         <div className="absolute top-0 left-0 w-4 h-4 border-t-[1.5px] border-l-[1.5px] border-macaonico-dourado -translate-x-[2px] -translate-y-[2px]"></div>
         <div className="absolute top-0 right-0 w-4 h-4 border-t-[1.5px] border-r-[1.5px] border-macaonico-dourado translate-x-[2px] -translate-y-[2px]"></div>
         <div className="absolute bottom-0 left-0 w-4 h-4 border-b-[1.5px] border-l-[1.5px] border-macaonico-dourado -translate-x-[2px] translate-y-[2px]"></div>
         <div className="absolute bottom-0 right-0 w-4 h-4 border-b-[1.5px] border-r-[1.5px] border-macaonico-dourado translate-x-[2px] translate-y-[2px]"></div>
      </div>

      {/* Global Background Texture */}
      <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/black-scales.png')] opacity-20 pointer-events-none z-0"></div>

      {/* HTML5 Audio */}
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

      {/* Top Axis: Moments */}
      {dadosSessao && (
        <MasonicTimeline
          momentos={dadosSessao.esteira_ritualistica}
          indiceAtual={indiceAtual}
          onMudarMomento={setIndiceAtual}
        />
      )}

      {/* Center Axis: Tracks (3D Vertical) */}
      <div className="flex-1 overflow-hidden relative">
        <MasonicTrackList
          musicas={musicasDoMomento}
          indiceAtivo={safeIndiceTrack}
          tocando={tocando}
          onSelecionarMusica={selecionarMusicaDaLista}
          progressoPercentual={progressoPercentual}
        />
      </div>

      {/* Bottom Axis: Controls */}
      <div className="shrink-0 bg-macaonico-surface relative z-30">
        <MasonicControls
          tocando={tocando}
          onPlayPause={alternarPlayPause}
          onPrevTrack={voltarFaixa}
          onNextTrack={pularFaixa}
          onPrevMoment={voltarAnterior}
          onNextMoment={avancarProximo}
          tempoRestanteMomento="04:12" 
          tempoAtual={tempoAtual}
          duracaoTotal={duracaoTotal}
          onSeek={onSeek}
        />
      </div>

      {/* Hidden Youtube Frame for playback */}
      {musicaAtual?.tipo_midia === 'YOUTUBE' && musicaAtual.link_externo && (
        <div className="hidden">
           <iframe 
             id="yt-player-hidden" 
             src={`https://www.youtube.com/embed/${extrairIdYoutube(musicaAtual.link_externo)}?enablejsapi=1&autoplay=0&controls=0`} 
             allow="autoplay" 
           ></iframe>
        </div>
      )}

    </div>
  );
};
