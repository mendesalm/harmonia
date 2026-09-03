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
  
  const [ritos, setRitos] = useState<{id: string, nome: string}[]>([]);

  const [formData, setFormData] = useState({
    nome: '',
    rito_id: '',
    ativo: true,
    status_assinatura: 'DEMONSTRACAO',
    dados_especificos: {
      numero: '',
      obediencia: 'GOB',
      cnpj: '',
      endereco: ''
    }
  });

  useEffect(() => {
    const carregarDados = async () => {
      setCarregando(true);
      try {
        const respRitos = await clienteHttp.get('/admin/ritos');
        setRitos(respRitos.data);

        if (lojaId) {
          const respLoja = await clienteHttp.get<Organizacao>(`/organizacoes/${lojaId}`);
          setFormData({
            nome: respLoja.data.nome,
            rito_id: respLoja.data.rito_id || (respRitos.data.length > 0 ? respRitos.data[0].id : ''),
            ativo: respLoja.data.ativo,
            status_assinatura: respLoja.data.status_assinatura || 'DEMONSTRACAO',
            dados_especificos: {
              numero: respLoja.data.dados_especificos?.numero || '',
              obediencia: respLoja.data.dados_especificos?.obediencia || 'GOB',
              cnpj: respLoja.data.dados_especificos?.cnpj || '',
              endereco: respLoja.data.dados_especificos?.endereco || ''
            }
          });
        } else {
          if (respRitos.data.length > 0) {
            setFormData(prev => ({ ...prev, rito_id: respRitos.data[0].id }));
          }
        }
      } catch (err) {
        console.error('Erro ao carregar dados', err);
      } finally {
        setCarregando(false);
      }
    };

    carregarDados();
  }, [lojaId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSalvando(true);
    
    // Evitar enviar rito_id vazio (UUID inválido)
    const payload = { ...formData };
    if (!payload.rito_id) {
      delete (payload as any).rito_id;
    }

    try {
      if (lojaId) {
        await clienteHttp.put(`/organizacoes/${lojaId}`, payload);
      } else {
        await clienteHttp.post('/organizacoes', payload);
      }
      onSalvo();
    } catch (err: any) {
      console.error(err);
      alert('Erro ao salvar loja: ' + (err.response?.data?.detail || err.message || JSON.stringify(err)));
    } finally {
      setSalvando(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto py-10">
      <div className="bg-[#0a0a0a] rounded-2xl w-full max-w-2xl border border-gray-800 shadow-2xl flex flex-col my-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-800 shrink-0">
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
          <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto custom-scrollbar" style={{maxHeight: '70vh'}}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-400 mb-1">Nome da Loja</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: A.R.L.S. Acácia do Sol"
                  value={formData.nome}
                  onChange={e => setFormData({ ...formData, nome: e.target.value })}
                  className="w-full bg-[#161616] border border-gray-700 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-macaonico-dourado"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">Número da Loja</label>
                <input
                  type="text"
                  placeholder="Ex: 4567"
                  value={formData.dados_especificos.numero}
                  onChange={e => setFormData({ ...formData, dados_especificos: { ...formData.dados_especificos, numero: e.target.value } })}
                  className="w-full bg-[#161616] border border-gray-700 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-macaonico-dourado"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">Obediência</label>
                <select
                  value={formData.dados_especificos.obediencia}
                  onChange={e => setFormData({ ...formData, dados_especificos: { ...formData.dados_especificos, obediencia: e.target.value } })}
                  className="w-full bg-[#161616] border border-gray-700 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-macaonico-dourado"
                >
                  <option value="GOB">GOB (Grande Oriente do Brasil)</option>
                  <option value="CMSB">CMSB (Grandes Lojas)</option>
                  <option value="COMAB">COMAB (Grandes Orientes Independentes)</option>
                  <option value="INDEP">Independente</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">CNPJ</label>
                <input
                  type="text"
                  placeholder="00.000.000/0000-00"
                  value={formData.dados_especificos.cnpj}
                  onChange={e => setFormData({ ...formData, dados_especificos: { ...formData.dados_especificos, cnpj: e.target.value } })}
                  className="w-full bg-[#161616] border border-gray-700 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-macaonico-dourado"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">Rito Padrão</label>
                <select
                  required
                  value={formData.rito_id}
                  onChange={e => setFormData({ ...formData, rito_id: e.target.value })}
                  className="w-full bg-[#161616] border border-gray-700 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-macaonico-dourado"
                >
                  {ritos.map(rito => (
                    <option key={rito.id} value={rito.id}>{rito.nome}</option>
                  ))}
                </select>
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-400 mb-1">Endereço Completo (Oriente)</label>
                <input
                  type="text"
                  placeholder="Rua das Acácias, 100 - Bairro - Cidade/UF"
                  value={formData.dados_especificos.endereco}
                  onChange={e => setFormData({ ...formData, dados_especificos: { ...formData.dados_especificos, endereco: e.target.value } })}
                  className="w-full bg-[#161616] border border-gray-700 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-macaonico-dourado"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-400 mb-1">Status da Assinatura</label>
                <select
                  value={formData.status_assinatura}
                  onChange={e => setFormData({ ...formData, status_assinatura: e.target.value })}
                  className="w-full bg-[#161616] border border-gray-700 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-macaonico-dourado"
                >
                  <option value="INATIVA">Inativa</option>
                  <option value="ATIVA">Ativa</option>
                  <option value="ESPECIAL">Especial (Ativa sem Cobrança)</option>
                  <option value="DEMONSTRACAO">Demonstração (Acesso Limitado)</option>
                </select>
              </div>
            </div>

            <label className="flex items-center gap-3 p-4 bg-[#161616] border border-gray-700 rounded-xl cursor-pointer mt-4">
              <input
                type="checkbox"
                checked={formData.ativo}
                onChange={e => setFormData({ ...formData, ativo: e.target.checked })}
                className="w-5 h-5 rounded border-gray-600 text-macaonico-dourado focus:ring-macaonico-dourado bg-black"
              />
              <span className="text-sm font-medium text-white">Loja Ativa no Sistema Global (Login Permitido)</span>
            </label>

            <div className="flex justify-end gap-3 pt-4 border-t border-gray-800 shrink-0">
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
