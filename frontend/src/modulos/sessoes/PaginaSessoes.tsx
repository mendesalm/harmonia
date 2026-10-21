import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  Plus,
  Search,
  ListOrdered,
  Trash2,
  PlayCircle,
  X,
  ArrowUp,
  ArrowDown,
  Eye,
  EyeOff,
  Check,
  Loader2,
  Sparkles,
  Edit3,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import clienteHttp from '../../compartilhado/api/cliente_http';
import { useTenant } from '../../compartilhado/contextos/ContextoTenant';
import { Evento } from '../../compartilhado/tipos';

interface SessaoLojaEventoItem {
  id?: string;
  sessao_loja_id?: string;
  evento_id: string;
  evento_nome?: string;
  ordem_execucao: number;
  suprimido: boolean;
  observacao_mestre_harmonia?: string | null;
}

interface SessaoLoja {
  id: string;
  loja_id: string;
  tipo_sessao_id: string;
  nome_personalizado: string;
  criado_em: string;
  eventos_customizados: SessaoLojaEventoItem[];
}

interface TemplateSessaoEvento {
  id: string;
  evento_id: string;
  evento_nome?: string;
  ordem_sequencia: number;
}

interface TemplateSessao {
  id: string;
  nome: string;
  rito_id: string;
  eventos: TemplateSessaoEvento[];
}

/**
 * Página de Cadastro e Gestão das Sessões Maçônicas e Roteiros Ritualísticos da Loja.
 * Oferece modal centralizado (via Portal) para criar novas sessões ou editar sessões existentes,
 * permitindo carregar modelos do Rito Brasileiro, visualizar todos os momentos, reordenar,
 * ocultar/exibir ou adicionar novos momentos do Rito na esteira.
 */
