import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Edit2, Trash2, Shield, Loader2, Plus } from 'lucide-react';
import clienteHttp from '../../compartilhado/api/cliente_http';
import { Organizacao } from '../../compartilhado/tipos';
import { ModalLojaAdmin } from './ModalLojaAdmin';

export const PaginaLojasAdmin: React.FC = () => {
  const navigate = useNavigate();
  const [lojas, setLojas] = useState<Organizacao[]>([]);
  const [ritos, setRitos] = useState<{id: string, nome: string}[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [modalAberto, setModalAberto] = useState(false);
  const [lojaEditandoId, setLojaEditandoId] = useState<string | undefined>(undefined);

  const buscarLojasERitos = async () => {
    try {
      setCarregando(true);
      const [respLojas, respRitos] = await Promise.all([
        clienteHttp.get<Organizacao[]>('/organizacoes?apenas_ativas=false'),
        clienteHttp.get('/admin/ritos')
      ]);
      setLojas(respLojas.data);
      setRitos(respRitos.data);
    } catch (err) {
      console.error('Erro ao buscar dados', err);
    } finally {
      setCarregando(false);
    }
  };

  useEffect(() => {
    buscarLojasERitos();
  }, []);

  return (
    <div className="h-full overflow-y-auto p-4 md:p-8 bg-[#080808]">
      <div className="max-w-7xl mx-auto space-y-6">
        
        <header className="flex items-center justify-between border-b border-gray-800 pb-6 pt-4">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => navigate('/admin')}
              className="p-2 rounded-full hover:bg-white/5 text-gray-400 hover:text-white transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-white font-cinzel">Lojas Cadastradas</h1>
              <p className="text-sm text-gray-400">Gerenciamento global de tenants e assinaturas.</p>
            </div>
          </div>
          
          <button 
            onClick={() => {
              setLojaEditandoId(undefined);
              setModalAberto(true);
            }}
            className="flex items-center gap-2 bg-macaonico-dourado text-black px-4 py-2 rounded-lg font-bold hover:bg-yellow-500 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Nova Loja
          </button>
        </header>

        <section className="bg-[#111111] border border-gray-800 rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-900 border-b border-gray-800 text-sm font-semibold text-gray-400 uppercase tracking-wider">
                  <th className="p-4 pl-6">Nome da Loja</th>
                  <th className="p-4">Rito Padrão</th>
                  <th className="p-4">Assinatura</th>
                  <th className="p-4 text-center">Status</th>
                  <th className="p-4 text-right pr-6">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800/50">
                {carregando ? (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-gray-500">
                      <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />
                      Carregando dados...
                    </td>
                  </tr>
                ) : lojas.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-gray-500">
                      Nenhuma loja encontrada.
                    </td>
                  </tr>
                ) : (
                  lojas.map(loja => (
                    <tr key={loja.id} className="hover:bg-white/[0.02] transition-colors group">
                      <td className="p-4 pl-6">
                        <div className="font-semibold text-white">{loja.nome}</div>
                        <div className="text-xs text-gray-500 font-mono mt-0.5">{loja.slug_armazenamento}</div>
                      </td>
                      <td className="p-4">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-cyan-900/30 text-cyan-400 border border-cyan-800">
                          {ritos.find(r => r.id === loja.rito_id)?.nome || 'Não definido'}
                        </span>
                      </td>
                      <td className="p-4 text-sm text-gray-300">
                        {loja.status_assinatura === 'ATIVA' ? (
                          <span className="text-green-400">Ativa</span>
                        ) : loja.status_assinatura === 'ESPECIAL' ? (
                          <span className="text-emerald-400">Especial</span>
                        ) : loja.status_assinatura === 'DEMONSTRACAO' ? (
                          <span className="text-yellow-400">Demo</span>
                        ) : loja.status_assinatura === 'INATIVA' ? (
                          <span className="text-red-400">Inativa</span>
                        ) : (
                          <span className="text-gray-400">{loja.status_assinatura || 'Indefinido'}</span>
                        )}
                        {loja.validade_assinatura && (
                          <div className="text-xs text-gray-500">
                            Até {new Date(loja.validade_assinatura).toLocaleDateString('pt-BR')}
                          </div>
                        )}
                      </td>
                      <td className="p-4 text-center">
                        <span className={`inline-block w-2.5 h-2.5 rounded-full ${loja.ativo ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]' : 'bg-red-500'}`}></span>
                      </td>
                      <td className="p-4 pr-6">
                        <div className="flex items-center justify-end gap-2 opacity-50 group-hover:opacity-100 transition-opacity">
                          <button 
                            title="Personificar (Acessar como Loja)"
                            className="p-2 bg-blue-900/20 text-blue-400 hover:bg-blue-600 hover:text-white rounded-lg transition-colors"
                          >
                            <Shield className="w-4 h-4" />
                          </button>
                          <button 
                            title="Editar Loja"
                            onClick={() => {
                              setLojaEditandoId(loja.id);
                              setModalAberto(true);
                            }}
                            className="p-2 bg-gray-800 text-gray-300 hover:bg-gray-700 hover:text-white rounded-lg transition-colors"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button 
                            title="Excluir"
                            className="p-2 bg-red-900/20 text-red-400 hover:bg-red-600 hover:text-white rounded-lg transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>

      </div>

      {modalAberto && (
        <ModalLojaAdmin
          lojaId={lojaEditandoId}
          onClose={() => setModalAberto(false)}
          onSalvo={() => {
            setModalAberto(false);
            buscarLojasERitos();
          }}
        />
      )}
    </div>
  );
};
