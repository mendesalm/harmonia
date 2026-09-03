import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Loader2, Plus, Settings } from 'lucide-react';
import clienteHttp from '../../compartilhado/api/cliente_http';

interface MomentoCanonico {
  id: string;
  nome: string;
  descricao: string;
  ativo: boolean;
}

export const PaginaEventosAdmin: React.FC = () => {
  const navigate = useNavigate();
  const [momentos, setMomentos] = useState<MomentoCanonico[]>([]);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    const buscarMomentos = async () => {
      try {
        const resp = await clienteHttp.get<MomentoCanonico[]>('/admin/canonicos/momentos');
        setMomentos(resp.data);
      } catch (err) {
        console.error('Erro ao buscar momentos', err);
      } finally {
        setCarregando(false);
      }
    };
    buscarMomentos();
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
              <h1 className="text-2xl font-bold text-white font-cinzel">Momentos Canônicos (Matriz Global)</h1>
              <p className="text-sm text-gray-400">Dicionário unificado de eventos ritualísticos para o ecossistema musical.</p>
            </div>
          </div>
          <button className="flex items-center gap-2 bg-macaonico-dourado text-black px-4 py-2 rounded-lg font-bold hover:bg-yellow-500 transition-colors">
            <Plus className="w-4 h-4" />
            Novo Momento
          </button>
        </header>

        <section className="bg-[#111111] border border-gray-800 rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-900 border-b border-gray-800 text-sm font-semibold text-gray-400 uppercase tracking-wider">
                  <th className="p-4 pl-6">Nome Canônico</th>
                  <th className="p-4 text-center">Status</th>
                  <th className="p-4 text-right pr-6">Gerenciar</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800/50">
                {carregando ? (
                  <tr>
                    <td colSpan={3} className="p-8 text-center text-gray-500">
                      <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />
                      Carregando dicionário global...
                    </td>
                  </tr>
                ) : (
                  momentos.map(momento => (
                    <tr key={momento.id} className="hover:bg-white/[0.02] transition-colors group">
                      <td className="p-4 pl-6">
                        <div className="font-semibold text-white">{momento.nome}</div>
                        {momento.descricao && (
                          <div className="text-xs text-gray-500 mt-1">{momento.descricao}</div>
                        )}
                      </td>
                      <td className="p-4 text-center">
                        <span className={`inline-block w-2.5 h-2.5 rounded-full ${momento.ativo ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]' : 'bg-red-500'}`}></span>
                      </td>
                      <td className="p-4 pr-6">
                        <div className="flex items-center justify-end gap-2 opacity-50 group-hover:opacity-100 transition-opacity">
                          <button 
                            title="Opções"
                            className="p-2 bg-gray-800 text-gray-300 hover:bg-gray-700 hover:text-white rounded-lg transition-colors"
                          >
                            <Settings className="w-4 h-4" />
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
    </div>
  );
};
