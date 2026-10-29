import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import {
  X,
  Search,
  Music,
  Plus,
  Trash2,
  Play,
  Pause,
  Upload,
  Volume1,
  Filter,
  Layers,
  Star,
} from 'lucide-react';
import { Musica, SessaoPlayerExecucao } from '../../compartilhado/tipos';
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
 * Oferece busca instantânea no acervo existente com pré-escuta de áudio,
 * vinculação direta ao momento, marcação de músicas PREFERENCIAIS (★) da Loja
 * e pergunta ao adicionar uma nova música se o Mestre deseja torná-la preferencial.
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
  const [idsPreferidasSessao, setIdsPreferidasSessao] = useState<Set<string>>(new Set());
  const [carregando, setCarregando] = useState(true);
  const [filtroApenasVinculadas, setFiltroApenasVinculadas] = useState(false);
  const [processandoId, setProcessandoId] = useState<string | null>(null);

  // Prompt elegante pós-adição perguntando se deseja tornar a música recém-adicionada PREFERENCIAL
  const [musicaPerguntaPreferencial, setMusicaPerguntaPreferencial] = useState<{
    id: string;
    titulo: string;
  } | null>(null);

  // Pré-escuta de áudio
  const [audioPreviewId, setAudioPreviewId] = useState<string | null>(null);
  const previewAudioRef = useRef<HTMLAudioElement | null>(null);

  const carregarMusicas = async () => {
    try {
      setCarregando(true);
      const promessas: Promise<any>[] = [clienteHttp.get<Musica[]>('/musicas')];
      if (sessaoId) {
        promessas.push(
          clienteHttp.get<SessaoPlayerExecucao>(`/player/sessao/${sessaoId}`).catch(() => null)
        );
      }
      const [respMusicas, respSessao] = await Promise.all(promessas);
      setMusicasAcervo(respMusicas.data || []);

      if (respSessao?.data?.esteira_ritualistica) {
        const mom = respSessao.data.esteira_ritualistica.find(
          (m: any) => m.evento_id === eventoId
        );
        if (mom && Array.isArray(mom.candidatas)) {
          const prefs = new Set<string>(
            mom.candidatas.filter((c: any) => c.preferida).map((c: any) => String(c.id))
          );
          setIdsPreferidasSessao(prefs);
        }
      }
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
  }, [eventoId, sessaoId]);

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

  // Alterna o status de Preferencial (★) de uma música vinculada na sessão ativa
  const alternarPreferencialNoMomento = async (musicaId: string, tornarPreferida: boolean) => {
    if (!sessaoId) return;
    try {
      feedbackTatil.clique();
      setProcessandoId(musicaId);
      await clienteHttp.patch(
        `/player/sessao/${sessaoId}/momento/${eventoId}/musica/${musicaId}/preferencia`,
        null,
        { params: { preferida: tornarPreferida } }
      );
      setIdsPreferidasSessao((anterior) => {
        const novo = new Set(anterior);
        if (tornarPreferida) novo.add(musicaId);
        else novo.delete(musicaId);
        return novo;
      });
      feedbackTatil.sucesso();
      if (onSalvo) await onSalvo();
    } catch (err) {
      feedbackTatil.erro();
      console.error('Erro ao alterar preferência da música:', err);
    } finally {
      setProcessandoId(null);
    }
  };

  // Vincula música existente ao momento e pergunta se deseja torná-la Preferencial
  const vincularMusica = async (m: Musica) => {
    try {
      feedbackTatil.sucesso();
      setProcessandoId(m.id);

      // 1. Associa a música ao evento ritualístico no banco
      await clienteHttp.post(`/eventos/${eventoId}/musicas/${m.id}`);

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

      // 2. Se houver sessão ativa, exibe a pergunta para tornar preferencial neste momento
      if (sessaoId) {
        setMusicaPerguntaPreferencial({ id: m.id, titulo: m.titulo });
      }

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
          setIdsPreferidasSessao((ant) => {
            const n = new Set(ant);
            n.delete(m.id);
            return n;
          });
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

  // Filtragem reativa por busca e por status de vínculo (agrupando as preferidas e vinculadas no topo)
  const musicasFiltradas = musicasAcervo
    .filter((m) => {
      const vinculada = isMusicaVinculada(m);
      if (filtroApenasVinculadas && !vinculada) return false;

      if (!busca.trim()) return true;
      const termo = busca.toLowerCase();
      const titulo = (m.titulo || '').toLowerCase();
      const artista = (m.autor_artista || '').toLowerCase();
      return titulo.includes(termo) || artista.includes(termo);
    })
    .sort((a, b) => {
      const prefA = idsPreferidasSessao.has(a.id) ? 1 : 0;
      const prefB = idsPreferidasSessao.has(b.id) ? 1 : 0;
      if (prefA !== prefB) return prefB - prefA;
      const vincA = isMusicaVinculada(a) ? 1 : 0;
      const vincB = isMusicaVinculada(b) ? 1 : 0;
      if (vincA !== vincB) return vincB - vincA;
      return (a.titulo || '').localeCompare(b.titulo || '');
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

      <div className="bg-[#0A1428] border border-macaonico-dourado/40 rounded-2xl sm:rounded-3xl w-full max-w-2xl max-h-[92dvh] flex flex-col shadow-[0_25px_60px_rgba(0,0,0,0.95)] overflow-hidden relative">
        {/* Cabeçalho do Modal */}
        <div className="p-3.5 sm:p-4 border-b border-macaonico-dourado/20 bg-[#0E1C36] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5 min-w-0 pr-2">
            <div className="w-8 h-8 rounded-lg bg-macaonico-dourado/15 border border-macaonico-dourado/30 flex items-center justify-center text-macaonico-dourado shrink-0">
              <Layers className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <h3 className="text-xs font-mono uppercase tracking-wider text-macaonico-dourado font-bold truncate">
                Compor Momento Ritualístico (Máx. 8 Faixas por Sessão)
              </h3>
              <p className="text-xs sm:text-sm font-semibold text-slate-100 truncate">
                {nomeMomento || 'Momento Litúrgico'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <span className="hidden sm:inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-mono font-bold bg-[#071122] text-macaonico-dourado border border-macaonico-dourado/30">
              {totalVinculadas} {totalVinculadas === 1 ? 'música' : 'músicas'} no acervo do momento
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

        {/* Diálogo de Confirmação Pós-Adição: "Tornar música Preferencial neste momento?" */}
        {musicaPerguntaPreferencial && sessaoId && (
          <div className="bg-gradient-to-r from-[#2b1d03] via-[#1c1302] to-[#2b1d03] border-b-2 border-[#DDB96B] px-4 py-3 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0 animate-in slide-in-from-top duration-200">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-full bg-[#DDB96B]/20 border border-[#DDB96B] flex items-center justify-center text-[#FDE68A] shrink-0">
                <Star className="w-4 h-4 fill-current" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-cinzel font-bold text-[#FFF2CC] truncate">
                  Deseja tornar “{musicaPerguntaPreferencial.titulo}” Preferencial (★)?
                </p>
                <p className="text-[11px] text-[#DDB96B]/90">
                  Músicas preferenciais ocupam as primeiras faixas do álbum e têm prioridade no sorteio da sessão.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0 w-full sm:w-auto justify-end">
              <button
                type="button"
                onClick={() => setMusicaPerguntaPreferencial(null)}
                className="px-3 py-1.5 rounded-lg bg-black/50 hover:bg-white/10 border border-white/15 text-xs text-slate-300 font-semibold cursor-pointer"
              >
                Apenas no Acervo
              </button>
              <button
                type="button"
                onClick={async () => {
                  const alvo = musicaPerguntaPreferencial;
                  setMusicaPerguntaPreferencial(null);
                  if (alvo) {
                    await alternarPreferencialNoMomento(alvo.id, true);
                  }
                }}
                className="px-3.5 py-1.5 rounded-lg bg-gradient-to-r from-[#DDB96B] to-[#FDE68A] text-black text-xs font-cinzel font-bold flex items-center gap-1.5 shadow-[0_0_12px_rgba(221,185,107,0.5)] cursor-pointer"
              >
                <Star className="w-3.5 h-3.5 fill-current" />
                <span>Sim, Tornar Preferencial</span>
              </button>
            </div>
          </div>
        )}

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
                  const ehPreferida = idsPreferidasSessao.has(m.id);
                  const tocandoPreview = audioPreviewId === m.id;
                  const processando = processandoId === m.id;

                  return (
                    <div
                      key={m.id}
                      className={`flex items-center justify-between gap-2.5 p-2.5 sm:p-3 rounded-xl border transition-all ${
                        ehPreferida
                          ? 'bg-[#1a1608]/90 border-[#DDB96B] shadow-[0_0_15px_rgba(221,185,107,0.18)]'
                          : vinculada
                          ? 'bg-[#0D1D3A]/70 border-macaonico-dourado/45 shadow-sm'
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
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="text-xs sm:text-sm font-semibold text-slate-100 truncate">
                              {m.titulo}
                            </span>
                            {ehPreferida && (
                              <span className="shrink-0 px-1.5 py-0.5 rounded text-[9px] font-mono font-bold bg-[#DDB96B] text-black flex items-center gap-0.5">
                                <Star className="w-2.5 h-2.5 fill-current" /> Preferencial
                              </span>
                            )}
                            {vinculada && !ehPreferida && (
                              <span className="shrink-0 px-1.5 py-0.5 rounded text-[9px] font-mono font-bold bg-macaonico-dourado/20 text-macaonico-dourado border border-macaonico-dourado/40">
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

                      {/* Ações: Botão de Preferencial (★) + Vincular/Desvincular */}
                      <div className="flex items-center gap-1.5 shrink-0">
                        {vinculada && sessaoId && (
                          <button
                            type="button"
                            disabled={processando}
                            onClick={() => alternarPreferencialNoMomento(m.id, !ehPreferida)}
                            className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg border text-xs font-semibold transition-all cursor-pointer active:scale-95 ${
                              ehPreferida
                                ? 'bg-[#DDB96B]/25 border-[#DDB96B] text-[#FDE68A]'
                                : 'bg-white/5 border-white/15 text-slate-400 hover:text-[#FDE68A] hover:border-[#DDB96B]/50'
                            }`}
                            title={
                              ehPreferida
                                ? 'Remover das músicas preferenciais deste momento'
                                : 'Tornar música preferencial deste momento (prioridade nas 8 faixas da sessão)'
                            }
                          >
                            <Star
                              className={`w-3.5 h-3.5 ${ehPreferida ? 'fill-current text-[#FDE68A]' : ''}`}
                            />
                            <span className="hidden sm:inline">
                              {ehPreferida ? 'Preferida' : 'Preferir'}
                            </span>
                          </button>
                        )}

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
              onSalvo={async (novaMusicaId) => {
                await carregarMusicas();
                setAbaAtiva('ACERVO');
                if (novaMusicaId && sessaoId) {
                  setMusicaPerguntaPreferencial({
                    id: novaMusicaId,
                    titulo: 'Nova Música Enviada',
                  });
                }
                if (onSalvo) await onSalvo();
              }}
            />
          </div>
        )}

        {/* Rodapé do Modal */}
        <div className="p-3 border-t border-slate-800 bg-[#0E1C36] flex items-center justify-between shrink-0">
          <span className="text-[11px] font-mono text-slate-400">
            {idsPreferidasSessao.size} preferencial(is) • {totalVinculadas} no acervo do momento
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
