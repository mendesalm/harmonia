import React, { useState, useEffect } from 'react';
import { X, Save, Loader2 } from 'lucide-react';
import clienteHttp from '../../compartilhado/api/cliente_http';
import { Organizacao } from '../../compartilhado/tipos';

interface Props {
  lojaId?: string;
  onClose: () => void;
  onSalvo: () => void;
}

export const ModalLojaAdmin: React.FC<Props> = ({ lojaId, onClose, onSalvo }) => {
  const [carregando, setCarregando] = useState(false);
  const [salvando, setSalvando] = useState(false);
  
  const [formData, setFormData] = useState({
    nome: '',
    rito_padrao: 'REAA',
    ativo: true,
    status_assinatura: 'TESTE',
  });

  useEffect(() => {
    if (lojaId) {
      setCarregando(true);
      clienteHttp.get<Organizacao>(`/organizacoes/${lojaId}`)
        .then(resp => {
          setFormData({
            nome: resp.data.nome,
            rito_padrao: resp.data.rito_padrao,
            ativo: resp.data.ativo,
            status_assinatura: resp.data.status_assinatura || 'TESTE'
          });
        })
        .finally(() => setCarregando(false));
    }
  }, [lojaId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSalvando(true);
    try {
      if (lojaId) {
        await clienteHttp.put(`/organizacoes/${lojaId}`, formData);
      } else {
        await clienteHttp.post('/organizacoes', formData);
      }
      onSalvo();
    } catch (err) {
      alert('Erro ao salvar loja');
    } finally {
      setSalvando(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="bg-[#0a0a0a] rounded-2xl w-full max-w-md border border-gray-800 shadow-2xl flex flex-col">
        <div className="flex items-center justify-between p-6 border-b border-gray-800">
          <h2 className="text-xl font-bold text-white">{lojaId ? 'Editar Loja' : 'Nova Loja'}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {carregando ? (
          <div className="p-12 flex justify-center">
            <Loader2 className="w-8 h-8 text-macaonico-dourado animate-spin" />
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1">Nome da Loja</label>
              <input
                type="text"
                required
                value={formData.nome}
                onChange={e => setFormData({ ...formData, nome: e.target.value })}
                className="w-full bg-[#161616] border border-gray-700 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-macaonico-dourado"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1">Rito Padrão</label>
              <select
                value={formData.rito_padrao}
                onChange={e => setFormData({ ...formData, rito_padrao: e.target.value })}
                className="w-full bg-[#161616] border border-gray-700 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-macaonico-dourado"
              >
                <option value="REAA">REAA</option>
                <option value="York">York</option>
                <option value="Adonhiramita">Adonhiramita</option>
                <option value="Moderno">Moderno</option>
                <option value="Brasileiro">Brasileiro</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1">Assinatura</label>
              <select
                value={formData.status_assinatura}
                onChange={e => setFormData({ ...formData, status_assinatura: e.target.value })}
                className="w-full bg-[#161616] border border-gray-700 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-macaonico-dourado"
              >
                <option value="TESTE">Teste / Demo</option>
                <option value="PAGA">Paga / Ativa</option>
                <option value="INATIVA">Inativa</option>
              </select>
            </div>

            <label className="flex items-center gap-3 p-4 bg-[#161616] border border-gray-700 rounded-xl cursor-pointer">
              <input
                type="checkbox"
                checked={formData.ativo}
                onChange={e => setFormData({ ...formData, ativo: e.target.checked })}
                className="w-5 h-5 rounded border-gray-600 text-macaonico-dourado focus:ring-macaonico-dourado bg-black"
              />
              <span className="text-sm font-medium text-white">Loja Ativa no Sistema</span>
            </label>

            <div className="flex justify-end gap-3 pt-4 border-t border-gray-800">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-gray-400 hover:text-white"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={salvando}
                className="flex items-center gap-2 bg-macaonico-dourado text-black px-6 py-2.5 rounded-xl font-bold hover:bg-yellow-500 transition-colors disabled:opacity-50"
              >
                {salvando ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                Salvar Loja
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
