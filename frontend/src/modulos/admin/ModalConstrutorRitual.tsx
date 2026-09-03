import React, { useState, useEffect } from 'react';
import { X, Loader2, Save, GripVertical, Copy } from 'lucide-react';
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
  const [ritosData, setRitosData] = useState<any[]>([]); // Para achar a sessão ordinária
  
  useEffect(() => {
    const carregar = async () => {
      try {
        // 1. Busca Dicionario
        const respDic = await clienteHttp.get<MomentoCanonico[]>('/admin/canonicos/momentos');
        const todosMomentos = respDic.data;
        setDicMomentos(todosMomentos);

        // 2. Busca a Sequencia Atual desta sessao
        const respSeq = await clienteHttp.get<string[]>(`/admin/ritos/sessoes/${sessaoId}/sequencia`);
        const seqIds = respSeq.data;
        
        // Popula a playlist
        const atuais = seqIds.map(id => todosMomentos.find(m => m.id === id)).filter(Boolean) as MomentoCanonico[];
        setPlaylist(atuais);

        // 3. Busca ritos para o botao de clonar
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
    
    // Caiu fora
    if (!destination) return;

    // Dicionario -> Playlist
    if (source.droppableId === 'dicionario' && destination.droppableId === 'playlist') {
      const draggedItem = dicMomentos[source.index];
      const novaPlaylist = Array.from(playlist);
      novaPlaylist.splice(destination.index, 0, draggedItem);
      setPlaylist(novaPlaylist);
    }
    
    // Playlist -> Playlist (Reordenar)
    if (source.droppableId === 'playlist' && destination.droppableId === 'playlist') {
      const novaPlaylist = Array.from(playlist);
      const [reorderedItem] = novaPlaylist.splice(source.index, 1);
      novaPlaylist.splice(destination.index, 0, reorderedItem);
      setPlaylist(novaPlaylist);
    }

    // Playlist -> Lixo (Remover)
    if (source.droppableId === 'playlist' && destination.droppableId === 'dicionario') {
      const novaPlaylist = Array.from(playlist);
      novaPlaylist.splice(source.index, 1);
      setPlaylist(novaPlaylist);
    }
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
      <div className="bg-[#111111] border border-gray-800 rounded-2xl w-full max-w-6xl h-[90vh] flex flex-col shadow-2xl">
        
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-800">
          <div>
            <h2 className="text-2xl font-bold text-white font-cinzel">Construtor de Ritual (Lego)</h2>
            <p className="text-sm text-gray-400 mt-1">Sessão: {sessaoNome}</p>
          </div>
          <div className="flex items-center gap-4">
            <button 
              onClick={clonarOrdinaria}
              className="flex items-center gap-2 text-sm text-purple-400 hover:text-purple-300 bg-purple-900/20 px-3 py-1.5 rounded-lg transition-colors border border-purple-900/50"
            >
              <Copy className="w-4 h-4" />
              Clonar Sessão Ordinária
            </button>
            <button onClick={onClose} className="p-2 text-gray-400 hover:text-white hover:bg-white/5 rounded-full transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-hidden p-6">
          {carregando ? (
            <div className="flex h-full items-center justify-center">
              <Loader2 className="w-8 h-8 animate-spin text-gray-500" />
            </div>
          ) : (
            <DragDropContext onDragEnd={onDragEnd}>
              <div className="grid grid-cols-2 gap-8 h-full">
                
                {/* Coluna 1: Dicionario */}
                <div className="flex flex-col h-full bg-black/30 rounded-xl border border-gray-800">
                  <div className="p-4 border-b border-gray-800">
                    <h3 className="font-bold text-gray-300">Dicionário de Momentos</h3>
                    <p className="text-xs text-gray-500">Arraste para a direita para adicionar</p>
                  </div>
                  <Droppable droppableId="dicionario" isDropDisabled={true}>
                    {(provided) => (
                      <div 
                        ref={provided.innerRef} 
                        {...provided.droppableProps}
                        className="flex-1 overflow-y-auto p-4 space-y-2"
                      >
                        {dicMomentos.map((momento, index) => (
                          <Draggable key={`dic-${momento.id}`} draggableId={`dic-${momento.id}`} index={index}>
                            {(provided, snapshot) => (
                              <div
                                ref={provided.innerRef}
                                {...provided.draggableProps}
                                {...provided.dragHandleProps}
                                className={`p-3 bg-gray-900 border border-gray-700 rounded-lg flex items-center gap-3 ${snapshot.isDragging ? 'opacity-50' : ''}`}
                              >
                                <GripVertical className="w-4 h-4 text-gray-500 flex-shrink-0" />
                                <span className="text-sm font-medium text-gray-300">{momento.nome}</span>
                              </div>
                            )}
                          </Draggable>
                        ))}
                        {provided.placeholder}
                      </div>
                    )}
                  </Droppable>
                </div>

                {/* Coluna 2: Playlist */}
                <div className="flex flex-col h-full bg-black/30 rounded-xl border border-macaonico-dourado/30 relative">
                  <div className="p-4 border-b border-macaonico-dourado/30 bg-macaonico-dourado/5 rounded-t-xl">
                    <h3 className="font-bold text-macaonico-dourado">Sequência do Ritual</h3>
                    <p className="text-xs text-gray-400">Arraste para reordenar. Arraste para fora para remover.</p>
                  </div>
                  <Droppable droppableId="playlist">
                    {(provided, snapshot) => (
                      <div 
                        ref={provided.innerRef} 
                        {...provided.droppableProps}
                        className={`flex-1 overflow-y-auto p-4 space-y-2 transition-colors ${snapshot.isDraggingOver ? 'bg-macaonico-dourado/5' : ''}`}
                      >
                        {playlist.length === 0 && (
                          <div className="h-32 flex items-center justify-center text-gray-600 text-sm border-2 border-dashed border-gray-800 rounded-xl">
                            Solte os momentos aqui
                          </div>
                        )}
                        {playlist.map((momento, index) => (
                          <Draggable key={`pl-${momento.id}-${index}`} draggableId={`pl-${momento.id}-${index}`} index={index}>
                            {(provided, snapshot) => (
                              <div
                                ref={provided.innerRef}
                                {...provided.draggableProps}
                                {...provided.dragHandleProps}
                                className={`p-3 bg-[#161616] border border-macaonico-dourado/50 rounded-lg flex items-center gap-3 shadow-lg ${snapshot.isDragging ? 'ring-2 ring-macaonico-dourado' : ''}`}
                              >
                                <GripVertical className="w-4 h-4 text-macaonico-dourado flex-shrink-0" />
                                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-macaonico-dourado text-black text-xs font-bold flex items-center justify-center">
                                  {index + 1}
                                </span>
                                <span className="text-sm font-bold text-white">{momento.nome}</span>
                              </div>
                            )}
                          </Draggable>
                        ))}
                        {provided.placeholder}
                      </div>
                    )}
                  </Droppable>
                </div>

              </div>
            </DragDropContext>
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
            className="flex items-center gap-2 px-6 py-2 bg-macaonico-dourado text-black font-bold rounded-lg hover:bg-yellow-500 transition-colors disabled:opacity-50"
          >
            {salvando ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Salvar Liturgia ({playlist.length})
          </button>
        </div>

      </div>
    </div>
  );
};
