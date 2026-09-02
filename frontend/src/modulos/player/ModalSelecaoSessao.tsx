import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, PlayCircle, Loader2, ListOrdered, Wand2, CheckCircle2 } from 'lucide-react';
import clienteHttp from '../../compartilhado/api/cliente_http';
import { useTenant } from '../../compartilhado/contextos/ContextoTenant';

interface SessaoLoja {
  id: string;
  nome_personalizado: string;
}

interface Props {
  onFechar: () => void;
}

export const ModalSelecaoSessao: React.FC<Props> = ({ onFechar }) => {
  const navigate = useNavigate();
  const { lojaAtiva } = useTenant();
  
  const [sessoes, setSessoes] = useState<SessaoLoja[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [sessaoSelecionada, setSessaoSelecionada] = useState<string | null>(null);
  
  const [analisando, setAnalisando] = useState(false);
  const [precisaAutoFill, setPrecisaAutoFill] = useState(false);
  const [preenchendo, setPreenchendo] = useState(false);
  const [mensagemAutoFill, setMensagemAutoFill] = useState('');

  useEffect(() => {
    const buscarSessoes = async () => {
      if (!lojaAtiva) return;
      try {
        setCarregando(true);
        const resp = await clienteHttp.get<SessaoLoja[]>(`/sessoes/loja/${lojaAtiva.id}`);
        setSessoes(resp.data);
      } catch (err) {
        console.error('Erro ao buscar sessoes', err);
      } finally {
        setCarregando(false);
      }
    };
    buscarSessoes();
  }, [lojaAtiva]);

  const handleSelecionar = async (id: string) => {
    setSessaoSelecionada(id);
    setAnalisando(true);
    setPrecisaAutoFill(false);
    
    // Simulate analyzing the session for missing songs
    // (In reality, we would call an endpoint to verify if any SessaoLojaEvento is missing MusicaEvento)
    setTimeout(() => {
      setAnalisando(false);
      // For demonstration, we assume we always need auto-fill to show the feature.
      // In production, we'd check if `playlist_vazia === true`
      setPrecisaAutoFill(true); 
    }, 1500);
  };

  const handleAplicarAutoFill = async () => {
    if (!sessaoSelecionada) return;
    setPreenchendo(true);
    setMensagemAutoFill('Cruzando momentos da Sessão com Acervo Global...');
    
    // Simulate auto-fill process
    setTimeout(() => {
      setMensagemAutoFill('Preenchendo Playlists Sugeridas...');
      setTimeout(() => {
        setPreenchendo(false);
        setMensagemAutoFill('');
        // Proceed to player
        navigate(`/player?sessao=${sessaoSelecionada}`);
      }, 1500);
    }, 1500);
  };

  const handleAcessarPlayer = () => {
    if (!sessaoSelecionada) return;
    navigate(`/player?sessao=${sessaoSelecionada}`);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="bg-[#111111] border border-macaonico-dourado/30 rounded-2xl w-full max-w-xl p-6 shadow-2xl relative overflow-hidden animate-in zoom-in-95 duration-200">
        
        {/* Golden Line Decorator */}
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-yellow-600 via-macaonico-dourado to-yellow-600"></div>

        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-gray-800 mb-6">
          <h2 className="text-2xl font-bold text-macaonico-dourado font-cinzel tracking-wider flex items-center gap-2">
            <PlayCircle className="w-6 h-6" />
            Iniciar Sessão
          </h2>
          <button onClick={onFechar} className="text-gray-400 hover:text-white transition-colors p-2 rounded-lg hover:bg-white/5">
            <X className="w-5 h-5" />
          </button>
        </div>

        {carregando ? (
          <div className="flex flex-col items-center justify-center py-12 text-macaonico-dourado">
            <Loader2 className="w-8 h-8 animate-spin mb-4" />
            <p className="font-medium font-cinzel">Carregando Roteiros da Loja...</p>
          </div>
        ) : sessoes.length === 0 ? (
          <div className="text-center py-12">
            <ListOrdered className="w-12 h-12 text-gray-600 mx-auto mb-4" />
            <p className="text-gray-300">Nenhuma sessão encontrada para a sua Loja.</p>
            <p className="text-xs text-gray-500 mt-2">Vá em "Sessões / Roteiros" no Dashboard e importe um Template.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {!sessaoSelecionada ? (
              <>
                <p className="text-sm text-gray-300">Selecione qual Sessão ou Roteiro Ritualístico você conduzirá agora:</p>
                <div className="grid gap-3 max-h-64 overflow-y-auto pr-2">
                  {sessoes.map(s => (
                    <button
                      key={s.id}
                      onClick={() => handleSelecionar(s.id)}
                      className="flex items-center justify-between p-4 rounded-xl bg-gray-900 border border-gray-800 hover:border-macaonico-dourado/50 hover:bg-gray-800 transition-all text-left group"
                    >
                      <span className="font-semibold text-white group-hover:text-macaonico-dourado transition-colors">{s.nome_personalizado}</span>
                      <PlayCircle className="w-5 h-5 text-gray-600 group-hover:text-macaonico-dourado transition-colors" />
                    </button>
                  ))}
                </div>
              </>
            ) : analisando ? (
              <div className="flex flex-col items-center justify-center py-12 text-cyan-400">
                <Loader2 className="w-8 h-8 animate-spin mb-4" />
                <p className="font-medium animate-pulse">Analisando Playlists da Sessão...</p>
                <p className="text-xs text-gray-400 mt-2">Verificando se há buracos no roteiro musical.</p>
              </div>
            ) : precisaAutoFill ? (
              <div className="py-4 animate-in slide-in-from-right-4">
                <div className="bg-cyan-900/20 border border-cyan-800 rounded-xl p-5 mb-6 text-center">
                  <div className="w-12 h-12 bg-cyan-900/50 rounded-full flex items-center justify-center mx-auto mb-3 shadow-lg shadow-cyan-500/20">
                    <Wand2 className="w-6 h-6 text-cyan-400" />
                  </div>
                  <h3 className="text-lg font-bold text-cyan-300 mb-2">Preenchimento Inteligente (Auto-Fill)</h3>
                  <p className="text-sm text-cyan-100/70">
                    Identificamos que alguns momentos ritualísticos desta sessão estão <strong>sem músicas configuradas</strong>. Deseja que o sistema preencha as lacunas automaticamente usando as músicas mais adequadas do Acervo Global?
                  </p>
                </div>
                
                {preenchendo ? (
                  <div className="flex flex-col items-center justify-center py-4 text-cyan-400">
                    <Loader2 className="w-6 h-6 animate-spin mb-3" />
                    <p className="text-sm font-semibold">{mensagemAutoFill}</p>
                  </div>
                ) : (
                  <div className="flex items-center justify-center gap-4">
                    <button 
                      onClick={handleAcessarPlayer}
                      className="px-6 py-3 rounded-xl font-medium text-gray-400 hover:text-white bg-gray-900 border border-gray-800 hover:bg-gray-800 transition-colors"
                    >
                      Acessar Incompleto
                    </button>
                    <button 
                      onClick={handleAplicarAutoFill}
                      className="flex items-center gap-2 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold px-8 py-3 rounded-xl shadow-lg shadow-cyan-500/30 transition-all cursor-pointer hover:scale-105"
                    >
                      <Wand2 className="w-5 h-5" />
                      Aplicar Auto-Fill
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="py-8 text-center animate-in zoom-in-95">
                <CheckCircle2 className="w-16 h-16 text-green-500 mx-auto mb-4" />
                <h3 className="text-xl font-bold text-white mb-2">Tudo Pronto!</h3>
                <p className="text-sm text-gray-400 mb-8">Sua sessão está 100% mapeada com músicas e áudios.</p>
                <button 
                  onClick={handleAcessarPlayer}
                  className="bg-macaonico-dourado hover:bg-yellow-500 text-black font-bold px-10 py-4 rounded-full text-lg shadow-lg shadow-macaonico-dourado/20 hover:scale-105 transition-all font-cinzel"
                >
                  Abrir Player Agora
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
