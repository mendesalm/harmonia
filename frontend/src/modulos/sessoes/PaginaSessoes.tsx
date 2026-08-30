import React, { useState, useEffect } from 'react';
import { Plus, Search, ListOrdered, Edit3, Trash2, PlayCircle, Copy, X, Check, Sparkles } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Sessao } from '../../compartilhado/tipos';
import clienteHttp from '../../compartilhado/api/cliente_http';
import { useTenant } from '../../compartilhado/contextos/ContextoTenant';
import { ModalSequenciadorSessao } from './ModalSequenciadorSessao';

export const PaginaSessoes: React.FC = () => {
  const navigate = useNavigate();
  const { lojaAtiva } = useTenant();
  const [sessoes, setSessoes] = useState<Sessao[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [busca, setBusca] = useState('');

  // Modal de Criação / Edição de Sessão
  const [modalNovaAberto, setModalNovaAberto] = useState(false);
  const [sessaoEmEdicao, setSessaoEmEdicao] = useState<Sessao | null>(null);
  const [formNome, setFormNome] = useState('');
  const [formRito, setFormRito] = useState('Brasileiro');
  const [formGrau, setFormGrau] = useState(1);
  const [formDescricao, setFormDescricao] = useState('');
  const [salvando, setSalvando] = useState(false);

  // Modal Sequenciador
  const [sequenciandoSessaoId, setSequenciandoSessaoId] = useState<string | null>(null);

  // Modal Clonar Sessão
  const [sessaoParaClonar, setSessaoParaClonar] = useState<Sessao | null>(null);
  const [cloneNome, setCloneNome] = useState('');
  const [cloneRito, setCloneRito] = useState('Brasileiro');
  const [cloneGrau, setCloneGrau] = useState(1);
  const [clonando, setClonando] = useState(false);

  const carregarSessoes = async () => {
    try {
      setCarregando(true);
      const params: any = {};
      if (lojaAtiva) params.organizacao_id = lojaAtiva.id;
      const resp = await clienteHttp.get<Sessao[]>('/sessoes', { params });
      setSessoes(resp.data);
    } catch (err) {
      console.error('Erro ao carregar sessões:', err);
    } finally {
      setCarregando(false);
    }
  };

  useEffect(() => {
    carregarSessoes();
  }, [lojaAtiva]);

  const abrirModalNova = () => {
    setSessaoEmEdicao(null);
    setFormNome('');
    setFormRito(lojaAtiva?.rito_padrao || 'Brasileiro');
    setFormGrau(1);
    setFormDescricao('');
    setModalNovaAberto(true);
  };

  const abrirModalEditar = (s: Sessao) => {
    setSessaoEmEdicao(s);
    setFormNome(s.nome);
    setFormRito(s.rito);
    setFormGrau(s.grau);
    setFormDescricao(s.descricao || '');
    setModalNovaAberto(true);
  };

  const abrirModalClonar = (s: Sessao) => {
    setSessaoParaClonar(s);
    setCloneNome(`${s.nome} (Cópia)`);
    setCloneRito(s.rito);
    setCloneGrau(s.grau);
  };

  const executarClonagem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sessaoParaClonar) return;

    try {
      setClonando(true);
      await clienteHttp.post(`/sessoes/${sessaoParaClonar.id}/clonar`, {
        novo_nome: cloneNome.trim(),
        novo_rito: cloneRito,
        novo_grau: cloneGrau,
      });

      setSessaoParaClonar(null);
      await carregarSessoes();
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Erro ao clonar sessão.');
    } finally {
      setClonando(false);
    }
  };

  const salvarSessao = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formNome.trim() || !lojaAtiva) return;

    try {
      setSalvando(true);
      if (sessaoEmEdicao) {
        await clienteHttp.put(`/sessoes/${sessaoEmEdicao.id}`, {
          nome: formNome,
          rito: formRito,
          grau: formGrau,
          descricao: formDescricao,
        });
      } else {
        await clienteHttp.post('/sessoes', {
          organizacao_id: lojaAtiva.id,
          nome: formNome,
          rito: formRito,
          grau: formGrau,
          descricao: formDescricao,
        });
      }
      setModalNovaAberto(false);
      await carregarSessoes();
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Erro ao salvar sessão.');
    } finally {
      setSalvando(false);
    }
  };

  const deletarSessao = async (s: Sessao) => {
    if (!window.confirm(`Tem certeza que deseja excluir a sessão "${s.nome}"?`)) return;

    try {
      await clienteHttp.delete(`/sessoes/${s.id}`);
      await carregarSessoes();
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Erro ao deletar sessão.');
    }
  };

  const sessoesFiltradas = sessoes.filter((s) =>
    s.nome.toLowerCase().includes(busca.toLowerCase()) ||
    s.rito.toLowerCase().includes(busca.toLowerCase())
  );

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Cabeçalho */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-wide fonte-ritual flex items-center gap-3">
            Sessões Maçônicas <span className="text-xs px-2.5 py-1 rounded-lg bg-macaonico-cianoSigma/10 text-macaonico-cianoSigma border border-macaonico-cianoSigma/20 font-sans">Esteiras Litúrgicas</span>
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Configure, clone modelos existentes e ordene a sequência de eventos/playlists para cada rito maçônico.
          </p>
        </div>

        <button
          onClick={abrirModalNova}
          className="flex items-center justify-center gap-2 bg-gradient-to-r from-macaonico-cianoSigma to-primaria-600 hover:from-cyan-400 hover:to-primaria-500 text-black font-bold px-5 py-2.5 rounded-xl shadow-lg shadow-cyan-500/20 transition-all cursor-pointer"
        >
          <Plus className="w-5 h-5" />
          <span>Nova Sessão</span>
        </button>
      </div>

      {/* Barra de Busca */}
      <div className="vidro-escuro rounded-2xl p-4 mb-6">
        <div className="relative w-full md:w-96">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
          <input
            type="text"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar sessão por nome ou rito (Brasileiro, REAA, York...)..."
            className="w-full bg-primaria-800/80 border border-white/10 rounded-xl pl-10 pr-4 py-2 text-sm text-white focus:border-macaonico-cianoSigma outline-none placeholder:text-slate-500"
          />
        </div>
      </div>

      {/* Grid de Sessões */}
      {carregando ? (
        <div className="py-20 text-center text-slate-400">Carregando sessões...</div>
      ) : sessoesFiltradas.length === 0 ? (
        <div className="vidro-escuro rounded-2xl p-12 text-center text-slate-400">
          Nenhuma sessão maçônica cadastrada para esta Loja. Clique em "Nova Sessão" para começar.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {sessoesFiltradas.map((s) => (
            <div
              key={s.id}
              className="vidro-escuro hover:border-white/20 transition-all rounded-3xl p-6 flex flex-col justify-between group relative overflow-hidden"
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-md bg-macaonico-cianoSigma/15 text-macaonico-cianoSigma border border-macaonico-cianoSigma/30">
                      Rito {s.rito}
                    </span>
                    <span className="text-[11px] font-semibold px-2 py-0.5 rounded-md bg-white/5 text-slate-300 border border-white/5">
                      Grau {s.grau}
                    </span>
                  </div>

                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => abrirModalClonar(s)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-macaonico-cianoSigma hover:bg-white/10"
                      title="Clonar Este Modelo de Sessão"
                    >
                      <Copy className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => abrirModalEditar(s)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10"
                      title="Editar Dados da Sessão"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => deletarSessao(s)}
                      className="p-1.5 rounded-lg text-red-400 hover:text-red-300 hover:bg-red-500/10"
                      title="Excluir Sessão"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <h3 className="text-xl font-bold text-white group-hover:text-macaonico-cianoSigma transition-colors mb-2">
                  {s.nome}
                </h3>

                <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed mb-6">
                  {s.descricao || 'Sem descrição cadastrada.'}
                </p>
              </div>

              <div>
                <div className="flex items-center justify-between py-3 border-t border-white/5 text-xs text-slate-400 mb-4">
                  <span className="flex items-center gap-1.5 font-medium text-slate-300">
                    <ListOrdered className="w-3.5 h-3.5 text-macaonico-cianoSigma" />
                    {s.total_eventos || 0} {(s.total_eventos || 0) === 1 ? 'momento na esteira' : 'momentos na esteira'}
                  </span>

                  <button
                    onClick={() => abrirModalClonar(s)}
                    className="text-[11px] font-semibold text-slate-400 hover:text-macaonico-cianoSigma flex items-center gap-1 transition-colors"
                  >
                    <Copy className="w-3 h-3" /> Clonar Modelo
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => setSequenciandoSessaoId(s.id)}
                    className="flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl bg-white/5 hover:bg-white/10 text-white font-semibold text-xs border border-white/10 transition-all cursor-pointer"
                  >
                    <ListOrdered className="w-3.5 h-3.5 text-macaonico-cianoSigma" />
                    <span>Editar Esteira</span>
                  </button>

                  <button
                    onClick={() => navigate(`/?sessao=${s.id}`)}
                    className="flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl bg-macaonico-cianoSigma hover:bg-cyan-400 text-black font-bold text-xs shadow-md shadow-cyan-500/20 transition-all cursor-pointer"
                  >
                    <PlayCircle className="w-3.5 h-3.5" />
                    <span>Iniciar Player</span>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal Clonar Sessão */}
      {sessaoParaClonar && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="vidro-destaque rounded-3xl w-full max-w-lg p-6 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-white/10 mb-4">
              <div>
                <span className="text-[10px] font-bold text-macaonico-cianoSigma uppercase tracking-wider">
                  Duplicar Esteira Litúrgica
                </span>
                <h3 className="text-xl font-bold text-white fonte-ritual">
                  Clonar Modelo de Sessão
                </h3>
              </div>
              <button
                onClick={() => setSessaoParaClonar(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-400 mb-4">
              Criará uma nova sessão com todos os <strong className="text-white">{sessaoParaClonar.total_eventos || 0} momentos ritualísticos</strong> já ordenados na mesma sequência.
            </p>

            <form onSubmit={executarClonagem} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Nome da Nova Sessão Clonada
                </label>
                <input
                  type="text"
                  required
                  value={cloneNome}
                  onChange={(e) => setCloneNome(e.target.value)}
                  className="w-full bg-primaria-800 border border-white/15 rounded-xl px-4 py-2.5 text-sm text-white focus:border-macaonico-cianoSigma outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Rito Litúrgico
                  </label>
                  <select
                    value={cloneRito}
                    onChange={(e) => setCloneRito(e.target.value)}
                    className="w-full bg-primaria-800 border border-white/15 rounded-xl px-3 py-2 text-sm text-white focus:border-macaonico-cianoSigma outline-none"
                  >
                    <option value="Brasileiro">Rito Brasileiro</option>
                    <option value="REAA">R.E.A.A.</option>
                    <option value="York">Rito de York</option>
                    <option value="Schroeder">Rito Schroeder</option>
                    <option value="Moderno">Rito Moderno</option>
                    <option value="Adonhiramita">Rito Adonhiramita</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Grau Simbólico
                  </label>
                  <select
                    value={cloneGrau}
                    onChange={(e) => setCloneGrau(Number(e.target.value))}
                    className="w-full bg-primaria-800 border border-white/15 rounded-xl px-3 py-2 text-sm text-white focus:border-macaonico-cianoSigma outline-none"
                  >
                    <option value={1}>Grau 1 - Aprendiz</option>
                    <option value={2}>Grau 2 - Companheiro</option>
                    <option value={3}>Grau 3 - Mestre</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setSessaoParaClonar(null)}
                  className="px-4 py-2 rounded-xl text-sm font-medium text-slate-400 hover:text-white"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={clonando}
                  className="flex items-center gap-2 bg-macaonico-cianoSigma hover:bg-cyan-400 text-black font-bold px-5 py-2 rounded-xl text-sm shadow-md transition-all disabled:opacity-50"
                >
                  <Copy className="w-4 h-4" />
                  <span>{clonando ? 'Clonando...' : 'Confirmar e Clonar'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Sequenciador */}
      {sequenciandoSessaoId && (
        <ModalSequenciadorSessao
          sessaoId={sequenciandoSessaoId}
          onFechar={() => setSequenciandoSessaoId(null)}
          onSalvo={carregarSessoes}
        />
      )}

      {/* Modal de Criação / Edição de Sessão */}
      {modalNovaAberto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="vidro-destaque rounded-3xl w-full max-w-lg p-6 animate-in fade-in zoom-in-95 duration-200">
            <h2 className="text-xl font-bold text-white fonte-ritual mb-4">
              {sessaoEmEdicao ? 'Editar Sessão Maçônica' : 'Nova Sessão Maçônica'}
            </h2>

            <form onSubmit={salvarSessao} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Nome da Sessão
                </label>
                <input
                  type="text"
                  required
                  value={formNome}
                  onChange={(e) => setFormNome(e.target.value)}
                  placeholder="Ex: Sessão Magna de Iniciação - Rito Brasileiro"
                  className="w-full bg-primaria-800 border border-white/15 rounded-xl px-4 py-2.5 text-sm text-white focus:border-macaonico-cianoSigma outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Rito Litúrgico
                  </label>
                  <select
                    value={formRito}
                    onChange={(e) => setFormRito(e.target.value)}
                    className="w-full bg-primaria-800 border border-white/15 rounded-xl px-3 py-2 text-sm text-white focus:border-macaonico-cianoSigma outline-none"
                  >
                    <option value="Brasileiro">Rito Brasileiro</option>
                    <option value="REAA">R.E.A.A.</option>
                    <option value="York">Rito de York</option>
                    <option value="Schroeder">Rito Schroeder</option>
                    <option value="Moderno">Rito Moderno</option>
                    <option value="Adonhiramita">Rito Adonhiramita</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Grau Simbólico
                  </label>
                  <select
                    value={formGrau}
                    onChange={(e) => setFormGrau(Number(e.target.value))}
                    className="w-full bg-primaria-800 border border-white/15 rounded-xl px-3 py-2 text-sm text-white focus:border-macaonico-cianoSigma outline-none"
                  >
                    <option value={1}>Grau 1 - Aprendiz</option>
                    <option value={2}>Grau 2 - Companheiro</option>
                    <option value={3}>Grau 3 - Mestre</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Notas Litúrgicas / Observações (Opcional)
                </label>
                <textarea
                  rows={3}
                  value={formDescricao}
                  onChange={(e) => setFormDescricao(e.target.value)}
                  placeholder="Orientações e particularidades litúrgicas desta sessão..."
                  className="w-full bg-primaria-800 border border-white/15 rounded-xl px-4 py-2.5 text-sm text-white focus:border-macaonico-cianoSigma outline-none resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setModalNovaAberto(false)}
                  className="px-4 py-2 rounded-xl text-sm font-medium text-slate-400 hover:text-white hover:bg-white/5 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={salvando}
                  className="bg-macaonico-cianoSigma hover:bg-cyan-400 text-black font-bold px-5 py-2 rounded-xl text-sm transition-all cursor-pointer disabled:opacity-50"
                >
                  {salvando ? 'Salvando...' : sessaoEmEdicao ? 'Atualizar' : 'Criar Sessão'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
