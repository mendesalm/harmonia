import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { X, PlayCircle, Loader2, ListOrdered } from 'lucide-react';
import clienteHttp from '../../compartilhado/api/cliente_http';
import { useTenant } from '../../compartilhado/contextos/ContextoTenant';

interface SessaoLoja {
  id: string;
  nome_personalizado: string;
  eventos_customizados?: { id: string; suprimido?: boolean }[];
}

interface Props {
  onFechar: () => void;
}

/**
 * Modal responsivo centralizado (via Portal) para seleção rápida da Sessão/Roteiro
 * antes de abrir o Player Harmonia.
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

  return createPortal(
    <div
      style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 9999 }}
      className="fixed inset-0 z-[120] flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-md"
    >
      <div className="bg-[#0a1428] border border-macaonico-dourado/45 rounded-2xl sm:rounded-3xl w-full max-w-xl max-h-[88dvh] flex flex-col shadow-[0_20px_60px_rgba(0,0,0,0.9)] relative overflow-hidden">
        {/* Linha dourada superior */}
        <div className="h-1 w-full bg-gradient-to-r from-yellow-600 via-macaonico-dourado to-yellow-600 shrink-0"></div>

        {/* Cabeçalho */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-4 border-b border-white/10 bg-[#070e1c] shrink-0">
          <h2 className="text-base sm:text-xl font-bold text-macaonico-dourado font-cinzel tracking-wider flex items-center gap-2">
            <PlayCircle className="w-5 h-5 sm:w-6 sm:h-6 shrink-0" />
            <span>Selecionar Sessão para o Player</span>
          </h2>
          <button
            type="button"
            onClick={onFechar}
            className="text-slate-400 hover:text-white transition-colors p-2 rounded-xl hover:bg-white/10"
            aria-label="Fechar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Corpo rolável */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 min-h-0">
          {carregando ? (
            <div className="flex flex-col items-center justify-center py-10 text-macaonico-dourado">
              <Loader2 className="w-8 h-8 animate-spin mb-3" />
              <p className="font-medium font-cinzel text-sm">Carregando Sessões da Loja...</p>
            </div>
          ) : sessoes.length === 0 ? (
            <div className="text-center py-8 space-y-4">
              <ListOrdered className="w-12 h-12 text-slate-500 mx-auto" />
              <div>
                <p className="text-slate-200 font-medium">
                  Nenhuma sessão cadastrada para a sua Loja.
                </p>
                <p className="text-xs text-slate-400 mt-1">
                  Cadastre uma nova sessão maçônica a partir do modelo do seu Rito.
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  onFechar();
                  navigate('/sessoes');
                }}
                className="bg-macaonico-dourado text-black font-bold px-6 py-3 rounded-xl text-sm hover:bg-yellow-400 transition-colors"
              >
                Cadastrar Sessões
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-xs sm:text-sm text-slate-300">
                Toque na Sessão Maçônica que será conduzida agora:
              </p>
              <div className="grid gap-2.5">
                {sessoes.map((s) => {
                  const ativos = (s.eventos_customizados || []).filter((e) => !e.suprimido);
                  return (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => handleSelecionar(s.id)}
                      className="flex items-center justify-between p-4 rounded-xl bg-[#0e1c36]/90 border border-white/10 hover:border-macaonico-dourado/60 active:border-macaonico-dourado hover:bg-[#132647] transition-all text-left group min-h-[3.5rem]"
                    >
                      <div className="min-w-0 pr-3">
                        <span className="block font-semibold text-white group-hover:text-macaonico-dourado transition-colors text-sm sm:text-base truncate">
                          {s.nome_personalizado}
                        </span>
                        <span className="block text-xs text-slate-400 mt-0.5">
                          {ativos.length} {ativos.length === 1 ? 'momento ativo' : 'momentos ativos'}
                        </span>
                      </div>
                      <PlayCircle className="w-6 h-6 text-macaonico-dourado shrink-0 group-hover:scale-110 transition-transform" />
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
};
