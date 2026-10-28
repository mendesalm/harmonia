import React, { useState, useEffect, useRef } from 'react';
import {
  Music,
  Search,
  Filter,
  Play,
  Pause,
  CheckSquare,
  Square,
  Tag,
  Sparkles,
  Save,
  Check,
  AlertCircle,
  Loader2,
  Plus,
  Upload,
  X,
  Volume1,
  Layers,
  ArrowLeft,
  ChevronRight,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import clienteHttp from '../../compartilhado/api/cliente_http';
import { feedbackTatil } from '../../compartilhado/utilitarios/dispositivoNativo';
import { ModalUploadMusica } from '../musicas/ModalUploadMusica';

interface MomentoCanonicoRef {
  id: string;
  nome: string;
  ordem?: number;
}

interface EventoVinculado {
  evento_id: string;
  canonico_id?: string | null;
  nome: string;
}

interface MusicaCuradoria {
  id: string;
  titulo: string;
  autor_artista?: string | null;
  estilo: string;
  subclassificacao: string;
  arquivo_url?: string | null;
  caminho_arquivo?: string | null;
  link_externo?: string | null;
  tipo_midia: string;
  duracao_segundos?: number | null;
  eventos_vinculados: EventoVinculado[];
  ativo: boolean;
}

interface RespostaCatalogo {
  total: number;
  pagina: number;
  limite: number;
  itens: MusicaCuradoria[];
}

export const PaginaCuradoriaMusicasAdmin: React.FC = () => {
  const navigate = useNavigate();

  // Opções globais
  const [estilosDisponiveis, setEstilosDisponiveis] = useState<string[]>(['UNIVERSAL', 'CLASSICA', 'VIOLAO', 'SOUNDTRACKS', 'POPULAR']);
  const [subclassificacoesDisponiveis, setSubclassificacoesDisponiveis] = useState<string[]>(['GERAL', 'AMBIENTE']);
  const [momentosCanonicos, setMomentosCanonicos] = useState<MomentoCanonicoRef[]>([]);

  // Dados do catálogo
  const [musicas, setMusicas] = useState<MusicaCuradoria[]>([]);
  const [total, setTotal] = useState(0);
  const [carregando, setCarregando] = useState(true);
  const [salvandoId, setSalvandoId] = useState<string | null>(null);
  const [sucessoSalvoId, setSucessoSalvoId] = useState<string | null>(null);
  const [modalUploadAberto, setModalUploadAberto] = useState(false);

  // Filtros
  const [busca, setBusca] = useState('');
  const [filtroEstilo, setFiltroEstilo] = useState('');
  const [filtroSubclassificacao, setFiltroSubclassificacao] = useState('');
  const [filtroMomentoId, setFiltroMomentoId] = useState('');
  const [apenasSemClassificacao, setApenasSemClassificacao] = useState(false);

  // Seleção múltipla para ações em lote
  const [selecionadas, setSelecionadas] = useState<Set<string>>(new Set());
  const [loteEstilo, setLoteEstilo] = useState('');
  const [loteSubclassificacao, setLoteSubclassificacao] = useState('');
  const [loteMomentoId, setLoteMomentoId] = useState('');
  const [aplicandoLote, setAplicandoLote] = useState(false);

  // Pré-escuta de áudio
  const [audioTocandoId, setAudioTocandoId] = useState<string | null>(null);
  const audioPlayerRef = useRef<HTMLAudioElement | null>(null);

  // Carrega opções de estilos e momentos canônicos
  useEffect(() => {
    const carregarOpcoes = async () => {
      try {
        const resp = await clienteHttp.get('/admin/musicas/opcoes-classificacao');
        if (resp.data.estilos) setEstilosDisponiveis(resp.data.estilos);
        if (resp.data.subclassificacoes) setSubclassificacoesDisponiveis(resp.data.subclassificacoes);
        if (resp.data.momentos_canonicos) setMomentosCanonicos(resp.data.momentos_canonicos);
      } catch (err) {
        console.error('Erro ao carregar opções de classificação', err);
      }
    };
    carregarOpcoes();
  }, []);

  // Busca músicas no catálogo com filtros
  const carregarCatalogo = async () => {
    try {
      setCarregando(true);
      const params: any = { limite: 250 };
      if (busca.trim()) params.busca = busca.trim();
      if (filtroEstilo) params.estilo = filtroEstilo;
      if (filtroSubclassificacao) params.subclassificacao = filtroSubclassificacao;
      if (filtroMomentoId) params.momento_id = filtroMomentoId;
      if (apenasSemClassificacao) params.apenas_sem_classificacao = true;

      const resp = await clienteHttp.get<RespostaCatalogo>('/admin/musicas/catalogo', { params });
      setMusicas(resp.data.itens);
      setTotal(resp.data.total);
    } catch (err) {
      console.error('Erro ao carregar catálogo', err);
    } finally {
      setCarregando(false);
    }
  };

  useEffect(() => {
    carregarCatalogo();
  }, [filtroEstilo, filtroSubclassificacao, filtroMomentoId, apenasSemClassificacao]);

  const handleBuscarSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    carregarCatalogo();
  };

  // Reproduzir / Pausar pré-escuta
  const alternarPreview = (m: MusicaCuradoria) => {
    if (audioTocandoId === m.id) {
      audioPlayerRef.current?.pause();
      setAudioTocandoId(null);
      return;
    }

    const src = m.caminho_arquivo || m.arquivo_url;
    if (!src) return;

    if (!audioPlayerRef.current) {
      audioPlayerRef.current = new Audio();
      audioPlayerRef.current.onended = () => setAudioTocandoId(null);
    }

    audioPlayerRef.current.src = src;
    audioPlayerRef.current.play().then(() => {
      setAudioTocandoId(m.id);
    }).catch(err => {
      console.error('Erro ao reproduzir preview', err);
      setAudioTocandoId(null);
    });
  };

  // Alterações inline de uma música
  const atualizarCampoMusica = (id: string, campo: 'estilo' | 'subclassificacao', valor: string) => {
    setMusicas(prev =>
      prev.map(m => (m.id === id ? { ...m, [campo]: valor } : m))
    );
  };

  // Adicionar momento a uma música individualmente
  const adicionarMomentoMusica = (musicaId: string, momentoId: string) => {
    if (!momentoId) return;
    const momentoRef = momentosCanonicos.find(mc => mc.id === momentoId);
    if (!momentoRef) return;

    setMusicas(prev =>
      prev.map(m => {
        if (m.id !== musicaId) return m;
        const jaExiste = m.eventos_vinculados.some(ev => ev.canonico_id === momentoId || ev.evento_id === momentoId);
        if (jaExiste) return m;
        return {
          ...m,
          eventos_vinculados: [
            ...m.eventos_vinculados,
            { evento_id: momentoId, canonico_id: momentoId, nome: momentoRef.nome }
          ]
        };
      })
    );
  };

  // Remover momento de uma música
  const removerMomentoMusica = (musicaId: string, identificador: string) => {
    setMusicas(prev =>
      prev.map(m => {
        if (m.id !== musicaId) return m;
        return {
          ...m,
          eventos_vinculados: m.eventos_vinculados.filter(
            ev => ev.evento_id !== identificador && ev.canonico_id !== identificador
          )
        };
      })
    );
  };

  // Salvar uma música individualmente
  const salvarMusicaIndividual = async (m: MusicaCuradoria) => {
    try {
      setSalvandoId(m.id);
      feedbackTatil.clique();
      const eventosIds = m.eventos_vinculados.map(ev => ev.canonico_id || ev.evento_id);

      await clienteHttp.patch(`/admin/musicas/${m.id}/classificacao`, {
        estilo: m.estilo,
        subclassificacao: m.subclassificacao,
        eventos_sugeridos_ids: eventosIds
      });

      setSucessoSalvoId(m.id);
      setTimeout(() => setSucessoSalvoId(null), 2500);
    } catch (err) {
      console.error('Erro ao salvar classificação', err);
      alert('Erro ao salvar alterações da música.');
    } finally {
      setSalvandoId(null);
    }
  };

  // Seleção múltipla
  const alternarSelecionarTodas = () => {
    if (selecionadas.size === musicas.length) {
      setSelecionadas(new Set());
    } else {
      setSelecionadas(new Set(musicas.map(m => m.id)));
    }
  };

  const alternarSelecao = (id: string) => {
    setSelecionadas(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // Aplicar classificação em lote
  const aplicarLote = async () => {
    if (selecionadas.size === 0) return;
    if (!loteEstilo && !loteSubclassificacao && !loteMomentoId) {
      alert('Selecione pelo menos um estilo, subclassificação ou momento para aplicar em lote.');
      return;
    }

    try {
      setAplicandoLote(true);
      feedbackTatil.acaoForte();
      const payload: any = {
        musicas_ids: Array.from(selecionadas),
        adicionar_eventos: true
      };
      if (loteEstilo) payload.estilo = loteEstilo;
      if (loteSubclassificacao) payload.subclassificacao = loteSubclassificacao;
      if (loteMomentoId) payload.eventos_sugeridos_ids = [loteMomentoId];

      await clienteHttp.post('/admin/musicas/classificacao-lote', payload);

      setSelecionadas(new Set());
      setLoteEstilo('');
      setLoteSubclassificacao('');
      setLoteMomentoId('');
      await carregarCatalogo();
    } catch (err) {
      console.error('Erro ao aplicar classificação em lote', err);
      alert('Erro ao processar lote.');
    } finally {
      setAplicandoLote(false);
    }
  };

  const formatarDuracao = (s?: number | null) => {
    if (!s) return '--:--';
    const m = Math.floor(s / 60);
    const seg = Math.floor(s % 60);
    return `${m}:${String(seg).padStart(2, '0')}`;
  };

  return (
    <div className="h-full overflow-y-auto p-3 sm:p-6 md:p-8 bg-[#040812] text-slate-100 flex flex-col gap-6">
      <div className="max-w-7xl mx-auto w-full flex flex-col gap-6">

        {/* Topo / Breadcrumb */}
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-macaonico-dourado/20 pb-4">
          <div>
            <button
              type="button"
              onClick={() => navigate('/admin')}
              className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-macaonico-dourado transition-colors mb-1.5"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Voltar ao Painel Global</span>
            </button>
            <h1 className="text-xl sm:text-2xl font-bold font-cinzel text-macaonico-dourado flex items-center gap-2">
              <Music className="w-6 h-6 text-macaonico-dourado" />
              <span>Curadoria Litúrgica de Músicas</span>
            </h1>
            <p className="text-xs sm:text-sm text-slate-400 mt-1">
              Classifique o estilo litúrgico, a subclassificação de surdina e designe músicas para múltiplos momentos ritualísticos.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => {
                feedbackTatil.clique();
                setModalUploadAberto(true);
              }}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-macaonico-dourado via-[#F7D070] to-macaonico-dourado text-black font-bold text-xs sm:text-sm hover:brightness-110 active:scale-95 transition-all shadow-md shadow-macaonico-dourado/20 cursor-pointer"
              title="Fazer upload de nova música ou converter do YouTube para o acervo global"
            >
              <Upload className="w-4 h-4 text-black stroke-[2.5]" />
              <span>Upload de Música</span>
            </button>

            <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-[#091326] border border-macaonico-dourado/30 text-xs font-mono">
              <span className="text-slate-400">Total no Acervo:</span>
              <span className="text-macaonico-dourado font-bold">{total}</span>
            </div>
          </div>
        </div>

        {/* Barra de Filtros e Busca */}
        <div className="p-4 rounded-2xl bg-[#070e1c] border border-slate-800 shadow-md flex flex-col gap-3">
          <form onSubmit={handleBuscarSubmit} className="flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[240px]">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Buscar por título ou compositor/artista..."
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                className="w-full bg-[#030712] border border-slate-700 rounded-xl pl-9 pr-3 py-2 text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:border-macaonico-dourado"
              />
            </div>

            <select
              value={filtroEstilo}
              onChange={(e) => setFiltroEstilo(e.target.value)}
              className="bg-[#030712] border border-slate-700 rounded-xl px-3 py-2 text-xs sm:text-sm text-white focus:outline-none focus:border-macaonico-dourado"
            >
              <option value="">Todos os Estilos</option>
              {estilosDisponiveis.map(e => (
                <option key={e} value={e}>{e}</option>
              ))}
            </select>

            <select
              value={filtroSubclassificacao}
              onChange={(e) => setFiltroSubclassificacao(e.target.value)}
              className="bg-[#030712] border border-slate-700 rounded-xl px-3 py-2 text-xs sm:text-sm text-white focus:outline-none focus:border-macaonico-dourado"
            >
              <option value="">Todas as Subclassificações</option>
              {subclassificacoesDisponiveis.map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>

            <select
              value={filtroMomentoId}
              onChange={(e) => setFiltroMomentoId(e.target.value)}
              className="bg-[#030712] border border-slate-700 rounded-xl px-3 py-2 text-xs sm:text-sm text-white focus:outline-none focus:border-macaonico-dourado max-w-[220px]"
            >
              <option value="">Todos os Momentos</option>
              {momentosCanonicos.map(mc => (
                <option key={mc.id} value={mc.id}>{mc.nome}</option>
              ))}
            </select>

            <button
              type="submit"
              className="px-4 py-2 rounded-xl bg-macaonico-dourado text-black font-bold text-xs sm:text-sm hover:bg-yellow-400 transition-colors shadow-sm"
            >
              Filtrar
            </button>
          </form>

          <div className="flex items-center gap-2 pt-1 border-t border-slate-800 text-xs text-slate-400">
            <label className="flex items-center gap-1.5 cursor-pointer hover:text-white transition-colors">
              <input
                type="checkbox"
                checked={apenasSemClassificacao}
                onChange={(e) => setApenasSemClassificacao(e.target.checked)}
                className="rounded border-slate-700 text-macaonico-dourado focus:ring-0"
              />
              <span>Exibir apenas faixas com estilo inicial Universal</span>
            </label>
          </div>
        </div>

        {/* Barra de Ações em Lote */}
        {selecionadas.size > 0 && (
          <div className="p-3.5 rounded-2xl bg-gradient-to-r from-[#0d1c3a] to-[#070e1c] border border-macaonico-dourado/50 shadow-lg flex flex-wrap items-center justify-between gap-3 animate-in fade-in duration-200">
            <div className="flex items-center gap-2 text-xs sm:text-sm font-semibold text-macaonico-dourado">
              <CheckSquare className="w-4 h-4" />
              <span>{selecionadas.size} {selecionadas.size === 1 ? 'música selecionada' : 'músicas selecionadas'}</span>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <select
                value={loteEstilo}
                onChange={(e) => setLoteEstilo(e.target.value)}
                className="bg-[#040812] border border-slate-700 rounded-xl px-2.5 py-1.5 text-xs text-white"
              >
                <option value="">Definir Estilo...</option>
                {estilosDisponiveis.map(e => (
                  <option key={e} value={e}>{e}</option>
                ))}
              </select>

              <select
                value={loteSubclassificacao}
                onChange={(e) => setLoteSubclassificacao(e.target.value)}
                className="bg-[#040812] border border-slate-700 rounded-xl px-2.5 py-1.5 text-xs text-white"
              >
                <option value="">Definir Subclassificação...</option>
                {subclassificacoesDisponiveis.map(s => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>

              <select
                value={loteMomentoId}
                onChange={(e) => setLoteMomentoId(e.target.value)}
                className="bg-[#040812] border border-slate-700 rounded-xl px-2.5 py-1.5 text-xs text-white max-w-[180px]"
              >
                <option value="">Adicionar Momento...</option>
                {momentosCanonicos.map(mc => (
                  <option key={mc.id} value={mc.id}>{mc.nome}</option>
                ))}
              </select>

              <button
                type="button"
                onClick={aplicarLote}
                disabled={aplicandoLote}
                className="px-3.5 py-1.5 rounded-xl bg-macaonico-dourado text-black font-bold text-xs hover:bg-yellow-400 disabled:opacity-50 transition-all flex items-center gap-1.5 shadow-sm"
              >
                {aplicandoLote ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                <span>Aplicar em Lote</span>
              </button>

              <button
                type="button"
                onClick={() => setSelecionadas(new Set())}
                className="px-2.5 py-1.5 rounded-xl bg-white/10 text-slate-300 hover:text-white text-xs transition-colors"
              >
                Cancelar
              </button>
            </div>
          </div>
        )}

        {/* Tabela de Gestão de Músicas */}
        <div className="bg-[#070e1c] border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs sm:text-sm">
              <thead className="bg-[#0a1428] border-b border-slate-800 text-slate-400 font-cinzel text-[11px] uppercase tracking-wider">
                <tr>
                  <th className="p-3 w-10 text-center">
                    <button
                      type="button"
                      onClick={alternarSelecionarTodas}
                      className="text-slate-400 hover:text-white transition-colors"
                      title="Selecionar todas"
                    >
                      {selecionadas.size > 0 && selecionadas.size === musicas.length ? (
                        <CheckSquare className="w-4 h-4 text-macaonico-dourado" />
                      ) : (
                        <Square className="w-4 h-4" />
                      )}
                    </button>
                  </th>
                  <th className="p-3 min-w-[200px]">Música / Artista</th>
                  <th className="p-3 w-20 text-center">Duração</th>
                  <th className="p-3 min-w-[140px]">Estilo Litúrgico</th>
                  <th className="p-3 min-w-[140px]">Subclassificação</th>
                  <th className="p-3 min-w-[280px]">Momentos Litúrgicos Designados</th>
                  <th className="p-3 w-28 text-center">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80">
                {carregando ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-slate-400">
                      <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-macaonico-dourado" />
                      <p>Carregando acervo musical para curadoria...</p>
                    </td>
                  </tr>
                ) : musicas.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-slate-400">
                      <Music className="w-8 h-8 mx-auto mb-2 opacity-40 text-slate-500" />
                      <p className="mb-3">Nenhuma música encontrada com os filtros selecionados.</p>
                      <button
                        type="button"
                        onClick={() => {
                          feedbackTatil.clique();
                          setModalUploadAberto(true);
                        }}
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-macaonico-dourado text-black font-semibold text-xs hover:bg-yellow-400 transition-colors shadow-sm cursor-pointer"
                      >
                        <Upload className="w-3.5 h-3.5 stroke-[2.5]" />
                        <span>Fazer Upload de Música</span>
                      </button>
                    </td>
                  </tr>
                ) : (
                  musicas.map((m) => {
                    const isSelecionada = selecionadas.has(m.id);
                    const isTocando = audioTocandoId === m.id;
                    const isSalvando = salvandoId === m.id;
                    const isSucesso = sucessoSalvoId === m.id;

                    return (
                      <tr
                        key={m.id}
                        className={`transition-colors ${
                          isSelecionada ? 'bg-amber-500/10' : 'hover:bg-white/[0.02]'
                        }`}
                      >
                        {/* Checkbox */}
                        <td className="p-3 text-center">
                          <button
                            type="button"
                            onClick={() => alternarSelecao(m.id)}
                            className="text-slate-400 hover:text-white transition-colors"
                          >
                            {isSelecionada ? (
                              <CheckSquare className="w-4 h-4 text-macaonico-dourado" />
                            ) : (
                              <Square className="w-4 h-4" />
                            )}
                          </button>
                        </td>

                        {/* Título & Preview */}
                        <td className="p-3">
                          <div className="flex items-center gap-2.5">
                            <button
                              type="button"
                              onClick={() => alternarPreview(m)}
                              className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 border transition-all ${
                                isTocando
                                  ? 'bg-macaonico-dourado border-yellow-300 text-black shadow-[0_0_10px_rgba(221,185,107,0.5)]'
                                  : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700 hover:text-white'
                              }`}
                              title={isTocando ? 'Pausar pré-escuta' : 'Ouvir pré-escuta'}
                            >
                              {isTocando ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5 ml-0.5" />}
                            </button>
                            <div className="min-w-0">
                              <p className="font-semibold text-slate-100 truncate text-xs sm:text-sm">{m.titulo}</p>
                              <p className="text-[11px] text-slate-400 truncate">{m.autor_artista || 'Acervo Harmonia'}</p>
                            </div>
                          </div>
                        </td>

                        {/* Duração */}
                        <td className="p-3 text-center font-mono text-xs text-slate-400">
                          {formatarDuracao(m.duracao_segundos)}
                        </td>

                        {/* Estilo */}
                        <td className="p-3">
                          <select
                            value={m.estilo}
                            onChange={(e) => atualizarCampoMusica(m.id, 'estilo', e.target.value)}
                            className="w-full bg-[#030712] border border-slate-700 rounded-xl px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-macaonico-dourado font-medium"
                          >
                            {estilosDisponiveis.map(e => (
                              <option key={e} value={e}>{e}</option>
                            ))}
                          </select>
                        </td>

                        {/* Subclassificação */}
                        <td className="p-3">
                          <div className="flex items-center gap-1.5">
                            <select
                              value={m.subclassificacao}
                              onChange={(e) => atualizarCampoMusica(m.id, 'subclassificacao', e.target.value)}
                              className={`w-full bg-[#030712] border rounded-xl px-2.5 py-1.5 text-xs font-medium focus:outline-none ${
                                m.subclassificacao === 'AMBIENTE'
                                  ? 'border-amber-400/50 text-amber-300'
                                  : 'border-slate-700 text-slate-200 focus:border-macaonico-dourado'
                              }`}
                            >
                              {subclassificacoesDisponiveis.map(s => (
                                <option key={s} value={s}>{s}</option>
                              ))}
                            </select>
                            {m.subclassificacao === 'AMBIENTE' && (
                              <Volume1 className="w-4 h-4 text-amber-300 shrink-0" title="Ideal para Surdina" />
                            )}
                          </div>
                        </td>

                        {/* Momentos Associados (Multi-Tags) */}
                        <td className="p-3">
                          <div className="flex flex-col gap-1.5">
                            <div className="flex flex-wrap gap-1 max-w-sm">
                              {m.eventos_vinculados.length === 0 ? (
                                <span className="text-[11px] text-slate-500 italic">Nenhum momento designado</span>
                              ) : (
                                m.eventos_vinculados.map(ev => (
                                  <span
                                    key={ev.evento_id}
                                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-[#0e1a2f] border border-macaonico-dourado/30 text-[10px] text-slate-200 font-medium"
                                  >
                                    <span className="truncate max-w-[130px]">{ev.nome}</span>
                                    <button
                                      type="button"
                                      onClick={() => removerMomentoMusica(m.id, ev.evento_id)}
                                      className="text-slate-400 hover:text-red-400 transition-colors"
                                      title="Remover momento"
                                    >
                                      <X className="w-3 h-3" />
                                    </button>
                                  </span>
                                ))
                              )}
                            </div>

                            {/* Dropdown para adicionar mais momentos */}
                            <select
                              defaultValue=""
                              onChange={(e) => {
                                if (e.target.value) {
                                  adicionarMomentoMusica(m.id, e.target.value);
                                  e.target.value = '';
                                }
                              }}
                              className="bg-[#030712] border border-dashed border-slate-700 hover:border-slate-500 rounded-lg px-2 py-1 text-[11px] text-slate-400 focus:outline-none focus:border-macaonico-dourado max-w-[200px]"
                            >
                              <option value="">+ Designar Momento...</option>
                              {momentosCanonicos.map(mc => (
                                <option key={mc.id} value={mc.id}>{mc.nome}</option>
                              ))}
                            </select>
                          </div>
                        </td>

                        {/* Botão Salvar */}
                        <td className="p-3 text-center">
                          <button
                            type="button"
                            onClick={() => salvarMusicaIndividual(m)}
                            disabled={isSalvando}
                            className={`px-3 py-1.5 rounded-xl font-semibold text-xs flex items-center justify-center gap-1.5 mx-auto transition-all shadow-sm ${
                              isSucesso
                                ? 'bg-emerald-600 text-white'
                                : 'bg-[#09152b] border border-macaonico-dourado/40 text-macaonico-dourado hover:bg-macaonico-dourado hover:text-black'
                            }`}
                          >
                            {isSalvando ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : isSucesso ? (
                              <>
                                <Check className="w-3.5 h-3.5" />
                                <span>Salvo</span>
                              </>
                            ) : (
                              <>
                                <Save className="w-3.5 h-3.5" />
                                <span>Salvar</span>
                              </>
                            )}
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Modal de Upload de Músicas / Conversão YouTube */}
        {modalUploadAberto && (
          <ModalUploadMusica
            isGlobalAdmin={true}
            esconderEventos={false}
            onFechar={() => setModalUploadAberto(false)}
            onSalvo={(_novaMusicaId) => {
              carregarCatalogo();
            }}
          />
        )}

      </div>
    </div>
  );
};
