import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Loader2, Plus, Edit2, Trash2 } from 'lucide-react';
import clienteHttp from '../../compartilhado/api/cliente_http';
import { ModalEventoGlobal } from './ModalEventoGlobal';

interface EventoCanonico {
  id: string;
  nome: string;
  descricao: string;
  orientacao: string;
  ordem_sugerida: number;
  grau_aplicado: number;
}

/**
 * Administração Global de Momentos Canônicos (Eventos Matriz).
 * Responsiva com cards mobile e tabela desktop.
 */
export const PaginaEventosAdmin: React.FC = () => {
  const navigate = useNavigate();
  const [eventos, setEventos] = useState<EventoCanonico[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [modalAberto, setModalAberto] = useState(false);
  const [eventoSelecionadoId, setEventoSelecionadoId] = useState<string | undefined>(undefined);

  const carregar = async () => {
    setCarregando(true);
    try {
      const resp = await clienteHttp.get<EventoCanonico[]>('/admin/canonicos/momentos');
      setEventos(resp.data);
    } catch (err) {
      console.error(err);
    } finally {
      setCarregando(false);
    }
  };

  useEffect(() => {
    carregar();
  }, []);

  const abrirModal = (id?: string) => {
    setEventoSelecionadoId(id);
    setModalAberto(true);
  };

  const deletarEvento = async (id: string) => {
    if (!confirm('Tem certeza? Isso apagará o evento de todos os ritos e templates!')) return;
    try {
      await clienteHttp.delete(`/admin/canonicos/momentos/${id}`);
      carregar();
    } catch (err) {
      alert('Erro ao excluir.');
    }
  };

  const renderBadgeGrau = (grau: number) => {
    if (grau === 1)
      return (
        <span className="px-2 py-0.5 bg-blue-900/40 text-blue-300 rounded-md text-xs">
          1º - Aprendiz
        </span>
      );
    if (grau === 2)
      return (
        <span className="px-2 py-0.5 bg-purple-900/40 text-purple-300 rounded-md text-xs">
          2º - Companheiro
        </span>
      );
    if (grau === 3)
      return (
        <span className="px-2 py-0.5 bg-red-900/40 text-red-300 rounded-md text-xs">
          3º - Mestre
        </span>
      );
    return (
      <span className="px-2 py-0.5 bg-gray-800 text-gray-300 rounded-md text-xs">Universal</span>
    );
  };

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
                Momentos Canônicos (Eventos)
              </h1>
              <p className="text-xs sm:text-sm text-gray-400">
                Gerenciamento das matrizes de eventos e playlists sugeridas globais.
              </p>
            </div>
          </div>
          <button
            onClick={() => abrirModal()}
            className="w-full sm:w-auto flex items-center justify-center gap-2 bg-macaonico-dourado text-black px-4 py-2.5 rounded-xl font-bold hover:bg-yellow-500 transition-colors text-sm shrink-0"
          >
            <Plus className="w-4 h-4" />
            Novo Evento
          </button>
        </header>

        {carregando ? (
          <div className="flex justify-center p-12">
            <Loader2 className="w-8 h-8 animate-spin text-gray-500" />
          </div>
        ) : (
          <>
            {/* Cards Mobile */}
            <div className="md:hidden space-y-3">
              {eventos.map((ev) => (
                <div
                  key={ev.id}
                  className="bg-sigma-surface border border-gray-800 rounded-2xl p-4 space-y-2"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-mono text-macaonico-dourado">
                          #{ev.ordem_sugerida}
                        </span>
                        {renderBadgeGrau(ev.grau_aplicado)}
                      </div>
                      <h3 className="font-bold text-white text-sm">{ev.nome}</h3>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={() => abrirModal(ev.id)}
                        className="p-2 text-blue-400 hover:bg-blue-900/30 rounded-lg"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => deletarEvento(ev.id)}
                        className="p-2 text-red-400 hover:bg-red-900/30 rounded-lg"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  {ev.descricao && <p className="text-xs text-gray-400">{ev.descricao}</p>}
                </div>
              ))}
            </div>

            {/* Tabela Desktop */}
            <div className="hidden md:block bg-sigma-surface border border-gray-800 rounded-2xl overflow-hidden">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-sigma-bg/50 border-b border-gray-800 text-gray-400 text-sm">
                    <th className="p-4 font-medium">Ordem</th>
                    <th className="p-4 font-medium">Grau</th>
                    <th className="p-4 font-medium">Nome (Matriz)</th>
                    <th className="p-4 font-medium">Descrição</th>
                    <th className="p-4 font-medium text-right">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {eventos.map((ev) => (
                    <tr
                      key={ev.id}
                      className="border-b border-gray-800/50 hover:bg-white/5 transition-colors group"
                    >
                      <td className="p-4 text-gray-500 font-mono text-sm">{ev.ordem_sugerida}</td>
                      <td className="p-4 text-gray-400 text-sm">
                        {renderBadgeGrau(ev.grau_aplicado)}
                      </td>
                      <td className="p-4 text-gray-200 font-medium">{ev.nome}</td>
                      <td className="p-4 text-gray-500 text-sm truncate max-w-xs">
                        {ev.descricao || '-'}
                      </td>
                      <td className="p-4 text-right">
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => abrirModal(ev.id)}
                            className="p-2 text-blue-400 hover:bg-blue-900/30 rounded-lg transition-colors"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => deletarEvento(ev.id)}
                            className="p-2 text-red-400 hover:bg-red-900/30 rounded-lg transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {eventos.length === 0 && (
                    <tr>
                      <td colSpan={5} className="p-8 text-center text-gray-500">
                        Nenhum evento global cadastrado.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      {modalAberto && (
        <ModalEventoGlobal
          momentoId={eventoSelecionadoId}
          onClose={() => setModalAberto(false)}
          onSaved={() => carregar()}
        />
      )}
    </div>
  );
};
