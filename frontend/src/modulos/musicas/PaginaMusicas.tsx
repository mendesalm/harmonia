import React, { useState, useEffect, useRef } from 'react';
import { Plus, Search, Play, Pause, Trash2, Music, ExternalLink, Youtube, Disc, X, Edit2 } from 'lucide-react';
import { Musica, Evento } from '../../compartilhado/tipos';
import clienteHttp from '../../compartilhado/api/cliente_http';
import { useTenant } from '../../compartilhado/contextos/ContextoTenant';
import { ModalUploadMusica } from './ModalUploadMusica';
import { extrairIdYoutube, extrairEmbedSpotify } from '../../compartilhado/formatadores/midia';

export const PaginaMusicas: React.FC = () => {
  const { lojaAtiva } = useTenant();
  const [musicas, setMusicas] = useState<Musica[]>([]);
  const [eventos, setEventos] = useState<Evento[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [busca, setBusca] = useState('');
  const [filtroEvento, setFiltroEvento] = useState('');
  const [modalUploadAberto, setModalUploadAberto] = useState(false);

  // Player de Prévia
  const [musicaTocandoId, setMusicaTocandoId] = useState<string | null>(null);
  const [musicaStreamingPrevia, setMusicaStreamingPrevia] = useState<Musica | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const carregarDados = async () => {
    try {
      setCarregando(true);
      const params: any = {};
      if (lojaAtiva) params.organizacao_id = lojaAtiva.id;
      if (filtroEvento) params.evento_id = filtroEvento;

      const [resMusicas, resEventos] = await Promise.all([
        clienteHttp.get<Musica[]>('/musicas', { params }),
        clienteHttp.get<Evento[]>('/eventos', { params: { organizacao_id: lojaAtiva?.id, incluir_globais: true } })
      ]);

      setMusicas(resMusicas.data);
      setEventos(resEventos.data);
    } catch (err) {
      console.error('Erro ao carregar acervo de músicas:', err);
    } finally {
      setCarregando(false);
    }
  };

  useEffect(() => {
    carregarDados();
  }, [lojaAtiva, filtroEvento]);

  const alternarPlayerPrevia = (musica: Musica) => {
    if (musica.tipo_midia === 'YOUTUBE' || musica.tipo_midia === 'SPOTIFY') {
      if (audioRef.current) {
        audioRef.current.pause();
        setMusicaTocandoId(null);
      }
      setMusicaStreamingPrevia(musica);
      return;
    }

    if (!audioRef.current) return;

    if (musicaTocandoId === musica.id) {
      audioRef.current.pause();
      setMusicaTocandoId(null);
    } else {
      if (musica.caminho_arquivo) {
        audioRef.current.src = musica.caminho_arquivo;
        audioRef.current.play().catch((e) => console.error('Erro de reprodução:', e));
        setMusicaTocandoId(musica.id);
      }
    }
  };

  const deletarMusica = async (musica: Musica) => {
    if (!window.confirm(`Tem certeza que deseja DELETAR PERMANENTEMENTE "${musica.titulo}" do Acervo Global? O arquivo também será excluído do servidor.`)) return;

    try {
      if (musicaTocandoId === musica.id && audioRef.current) {
        audioRef.current.pause();
        setMusicaTocandoId(null);
      }
      const params = lojaAtiva ? { organizacao_id: lojaAtiva.id } : {};
      await clienteHttp.delete(`/musicas/${musica.id}`, { params });
      await carregarDados();
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Erro ao deletar música.');
    }
  };

  const handleEditarMusica = async (musica: Musica) => {
    const novoTitulo = window.prompt("Digite o novo título da música:", musica.titulo);
    if (novoTitulo === null) return;
    const novoAutor = window.prompt("Digite o novo autor/artista (opcional):", musica.autor_artista || '') || null;
    
    try {
      await clienteHttp.put(`/musicas/${musica.id}`, {
        titulo: novoTitulo,
        autor_artista: novoAutor
      });
      carregarDados();
    } catch (err: any) {
      alert("Erro ao editar música: " + (err.response?.data?.detail || err.message));
    }
  };

  const musicasFiltradas = musicas.filter((m) =>
    m.titulo.toLowerCase().includes(busca.toLowerCase()) ||
    (m.autor_artista && m.autor_artista.toLowerCase().includes(busca.toLowerCase()))
  );

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Elemento de áudio invisível para prévia */}
      <audio
        ref={audioRef}
        onEnded={() => setMusicaTocandoId(null)}
        className="hidden"
      />

      {/* Cabeçalho */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-wide fonte-ritual flex items-center gap-3">
            Acervo Musical <span className="text-xs px-2.5 py-1 rounded-lg bg-macaonico-cianoSigma/10 text-macaonico-cianoSigma border border-macaonico-cianoSigma/20 font-sans">Mestre de Harmonia</span>
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Biblioteca completa de áudios locais e streamings vinculados aos momentos litúrgicos.
          </p>
        </div>

        <button
          onClick={() => setModalUploadAberto(true)}
          className="flex items-center justify-center gap-2 bg-gradient-to-r from-macaonico-cianoSigma to-primaria-600 hover:from-cyan-400 hover:to-primaria-500 text-black font-bold px-5 py-2.5 rounded-xl shadow-lg shadow-cyan-500/20 transition-all cursor-pointer"
        >
          <Plus className="w-5 h-5" />
          <span>+ Adicionar Música / Streaming</span>
        </button>
      </div>

      {/* Filtros e Busca */}
      <div className="vidro-escuro rounded-2xl p-4 mb-6 flex flex-col md:flex-row gap-4 justify-between items-center">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
          <input
            type="text"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar por título ou compositor..."
            className="w-full bg-primaria-800/80 border border-white/10 rounded-xl pl-10 pr-4 py-2 text-sm text-white focus:border-macaonico-cianoSigma outline-none placeholder:text-slate-500"
          />
        </div>

        <div className="w-full md:w-72">
          <select
            value={filtroEvento}
            onChange={(e) => setFiltroEvento(e.target.value)}
            className="w-full bg-primaria-800/80 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:border-macaonico-cianoSigma outline-none"
          >
            <option value="">-- Filtrar por Momento Ritualístico --</option>
            {eventos.map((ev) => (
              <option key={ev.id} value={ev.id}>
                {ev.nome}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Tabela de Músicas */}
      {carregando ? (
        <div className="py-20 text-center text-slate-400">Carregando acervo de músicas...</div>
      ) : musicasFiltradas.length === 0 ? (
        <div className="vidro-escuro rounded-2xl p-12 text-center text-slate-400">
          Nenhuma música encontrada no acervo. Clique em "Adicionar Música" para cadastrar áudios ou links.
        </div>
      ) : (
        <div className="vidro-escuro rounded-3xl overflow-hidden border border-white/10">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-white/10 bg-white/5 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  <th className="py-3.5 px-4 w-12 text-center">Play</th>
                  <th className="py-3.5 px-4">Título & Artista</th>
                  <th className="py-3.5 px-4">Tipo de Mídia</th>
                  <th className="py-3.5 px-4">Momentos Litúrgicos (Playlists)</th>
                  <th className="py-3.5 px-4 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 text-sm">
                {musicasFiltradas.map((m) => {
                  const tocandoLocal = musicaTocandoId === m.id;
                  return (
                    <tr key={m.id} className="hover:bg-white/5 transition-colors group">
                      {/* Botão Play / Pause */}
                      <td className="py-3.5 px-4 text-center">
                        <button
                          onClick={() => alternarPlayerPrevia(m)}
                          className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all cursor-pointer ${
                            tocandoLocal
                              ? 'bg-macaonico-cianoSigma text-black shadow-md shadow-cyan-500/30 animate-pulse'
                              : 'bg-white/5 hover:bg-white/15 text-white'
                          }`}
                        >
                          {tocandoLocal ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 fill-current ml-0.5" />}
                        </button>
                      </td>

                      {/* Título e Artista */}
                      <td className="py-3.5 px-4">
                        <p className="font-bold text-white group-hover:text-macaonico-cianoSigma transition-colors">
                          {m.titulo}
                        </p>
                        <p className="text-xs text-slate-400">
                          {m.autor_artista || 'Compositor não informado'}
                        </p>
                      </td>

                      {/* Tipo de Mídia */}
                      <td className="py-3.5 px-4">
                        {m.tipo_midia === 'ARQUIVO_LOCAL' ? (
                          <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-300 border border-emerald-500/30">
                            <Disc className="w-3.5 h-3.5" /> Arquivo Local (MP3)
                          </span>
                        ) : m.tipo_midia === 'YOUTUBE' ? (
                          <button
                            onClick={() => alternarPlayerPrevia(m)}
                            className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-lg bg-red-500/10 text-red-300 border border-red-500/30 hover:bg-red-500/20 transition-colors cursor-pointer"
                          >
                            <Youtube className="w-3.5 h-3.5" /> YouTube <ExternalLink className="w-3 h-3" />
                          </button>
                        ) : (
                          <button
                            onClick={() => alternarPlayerPrevia(m)}
                            className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-lg bg-green-500/10 text-green-300 border border-green-500/30 hover:bg-green-500/20 transition-colors cursor-pointer"
                          >
                            <Music className="w-3.5 h-3.5" /> Spotify <ExternalLink className="w-3 h-3" />
                          </button>
                        )}
                      </td>

                      {/* Eventos Associados */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-1.5 flex-wrap max-w-md">
                          {m.eventos && m.eventos.length > 0 ? (
                            m.eventos.map((ev) => (
                              <span
                                key={ev.evento_id}
                                className="text-[11px] font-medium px-2 py-0.5 rounded-md bg-white/10 text-slate-200 border border-white/10"
                              >
                                {ev.evento_nome}
                              </span>
                            ))
                          ) : (
                            <span className="text-xs text-slate-500 italic">Sem eventos vinculados</span>
                          )}
                        </div>
                      </td>

                      {/* Ações */}
                      <td className="py-3.5 px-4 text-right flex justify-end gap-1">
                        <button
                          onClick={() => handleEditarMusica(m)}
                          className="p-2 rounded-lg text-blue-400 hover:text-blue-300 hover:bg-blue-500/10 transition-colors cursor-pointer"
                          title="Editar Música"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => deletarMusica(m)}
                          className="p-2 rounded-lg text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-colors cursor-pointer"
                          title="Excluir Música"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal de Prévia de Streaming (YouTube / Spotify) */}
      {musicaStreamingPrevia && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="vidro-destaque rounded-3xl w-full max-w-xl p-6 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-white/10 mb-4">
              <div>
                <span className="text-[10px] font-bold text-macaonico-cianoSigma uppercase tracking-wider">
                  Prévia de Streaming
                </span>
                <h3 className="text-lg font-bold text-white truncate">
                  {musicaStreamingPrevia.titulo}
                </h3>
              </div>
              <button
                onClick={() => setMusicaStreamingPrevia(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {musicaStreamingPrevia.tipo_midia === 'YOUTUBE' && (
              <div className="rounded-2xl overflow-hidden aspect-video bg-black/80 shadow-2xl mb-4 border border-white/10">
                <iframe
                  title={musicaStreamingPrevia.titulo}
                  src={`https://www.youtube.com/embed/${extrairIdYoutube(musicaStreamingPrevia.link_externo)}?autoplay=1&rel=0`}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  className="w-full h-full"
                />
              </div>
            )}

            {musicaStreamingPrevia.tipo_midia === 'SPOTIFY' && (
              <div className="rounded-2xl overflow-hidden mb-4">
                <iframe
                  title={musicaStreamingPrevia.titulo}
                  src={extrairEmbedSpotify(musicaStreamingPrevia.link_externo) || ''}
                  width="100%"
                  height="152"
                  allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
                  loading="lazy"
                  className="rounded-2xl"
                />
              </div>
            )}

            <div className="flex items-center justify-between pt-2">
              <a
                href={musicaStreamingPrevia.link_externo}
                target="_blank"
                rel="noreferrer"
                className="text-xs text-macaonico-cianoSigma hover:underline flex items-center gap-1"
              >
                Abrir link original <ExternalLink className="w-3 h-3" />
              </a>

              <button
                onClick={() => setMusicaStreamingPrevia(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-white/10 hover:bg-white/20 text-white transition-colors"
              >
                Fechar Prévia
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Upload */}
      {modalUploadAberto && (
        <ModalUploadMusica
          onFechar={() => setModalUploadAberto(false)}
          onSalvo={carregarDados}
        />
      )}
    </div>
  );
};
