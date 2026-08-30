import React, { useState, useEffect } from 'react';
import { Plus, Search, Music, ShieldCheck, Share2, Trash2, Edit3, Sparkles, UploadCloud } from 'lucide-react';
import { Evento } from '../../compartilhado/tipos';
import clienteHttp from '../../compartilhado/api/cliente_http';
import { useTenant } from '../../compartilhado/contextos/ContextoTenant';
import { ModalUploadMusica } from '../musicas/ModalUploadMusica';

export const PaginaEventos: React.FC = () => {
  const { lojaAtiva } = useTenant();
  const [eventos, setEventos] = useState<Evento[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [busca, setBusca] = useState('');
  const [filtroTipo, setFiltroTipo] = useState<'TODOS' | 'PADRAO' | 'CUSTOM'>('TODOS');
  
  // Modal de Criação / Edição de Evento
  const [modalAberto, setModalAberto] = useState(false);
  const [eventoEmEdicao, setEventoEmEdicao] = useState<Evento | null>(null);
  const [formNome, setFormNome] = useState('');
  const [formDescricao, setFormDescricao] = useState('');
  const [formRito, setFormRito] = useState('Geral');
  const [formCompartilhado, setFormCompartilhado] = useState(true);
  const [salvando, setSalvando] = useState(false);

  // Modal de Upload Direto para este Evento
  const [eventoParaUploadId, setEventoParaUploadId] = useState<string | null>(null);

  const carregarEventos = async () => {
    try {
      setCarregando(true);
      const params: any = { incluir_globais: true };
      if (lojaAtiva) params.organizacao_id = lojaAtiva.id;
      const resp = await clienteHttp.get<Evento[]>('/eventos', { params });
      setEventos(resp.data);
    } catch (err) {
      console.error('Erro ao carregar eventos:', err);
    } finally {
      setCarregando(false);
    }
  };

  useEffect(() => {
    carregarEventos();
  }, [lojaAtiva]);

  const abrirModalNovo = () => {
    setEventoEmEdicao(null);
    setFormNome('');
    setFormDescricao('');
    setFormRito(lojaAtiva?.rito_padrao || 'Geral');
    setFormCompartilhado(true);
    setModalAberto(true);
  };

  const abrirModalEditar = (ev: Evento) => {
    setEventoEmEdicao(ev);
    setFormNome(ev.nome);
    setFormDescricao(ev.descricao || '');
    setFormRito(ev.categoria_rito);
    setFormCompartilhado(ev.compartilhado);
    setModalAberto(true);
  };

  const salvarEvento = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formNome.trim()) return;

    try {
      setSalvando(true);
      if (eventoEmEdicao) {
        await clienteHttp.put(`/eventos/${eventoEmEdicao.id}`, {
          nome: formNome,
          descricao: formDescricao,
          categoria_rito: formRito,
          compartilhado: formCompartilhado,
        });
      } else {
        await clienteHttp.post('/eventos', {
          nome: formNome,
          descricao: formDescricao,
          categoria_rito: formRito,
          compartilhado: formCompartilhado,
          organizacao_id: lojaAtiva?.id,
        });
      }
      setModalAberto(false);
      await carregarEventos();
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Erro ao salvar evento.');
    } finally {
      setSalvando(false);
    }
  };

  const deletarEvento = async (ev: Evento) => {
    if (ev.padrao_sistema) {
      alert('Eventos padrão do sistema não podem ser excluídos.');
      return;
    }
    if (!window.confirm(`Tem certeza que deseja excluir o evento "${ev.nome}"?`)) return;

    try {
      await clienteHttp.delete(`/eventos/${ev.id}`);
      await carregarEventos();
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Erro ao deletar evento.');
    }
  };

  const eventosFiltrados = eventos.filter((ev) => {
    const combinaBusca =
      ev.nome.toLowerCase().includes(busca.toLowerCase()) ||
      (ev.descricao && ev.descricao.toLowerCase().includes(busca.toLowerCase()));
    
    if (!combinaBusca) return false;
    if (filtroTipo === 'PADRAO') return ev.padrao_sistema;
    if (filtroTipo === 'CUSTOM') return !ev.padrao_sistema;
    return true;
  });

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Cabeçalho */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-wide fonte-ritual flex items-center gap-3">
            Eventos Ritualísticos <span className="text-xs px-2.5 py-1 rounded-lg bg-macaonico-cianoSigma/10 text-macaonico-cianoSigma border border-macaonico-cianoSigma/20 font-sans">Playlists</span>
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Momentos litúrgicos pré-definidos do Rito Maçônico e eventos customizados da Loja.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setEventoParaUploadId('')}
            className="flex items-center justify-center gap-2 bg-white/10 hover:bg-white/20 text-white font-semibold px-4 py-2.5 rounded-xl border border-white/10 transition-all cursor-pointer text-sm"
          >
            <UploadCloud className="w-4 h-4 text-macaonico-cianoSigma" />
            <span>Fazer Upload de Música</span>
          </button>

          <button
            onClick={abrirModalNovo}
            className="flex items-center justify-center gap-2 bg-gradient-to-r from-macaonico-cianoSigma to-primaria-600 hover:from-cyan-400 hover:to-primaria-500 text-black font-bold px-5 py-2.5 rounded-xl shadow-lg shadow-cyan-500/20 transition-all cursor-pointer text-sm"
          >
            <Plus className="w-5 h-5" />
            <span>Novo Evento Customizado</span>
          </button>
        </div>
      </div>

      {/* Filtros e Busca */}
      <div className="vidro-escuro rounded-2xl p-4 mb-6 flex flex-col md:flex-row gap-4 justify-between items-center">
        <div className="relative w-full md:w-96">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
          <input
            type="text"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar por momento ritualístico..."
            className="w-full bg-primaria-800/80 border border-white/10 rounded-xl pl-10 pr-4 py-2 text-sm text-white focus:border-macaonico-cianoSigma outline-none placeholder:text-slate-500"
          />
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto">
          {(['TODOS', 'PADRAO', 'CUSTOM'] as const).map((tipo) => (
            <button
              key={tipo}
              onClick={() => setFiltroTipo(tipo)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                filtroTipo === tipo
                  ? 'bg-macaonico-cianoSigma text-black shadow-md'
                  : 'bg-white/5 text-slate-400 hover:text-white border border-white/5'
              }`}
            >
              {tipo === 'TODOS' && 'Todos'}
              {tipo === 'PADRAO' && 'Padrão do Sistema'}
              {tipo === 'CUSTOM' && 'Personalizados'}
            </button>
          ))}
        </div>
      </div>

      {/* Grid de Eventos */}
      {carregando ? (
        <div className="py-20 text-center text-slate-400">Carregando catálogo de eventos...</div>
      ) : eventosFiltrados.length === 0 ? (
        <div className="vidro-escuro rounded-2xl p-12 text-center text-slate-400">
          Nenhum evento ritualístico encontrado com os filtros selecionados.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {eventosFiltrados.map((ev) => (
            <div
              key={ev.id}
              className="vidro-escuro hover:border-white/20 transition-all rounded-3xl p-5 flex flex-col justify-between group relative overflow-hidden"
            >
              <div>
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 flex-wrap mb-1.5">
                      {ev.padrao_sistema ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-300 border border-amber-500/30">
                          <ShieldCheck className="w-3 h-3" /> Padrão Maçônico
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-md bg-cyan-500/10 text-cyan-300 border border-cyan-500/30">
                          <Sparkles className="w-3 h-3" /> Loja
                        </span>
                      )}

                      <span className="text-[11px] font-medium px-2 py-0.5 rounded-md bg-white/5 text-slate-400 border border-white/5">
                        {ev.categoria_rito}
                      </span>
                    </div>

                    <h3 className="text-lg font-bold text-white group-hover:text-macaonico-cianoSigma transition-colors">
                      {ev.nome}
                    </h3>
                  </div>

                  {!ev.padrao_sistema && (
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => abrirModalEditar(ev)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10"
                        title="Editar Evento"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => deletarEvento(ev)}
                        className="p-1.5 rounded-lg text-red-400 hover:text-red-300 hover:bg-red-500/10"
                        title="Excluir Evento"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>

                <p className="text-xs text-slate-400 line-clamp-2 mb-4 leading-relaxed">
                  {ev.descricao || 'Sem descrição cadastrada.'}
                </p>
              </div>

              <div>
                <div className="flex items-center justify-between py-2.5 border-t border-white/5 text-xs text-slate-400 mb-3">
                  <span className="flex items-center gap-1.5 font-medium text-slate-300">
                    <Music className="w-3.5 h-3.5 text-macaonico-cianoSigma" />
                    {ev.total_musicas || 0} {(ev.total_musicas || 0) === 1 ? 'música cadastrada' : 'músicas cadastradas'}
                  </span>

                  {ev.compartilhado && (
                    <span className="flex items-center gap-1 text-slate-500" title="Disponível para outras Lojas">
                      <Share2 className="w-3 h-3" /> Compartilhado
                    </span>
                  )}
                </div>

                {/* Botão de Upload Direto para este Evento */}
                <button
                  onClick={() => setEventoParaUploadId(ev.id)}
                  className="w-full flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-macaonico-cianoSigma/10 hover:bg-macaonico-cianoSigma/20 text-macaonico-cianoSigma border border-macaonico-cianoSigma/30 font-semibold text-xs transition-all cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Adicionar / Catalogar Música</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal de Upload Direto para Evento */}
      {eventoParaUploadId !== null && (
        <ModalUploadMusica
          eventoIdPreSelecionado={eventoParaUploadId || undefined}
          onFechar={() => setEventoParaUploadId(null)}
          onSalvo={carregarEventos}
        />
      )}

      {/* Modal de Criação / Edição */}
      {modalAberto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="vidro-destaque rounded-3xl w-full max-w-lg p-6 animate-in fade-in zoom-in-95 duration-200">
            <h2 className="text-xl font-bold text-white fonte-ritual mb-4">
              {eventoEmEdicao ? 'Editar Evento Ritualístico' : 'Novo Evento Ritualístico'}
            </h2>

            <form onSubmit={salvarEvento} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Nome do Evento / Momento
                </label>
                <input
                  type="text"
                  required
                  value={formNome}
                  onChange={(e) => setFormNome(e.target.value)}
                  placeholder="Ex: Recepção de Visitantes"
                  className="w-full bg-primaria-800 border border-white/15 rounded-xl px-4 py-2.5 text-sm text-white focus:border-macaonico-cianoSigma outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Descrição Litúrgica (Opcional)
                </label>
                <textarea
                  rows={3}
                  value={formDescricao}
                  onChange={(e) => setFormDescricao(e.target.value)}
                  placeholder="Explique o momento ritualístico correspondente..."
                  className="w-full bg-primaria-800 border border-white/15 rounded-xl px-4 py-2.5 text-sm text-white focus:border-macaonico-cianoSigma outline-none resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Categoria do Rito
                  </label>
                  <select
                    value={formRito}
                    onChange={(e) => setFormRito(e.target.value)}
                    className="w-full bg-primaria-800 border border-white/15 rounded-xl px-3 py-2 text-sm text-white focus:border-macaonico-cianoSigma outline-none"
                  >
                    <option value="Geral">Geral (Todos os Ritos)</option>
                    <option value="Brasileiro">Rito Brasileiro</option>
                    <option value="REAA">R.E.A.A.</option>
                    <option value="York">Rito de York</option>
                    <option value="Schroeder">Rito Schroeder</option>
                    <option value="Moderno">Rito Moderno</option>
                    <option value="Adonhiramita">Rito Adonhiramita</option>
                  </select>
                </div>

                <div className="flex items-center pt-6">
                  <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-300">
                    <input
                      type="checkbox"
                      checked={formCompartilhado}
                      onChange={(e) => setFormCompartilhado(e.target.checked)}
                      className="rounded accent-macaonico-cianoSigma w-4 h-4"
                    />
                    <span>Compartilhar Evento</span>
                  </label>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setModalAberto(false)}
                  className="px-4 py-2 rounded-xl text-sm font-medium text-slate-400 hover:text-white hover:bg-white/5 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={salvando}
                  className="bg-macaonico-cianoSigma hover:bg-cyan-400 text-black font-bold px-5 py-2 rounded-xl text-sm transition-all cursor-pointer disabled:opacity-50"
                >
                  {salvando ? 'Salvando...' : eventoEmEdicao ? 'Atualizar' : 'Salvar Evento'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
