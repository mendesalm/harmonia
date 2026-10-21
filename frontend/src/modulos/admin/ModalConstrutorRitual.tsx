import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Loader2, Save, GripVertical, Copy, Trash2, Plus } from 'lucide-react';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import clienteHttp from '../../compartilhado/api/cliente_http';

interface MomentoCanonico {
  id: string;
  nome: string;
  descricao: string;
  ordem_sugerida: number;
}

interface ModalConstrutorRitualProps {
  ritoId: string;
  sessaoId: string;
  sessaoNome: string;
  onClose: () => void;
  onSaved: () => void;
}

/**
 * Modal de Administração Global para construção e ordenação da sequência ritualística de um Rito.
 * Renderizado via Portal no `document.body` com layout responsivo.
 */
export const ModalConstrutorRitual: React.FC<ModalConstrutorRitualProps> = ({
  ritoId,
  sessaoId,
  sessaoNome,
  onClose,
  onSaved,
}) => {
  const [dicMomentos, setDicMomentos] = useState<MomentoCanonico[]>([]);
  const [playlist, setPlaylist] = useState<MomentoCanonico[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [ritosData, setRitosData] = useState<any[]>([]);

  const [modoAdicao, setModoAdicao] = useState(false);
  const [momentoSelecionado, setMomentoSelecionado] = useState('');

  useEffect(() => {
    const carregar = async () => {
      try {
        const respDic = await clienteHttp.get<MomentoCanonico[]>('/admin/canonicos/momentos');
        const todosMomentos = respDic.data;
        setDicMomentos(todosMomentos.sort((a, b) => a.nome.localeCompare(b.nome)));

        const respSeq = await clienteHttp.get<string[]>(
          `/admin/ritos/sessoes/${sessaoId}/sequencia`
        );
        const seqIds = respSeq.data;

        const atuais = seqIds
          .map((id) => todosMomentos.find((m) => m.id === id))
          .filter(Boolean) as MomentoCanonico[];
        setPlaylist(atuais);

        const respRitos = await clienteHttp.get('/admin/ritos');
        setRitosData(respRitos.data);
      } catch (err) {
        console.error(err);
      } finally {
        setCarregando(false);
      }
    };
    carregar();
  }, [sessaoId]);

  const onDragEnd = (result: DropResult) => {
    const { source, destination } = result;
    if (!destination) return;
    if (source.index === destination.index) return;

    const novaPlaylist = Array.from(playlist);
    const [reorderedItem] = novaPlaylist.splice(source.index, 1);
    novaPlaylist.splice(destination.index, 0, reorderedItem);
    setPlaylist(novaPlaylist);
  };

  const removerMomento = (index: number) => {
    const novaPlaylist = Array.from(playlist);
    novaPlaylist.splice(index, 1);
    setPlaylist(novaPlaylist);
  };

  const adicionarMomento = () => {
    if (!momentoSelecionado) return;
    const momento = dicMomentos.find((m) => m.id === momentoSelecionado);
    if (momento) {
      const novaPlaylist = [...playlist, momento];
      novaPlaylist.sort((a, b) => a.ordem_sugerida - b.ordem_sugerida);
      setPlaylist(novaPlaylist);
    }
    setMomentoSelecionado('');
    setModoAdicao(false);
  };

  const clonarOrdinaria = async () => {
    try {
      const rito = ritosData.find((r) => r.id === ritoId);
      if (!rito) return;

      const sessaoOrd = rito.tipos_sessao.find((s: any) =>
        s.nome.toLowerCase().includes('ordinária')
      );
      if (!sessaoOrd) {
        alert('Este Rito ainda não tem uma Sessão Ordinária cadastrada.');
        return;
      }

      const resp = await clienteHttp.get<string[]>(
        `/admin/ritos/sessoes/${sessaoOrd.id}/sequencia`
      );
      const ordIds = resp.data;
      const copiados = ordIds
        .map((id) => dicMomentos.find((m) => m.id === id))
        .filter(Boolean) as MomentoCanonico[];
      setPlaylist(copiados);
    } catch (err) {
      console.error(err);
      alert('Erro ao clonar a sessão.');
    }
  };

  const handleSalvar = async () => {
    setSalvando(true);
    try {
      await clienteHttp.put(`/admin/ritos/${ritoId}/sessoes/${sessaoId}/sequencia`, {
        canonicos_ids: playlist.map((p) => p.id),
      });
      onSaved();
      onClose();
    } catch (err) {
      console.error(err);
      alert('Erro ao salvar sequência.');
      setSalvando(false);
    }
  };

  return createPortal(
    <div
      style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 9999 }}
      className="fixed inset-0 z-[120] flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-md"
    >
      <div className="bg-[#0a1428] border border-macaonico-dourado/45 rounded-2xl sm:rounded-3xl w-full max-w-3xl max-h-[88dvh] flex flex-col shadow-[0_20px_60px_rgba(0,0,0,0.9)] overflow-hidden">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-4 sm:px-6 py-4 border-b border-white/10 bg-[#070e1c] shrink-0">
          <div className="min-w-0">
            <h2 className="text-lg sm:text-2xl font-bold text-white font-cinzel">
              Editor de Rituais
            </h2>
            <p className="text-xs sm:text-sm text-gray-400 mt-0.5 truncate">
              Sessão: <span className="text-macaonico-dourado">{sessaoNome}</span>
            </p>
          </div>
          <div className="flex items-center justify-between sm:justify-end gap-2.5 shrink-0">
            <button
              type="button"
              onClick={clonarOrdinaria}
              title="Sobrescrever esta sessão com a estrutura da Sessão Ordinária"
              className="flex items-center gap-1.5 text-xs sm:text-sm text-purple-300 hover:text-white bg-purple-900/30 px-3 py-1.5 rounded-lg transition-colors border border-purple-500/40"
            >
              <Copy className="w-4 h-4" />
              <span>Preencher c/ Ordinária</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-xl transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 min-h-0">
          {carregando ? (
            <div className="flex py-16 items-center justify-center">
              <Loader2 className="w-8 h-8 animate-spin text-macaonico-dourado" />
            </div>
          ) : (
            <div className="max-w-2xl mx-auto space-y-4">
              <p className="text-xs sm:text-sm text-gray-400 mb-4 text-center">
                Arraste os itens para reordená-los. Clique no botão ao final da lista para adicionar
                novos momentos.
              </p>

              <DragDropContext onDragEnd={onDragEnd}>
                <Droppable droppableId="playlist">
                  {(provided) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                      className="space-y-2"
                    >
                      {playlist.length === 0 && (
                        <div className="p-10 text-center text-gray-500 border-2 border-dashed border-white/10 rounded-xl">
                          Nenhum evento nesta sessão.
                        </div>
                      )}

                      {playlist.map((momento, index) => (
                        <Draggable
                          key={`pl-${momento.id}-${index}`}
                          draggableId={`pl-${momento.id}-${index}`}
                          index={index}
                        >
                          {(provided, snapshot) => (
                            <div
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              {...provided.dragHandleProps}
                              className={`p-3 bg-[#0e1c36]/90 border border-white/10 rounded-xl flex items-center gap-3 shadow-sm transition-colors group ${
                                snapshot.isDragging
                                  ? 'ring-2 ring-macaonico-dourado bg-[#132647]'
                                  : 'hover:border-macaonico-dourado/40'
                              }`}
                            >
                              <GripVertical className="w-5 h-5 text-gray-500 cursor-grab active:cursor-grabbing shrink-0" />
                              <span className="shrink-0 w-6 h-6 rounded-md bg-macaonico-dourado/15 border border-macaonico-dourado/30 text-macaonico-dourado text-xs font-bold flex items-center justify-center">
                                {index + 1}
                              </span>
                              <div className="flex-1 min-w-0">
                                <span className="text-xs sm:text-sm font-semibold text-gray-100 block truncate">
                                  {momento.nome}
                                </span>
                              </div>
                              <button
                                type="button"
                                onClick={() => removerMomento(index)}
                                className="p-1.5 text-gray-400 hover:text-red-400 hover:bg-red-900/20 rounded-lg transition-colors shrink-0"
                                title="Remover"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          )}
                        </Draggable>
                      ))}
                      {provided.placeholder}
                    </div>
                  )}
                </Droppable>
              </DragDropContext>

              {/* Adicionar Novo Evento */}
              <div className="pt-4">
                {!modoAdicao ? (
                  <button
                    type="button"
                    onClick={() => setModoAdicao(true)}
                    className="w-full flex items-center justify-center gap-2 py-3.5 border-2 border-dashed border-white/15 text-gray-300 rounded-xl hover:border-macaonico-dourado/50 hover:text-white hover:bg-white/5 transition-colors font-medium text-xs sm:text-sm"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Adicionar Novo Momento Ritualístico</span>
                  </button>
                ) : (
                  <div className="p-3.5 bg-[#070e1c] border border-macaonico-dourado/50 rounded-xl flex flex-col sm:flex-row gap-2.5 shadow-lg">
                    <select
                      className="flex-1 bg-[#0e1c36] border border-white/15 rounded-xl px-3 py-2 text-xs sm:text-sm text-white focus:outline-none focus:border-macaonico-dourado"
                      value={momentoSelecionado}
                      onChange={(e) => setMomentoSelecionado(e.target.value)}
                    >
                      <option value="">Selecione um momento do dicionário global...</option>
                      {dicMomentos.map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.nome}
                        </option>
                      ))}
                    </select>
                    <div className="flex gap-2 justify-end">
                      <button
                        type="button"
                        onClick={adicionarMomento}
                        disabled={!momentoSelecionado}
                        className="px-5 py-2 bg-macaonico-dourado text-black text-xs sm:text-sm font-bold rounded-xl hover:bg-yellow-500 disabled:opacity-50"
                      >
                        Inserir
                      </button>
                      <button
                        type="button"
                        onClick={() => setModoAdicao(false)}
                        className="px-3 py-2 text-xs sm:text-sm text-gray-400 hover:text-white"
                      >
                        Cancelar
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-4 sm:px-6 py-3.5 border-t border-white/10 flex justify-end gap-3 bg-[#070e1c] shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs sm:text-sm font-medium text-gray-300 hover:text-white transition-colors"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleSalvar}
            disabled={salvando || playlist.length === 0}
            className="flex items-center gap-2 px-6 py-2.5 bg-macaonico-dourado text-black text-xs sm:text-sm font-bold rounded-xl hover:bg-yellow-500 transition-colors disabled:opacity-50 shadow-lg"
          >
            {salvando ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            <span>Salvar Liturgia ({playlist.length} Momentos)</span>
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};
