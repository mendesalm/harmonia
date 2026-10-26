import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import {
  X,
  Search,
  Music,
  Plus,
  Check,
  Trash2,
  Play,
  Pause,
  Upload,
  Disc3,
  Volume1,
  Sparkles,
  Filter,
  Layers,
  CheckCircle2,
} from 'lucide-react';
import { Musica } from '../../compartilhado/tipos';
import clienteHttp from '../../compartilhado/api/cliente_http';
import { feedbackTatil } from '../../compartilhado/utilitarios/dispositivoNativo';
import { ModalUploadMusica } from '../musicas/ModalUploadMusica';

interface ModalComporMomentoProps {
  eventoId: string;
  nomeMomento?: string;
  sessaoId?: string;
  onFechar: () => void;
  onSalvo?: () => void | Promise<void>;
}

/**
 * Modal para compor e enriquecer momentos litúrgicos com músicas do acervo já salvo.
 * Oferece busca instantânea no acervo existente com pré-escuta de áudio e
 * vinculação direta ao momento (e à esteira da sessão ativa), além de aba para upload/YouTube.
 */
export const ModalComporMomento: React.FC<ModalComporMomentoProps> = ({
  eventoId,
  nomeMomento,
  sessaoId,
  onFechar,
  onSalvo,
}) => {
  const [abaAtiva, setAbaAtiva] = useState<'ACERVO' | 'UPLOAD'>('ACERVO');
  const [busca, setBusca] = useState('');
  const [musicasAcervo, setMusicasAcervo] = useState<Musica[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [filtroApenasVinculadas, setFiltroApenasVinculadas] = useState(false);
  const [processandoId, setProcessandoId] = useState<string | null>(null);

  // Pré-escuta de áudio
  const [audioPreviewId, setAudioPreviewId] = useState<string | null>(null);
  const previewAudioRef = useRef<HTMLAudioElement | null>(null);

  const carregarMusicas = async () => {
    try {
      setCarregando(true);
      const resp = await clienteHttp.get<Musica[]>('/musicas');
      setMusicasAcervo(resp.data || []);
    } catch (err) {
      console.error('Erro ao listar músicas do acervo:', err);
    } finally {
      setCarregando(false);
    }
  };

  useEffect(() => {
    carregarMusicas();
    return () => {
      if (previewAudioRef.current) {
        previewAudioRef.current.pause();
        previewAudioRef.current.src = '';
      }
    };
  }, [eventoId]);

  // Alterna prévia de áudio
  const alternarPreview = (m: Musica) => {
    feedbackTatil.clique();
    const url = m.arquivo_url || m.caminho_arquivo || m.link_externo;
    if (!url) return;

    if (audioPreviewId === m.id) {
      if (previewAudioRef.current) {
        previewAudioRef.current.pause();
      }
      setAudioPreviewId(null);
      return;
    }

    if (previewAudioRef.current) {
      previewAudioRef.current.pause();
      previewAudioRef.current.src = url;
      previewAudioRef.current.play().catch((e) => console.warn('Erro ao reproduzir preview:', e));
    }
    setAudioPreviewId(m.id);
  };

  // Verifica se uma música do acervo já está vinculada ao evento atual
  const isMusicaVinculada = (m: Musica): boolean => {
    if (!m.eventos || !Array.isArray(m.eventos)) return false;
    return m.eventos.some((ev) => ev.evento_id === eventoId);
  };

  // Vincula música existente ao momento
  const vincularMusica = async (m: Musica) => {
    try {
      feedbackTatil.sucesso();
      setProcessandoId(m.id);

      // 1. Associa a música ao evento ritualístico no banco
      await clienteHttp.post(`/eventos/${eventoId}/musicas/${m.id}`);

      // 2. Se estiver no contexto do player com sessão ativa, marca na playlist da sessão
      if (sessaoId) {
        try {
          await clienteHttp.patch(
            `/player/sessao/${sessaoId}/momento/${eventoId}/musica/${m.id}/preferencia`,
            null,
            { params: { preferida: true } }
          );
        } catch (err) {
          console.warn('Aviso: Não foi possível marcar como preferida na sessão:', err);
        }
      }

      // Atualiza o estado local imediatamente
      setMusicasAcervo((antigas) =>
        antigas.map((item) => {
          if (item.id === m.id) {
            const novosEvs = [...(item.eventos || [])];
            if (!novosEvs.some((e) => e.evento_id === eventoId)) {
              novosEvs.push({
                evento_id: eventoId,
                evento_nome: nomeMomento || 'Momento Litúrgico',
              });
            }
            return { ...item, eventos: novosEvs };
          }
          return item;
        })
      );

      if (onSalvo) {
        await onSalvo();
      }
    } catch (err) {
      feedbackTatil.erro();
      console.error('Erro ao vincular música ao momento:', err);
    } finally {
      setProcessandoId(null);
    }
  };

  // Desvincula música do momento
  const desvincularMusica = async (m: Musica) => {
    try {
      feedbackTatil.clique();
      setProcessandoId(m.id);

      // 1. Remove o vínculo do evento
      await clienteHttp.delete(`/eventos/${eventoId}/musicas/${m.id}`);

      // 2. Se no player com sessão ativa, desmarca também da playlist da sessão
      if (sessaoId) {
        try {
          await clienteHttp.patch(
            `/player/sessao/${sessaoId}/momento/${eventoId}/musica/${m.id}/preferencia`,
            null,
            { params: { preferida: false } }
          );
        } catch (err) {
          console.warn('Aviso: Não foi possível desmarcar preferência na sessão:', err);
        }
      }

      // Atualiza localmente
      setMusicasAcervo((antigas) =>
        antigas.map((item) => {
          if (item.id === m.id) {
            return {
              ...item,
              eventos: (item.eventos || []).filter((e) => e.evento_id !== eventoId),
            };
          }
          return item;
        })
      );

      if (onSalvo) {
        await onSalvo();
      }
    } catch (err) {
      feedbackTatil.erro();
      console.error('Erro ao desvincular música:', err);
    } finally {
      setProcessandoId(null);
    }
  };

  const formatarDuracao = (segundos?: number) => {
    if (!segundos) return '--:--';
    const m = Math.floor(segundos / 60);
    const s = Math.floor(segundos % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  // Filtragem reativa por busca e por status de vínculo
  const musicasFiltradas = musicasAcervo.filter((m) => {
    const vinculada = isMusicaVinculada(m);
    if (filtroApenasVinculadas && !vinculada) return false;

    if (!busca.trim()) return true;
    const termo = busca.toLowerCase();
    const titulo = (m.titulo || '').toLowerCase();
    const artista = (m.autor_artista || '').toLowerCase();
    return titulo.includes(termo) || artista.includes(termo);
  });

  const totalVinculadas = musicasAcervo.filter(isMusicaVinculada).length;

  return createPortal(
    <div
      style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 9999 }}
      className="flex items-center justify-center p-2 sm:p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200"
    >
      {/* Elemento de áudio invisível para pré-escuta */}
      <audio
        ref={previewAudioRef}
        onEnded={() => setAudioPreviewId(null)}
        onError={() => setAudioPreviewId(null)}
      />

      <div className="bg-[#0A1428] border border-macaonico-dourado/40 rounded-2xl sm:rounded-3xl w-full max-w-2xl max-h-[92dvh] flex flex-col shadow-[0_25px_60px_rgba(0,0,0,0.95)] overflow-hidden">
        {/* Cabeçalho do Modal */}
        <div className="p-3.5 sm:p-4 border-b border-macaonico-dourado/20 bg-[#0E1C36] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5 min-w-0 pr-2">
            <div className="w-8 h-8 rounded-lg bg-macaonico-dourado/15 border border-macaonico-dourado/30 flex items-center justify-center text-macaonico-dourado shrink-0">
              <Layers className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <h3 className="text-xs font-mono uppercase tracking-wider text-macaonico-dourado font-bold truncate">
                Compor Momento Ritualístico
              </h3>
              <p className="text-xs sm:text-sm font-semibold text-slate-100 truncate">
                {nomeMomento || 'Momento Litúrgico'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <span className="hidden sm:inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-mono font-bold bg-[#071122] text-macaonico-dourado border border-macaonico-dourado/30">
              {totalVinculadas} {totalVinculadas === 1 ? 'música' : 'músicas'} vinculadas
            </span>
            <button
              type="button"
              onClick={() => {
                feedbackTatil.clique();
                onFechar();
              }}
              className="p-1.5 rounded-full text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
              title="Fechar"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Abas Superiores: Buscar no Acervo vs Nova Música */}
        <div className="flex items-center border-b border-slate-800 bg-[#070F1E] shrink-0 px-3 pt-2 gap-2">
          <button
            type="button"
            onClick={() => setAbaAtiva('ACERVO')}
            className={`flex items-center gap-2 pb-2.5 px-3 text-xs font-semibold border-b-2 transition-all ${
              abaAtiva === 'ACERVO'
                ? 'border-macaonico-dourado text-macaonico-dourado font-bold'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Search className="w-3.5 h-3.5" />
            <span>Músicas no Acervo ({musicasAcervo.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setAbaAtiva('UPLOAD')}
            className={`flex items-center gap-2 pb-2.5 px-3 text-xs font-semibold border-b-2 transition-all ${
              abaAtiva === 'UPLOAD'
                ? 'border-macaonico-dourado text-macaonico-dourado font-bold'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Nova Música (Upload / YouTube)</span>
          </button>
        </div>

        {/* Conteúdo da Aba Selecionada */}
        {abaAtiva === 'ACERVO' ? (
          <div className="flex flex-col flex-1 min-h-0">
            {/* Barra de Pesquisa e Filtros */}
            <div className="p-3 bg-[#081224] border-b border-slate-800/80 flex flex-col sm:flex-row gap-2 shrink-0">
              <div className="relative flex-1">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={busca}
                  onChange={(e) => setBusca(e.target.value)}
                  placeholder="Pesquisar por título ou artista..."
                  className="w-full bg-[#050B17] border border-slate-700/80 focus:border-macaonico-dourado rounded-xl pl-9 pr-8 py-2 text-xs sm:text-sm text-slate-100 placeholder-slate-500 focus:outline-none transition-colors"
                />
                {busca && (
                  <button
                    type="button"
                    onClick={() => setBusca('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-white"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Botão Toggle: Apenas Vinculadas */}
              <button
                type="button"
                onClick={() => setFiltroApenasVinculadas((v) => !v)}
                className={`flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium border transition-all shrink-0 ${
                  filtroApenasVinculadas
                    ? 'bg-macaonico-dourado/20 border-macaonico-dourado/60 text-macaonico-dourado font-semibold'
                    : 'bg-[#050B17] border-slate-700/80 text-slate-300 hover:bg-white/5'
                }`}
              >
                <Filter className="w-3.5 h-3.5" />
                <span>Vinculadas ({totalVinculadas})</span>
              </button>
            </div>

            {/* Lista Rolável de Músicas */}
            <div className="flex-1 overflow-y-auto p-2 sm:p-3 space-y-2">
              {carregando ? (
                <div className="p-8 text-center text-slate-400 font-mono text-xs">
                  Carregando acervo musical...
                </div>
              ) : musicasFiltradas.length === 0 ? (
                <div className="p-8 text-center text-slate-400 flex flex-col items-center justify-center gap-2">
                  <Music className="w-8 h-8 text-slate-600 mb-1" />
                  <p className="text-xs sm:text-sm">
                    {busca
                      ? 'Nenhuma música encontrada com este termo.'
                      : filtroApenasVinculadas
                      ? 'Nenhuma música vinculada a este momento ainda.'
                      : 'Nenhuma música cadastrada no acervo.'}
                  </p>
                  <button
                    type="button"
                    onClick={() => setAbaAtiva('UPLOAD')}
                    className="mt-2 px-3 py-1.5 rounded-lg bg-macaonico-dourado/15 border border-macaonico-dourado/30 text-macaonico-dourado text-xs font-bold hover:bg-macaonico-dourado/25 transition-colors"
                  >
                    + Fazer Upload de Nova Música
                  </button>
                </div>
              ) : (
                musicasFiltradas.map((m) => {
                  const vinculada = isMusicaVinculada(m);
                  const tocandoPreview = audioPreviewId === m.id;
                  const processando = processandoId === m.id;

                  return (
                    <div
                      key={m.id}
                      className={`flex items-center justify-between gap-3 p-2.5 sm:p-3 rounded-xl border transition-all ${
                        vinculada
                          ? 'bg-[#0D1D3A]/70 border-macaonico-dourado/50 shadow-sm'
                          : 'bg-[#060E1C] border-slate-800/80 hover:border-slate-700'
                      }`}
                    >
                      {/* Botão de Pré-Escuta + Título/Artista */}
                      <div className="flex items-center gap-2.5 min-w-0 flex-1">
                        <button
                          type="button"
                          onClick={() => alternarPreview(m)}
                          className={`w-8 h-8 rounded-full border flex items-center justify-center shrink-0 transition-transform active:scale-95 ${
                            tocandoPreview
                              ? 'bg-macaonico-dourado text-black border-macaonico-dourado shadow-[0_0_12px_rgba(221,185,107,0.6)]'
                              : 'bg-white/5 text-slate-300 border-white/15 hover:border-macaonico-dourado hover:text-macaonico-dourado'
                          }`}
                          title={tocandoPreview ? 'Pausar prévia' : 'Ouvir prévia'}
                        >
                          {tocandoPreview ? (
                            <Pause className="w-3.5 h-3.5 fill-current" />
                          ) : (
                            <Play className="w-3.5 h-3.5 fill-current ml-0.5" />
                          )}
                        </button>

                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs sm:text-sm font-semibold text-slate-100 truncate">
                              {m.titulo}
                            </span>
                            {vinculada && (
                              <span className="shrink-0 px-1.5 py-0.2 rounded text-[9px] font-mono font-bold bg-macaonico-dourado/20 text-macaonico-dourado border border-macaonico-dourado/40">
                                No Momento
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-slate-400 truncate flex items-center gap-1.5">
                            <span>{m.autor_artista || 'Acervo Harmonia'}</span>
                            <span>•</span>
                            <span className="font-mono">{formatarDuracao(m.duracao_segundos)}</span>
                            {m.metadados?.surdina && (
                              <>
                                <span>•</span>
                                <span className="text-amber-400 flex items-center gap-0.5">
                                  <Volume1 className="w-3 h-3" /> Surdina
                                </span>
                              </>
                            )}
                          </p>
                        </div>
                      </div>

                      {/* Botão de Ação: Vincular ou Desvincular */}
                      <div className="shrink-0">
                        {vinculada ? (
                          <button
                            type="button"
                            disabled={processando}
                            onClick={() => desvincularMusica(m)}
                            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-rose-950/40 hover:bg-rose-900/60 border border-rose-500/40 text-rose-300 text-xs font-semibold transition-all active:scale-95 disabled:opacity-50"
                            title="Remover música deste momento"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span className="hidden sm:inline">Desvincular</span>
                          </button>
                        ) : (
                          <button
                            type="button"
                            disabled={processando}
                            onClick={() => vincularMusica(m)}
                            className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-macaonico-dourado hover:bg-yellow-400 text-black text-xs font-bold transition-all shadow-sm active:scale-95 disabled:opacity-50"
                            title="Adicionar música a este momento litúrgico"
                          >
                            <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                            <span>Adicionar</span>
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        ) : (
          /* Aba de Upload / YouTube */
          <div className="flex-1 overflow-y-auto p-4">
            <ModalUploadMusica
              eventoIdPreSelecionado={eventoId}
              esconderEventos={true}
              onFechar={() => setAbaAtiva('ACERVO')}
              onSalvo={async () => {
                await carregarMusicas();
                setAbaAtiva('ACERVO');
                if (onSalvo) await onSalvo();
              }}
            />
          </div>
        )}

        {/* Rodapé do Modal */}
        <div className="p-3 border-t border-slate-800 bg-[#0E1C36] flex items-center justify-between shrink-0">
          <span className="text-[11px] font-mono text-slate-400">
            {totalVinculadas} {totalVinculadas === 1 ? 'música ativa' : 'músicas ativas'} neste momento
          </span>

          <button
            type="button"
            onClick={() => {
              feedbackTatil.clique();
              onFechar();
            }}
            className="px-4 py-1.5 rounded-xl bg-macaonico-dourado hover:bg-yellow-400 text-black text-xs font-bold transition-colors shadow-sm"
          >
            Concluir Composição
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};
