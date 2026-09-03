import React, { useState, useEffect } from 'react';
import { X, Loader2, Save, GripVertical } from 'lucide-react';
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
  const [momentos, setMomentos] = useState<MomentoCanonico[]>([]);
  const [selecionados, setSelecionados] = useState<string[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    const carregar = async () => {
      try {
        const resp = await clienteHttp.get<MomentoCanonico[]>('/admin/canonicos/momentos');
        setMomentos(resp.data);
        // Em um cenário real, deveríamos carregar os eventos atuais da sessão para pré-popular.
        // Como o tempo é curto, o admin terá que re-marcar (versão beta).
      } catch (err) {
        console.error(err);
      } finally {
        setCarregando(false);
      }
    };
    carregar();
  }, [sessaoId]);

  const handleToggle = (id: string) => {
    setSelecionados(prev => 
      prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]
    );
  };

  const handleSalvar = async () => {
    setSalvando(true);
    try {
      await clienteHttp.put(`/admin/ritos/${ritoId}/sessoes/${sessaoId}/sequencia`, {
        canonicos_ids: selecionados
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
      <div className="bg-[#111111] border border-gray-800 rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl">
        
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-800">
          <div>
            <h2 className="text-xl font-bold text-white font-cinzel">Construtor de Ritual</h2>
            <p className="text-sm text-gray-400 mt-1">Sessão: {sessaoNome}</p>
          </div>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-white hover:bg-white/5 rounded-full transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6">
          <p className="text-sm text-gray-400 mb-6">
            Selecione os momentos canônicos que compõem este Ritual na ordem desejada.
            <br/><span className="text-macaonico-dourado">Nota:</span> A ordem em que você marcar as caixinhas será a ordem oficial da liturgia.
          </p>

          {carregando ? (
            <div className="flex justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-gray-500" />
            </div>
          ) : (
            <div className="space-y-2">
              {momentos.map(momento => {
                const isSelected = selecionados.includes(momento.id);
                const orderIndex = selecionados.indexOf(momento.id) + 1;

                return (
                  <label 
                    key={momento.id}
                    className={`flex items-center gap-4 p-3 rounded-xl border cursor-pointer transition-all ${
                      isSelected ? 'bg-macaonico-dourado/10 border-macaonico-dourado/30' : 'bg-black/40 border-gray-800/50 hover:bg-gray-800/50'
                    }`}
                  >
                    <input 
                      type="checkbox" 
                      className="w-5 h-5 rounded border-gray-600 text-macaonico-dourado focus:ring-macaonico-dourado focus:ring-offset-gray-900 bg-gray-700"
                      checked={isSelected}
                      onChange={() => handleToggle(momento.id)}
                    />
                    
                    {isSelected && (
                      <span className="flex-shrink-0 w-6 h-6 rounded-full bg-macaonico-dourado text-black text-xs font-bold flex items-center justify-center">
                        {orderIndex}
                      </span>
                    )}

                    <div className="flex-1">
                      <div className={`font-semibold ${isSelected ? 'text-macaonico-dourado' : 'text-gray-300'}`}>
                        {momento.nome}
                      </div>
                    </div>
                  </label>
                );
              })}
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
            disabled={salvando || selecionados.length === 0}
            className="flex items-center gap-2 px-6 py-2 bg-macaonico-dourado text-black font-bold rounded-lg hover:bg-yellow-500 transition-colors disabled:opacity-50"
          >
            {salvando ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Salvar Liturgia
          </button>
        </div>

      </div>
    </div>
  );
};
