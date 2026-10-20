import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Edit2, Trash2, Shield, Loader2, Plus } from 'lucide-react';
import clienteHttp from '../../compartilhado/api/cliente_http';
import { Organizacao } from '../../compartilhado/tipos';
import { ModalLojaAdmin } from './ModalLojaAdmin';

/**
 * Página de Administração Global de Lojas Cadastradas.
 * Responsiva com cards mobile e tabela desktop.
 */
export const PaginaLojasAdmin: React.FC = () => {
  const navigate = useNavigate();
  const [lojas, setLojas] = useState<Organizacao[]>([]);
  const [ritos, setRitos] = useState<{ id: string; nome: string }[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [modalAberto, setModalAberto] = useState(false);
  const [lojaEditandoId, setLojaEditandoId] = useState<string | undefined>(undefined);

  const buscarLojasERitos = async () => {
    try {
      setCarregando(true);
      const [respLojas, respRitos] = await Promise.all([
        clienteHttp.get<Organizacao[]>('/organizacoes?apenas_ativas=false').catch(() => ({ data: [] as Organizacao[] })),
        clienteHttp.get('/admin/ritos').catch(() => ({ data: [] })),
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
    <div className="p-3 sm:p-6 md:p-8 bg-sigma-bg min-h-full">
      <div className="max-w-7xl mx-auto space-y-5 sm:space-y-6 pb-8">
        <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-800 pb-4 sm:pb-6 pt-2">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/admin')}
              className="p-2 rounded-full hover:bg-white/5 text-gray-400 hover:text-white transition-colors shrink-0"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-lg sm:text-2xl font-bold text-white font-cinzel">
                Lojas Cadastradas
              </h1>
              <p className="text-xs sm:text-sm text-gray-400">
                Gerenciamento global de tenants e assinaturas.
              </p>
            </div>
          </div>

          <button
            onClick={() => {
              setLojaEditandoId(undefined);
              setModalAberto(true);
            }}
            className="w-full sm:w-auto flex items-center justify-center gap-2 bg-macaonico-dourado text-black px-4 py-2.5 rounded-xl font-bold hover:bg-yellow-500 transition-colors text-sm shrink-0"
          >
            <Plus className="w-4 h-4" />
            Nova Loja
          </button>
        </header>

        {/* Cards Mobile */}
        <div className="md:hidden space-y-3">
          {carregando ? (
            <div className="p-8 text-center text-gray-500">
              <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />
              Carregando dados...
            </div>
          ) : lojas.length === 0 ? (
            <div className="p-8 text-center text-gray-500 bg-sigma-surface rounded-2xl border border-gray-800">
              Nenhuma loja encontrada.
            </div>
          ) : (
            lojas.map((loja) => (
              <div
                key={loja.id}
                className="bg-sigma-surface border border-gray-800 rounded-2xl p-4 space-y-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="font-semibold text-white text-sm">{loja.nome}</div>
                    <div className="text-xs text-gray-500 font-mono">{loja.slug_armazenamento}</div>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => {
                        setLojaEditandoId(loja.id);
                        setModalAberto(true);
                      }}
                      className="p-2 bg-gray-800 text-gray-300 rounded-lg"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                <div className="flex items-center justify-between text-xs pt-2 border-t border-gray-800">
                  <span className="px-2.5 py-0.5 rounded-full bg-cyan-900/30 text-cyan-400 border border-cyan-800">
                    {ritos.find((r) => r.id === loja.rito_id)?.nome || 'Rito Padrão'}
                  </span>
                  <span className="text-emerald-400 font-medium">
                    {loja.status_assinatura || 'Ativa'}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Tabela Desktop */}
        <section className="hidden md:block bg-sigma-surface border border-gray-800 rounded-2xl overflow-hidden">
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
                  lojas.map((loja) => (
                    <tr key={loja.id} className="hover:bg-white/[0.02] transition-colors group">
                      <td className="p-4 pl-6">
                        <div className="font-semibold text-white">{loja.nome}</div>
                        <div className="text-xs text-gray-500 font-mono mt-0.5">
                          {loja.slug_armazenamento}
                        </div>
                      </td>
                      <td className="p-4">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-cyan-900/30 text-cyan-400 border border-cyan-800">
                          {ritos.find((r) => r.id === loja.rito_id)?.nome || 'Não definido'}
                        </span>
                      </td>
                      <td className="p-4 text-sm text-gray-300">
                        <span className="text-green-400">{loja.status_assinatura || 'Ativa'}</span>
                      </td>
                      <td className="p-4 text-center">
                        <span
                          className={`inline-block w-2.5 h-2.5 rounded-full ${
                            loja.ativo
                              ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]'
                              : 'bg-red-500'
                          }`}
                        ></span>
                      </td>
                      <td className="p-4 pr-6">
                        <div className="flex items-center justify-end gap-2">
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
