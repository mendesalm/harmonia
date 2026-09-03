import React, { useState, useEffect } from 'react';
import { X, Loader2, Save, GripVertical, Copy, Trash2, Plus } from 'lucide-react';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import clienteHttp from '../../compartilhado/api/cliente_http';

interface MomentoCanonico {
  id: string;
  nome: string;
  descricao: string;
}

interface ModalConstrutorRitualProps {
  ritoId: string;
  sessaoId: string;
  sessaoNome: string;
  onClose: () => void;
  onSaved: () => void;
}

export const ModalConstrutorRitual: React.FC<ModalConstrutorRitualProps> = ({ ritoId, sessaoId, sessaoNome, onClose, onSaved }) => {
  const [dicMomentos, setDicMomentos] = useState<MomentoCanonico[]>([]);
  const [playlist, setPlaylist] = useState<MomentoCanonico[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [ritosData, setRitosData] = useState<any[]>([]);
  
  // Estado para o combobox de adição
  const [modoAdicao, setModoAdicao] = useState(false);
  const [momentoSelecionado, setMomentoSelecionado] = useState('');

  useEffect(() => {
    const carregar = async () => {
      try {
        const respDic = await clienteHttp.get<MomentoCanonico[]>('/admin/canonicos/momentos');
        const todosMomentos = respDic.data;
        setDicMomentos(todosMomentos);

        const respSeq = await clienteHttp.get<string[]>(`/admin/ritos/sessoes/${sessaoId}/sequencia`);
        const seqIds = respSeq.data;
        
        const atuais = seqIds.map(id => todosMomentos.find(m => m.id === id)).filter(Boolean) as MomentoCanonico[];
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
    const momento = dicMomentos.find(m => m.id === momentoSelecionado);
    if (momento) {
      setPlaylist([...playlist, momento]);
    }
    setMomentoSelecionado('');
    setModoAdicao(false);
  };

  const clonarOrdinaria = async () => {
    try {
      const rito = ritosData.find(r => r.id === ritoId);
      if (!rito) return;
      
      const sessaoOrd = rito.tipos_sessao.find((s: any) => s.nome.toLowerCase().includes('ordinária'));
      if (!sessaoOrd) {
        alert("Este Rito ainda não tem uma Sessão Ordinária cadastrada.");
        return;
      }
      
      const resp = await clienteHttp.get<string[]>(`/admin/ritos/sessoes/${sessaoOrd.id}/sequencia`);
      const ordIds = resp.data;
      const copiados = ordIds.map(id => dicMomentos.find(m => m.id === id)).filter(Boolean) as MomentoCanonico[];
      setPlaylist(copiados);
    } catch (err) {
      console.error(err);
      alert("Erro ao clonar a sessão.");
    }
  };

  const handleSalvar = async () => {
    setSalvando(true);
    try {
      await clienteHttp.put(`/admin/ritos/${ritoId}/sessoes/${sessaoId}/sequencia`, {
        canonicos_ids: playlist.map(p => p.id)
      });
      onSaved();
      onClose();
    } catch (err) {
      console.error(err);
      alert('Erro ao salvar sequência.');
      setSalvando(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="bg-[#111111] border border-gray-800 rounded-2xl w-full max-w-3xl h-[85vh] flex flex-col shadow-2xl">
        
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-800">
          <div>
            <h2 className="text-2xl font-bold text-white font-cinzel">Editor de Rituais</h2>
            <p className="text-sm text-gray-400 mt-1">Sessão: <span className="text-macaonico-dourado">{sessaoNome}</span></p>
          </div>
          <div className="flex items-center gap-4">
            <button 
              onClick={clonarOrdinaria}
              title="Sobrescrever esta sessão com a estrutura da Sessão Ordinária"
              className="flex items-center gap-2 text-sm text-purple-400 hover:text-purple-300 bg-purple-900/20 px-3 py-1.5 rounded-lg transition-colors border border-purple-900/50"
            >
              <Copy className="w-4 h-4" />
              Preencher c/ Ordinária
            </button>
            <button onClick={onClose} className="p-2 text-gray-400 hover:text-white hover:bg-white/5 rounded-full transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 bg-[#080808]">
          {carregando ? (
            <div className="flex h-full items-center justify-center">
              <Loader2 className="w-8 h-8 animate-spin text-gray-500" />
            </div>
          ) : (
            <div className="max-w-2xl mx-auto space-y-4 pb-20">
              <p className="text-sm text-gray-400 mb-6 text-center">
                Arraste os itens para reordená-los. Clique no botão ao final da lista para adicionar novos momentos.
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
                        <div className="p-12 text-center text-gray-600 border-2 border-dashed border-gray-800 rounded-xl">
                          Nenhum evento nesta sessão.
                        </div>
                      )}
                      
                      {playlist.map((momento, index) => (
                        <Draggable key={`pl-${momento.id}-${index}`} draggableId={`pl-${momento.id}-${index}`} index={index}>
                          {(provided, snapshot) => (
                            <div
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              {...provided.dragHandleProps}
                              className={`p-3 bg-[#161616] border border-gray-800 rounded-xl flex items-center gap-4 shadow-sm transition-colors group ${snapshot.isDragging ? 'ring-2 ring-macaonico-dourado bg-[#1a1a1a]' : 'hover:border-gray-600'}`}
                            >
                              <GripVertical className="w-5 h-5 text-gray-600 cursor-grab active:cursor-grabbing" />
                              <span className="flex-shrink-0 w-7 h-7 rounded-full bg-black border border-gray-700 text-gray-400 text-xs font-bold flex items-center justify-center">
                                {index + 1}
                              </span>
                              <div className="flex-1">
                                <span className="text-base font-semibold text-gray-200">{momento.nome}</span>
                              </div>
                              <button 
                                onClick={() => removerMomento(index)}
                                className="p-2 text-gray-600 hover:text-red-400 hover:bg-red-900/20 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
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
              <div className="pt-6">
                {!modoAdicao ? (
                  <button 
                    onClick={() => setModoAdicao(true)}
                    className="w-full flex items-center justify-center gap-2 py-4 border-2 border-dashed border-gray-700 text-gray-400 rounded-xl hover:border-gray-500 hover:text-white hover:bg-white/5 transition-colors font-medium"
                  >
                    <Plus className="w-5 h-5" />
                    Adicionar Novo Momento Ritualístico
                  </button>
                ) : (
                  <div className="p-4 bg-[#111111] border border-macaonico-dourado/50 rounded-xl flex gap-3 shadow-lg">
                    <select
                      className="flex-1 bg-black border border-gray-700 rounded-lg px-4 text-white focus:outline-none focus:border-macaonico-dourado"
                      value={momentoSelecionado}
                      onChange={(e) => setMomentoSelecionado(e.target.value)}
                    >
                      <option value="">Selecione um momento do dicionário global...</option>
                      {dicMomentos.map(m => (
                        <option key={m.id} value={m.id}>{m.nome}</option>
                      ))}
                    </select>
                    <button 
                      onClick={adicionarMomento}
                      disabled={!momentoSelecionado}
                      className="px-6 py-2 bg-macaonico-dourado text-black font-bold rounded-lg hover:bg-yellow-500 disabled:opacity-50"
                    >
                      Inserir
                    </button>
                    <button 
                      onClick={() => setModoAdicao(false)}
                      className="px-4 py-2 text-gray-400 hover:text-white"
                    >
                      Cancelar
                    </button>
                  </div>
                )}
              </div>

            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-800 flex justify-end gap-3 bg-black/50">
          <button 
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-300 hover:text-white transition-colors"
          >
            Cancelar
          </button>
          <button 
            onClick={handleSalvar}
            disabled={salvando || playlist.length === 0}
            className="flex items-center gap-2 px-8 py-3 bg-macaonico-dourado text-black font-bold rounded-xl hover:bg-yellow-500 transition-colors disabled:opacity-50 text-lg shadow-[0_0_15px_rgba(212,175,55,0.3)]"
          >
            {salvando ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
            Salvar Liturgia ({playlist.length} Momentos)
          </button>
        </div>

      </div>
    </div>
  );
};