export const PaginaSessoes: React.FC = () => {
  const navigate = useNavigate();
  const { lojaAtiva } = useTenant();
  const [sessoes, setSessoes] = useState<SessaoLoja[]>([]);
  const [templates, setTemplates] = useState<TemplateSessao[]>([]);
  const [eventosDoRito, setEventosDoRito] = useState<Evento[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [busca, setBusca] = useState('');

  // Estado unificado do Modal de Cadastro / Edição de Sessão Maçônica
  const [modalAberto, setModalAberto] = useState(false);
  const [modoModal, setModoModal] = useState<'CRIAR' | 'EDITAR'>('CRIAR');
  const [sessaoEditandoId, setSessaoEditandoId] = useState<string | null>(null);
  const [templateSelecionadoId, setTemplateSelecionadoId] = useState('');
  const [nomeSessao, setNomeSessao] = useState('');
  const [itensEsteira, setItensEsteira] = useState<SessaoLojaEventoItem[]>([]);
  const [eventoParaAdicionarId, setEventoParaAdicionarId] = useState('');
  const [salvando, setSalvando] = useState(false);

  const carregarDados = async () => {
    if (!lojaAtiva?.id) {
      setCarregando(false);
      return;
    }
    try {
      setCarregando(true);
      const paramsTemplate: Record<string, string> = { organizacao_id: lojaAtiva.id };
      if (lojaAtiva.rito_id) paramsTemplate.rito_id = lojaAtiva.rito_id;
      const [respSessoes, respTemplates, respEventos] = await Promise.all([
        clienteHttp.get<SessaoLoja[]>(`/sessoes/loja/${lojaAtiva.id}`),
        clienteHttp.get<TemplateSessao[]>('/sessoes/templates', { params: paramsTemplate }),
        clienteHttp.get<Evento[]>('/eventos', {
          params: { organizacao_id: lojaAtiva.id, incluir_globais: true },
        }),
      ]);
      setSessoes(respSessoes.data);
      setTemplates(respTemplates.data);
      setEventosDoRito(respEventos.data);
    } catch (err) {
      console.error('Erro ao carregar sessões da loja:', err);
    } finally {
      setCarregando(false);
    }
  };

  useEffect(() => {
    carregarDados();
  }, [lojaAtiva?.id, lojaAtiva?.rito_id]);

  const converterTemplateParaEsteira = (template?: TemplateSessao): SessaoLojaEventoItem[] => {
    if (!template || !Array.isArray(template.eventos)) return [];
    const ordenados = [...template.eventos].sort((a, b) => a.ordem_sequencia - b.ordem_sequencia);
    return ordenados.map((ev, idx) => {
      const evCatalogo = eventosDoRito.find((e) => e.id === ev.evento_id);
      return {
        evento_id: ev.evento_id,
        evento_nome: ev.evento_nome || evCatalogo?.nome || 'Momento Ritualístico',
        ordem_execucao: idx + 1,
        suprimido: false,
        observacao_mestre_harmonia: null,
      };
    });
  };

  const abrirModalNovaSessao = () => {
    setModoModal('CRIAR');
    setSessaoEditandoId(null);
    const primeiroTemplate = templates[0];
    setTemplateSelecionadoId(primeiroTemplate?.id || '');
    setNomeSessao(primeiroTemplate ? primeiroTemplate.nome : 'Sessão Ordinária');
    setItensEsteira(converterTemplateParaEsteira(primeiroTemplate));
    setEventoParaAdicionarId('');
    setModalAberto(true);
  };

  const abrirModalEditarSessao = (s: SessaoLoja) => {
    setModoModal('EDITAR');
    setSessaoEditandoId(s.id);
    setTemplateSelecionadoId(s.tipo_sessao_id || '');
    setNomeSessao(s.nome_personalizado || 'Sessão Maçônica');
    const ordenados = [...(s.eventos_customizados || [])]
      .sort((a, b) => a.ordem_execucao - b.ordem_execucao)
      .map((item, idx) => ({
        ...item,
        ordem_execucao: idx + 1,
      }));
    setItensEsteira(ordenados);
    setEventoParaAdicionarId('');
    setModalAberto(true);
  };

  const aplicarModeloTemplate = (idTemplate: string) => {
    setTemplateSelecionadoId(idTemplate);
    const t = templates.find((item) => item.id === idTemplate);
    if (t) {
      if (modoModal === 'CRIAR' || !nomeSessao.trim()) {
        setNomeSessao(t.nome);
      }
      setItensEsteira(converterTemplateParaEsteira(t));
    }
  };

  const moverItem = (idx: number, direcao: -1 | 1) => {
    const destino = idx + direcao;
    if (destino < 0 || destino >= itensEsteira.length) return;
    const copia = [...itensEsteira];
    const temp = copia[idx];
    copia[idx] = copia[destino];
    copia[destino] = temp;
    copia.forEach((ev, i) => {
      ev.ordem_execucao = i + 1;
    });
    setItensEsteira(copia);
  };

  const alternarSuprimido = (idx: number) => {
    const copia = [...itensEsteira];
    copia[idx] = { ...copia[idx], suprimido: !copia[idx].suprimido };
    setItensEsteira(copia);
  };

  const removerItemDaEsteira = (idx: number) => {
    const copia = itensEsteira.filter((_, i) => i !== idx);
    copia.forEach((ev, i) => {
      ev.ordem_execucao = i + 1;
    });
    setItensEsteira(copia);
  };

  const adicionarMomentoNaEsteira = () => {
    if (!eventoParaAdicionarId) return;
    const ev = eventosDoRito.find((item) => item.id === eventoParaAdicionarId);
    if (!ev) return;

    const jaExisteIdx = itensEsteira.findIndex((item) => item.evento_id === ev.id);
    if (jaExisteIdx >= 0) {
      // Se já estava oculto na lista, reativa-o
      const copia = [...itensEsteira];
      copia[jaExisteIdx] = { ...copia[jaExisteIdx], suprimido: false };
      setItensEsteira(copia);
      setEventoParaAdicionarId('');
      return;
    }

    const novaLista: SessaoLojaEventoItem[] = [
      ...itensEsteira,
      {
        evento_id: ev.id,
        evento_nome: ev.nome,
        ordem_execucao: itensEsteira.length + 1,
        suprimido: false,
        observacao_mestre_harmonia: null,
      },
    ];
    setItensEsteira(novaLista);
    setEventoParaAdicionarId('');
  };

  const handleSalvarSessao = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!lojaAtiva?.id || !nomeSessao.trim()) return;

    const payloadEventos = itensEsteira.map((item, idx) => ({
      evento_id: item.evento_id,
      ordem_execucao: idx + 1,
      suprimido: Boolean(item.suprimido),
      observacao_mestre_harmonia: item.observacao_mestre_harmonia || null,
    }));

    try {
      setSalvando(true);
      if (modoModal === 'CRIAR') {
        await clienteHttp.post(`/sessoes/loja/${lojaAtiva.id}/importar`, {
          tipo_sessao_id: templateSelecionadoId || templates[0]?.id || undefined,
          nome_personalizado: nomeSessao.trim(),
          eventos_customizados: payloadEventos,
        });
      } else if (sessaoEditandoId) {
        await clienteHttp.put(`/sessoes/loja/${lojaAtiva.id}/${sessaoEditandoId}/completa`, {
          nome_personalizado: nomeSessao.trim(),
          eventos_customizados: payloadEventos,
        });
      }
      setModalAberto(false);
      await carregarDados();
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Erro ao salvar a sessão maçônica.');
    } finally {
      setSalvando(false);
    }
  };

  const deletarSessao = async (s: SessaoLoja) => {
    if (!lojaAtiva?.id) return;
    if (!window.confirm(`Tem certeza que deseja excluir a sessão "${s.nome_personalizado}"?`)) return;

    try {
      await clienteHttp.delete(`/sessoes/loja/${lojaAtiva.id}/${s.id}`);
      await carregarDados();
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Erro ao excluir sessão.');
    }
  };

  const sessoesFiltradas = sessoes.filter((s) =>
    (s.nome_personalizado || '').toLowerCase().includes(busca.toLowerCase())
  );

  // Momentos disponíveis no Rito que ainda não estão na esteira atual
  const eventosDisponiveisParaAdicao = eventosDoRito.filter(
    (ev) => !itensEsteira.some((item) => item.evento_id === ev.id)
  );

  const totalMomentosAtivosNoModal = itensEsteira.filter((i) => !i.suprimido).length;

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-6 py-4 sm:py-8">
      {/* Cabeçalho */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4 mb-5 sm:mb-8">
        <div>
          <h1 className="text-xl sm:text-3xl font-bold text-white tracking-wide fonte-ritual flex flex-wrap items-center gap-2">
            <span>Sessões Maçônicas</span>
            <span className="text-[11px] px-2.5 py-0.5 rounded-lg bg-macaonico-dourado/15 text-macaonico-dourado border border-macaonico-dourado/30 font-sans">
              {lojaAtiva?.rito_padrao || 'Rito Brasileiro'}
            </span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Cadastre as sessões praticadas pela Loja e personalize a sequência de momentos musicais do seu Rito.
          </p>
        </div>

        <button
          onClick={abrirModalNovaSessao}
          className="w-full sm:w-auto flex items-center justify-center gap-2 bg-gradient-to-r from-yellow-600 via-macaonico-dourado to-yellow-600 hover:from-yellow-500 hover:to-yellow-400 text-black font-bold px-5 py-3 rounded-xl shadow-lg shadow-macaonico-dourado/20 transition-all cursor-pointer text-sm shrink-0"
        >
          <Plus className="w-5 h-5" />
          <span>Cadastrar Nova Sessão</span>
        </button>
      </div>

      {/* Barra de Busca */}
      <div className="vidro-escuro rounded-2xl p-3 sm:p-4 mb-5">
        <div className="relative w-full md:w-96">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
          <input
            type="text"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar sessão pelo nome..."
            className="w-full bg-primaria-800/80 border border-white/10 rounded-xl pl-10 pr-4 py-2 text-sm text-white focus:border-macaonico-dourado outline-none placeholder:text-slate-500"
          />
        </div>
      </div>

      {/* Lista de Sessões */}
      {carregando ? (
        <div className="py-16 text-center text-slate-400 flex flex-col items-center gap-3">
          <Loader2 className="w-7 h-7 animate-spin text-macaonico-dourado" />
          <span>Carregando sessões da Loja...</span>
        </div>
      ) : sessoesFiltradas.length === 0 ? (
        <div className="vidro-escuro rounded-2xl p-8 sm:p-12 text-center text-slate-400 space-y-4">
          <p className="text-sm sm:text-base">
            Nenhuma sessão cadastrada para esta Loja. Toque em{' '}
            <strong className="text-macaonico-dourado">"Cadastrar Nova Sessão"</strong> para começar.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
          {sessoesFiltradas.map((s) => {
            const ativos = (s.eventos_customizados || []).filter((e) => !e.suprimido);
            const primeirosMomentos = ativos.slice(0, 3);
            return (
              <div
                key={s.id}
                className="vidro-escuro hover:border-macaonico-dourado/40 transition-all rounded-2xl sm:rounded-3xl p-4 sm:p-6 flex flex-col justify-between group relative overflow-hidden"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <span className="text-[11px] font-bold px-2.5 py-1 rounded-md bg-macaonico-dourado/15 text-macaonico-dourado border border-macaonico-dourado/30 truncate">
                      {lojaAtiva?.rito_padrao || 'Rito Brasileiro'}
                    </span>

                    <button
                      onClick={() => deletarSessao(s)}
                      className="p-2 rounded-lg text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-colors"
                      title="Excluir Sessão"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  <h3 className="text-lg sm:text-xl font-bold text-white group-hover:text-macaonico-dourado transition-colors mb-2">
                    {s.nome_personalizado}
                  </h3>

                  {/* Prévia dos primeiros momentos */}
                  {primeirosMomentos.length > 0 && (
                    <div className="space-y-1 mb-4 bg-sigma-bg/60 border border-white/5 rounded-xl p-2.5">
                      {primeirosMomentos.map((m, i) => (
                        <div key={m.id || i} className="text-[11px] text-slate-300 truncate flex items-center gap-1.5">
                          <span className="text-macaonico-dourado font-mono font-bold">{i + 1}.</span>
                          <span className="truncate">{m.evento_nome || 'Momento Ritualístico'}</span>
                        </div>
                      ))}
                      {ativos.length > 3 && (
                        <div className="text-[10px] text-slate-400 pl-4">
                          + {ativos.length - 3} momentos na sequência...
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <div>
                  <div className="flex items-center justify-between py-2.5 border-t border-white/10 text-xs text-slate-300 mb-3">
                    <span className="flex items-center gap-1.5 font-medium">
                      <ListOrdered className="w-4 h-4 text-macaonico-dourado" />
                      {ativos.length} {ativos.length === 1 ? 'momento ativo' : 'momentos ativos'}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2.5">
                    <button
                      onClick={() => abrirModalEditarSessao(s)}
                      className="flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl bg-white/5 hover:bg-white/10 text-white font-semibold text-xs border border-white/10 transition-all cursor-pointer min-h-[42px]"
                    >
                      <Edit3 className="w-4 h-4 text-macaonico-dourado shrink-0" />
                      <span>Editar Sessão</span>
                    </button>

                    <button
                      onClick={() => navigate(`/player?sessao=${s.id}`)}
                      className="flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl bg-macaonico-dourado hover:bg-yellow-400 text-black font-bold text-xs shadow-md transition-all cursor-pointer min-h-[42px]"
                    >
                      <PlayCircle className="w-4 h-4 shrink-0" />
                      <span>Iniciar Player</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal Centralizado (Portal) para Cadastrar / Editar Sessão Maçônica */}
      {modalAberto &&
        createPortal(
          <div
            style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 9999 }}
            className="fixed inset-0 z-[120] flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-md"
          >
            <form
              onSubmit={handleSalvarSessao}
              className="bg-[#0a1428] border border-macaonico-dourado/45 rounded-2xl sm:rounded-3xl w-full max-w-2xl max-h-[88dvh] flex flex-col shadow-[0_20px_60px_rgba(0,0,0,0.9)] overflow-hidden"
            >
              {/* Cabeçalho do Modal */}
              <div className="flex items-center justify-between px-4 sm:px-6 py-4 border-b border-white/10 bg-[#070e1c] shrink-0">
                <div className="min-w-0 pr-2">
                  <span className="text-[10px] font-bold text-macaonico-dourado uppercase tracking-wider block">
                    {lojaAtiva?.rito_padrao || 'Rito Brasileiro'}
                  </span>
                  <h2 className="text-base sm:text-xl font-bold text-white fonte-ritual truncate">
                    {modoModal === 'CRIAR'
                      ? 'Cadastrar Nova Sessão Maçônica'
                      : 'Editar Sessão e Esteira Litúrgica'}
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={() => setModalAberto(false)}
                  className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 shrink-0"
                  title="Fechar"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Corpo Rolável do Modal */}
              <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5 min-h-0">
                {/* Passo 1: Modelo Base do Rito e Nome da Sessão */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 bg-[#070e1c]/80 border border-white/10 rounded-2xl p-3.5 sm:p-4">
                  <div>
                    <label className="block text-xs font-semibold text-macaonico-dourado mb-1.5">
                      1. Modelo Base do Rito
                    </label>
                    <select
                      value={templateSelecionadoId}
                      onChange={(e) => aplicarModeloTemplate(e.target.value)}
                      className="w-full bg-[#0e1c36] border border-white/15 rounded-xl px-3 py-2.5 text-sm text-white focus:border-macaonico-dourado outline-none"
                    >
                      {templates.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.nome} ({t.eventos?.length || 0} momentos)
                        </option>
                      ))}
                    </select>
                    <p className="text-[11px] text-slate-400 mt-1">
                      Selecionar um modelo preenche automaticamente os momentos padrão do Rito abaixo.
                    </p>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-macaonico-dourado mb-1.5">
                      2. Nome da Sessão na Loja
                    </label>
                    <input
                      type="text"
                      required
                      value={nomeSessao}
                      onChange={(e) => setNomeSessao(e.target.value)}
                      placeholder="Ex: Sessão Ordinária de Aprendiz"
                      className="w-full bg-[#0e1c36] border border-white/15 rounded-xl px-3.5 py-2.5 text-sm text-white focus:border-macaonico-dourado outline-none"
                    />
                    <p className="text-[11px] text-slate-400 mt-1">
                      Nome com o qual a sessão aparecerá no Player.
                    </p>
                  </div>
                </div>

                {/* Passo 3: Adicionar Momento do Rito na Esteira */}
                <div className="bg-[#070e1c]/80 border border-macaonico-dourado/25 rounded-2xl p-3.5 sm:p-4 space-y-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <label className="text-xs font-semibold text-white flex items-center gap-1.5">
                      <Sparkles className="w-4 h-4 text-macaonico-dourado" />
                      <span>Adicionar Momento Litúrgico do Rito à Sessão</span>
                    </label>
                    <span className="text-[11px] text-macaonico-dourado font-semibold">
                      {totalMomentosAtivosNoModal} ativos
                    </span>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-2">
                    <select
                      value={eventoParaAdicionarId}
                      onChange={(e) => setEventoParaAdicionarId(e.target.value)}
                      className="flex-1 bg-[#0e1c36] border border-white/15 rounded-xl px-3 py-2 text-xs sm:text-sm text-white focus:border-macaonico-dourado outline-none"
                    >
                      <option value="">
                        {eventosDisponiveisParaAdicao.length > 0
                          ? `Selecione um momento do ${lojaAtiva?.rito_padrao || 'Rito'} para incluir...`
                          : 'Todos os momentos cadastrados do Rito já estão na lista abaixo'}
                      </option>
                      {eventosDisponiveisParaAdicao.map((ev) => (
                        <option key={ev.id} value={ev.id}>
                          {ev.nome}
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={adicionarMomentoNaEsteira}
                      disabled={!eventoParaAdicionarId}
                      className="flex items-center justify-center gap-1.5 bg-macaonico-dourado/20 hover:bg-macaonico-dourado text-macaonico-dourado hover:text-black border border-macaonico-dourado/40 font-bold px-4 py-2 rounded-xl text-xs sm:text-sm transition-all disabled:opacity-40 shrink-0"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Incluir Momento</span>
                    </button>
                  </div>
                </div>

                {/* Lista Ordenada de Momentos da Sessão */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-xs sm:text-sm font-bold text-slate-200 uppercase tracking-wider">
                      3. Sequência de Momentos da Sessão ({itensEsteira.length})
                    </h3>
                    <span className="text-[11px] text-slate-400">
                      Reordene com as setas ou oculte momentos não utilizados
                    </span>
                  </div>

                  <div className="space-y-1.5">
                    {itensEsteira.map((item, idx) => (
                      <div
                        key={`${item.evento_id}-${idx}`}
                        className={`flex items-center justify-between gap-2 rounded-xl px-3 py-2 border transition-all ${
                          item.suprimido
                            ? 'bg-[#070e1c]/40 border-white/5 opacity-50'
                            : 'bg-[#0e1c36]/90 border-white/10'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0 flex-1">
                          <span className="w-6 h-6 rounded-md bg-macaonico-dourado/15 border border-macaonico-dourado/30 text-macaonico-dourado font-bold text-xs flex items-center justify-center shrink-0">
                            {idx + 1}
                          </span>
                          <span
                            className={`text-xs sm:text-sm font-medium truncate ${
                              item.suprimido ? 'line-through text-slate-500' : 'text-white'
                            }`}
                          >
                            {item.evento_nome || 'Momento Ritualístico'}
                          </span>
                        </div>

                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            type="button"
                            onClick={() => moverItem(idx, -1)}
                            disabled={idx === 0}
                            className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-white/10 disabled:opacity-20"
                            title="Subir na sequência"
                          >
                            <ArrowUp className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => moverItem(idx, 1)}
                            disabled={idx === itensEsteira.length - 1}
                            className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-white/10 disabled:opacity-20"
                            title="Descer na sequência"
                          >
                            <ArrowDown className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => alternarSuprimido(idx)}
                            className={`p-1.5 rounded-lg transition-colors ${
                              item.suprimido
                                ? 'text-amber-400 bg-amber-500/10'
                                : 'text-slate-300 hover:text-white hover:bg-white/10'
                            }`}
                            title={item.suprimido ? 'Reativar momento' : 'Ocultar momento'}
                          >
                            {item.suprimido ? (
                              <EyeOff className="w-4 h-4" />
                            ) : (
                              <Eye className="w-4 h-4" />
                            )}
                          </button>
                          <button
                            type="button"
                            onClick={() => removerItemDaEsteira(idx)}
                            className="p-1.5 rounded-lg text-red-400/80 hover:text-red-300 hover:bg-red-500/10 transition-colors"
                            title="Remover momento desta sessão"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Rodapé Fixo do Modal */}
              <div className="flex items-center justify-between gap-3 px-4 sm:px-6 py-3.5 border-t border-white/10 bg-[#070e1c] shrink-0">
                <span className="text-xs text-slate-400 hidden sm:inline">
                  {totalMomentosAtivosNoModal} momentos ativos para o Player
                </span>
                <div className="flex items-center justify-end gap-2.5 w-full sm:w-auto">
                  <button
                    type="button"
                    onClick={() => setModalAberto(false)}
                    className="px-4 py-2.5 rounded-xl text-xs sm:text-sm font-medium text-slate-300 hover:text-white hover:bg-white/5"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={salvando || !nomeSessao.trim() || itensEsteira.length === 0}
                    className="flex items-center justify-center gap-2 bg-macaonico-dourado hover:bg-yellow-400 text-black font-bold px-5 py-2.5 rounded-xl text-xs sm:text-sm shadow-lg transition-all disabled:opacity-50"
                  >
                    {salvando ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Check className="w-4 h-4" />
                    )}
                    <span>
                      {salvando
                        ? 'Salvando...'
                        : modoModal === 'CRIAR'
                        ? 'Cadastrar Sessão'
                        : 'Salvar Alterações'}
                    </span>
                  </button>
                </div>
              </div>
            </form>
          </div>,
          document.body
        )}
    </div>
  );
};
