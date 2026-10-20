import React, { useState, useEffect } from 'react';
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
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import clienteHttp from '../../compartilhado/api/cliente_http';
import { useTenant } from '../../compartilhado/contextos/ContextoTenant';

interface SessaoLojaEventoItem {
  id: string;
  sessao_loja_id: string;
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

interface TemplateSessao {
  id: string;
  nome: string;
  rito_id: string;
  eventos: { id: string; evento_id: string; ordem_sequencia: number }[];
}

/**
 * Página de gestão das Sessões e Roteiros Ritualísticos da Loja.
 * Totalmente responsiva (Mobile-First) e alinhada às rotas `/sessoes/loja/{loja_id}`.
 */
export const PaginaSessoes: React.FC = () => {
  const navigate = useNavigate();
  const { lojaAtiva } = useTenant();
  const [sessoes, setSessoes] = useState<SessaoLoja[]>([]);
  const [templates, setTemplates] = useState<TemplateSessao[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [busca, setBusca] = useState('');

  // Modal de Importação de Template
  const [modalImportarAberto, setModalImportarAberto] = useState(false);
  const [templateSelecionadoId, setTemplateSelecionadoId] = useState('');
  const [nomePersonalizado, setNomePersonalizado] = useState('');
  const [importando, setImportando] = useState(false);

  // Modal de Edição da Esteira (Roteiro da Loja)
  const [sessaoEditando, setSessaoEditando] = useState<SessaoLoja | null>(null);
  const [eventosEditando, setEventosEditando] = useState<SessaoLojaEventoItem[]>([]);
  const [salvandoRoteiro, setSalvandoRoteiro] = useState(false);

  const carregarDados = async () => {
    if (!lojaAtiva?.id) {
      setCarregando(false);
      return;
    }
    try {
      setCarregando(true);
      const paramsTemplate = lojaAtiva.rito_id ? { rito_id: lojaAtiva.rito_id } : {};
      const [respSessoes, respTemplates] = await Promise.all([
        clienteHttp.get<SessaoLoja[]>(`/sessoes/loja/${lojaAtiva.id}`),
        clienteHttp.get<TemplateSessao[]>('/sessoes/templates', { params: paramsTemplate }),
      ]);
      setSessoes(respSessoes.data);
      setTemplates(respTemplates.data);
      if (respTemplates.data.length > 0 && !templateSelecionadoId) {
        setTemplateSelecionadoId(respTemplates.data[0].id);
      }
    } catch (err) {
      console.error('Erro ao carregar sessões da loja:', err);
    } finally {
      setCarregando(false);
    }
  };

  useEffect(() => {
    carregarDados();
  }, [lojaAtiva?.id, lojaAtiva?.rito_id]);

  const abrirModalImportar = () => {
    const primeiroTemplate = templates[0];
    setTemplateSelecionadoId(primeiroTemplate?.id || '');
    setNomePersonalizado(primeiroTemplate ? `${primeiroTemplate.nome}` : '');
    setModalImportarAberto(true);
  };

  const handleImportarSessao = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!lojaAtiva?.id || !templateSelecionadoId) return;

    try {
      setImportando(true);
      await clienteHttp.post(`/sessoes/loja/${lojaAtiva.id}/importar`, {
        tipo_sessao_id: templateSelecionadoId,
        nome_personalizado: nomePersonalizado.trim() || undefined,
      });
      setModalImportarAberto(false);
      await carregarDados();
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Erro ao importar template de sessão.');
    } finally {
      setImportando(false);
    }
  };

  const deletarSessao = async (s: SessaoLoja) => {
    if (!lojaAtiva?.id) return;
    if (!window.confirm(`Tem certeza que deseja excluir o roteiro "${s.nome_personalizado}"?`)) return;

    try {
      await clienteHttp.delete(`/sessoes/loja/${lojaAtiva.id}/${s.id}`);
      await carregarDados();
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Erro ao excluir sessão.');
    }
  };

  const abrirEditorRoteiro = (s: SessaoLoja) => {
    setSessaoEditando(s);
    const ordenados = [...(s.eventos_customizados || [])].sort(
      (a, b) => a.ordem_execucao - b.ordem_execucao
    );
    setEventosEditando(ordenados);
  };

  const moverItem = (idx: number, direcao: -1 | 1) => {
    const destino = idx + direcao;
    if (destino < 0 || destino >= eventosEditando.length) return;
    const copia = [...eventosEditando];
    const temp = copia[idx];
    copia[idx] = copia[destino];
    copia[destino] = temp;
    copia.forEach((ev, i) => {
      ev.ordem_execucao = i + 1;
    });
    setEventosEditando(copia);
  };

  const alternarSuprimido = (idx: number) => {
    const copia = [...eventosEditando];
    copia[idx] = { ...copia[idx], suprimido: !copia[idx].suprimido };
    setEventosEditando(copia);
  };

