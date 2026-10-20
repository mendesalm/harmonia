import React, { useState, useEffect, useRef } from 'react';
import {
  Plus,
  Search,
  Play,
  Pause,
  Trash2,
  Music,
  ExternalLink,
  Youtube,
  Disc,
  X,
  Edit2,
} from 'lucide-react';
import { Musica, Evento } from '../../compartilhado/tipos';
import clienteHttp from '../../compartilhado/api/cliente_http';
import { useTenant } from '../../compartilhado/contextos/ContextoTenant';
import { ModalUploadMusica } from './ModalUploadMusica';
import { extrairIdYoutube, extrairEmbedSpotify } from '../../compartilhado/formatadores/midia';

/**
 * Página do Acervo Musical da Loja e Global.
 * Exibe cards otimizados para toque em telas móveis (`md:hidden`) e tabela completa no desktop (`hidden md:block`).
 */
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
        clienteHttp.get<Evento[]>('/eventos', {
          params: { organizacao_id: lojaAtiva?.id, incluir_globais: true },
        }),
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
      const urlArquivo = musica.arquivo_url || (musica as any).caminho_arquivo;
      if (urlArquivo) {
        const baseURL = clienteHttp.defaults.baseURL
          ? clienteHttp.defaults.baseURL.replace('/api/v1', '')
          : '';
        audioRef.current.src = `${baseURL}${urlArquivo}`;
        audioRef.current.play().catch((e) => console.error('Erro de reprodução:', e));
        setMusicaTocandoId(musica.id);
      }
    }
  };

  const deletarMusica = async (musica: Musica) => {
    if (
      !window.confirm(
        `Tem certeza que deseja excluir "${musica.titulo}" do acervo?`
      )
    )
      return;

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

  const [musicaEmEdicao, setMusicaEmEdicao] = useState<Musica | null>(null);
  const [tituloEdit, setTituloEdit] = useState('');
  const [autorEdit, setAutorEdit] = useState('');

  const abrirModalEditar = (musica: Musica) => {
    setMusicaEmEdicao(musica);
    setTituloEdit(musica.titulo);
    setAutorEdit(musica.autor_artista || '');
  };

  const salvarEdicaoMusica = async () => {
    if (!musicaEmEdicao) return;
    try {
      await clienteHttp.put(`/musicas/${musicaEmEdicao.id}`, {
        titulo: tituloEdit,
        autor_artista: autorEdit || null,
      });
      setMusicaEmEdicao(null);
      carregarDados();
    } catch (err: any) {
      alert('Erro ao editar música: ' + (err.response?.data?.detail || err.message));
    }
  };

  const musicasFiltradas = musicas.filter((m) => {
    const matchTexto =
      m.titulo.toLowerCase().includes(busca.toLowerCase()) ||
      (m.autor_artista && m.autor_artista.toLowerCase().includes(busca.toLowerCase()));
    if (!matchTexto) return false;
    if (filtroEvento) {
      return m.eventos?.some((ev) => ev.evento_id === filtroEvento);
    }
    return true;
  });

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-6 py-4 sm:py-8">
      <audio ref={audioRef} onEnded={() => setMusicaTocandoId(null)} className="hidden" />

      {/* Cabeçalho */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4 mb-5 sm:mb-8">
        <div>
          <h1 className="text-xl sm:text-3xl font-bold text-white tracking-wide fonte-ritual flex flex-wrap items-center gap-2">
            <span>Acervo Musical</span>
            <span className="text-[11px] px-2.5 py-0.5 rounded-lg bg-macaonico-dourado/15 text-macaonico-dourado border border-macaonico-dourado/30 font-sans">
              Mestre de Harmonia
            </span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Biblioteca de áudios locais e streamings vinculados aos momentos litúrgicos.
          </p>
        </div>

        <button
          onClick={() => setModalUploadAberto(true)}
          className="w-full sm:w-auto flex items-center justify-center gap-2 bg-gradient-to-r from-yellow-600 via-macaonico-dourado to-yellow-600 hover:from-yellow-500 hover:to-yellow-400 text-black font-bold px-5 py-3 rounded-xl shadow-lg shadow-macaonico-dourado/20 transition-all cursor-pointer text-sm shrink-0"
        >
          <Plus className="w-5 h-5" />
          <span>Adicionar Música</span>
        </button>
      </div>

      {/* Filtros e Busca */}
      <div className="vidro-escuro rounded-2xl p-3 sm:p-4 mb-5 flex flex-col md:flex-row gap-3 justify-between items-stretch md:items-center">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
          <input
            type="text"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar por título ou compositor..."
            className="w-full bg-primaria-800/80 border border-white/10 rounded-xl pl-10 pr-4 py-2 text-sm text-white focus:border-macaonico-dourado outline-none placeholder:text-slate-500"
          />
        </div>

        <div className="w-full md:w-72">
          <select
            value={filtroEvento}
            onChange={(e) => setFiltroEvento(e.target.value)}
            className="w-full bg-primaria-800/80 border border-white/10 rounded-xl px-3 py-2 text-xs sm:text-sm text-white focus:border-macaonico-dourado outline-none"
          >
            <option value="">-- Todos os Momentos Ritualísticos --</option>
            {eventos.map((ev) => (
              <option key={ev.id} value={ev.id}>
                {ev.nome}
              </option>
            ))}
          </select>
        </div>
      </div>

      {carregando ? (
        <div className="py-16 text-center text-slate-400">Carregando acervo de músicas...</div>
      ) : musicasFiltradas.length === 0 ? (
        <div className="vidro-escuro rounded-2xl p-8 sm:p-12 text-center text-slate-400">
          Nenhuma música encontrada no acervo. Toque em "Adicionar Música" para cadastrar áudios ou links.
        </div>
      ) : (
        <>
          {/* Visão Mobile em Cards (sem rolagem horizontal truncada) */}
          <div className="md:hidden space-y-3">
            {musicasFiltradas.map((m) => {
              const tocandoEsta = musicaTocandoId === m.id;
              return (
                <div
                  key={m.id}
                  className="vidro-escuro rounded-2xl p-4 border border-white/10 flex flex-col gap-3"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <button
                        type="button"
                        onClick={() => alternarPlayerPrevia(m)}
                        className={`w-11 h-11 shrink-0 flex items-center justify-center rounded-full transition-all shadow-md ${
                          tocandoEsta
                            ? 'bg-macaonico-dourado text-black'
                            : 'bg-primaria-700/80 text-macaonico-dourado border border-macaonico-dourado/30'
                        }`}
                      >
                        {tocandoEsta ? (
                          <Pause className="w-5 h-5 fill-current" />
                        ) : (
                          <Play className="w-5 h-5 fill-current ml-0.5" />
                        )}
                      </button>

                      <div className="min-w-0 flex-1">
                        <p className="font-bold text-white text-sm truncate">{m.titulo}</p>
                        <p className="text-xs text-slate-400 truncate">
                          {m.autor_artista || 'Compositor não informado'}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={() => abrirModalEditar(m)}
                        className="p-2.5 rounded-lg text-blue-400 hover:bg-blue-500/10"
                        aria-label="Editar Música"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => deletarMusica(m)}
                        className="p-2.5 rounded-lg text-red-400 hover:bg-red-500/10"
                        aria-label="Excluir Música"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {m.eventos && m.eventos.length > 0 && (
                    <div className="flex items-center gap-1.5 flex-wrap pt-2 border-t border-white/5">
                      {m.eventos.slice(0, 3).map((ev) => (
                        <span
                          key={ev.evento_id}
                          className="text-[10px] font-medium px-2 py-0.5 rounded-md bg-white/10 text-slate-200 border border-white/10 truncate max-w-full"
                        >
                          {ev.evento_nome}
                        </span>
                      ))}
                      {m.eventos.length > 3 && (
                        <span className="text-[10px] text-slate-400">
                          +{m.eventos.length - 3} momentos
                        </span>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Visão Desktop em Tabela */}
          <div className="hidden md:block vidro-escuro rounded-3xl overflow-hidden border border-white/10">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-white/10 bg-white/5 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                    <th className="py-3.5 px-4 w-12 text-center">Play</th>
                    <th className="py-3.5 px-4">Título & Artista</th>
                    <th className="py-3.5 px-4">Tipo de Mídia</th>
                    <th className="py-3.5 px-4">Momentos Litúrgicos</th>
                    <th className="py-3.5 px-4 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 text-sm">
                  {musicasFiltradas.map((m) => (
                    <tr key={m.id} className="hover:bg-white/5 transition-colors group">
                      <td className="py-3.5 px-4">
                        <button
                          onClick={() => alternarPlayerPrevia(m)}
                          className={`w-9 h-9 flex-shrink-0 flex items-center justify-center rounded-full transition-all shadow-lg ${
                            musicaTocandoId === m.id
                              ? 'bg-macaonico-dourado text-black'
                              : 'bg-primaria-700/80 hover:bg-macaonico-dourado/20 hover:text-macaonico-dourado text-white'
                          }`}
                        >
                          {musicaTocandoId === m.id ? (
                            <Pause className="w-4 h-4 fill-current" />
                          ) : (
                            <Play className="w-4 h-4 fill-current ml-0.5" />
                          )}
                        </button>
                      </td>

                      <td className="py-3.5 px-4">
                        <p className="font-bold text-white group-hover:text-macaonico-dourado transition-colors">
                          {m.titulo}
                        </p>
                        <p className="text-xs text-slate-400">
                          {m.autor_artista || 'Compositor não informado'}
                        </p>
                      </td>

                      <td className="py-3.5 px-4">
                        {m.tipo_midia === 'ARQUIVO_LOCAL' || !m.tipo_midia ? (
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

                      <td className="py-3.5 px-4 text-right">
                        <div className="flex justify-end gap-1">
                          <button
                            onClick={() => abrirModalEditar(m)}
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
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* Modal de Prévia de Streaming */}
      {musicaStreamingPrevia && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-sigma-bg/80 backdrop-blur-md">
          <div className="vidro-destaque rounded-3xl w-full max-w-xl p-5 sm:p-6">
            <div className="flex items-center justify-between pb-3 border-b border-white/10 mb-4">
              <div className="min-w-0 pr-2">
                <span className="text-[10px] font-bold text-macaonico-dourado uppercase tracking-wider">
                  Prévia de Streaming
                </span>
                <h3 className="text-base sm:text-lg font-bold text-white truncate">
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
              <div className="rounded-2xl overflow-hidden aspect-video bg-sigma-bg/80 shadow-2xl mb-4 border border-white/10">
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
                className="text-xs text-macaonico-dourado hover:underline flex items-center gap-1"
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
          isGlobalAdmin={!lojaAtiva}
        />
      )}

      {musicaEmEdicao && (
        <div className="fixed inset-0 z-50 bg-sigma-bg/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-sigma-surface border border-macaonico-dourado/30 p-5 sm:p-6 rounded-2xl shadow-xl w-full max-w-md">
            <h2 className="text-lg sm:text-xl font-bold text-white mb-4 font-cinzel">Editar Música</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-300 mb-1">Título da Música</label>
                <input
                  type="text"
                  value={tituloEdit}
                  onChange={(e) => setTituloEdit(e.target.value)}
                  className="w-full bg-sigma-bg border border-gray-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-macaonico-dourado"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-300 mb-1">Autor / Artista</label>
                <input
                  type="text"
                  value={autorEdit}
                  onChange={(e) => setAutorEdit(e.target.value)}
                  className="w-full bg-sigma-bg border border-gray-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-macaonico-dourado"
                />
              </div>
            </div>
            <div className="flex gap-3 justify-end mt-6">
              <button
                onClick={() => setMusicaEmEdicao(null)}
                className="px-4 py-2 rounded-xl text-sm text-gray-400 hover:text-white transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={salvarEdicaoMusica}
                className="px-5 py-2 rounded-xl bg-macaonico-dourado text-black text-sm font-bold hover:bg-yellow-400 transition-colors"
              >
                Salvar Alterações
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
