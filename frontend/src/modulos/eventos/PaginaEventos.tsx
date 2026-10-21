import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Plus, Search, Music, ShieldCheck, Share2, Trash2, Edit3, Sparkles, UploadCloud } from 'lucide-react';
import { Evento } from '../../compartilhado/tipos';
import clienteHttp from '../../compartilhado/api/cliente_http';
import { useTenant } from '../../compartilhado/contextos/ContextoTenant';
import { ModalUploadMusica } from '../musicas/ModalUploadMusica';

/**
 * Catálogo de Eventos/Momentos Ritualísticos e vínculo rápido de músicas por playlist.
 * Responsivo para celular e desktop, com ações táteis sempre visíveis.
 */
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
    <div className="max-w-7xl mx-auto px-3 sm:px-6 py-4 sm:py-8">
      {/* Cabeçalho */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4 mb-5 sm:mb-8">
        <div>
          <h1 className="text-xl sm:text-3xl font-bold text-white tracking-wide fonte-ritual flex flex-wrap items-center gap-2">
            <span>Momentos Ritualísticos</span>
            <span className="text-[11px] px-2.5 py-0.5 rounded-lg bg-macaonico-dourado/15 text-macaonico-dourado border border-macaonico-dourado/30 font-sans">
              Playlists
            </span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Momentos litúrgicos do Rito Maçônico e playlists vinculadas ao acervo.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
          <button
            onClick={() => setEventoParaUploadId('')}
            className="flex items-center justify-center gap-2 bg-gradient-to-r from-yellow-600 via-macaonico-dourado to-yellow-600 hover:from-yellow-500 hover:to-yellow-400 text-black font-bold px-4 py-3 rounded-xl shadow-lg shadow-macaonico-dourado/20 transition-all cursor-pointer text-xs sm:text-sm"
          >
            <UploadCloud className="w-4 h-4 shrink-0" />
            <span>Catalogar Música no Acervo</span>
          </button>
        </div>
      </div>

      {/* Filtros e Busca */}
      <div className="vidro-escuro rounded-2xl p-3 sm:p-4 mb-5 flex flex-col md:flex-row gap-3 justify-between items-stretch md:items-center">
        <div className="relative w-full md:w-96">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
          <input
            type="text"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar por momento ritualístico..."
            className="w-full bg-primaria-800/80 border border-white/10 rounded-xl pl-10 pr-4 py-2 text-sm text-white focus:border-macaonico-dourado outline-none placeholder:text-slate-500"
          />
        </div>

        <div className="flex items-center gap-1.5 w-full md:w-auto overflow-x-auto pb-1 md:pb-0">
          {(['TODOS', 'PADRAO', 'CUSTOM'] as const).map((tipo) => (
            <button
              key={tipo}
              onClick={() => setFiltroTipo(tipo)}
              className={`px-3 py-2 rounded-xl text-xs font-semibold transition-all shrink-0 ${
                filtroTipo === tipo
                  ? 'bg-macaonico-dourado text-black shadow-md'
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
        <div className="py-16 text-center text-slate-400">Carregando catálogo de momentos...</div>
      ) : eventosFiltrados.length === 0 ? (
        <div className="vidro-escuro rounded-2xl p-8 sm:p-12 text-center text-slate-400">
          Nenhum evento ritualístico encontrado com os filtros selecionados.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
          {eventosFiltrados.map((ev) => (
            <div
              key={ev.id}
              className="vidro-escuro hover:border-macaonico-dourado/40 transition-all rounded-2xl sm:rounded-3xl p-4 sm:p-5 flex flex-col justify-between group relative overflow-hidden"
            >
              <div>
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap mb-1.5">
                      {ev.padrao_sistema ? (
                        <span className="inline-flex items-center gap-1 text-[10px] sm:text-[11px] font-semibold px-2 py-0.5 rounded-md bg-sigma-elevated text-amber-300 border border-amber-500/30">
                          <ShieldCheck className="w-3 h-3" /> Padrão Maçônico
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[10px] sm:text-[11px] font-semibold px-2 py-0.5 rounded-md bg-cyan-500/10 text-cyan-300 border border-cyan-500/30">
                          <Sparkles className="w-3 h-3" /> Loja
                        </span>
                      )}

                      <span className="text-[10px] sm:text-[11px] font-medium px-2 py-0.5 rounded-md bg-white/5 text-slate-300 border border-white/5">
                        {ev.categoria_rito}
                      </span>
                    </div>

                    <h3 className="text-base sm:text-lg font-bold text-white group-hover:text-macaonico-dourado transition-colors">
                      {ev.nome}
                    </h3>
                  </div>

                  {!ev.padrao_sistema && (
                    <div className="flex items-center gap-1 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity shrink-0">
                      <button
                        onClick={() => abrirModalEditar(ev)}
                        className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/10"
                        title="Editar Evento"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => deletarEvento(ev)}
                        className="p-2 rounded-lg text-red-400 hover:text-red-300 hover:bg-red-500/10"
                        title="Excluir Evento"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>

                <p className="text-xs text-slate-400 line-clamp-2 mb-4 leading-relaxed">
                  {ev.descricao || 'Momento ritualístico configurado na esteira da sessão.'}
                </p>
              </div>

              <div>
                <div className="flex items-center justify-between py-2.5 border-t border-white/5 text-xs text-slate-400 mb-3">
                  <span className="flex items-center gap-1.5 font-medium text-slate-300">
                    <Music className="w-3.5 h-3.5 text-macaonico-dourado" />
                    {ev.total_musicas || 0}{' '}
                    {(ev.total_musicas || 0) === 1 ? 'música cadastrada' : 'músicas cadastradas'}
                  </span>

                  {ev.compartilhado && (
                    <span className="flex items-center gap-1 text-slate-500">
                      <Share2 className="w-3 h-3" /> Global
                    </span>
                  )}
                </div>

                <button
                  onClick={() => setEventoParaUploadId(ev.id)}
                  className="w-full flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl bg-macaonico-dourado/15 hover:bg-macaonico-dourado/25 text-macaonico-dourado border border-macaonico-dourado/35 font-semibold text-xs transition-all cursor-pointer min-h-[42px]"
                >
                  <Plus className="w-4 h-4" />
                  <span>Vincular / Enviar Música</span>
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

      {/* Modal de Criação / Edição Centralizado via Portal */}
      {modalAberto &&
        createPortal(
          <div
            style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 9999 }}
            className="fixed inset-0 z-[120] flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-md"
          >
            <div className="bg-[#0a1428] border border-macaonico-dourado/45 rounded-2xl sm:rounded-3xl w-full max-w-lg p-5 sm:p-6 max-h-[88dvh] overflow-y-auto shadow-[0_20px_60px_rgba(0,0,0,0.9)]">
              <h2 className="text-lg sm:text-xl font-bold text-white fonte-ritual mb-4">
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
                    className="w-full bg-primaria-800 border border-white/15 rounded-xl px-4 py-2.5 text-sm text-white focus:border-macaonico-dourado outline-none"
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
                    className="w-full bg-primaria-800 border border-white/15 rounded-xl px-4 py-2.5 text-sm text-white focus:border-macaonico-dourado outline-none resize-none"
                  />
                </div>

                <div className="flex items-center justify-end gap-3 pt-4 border-t border-white/10">
                  <button
                    type="button"
                    onClick={() => setModalAberto(false)}
                    className="px-4 py-2 rounded-xl text-sm font-medium text-slate-400 hover:text-white"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={salvando}
                    className="bg-macaonico-dourado hover:bg-yellow-400 text-black font-bold px-5 py-2.5 rounded-xl text-sm transition-all cursor-pointer disabled:opacity-50"
                  >
                    {salvando ? 'Salvando...' : 'Salvar Evento'}
                  </button>
                </div>
              </form>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
};
