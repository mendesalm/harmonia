import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Loader2, Plus, Edit2, Trash2 } from 'lucide-react';
import clienteHttp from '../../compartilhado/api/cliente_http';

import { ModalConstrutorRitual } from './ModalConstrutorRitual';

interface Rito {
  id: string;
  nome: string;
  descricao: string;
  tipos_sessao: any[];
}

export const PaginaRitosAdmin: React.FC = () => {
  const navigate = useNavigate();
  const [ritos, setRitos] = useState<Rito[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [modalAberto, setModalAberto] = useState(false);
  const [sessaoSelecionada, setSessaoSelecionada] = useState<{ritoId: string, sessaoId: string, nome: string} | null>(null);

  useEffect(() => {
    const buscarRitos = async () => {
      try {
        const resp = await clienteHttp.get<Rito[]>('/admin/ritos');
        setRitos(resp.data);
      } catch (err) {
        console.error('Erro ao buscar ritos', err);
      } finally {
        setCarregando(false);
      }
    };
    buscarRitos();
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
              <h1 className="text-2xl font-bold text-white font-cinzel">Tipos Globais de Sessão (Ritos)</h1>
              <p className="text-sm text-gray-400">Gerenciamento das matrizes litúrgicas e templates de sessão.</p>
            </div>
          </div>
          <button className="flex items-center gap-2 bg-macaonico-dourado text-black px-4 py-2 rounded-lg font-bold hover:bg-yellow-500 transition-colors">
            <Plus className="w-4 h-4" />
            Novo Rito
          </button>
        </header>

        {carregando ? (
          <div className="flex justify-center p-12">
            <Loader2 className="w-8 h-8 animate-spin text-gray-500" />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {ritos.map(rito => (
              <div key={rito.id} className="bg-[#111111] border border-gray-800 rounded-2xl p-6 hover:border-gray-700 transition-colors">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h2 className="text-xl font-bold text-white mb-1">{rito.nome}</h2>
                    <p className="text-sm text-gray-400">{rito.descricao}</p>
                  </div>
                  <div className="flex gap-2">
                    <button className="p-2 bg-gray-800 text-gray-300 hover:bg-gray-700 hover:text-white rounded-lg transition-colors">
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button className="p-2 bg-red-900/20 text-red-400 hover:bg-red-600 hover:text-white rounded-lg transition-colors">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="space-y-3 mt-6">
                  <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Templates de Sessão</h3>
                  {rito.tipos_sessao.length === 0 ? (
                    <p className="text-sm text-gray-600 italic">Nenhum template cadastrado.</p>
                  ) : (
                    <ul className="space-y-2">
                      {rito.tipos_sessao.map(sessao => (
                        <li key={sessao.id} className="flex justify-between items-center bg-black/40 p-3 rounded-lg border border-gray-800/50">
                          <div>
                            <span className="font-medium text-gray-300">{sessao.nome}</span>
                            {sessao.canonico && (
                              <div className="text-xs text-purple-400 mt-0.5">
                                ↳ Matriz: {sessao.canonico.nome}
                              </div>
                            )}
                          </div>
                          <div className="flex gap-2 items-center">
                            <span className="text-xs px-2 py-1 bg-gray-800 rounded text-gray-400">Ativo</span>
                            <button 
                              onClick={() => {
                                setSessaoSelecionada({ritoId: rito.id, sessaoId: sessao.id, nome: sessao.nome});
                                setModalAberto(true);
                              }}
                              className="text-xs px-2 py-1 bg-blue-900/40 text-blue-400 hover:bg-blue-600 hover:text-white rounded transition-colors"
                            >
                              Editar Sequência
                            </button>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                  <button className="w-full mt-2 py-2 border border-dashed border-gray-700 text-gray-500 rounded-lg hover:border-gray-500 hover:text-gray-300 transition-colors text-sm font-medium">
                    + Adicionar Template de Sessão
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

      </div>
      
      {modalAberto && sessaoSelecionada && (
        <ModalConstrutorRitual
          ritoId={sessaoSelecionada.ritoId}
          sessaoId={sessaoSelecionada.sessaoId}
          sessaoNome={sessaoSelecionada.nome}
          onClose={() => {
            setModalAberto(false);
            setSessaoSelecionada(null);
          }}
          onSaved={() => {
            // Em uma versão otimizada recarregaríamos apenas os dados afetados
            window.location.reload(); 
          }}
        />
      )}
    </div>
  );
};