  const salvarRoteiroCustomizado = async () => {
    if (!lojaAtiva?.id || !sessaoEditando) return;
    try {
      setSalvandoRoteiro(true);
      await Promise.all(
        eventosEditando.map((ev, i) =>
          clienteHttp.put(`/sessoes/loja/${lojaAtiva.id}/roteiro/${ev.id}`, {
            ordem_execucao: i + 1,
            suprimido: ev.suprimido,
            observacao_mestre_harmonia: ev.observacao_mestre_harmonia || null,
          })
        )
      );
      setSessaoEditando(null);
      await carregarDados();
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Erro ao salvar alterações na esteira.');
    } finally {
      setSalvandoRoteiro(false);
    }
  };

  const sessoesFiltradas = sessoes.filter((s) =>
    (s.nome_personalizado || '').toLowerCase().includes(busca.toLowerCase())
  );

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-6 py-4 sm:py-8">
      {/* Cabeçalho */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4 mb-5 sm:mb-8">
        <div>
          <h1 className="text-xl sm:text-3xl font-bold text-white tracking-wide fonte-ritual flex flex-wrap items-center gap-2">
            <span>Sessões Maçônicas</span>
            <span className="text-[11px] px-2.5 py-0.5 rounded-lg bg-macaonico-dourado/15 text-macaonico-dourado border border-macaonico-dourado/30 font-sans">
              Esteiras Litúrgicas
            </span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Importe roteiros do seu Rito e personalize a ordem de execução dos momentos musicais.
          </p>
        </div>

        <button
          onClick={abrirModalImportar}
          className="w-full sm:w-auto flex items-center justify-center gap-2 bg-gradient-to-r from-yellow-600 via-macaonico-dourado to-yellow-600 hover:from-yellow-500 hover:to-yellow-400 text-black font-bold px-5 py-3 rounded-xl shadow-lg shadow-macaonico-dourado/20 transition-all cursor-pointer text-sm shrink-0"
        >
          <Plus className="w-5 h-5" />
          <span>Importar Roteiro do Rito</span>
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
          <span>Carregando roteiros da Loja...</span>
        </div>
      ) : sessoesFiltradas.length === 0 ? (
        <div className="vidro-escuro rounded-2xl p-8 sm:p-12 text-center text-slate-400 space-y-4">
          <p className="text-sm sm:text-base">
            Nenhum roteiro configurado para esta Loja. Toque em <strong>"Importar Roteiro do Rito"</strong> para começar.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
          {sessoesFiltradas.map((s) => {
            const totalAtivos = (s.eventos_customizados || []).filter((e) => !e.suprimido).length;
            return (
              <div
                key={s.id}
                className="vidro-escuro hover:border-macaonico-dourado/40 transition-all rounded-2xl sm:rounded-3xl p-4 sm:p-6 flex flex-col justify-between group relative overflow-hidden"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <span className="text-[11px] font-bold px-2.5 py-1 rounded-md bg-macaonico-dourado/15 text-macaonico-dourado border border-macaonico-dourado/30 truncate">
                      {lojaAtiva?.rito_padrao || 'Rito da Loja'}
                    </span>

                    {/* Botão Excluir sempre visível no mobile */}
                    <button
                      onClick={() => deletarSessao(s)}
                      className="p-2 rounded-lg text-red-400 hover:text-red-300 hover:bg-red-500/10 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity"
                      title="Excluir Roteiro"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  <h3 className="text-lg sm:text-xl font-bold text-white group-hover:text-macaonico-dourado transition-colors mb-2">
                    {s.nome_personalizado}
                  </h3>

                  <p className="text-xs text-slate-400 mb-4">
                    Roteiro personalizado com momentos sequenciais configurados para a sua Oficina.
                  </p>
                </div>

                <div>
                  <div className="flex items-center justify-between py-2.5 border-t border-white/10 text-xs text-slate-300 mb-3">
                    <span className="flex items-center gap-1.5 font-medium">
                      <ListOrdered className="w-4 h-4 text-macaonico-dourado" />
                      {totalAtivos} {totalAtivos === 1 ? 'momento ativo' : 'momentos ativos'}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2.5">
                    <button
                      onClick={() => abrirEditorRoteiro(s)}
                      className="flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl bg-white/5 hover:bg-white/10 text-white font-semibold text-xs border border-white/10 transition-all cursor-pointer min-h-[42px]"
                    >
                      <ListOrdered className="w-4 h-4 text-macaonico-dourado shrink-0" />
                      <span>Editar Esteira</span>
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

      {/* Modal de Importação de Template */}
      {modalImportarAberto && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-sigma-bg/80 backdrop-blur-md">
          <div className="vidro-destaque rounded-t-3xl sm:rounded-3xl w-full max-w-lg p-5 sm:p-6 max-h-[90dvh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-white/10 mb-4">
              <div>
                <span className="text-[10px] font-bold text-macaonico-dourado uppercase tracking-wider">
                  Novo Roteiro da Loja
                </span>
                <h3 className="text-lg sm:text-xl font-bold text-white fonte-ritual">
                  Importar Template do Rito
                </h3>
              </div>
              <button
                onClick={() => setModalImportarAberto(false)}
                className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/10"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleImportarSessao} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Modelo Oficial de Sessão
                </label>
                <select
                  value={templateSelecionadoId}
                  onChange={(e) => {
                    const id = e.target.value;
                    setTemplateSelecionadoId(id);
                    const t = templates.find((item) => item.id === id);
                    if (t) setNomePersonalizado(t.nome);
                  }}
                  required
                  className="w-full bg-primaria-800 border border-white/15 rounded-xl px-3.5 py-2.5 text-sm text-white focus:border-macaonico-dourado outline-none"
                >
                  {templates.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.nome} ({t.eventos?.length || 0} momentos)
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Nome Personalizado na Loja
                </label>
                <input
                  type="text"
                  required
                  value={nomePersonalizado}
                  onChange={(e) => setNomePersonalizado(e.target.value)}
                  placeholder="Ex: Sessão Ordinária de Aprendiz"
                  className="w-full bg-primaria-800 border border-white/15 rounded-xl px-4 py-2.5 text-sm text-white focus:border-macaonico-dourado outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setModalImportarAberto(false)}
                  className="px-4 py-2.5 rounded-xl text-sm font-medium text-slate-400 hover:text-white"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={importando || !templateSelecionadoId}
                  className="bg-macaonico-dourado hover:bg-yellow-400 text-black font-bold px-5 py-2.5 rounded-xl text-sm transition-all disabled:opacity-50"
                >
                  {importando ? 'Importando...' : 'Importar Roteiro'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de Edição da Esteira (Reordenação e Supressão) */}
      {sessaoEditando && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-sigma-bg/80 backdrop-blur-md">
          <div className="vidro-destaque rounded-t-3xl sm:rounded-3xl w-full max-w-2xl p-4 sm:p-6 max-h-[90dvh] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-white/10 mb-3 shrink-0">
              <div className="min-w-0 pr-2">
                <span className="text-[10px] font-bold text-macaonico-dourado uppercase tracking-wider">
                  Personalizar Sequência
                </span>
                <h2 className="text-lg sm:text-xl font-bold text-white fonte-ritual truncate">
                  {sessaoEditando.nome_personalizado}
                </h2>
              </div>
              <button
                onClick={() => setSessaoEditando(null)}
                className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 shrink-0"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-400 mb-3 shrink-0">
              Use as setas para reordenar ou o ícone de olho para ocultar momentos que sua Loja não executa.
            </p>

            <div className="flex-1 overflow-y-auto space-y-2 pr-1 min-h-0">
              {eventosEditando.map((item, idx) => (
                <div
                  key={item.id}
                  className={`flex items-center justify-between gap-2 rounded-xl px-3 sm:px-4 py-2.5 border transition-all ${
                    item.suprimido
                      ? 'bg-sigma-bg/40 border-white/5 opacity-50'
                      : 'bg-primaria-800/70 border-white/10'
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
                      className="p-2 rounded-lg text-slate-300 hover:text-white hover:bg-white/10 disabled:opacity-20"
                      title="Subir"
                    >
                      <ArrowUp className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => moverItem(idx, 1)}
                      disabled={idx === eventosEditando.length - 1}
                      className="p-2 rounded-lg text-slate-300 hover:text-white hover:bg-white/10 disabled:opacity-20"
                      title="Descer"
                    >
                      <ArrowDown className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => alternarSuprimido(idx)}
                      className={`p-2 rounded-lg transition-colors ${
                        item.suprimido
                          ? 'text-amber-400 bg-amber-500/10'
                          : 'text-slate-400 hover:text-white hover:bg-white/10'
                      }`}
                      title={item.suprimido ? 'Reativar momento' : 'Ocultar momento'}
                    >
                      {item.suprimido ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-white/10 mt-3 shrink-0">
              <button
                type="button"
                onClick={() => setSessaoEditando(null)}
                className="px-4 py-2 rounded-xl text-sm font-medium text-slate-400 hover:text-white"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={salvarRoteiroCustomizado}
                disabled={salvandoRoteiro}
                className="flex items-center gap-2 bg-macaonico-dourado hover:bg-yellow-400 text-black font-bold px-5 py-2.5 rounded-xl text-sm transition-all disabled:opacity-50"
              >
                <Check className="w-4 h-4" />
                <span>{salvandoRoteiro ? 'Salvando...' : 'Salvar Esteira'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
