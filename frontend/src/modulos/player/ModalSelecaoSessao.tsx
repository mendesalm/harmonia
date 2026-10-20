import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, PlayCircle, Loader2, ListOrdered } from 'lucide-react';
import clienteHttp from '../../compartilhado/api/cliente_http';
import { useTenant } from '../../compartilhado/contextos/ContextoTenant';

interface SessaoLoja {
  id: string;
  nome_personalizado: string;
  eventos_customizados?: { id: string }[];
}

interface Props {
  onFechar: () => void;
}

/**
 * Modal responsivo para seleção rápida da Sessão/Roteiro antes de abrir o Player Harmonia.
 */
export const ModalSelecaoSessao: React.FC<Props> = ({ onFechar }) => {
  const navigate = useNavigate();
  const { lojaAtiva } = useTenant();

  const [sessoes, setSessoes] = useState<SessaoLoja[]>([]);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    const buscarSessoes = async () => {
      if (!lojaAtiva) return;
      try {
        setCarregando(true);
        const resp = await clienteHttp.get<SessaoLoja[]>(`/sessoes/loja/${lojaAtiva.id}`);
        setSessoes(resp.data);
      } catch (err) {
        console.error('Erro ao buscar sessoes da loja', err);
      } finally {
        setCarregando(false);
      }
    };
    buscarSessoes();
  }, [lojaAtiva]);

  const handleSelecionar = (id: string) => {
    onFechar();
    navigate(`/player?sessao=${id}`);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-sigma-bg/80 backdrop-blur-sm">
      <div className="bg-sigma-surface border-t sm:border border-macaonico-dourado/30 rounded-t-2xl sm:rounded-2xl w-full max-w-xl p-5 sm:p-6 shadow-2xl relative overflow-hidden max-h-[85dvh] flex flex-col">
        {/* Linha dourada superior */}
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-yellow-600 via-macaonico-dourado to-yellow-600"></div>

        {/* Cabeçalho */}
        <div className="flex items-center justify-between pb-3.5 border-b border-gray-800 mb-4 shrink-0">
          <h2 className="text-lg sm:text-2xl font-bold text-macaonico-dourado font-cinzel tracking-wider flex items-center gap-2">
            <PlayCircle className="w-5 h-5 sm:w-6 sm:h-6 shrink-0" />
            Selecionar Roteiro
          </h2>
          <button
            onClick={onFechar}
            className="text-gray-400 hover:text-white transition-colors p-2 rounded-lg hover:bg-white/5"
            aria-label="Fechar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {carregando ? (
          <div className="flex flex-col items-center justify-center py-10 text-macaonico-dourado">
            <Loader2 className="w-8 h-8 animate-spin mb-3" />
            <p className="font-medium font-cinzel text-sm">Carregando Roteiros da Loja...</p>
          </div>
        ) : sessoes.length === 0 ? (
          <div className="text-center py-8 space-y-4">
            <ListOrdered className="w-12 h-12 text-gray-600 mx-auto" />
            <div>
              <p className="text-gray-200 font-medium">Nenhuma sessão encontrada para a sua Loja.</p>
              <p className="text-xs text-gray-400 mt-1">
                Importe um template padrão do Rito ou crie seu roteiro personalizado.
              </p>
            </div>
            <button
              onClick={() => {
                onFechar();
                navigate('/sessoes');
              }}
              className="bg-macaonico-dourado text-black font-bold px-6 py-3 rounded-xl text-sm hover:bg-yellow-400 transition-colors"
            >
              Configurar Sessões
            </button>
          </div>
        ) : (
          <div className="flex flex-col min-h-0">
            <p className="text-xs sm:text-sm text-gray-300 mb-3 shrink-0">
              Toque na Sessão ou Roteiro Ritualístico que será conduzido agora:
            </p>
            <div className="grid gap-2.5 overflow-y-auto pr-1 pb-2">
              {sessoes.map((s) => (
                <button
                  key={s.id}
                  onClick={() => handleSelecionar(s.id)}
                  className="flex items-center justify-between p-4 rounded-xl bg-gray-900/90 border border-gray-800 hover:border-macaonico-dourado/60 active:border-macaonico-dourado hover:bg-gray-800/90 transition-all text-left group min-h-[3.5rem]"
                >
                  <div className="min-w-0 pr-3">
                    <span className="block font-semibold text-white group-hover:text-macaonico-dourado transition-colors text-sm sm:text-base truncate">
                      {s.nome_personalizado}
                    </span>
                    {s.eventos_customizados && (
                      <span className="block text-xs text-slate-400 mt-0.5">
                        {s.eventos_customizados.length} momentos configurados
                      </span>
                    )}
                  </div>
                  <PlayCircle className="w-6 h-6 text-macaonico-dourado shrink-0 group-hover:scale-110 transition-transform" />
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
