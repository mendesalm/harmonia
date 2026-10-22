import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Sparkles, Music, Play, Pause, X, Search, Volume2, ArrowLeft } from 'lucide-react';
import { Musica } from '../../compartilhado/tipos';
import clienteHttp from '../../compartilhado/api/cliente_http';

interface ModalInterludioFundoProps {
  aberto: boolean;
  onFechar: () => void;
  onSelecionarTrilhaFundo: (musica: Musica) => void;
  musicaFundoAtiva: Musica | null;
  tocandoFundo: boolean;
  onAlternarPlayPauseFundo: () => void;
  onRetomarEsteira: () => void;
}

/**
 * Modal e Gaveta Deslizante de Interlúdio / Trilha de Fundo Litúrgico.
 * Permite que o Mestre de Harmonia selecione trilhas de ambiência, esperas ou fundos para monólogo,
 * pausando a esteira litúrgica e permitindo o retorno imediato ao momento original.
 */
export const ModalInterludioFundo: React.FC<ModalInterludioFundoProps> = ({
  aberto,
  onFechar,
  onSelecionarTrilhaFundo,
  musicaFundoAtiva,
  tocandoFundo,
  onAlternarPlayPauseFundo,
  onRetomarEsteira,
}) => {
  const [musicasSugeridas, setMusicasSugeridas] = useState<Musica[]>([]);
  const [todasMusicas, setTodasMusicas] = useState<Musica[]>([]);
  const [aba, setAba] = useState<'SUGERIDAS' | 'ACERVO'>('SUGERIDAS');
  const [busca, setBusca] = useState('');
  const [carregando, setCarregando] = useState(false);

  useEffect(() => {
    if (!aberto) return;

    const carregarMusicas = async () => {
      try {
        setCarregando(true);
        // 1. Busca todas as músicas do acervo
        const respTodas = await clienteHttp.get<Musica[]>('/musicas');
        const listaCompleta = respTodas.data || [];
        setTodasMusicas(listaCompleta);

        // 2. Filtra músicas vinculadas a momentos de Fundo/Interlúdio ou com nomes sugestivos
        const sugeridas = listaCompleta.filter((m: any) => {
          const temTagEvento = m.eventos?.some((ev: any) =>
            ev.evento_nome?.toLowerCase().includes('fundo') ||
            ev.evento_nome?.toLowerCase().includes('interlúdio') ||
            ev.evento_nome?.toLowerCase().includes('interludio')
          );
          const nomeSugerido =
            m.titulo?.toLowerCase().includes('fundo') ||
            m.titulo?.toLowerCase().includes('interlúdio') ||
            m.titulo?.toLowerCase().includes('sonho') ||
            m.titulo?.toLowerCase().includes('ballade') ||
            m.titulo?.toLowerCase().includes('meditação') ||
            m.titulo?.toLowerCase().includes('meditacao') ||
            m.autor_artista?.toLowerCase().includes('corciolli') ||
            m.autor_artista?.toLowerCase().includes('clayderman');

          return temTagEvento || nomeSugerido;
        });

        setMusicasSugeridas(sugeridas.length > 0 ? sugeridas : listaCompleta.slice(0, 10));
      } catch (err) {
        console.error('Erro ao carregar trilhas de fundo:', err);
      } finally {
        setCarregando(false);
      }
    };

    carregarMusicas();
  }, [aberto]);

  if (!aberto) return null;

  const listaAtual = aba === 'SUGERIDAS' ? musicasSugeridas : todasMusicas;
  const listaFiltrada = listaAtual.filter((m) => {
    if (!busca.trim()) return true;
    const termo = busca.toLowerCase();
    return (
      m.titulo.toLowerCase().includes(termo) ||
      (m.autor_artista && m.autor_artista.toLowerCase().includes(termo))
    );
  });

  return createPortal(
    <div
      style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 10000 }}
      className="fixed inset-0 z-[130] flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-md"
    >
      <div className="bg-[#070e1c] border border-macaonico-dourado/45 rounded-2xl sm:rounded-3xl w-full max-w-xl max-h-[90dvh] flex flex-col shadow-[0_25px_70px_rgba(0,0,0,0.95)] overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Cabeçalho */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-white/10 shrink-0 bg-[#0a1428]">
          <div className="flex items-center gap-2.5 min-w-0 pr-2">
            <div className="w-9 h-9 rounded-xl bg-macaonico-dourado/15 border border-macaonico-dourado/30 flex items-center justify-center shrink-0 text-macaonico-dourado">
              <Sparkles className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h2 className="text-base sm:text-lg font-bold text-white fonte-ritual truncate flex items-center gap-2">
                <span>Trilha de Fundo / Interlúdio</span>
                <span className="text-[10px] font-sans px-2 py-0.5 rounded-full bg-macaonico-dourado/15 text-macaonico-dourado border border-macaonico-dourado/30">
                  Ambiência
                </span>
              </h2>
              <p className="text-[11px] text-slate-400 truncate">
                Músicas para monólogos, leituras, oratória e espera de irmãos.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onFechar}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors shrink-0"
            title="Fechar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Banner de status se houver música de fundo tocando */}
        {musicaFundoAtiva && (
          <div className="p-3 bg-gradient-to-r from-macaonico-dourado/20 via-yellow-500/10 to-transparent border-b border-macaonico-dourado/30 flex items-center justify-between gap-3 shrink-0">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-3 h-3 rounded-full bg-macaonico-dourado animate-pulse shrink-0" />
              <div className="min-w-0">
                <span className="text-[10px] text-macaonico-dourado uppercase tracking-wider font-bold block">
                  Em Reprodução de Fundo
                </span>
                <p className="text-xs font-semibold text-white truncate">
                  {musicaFundoAtiva.titulo}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                onClick={onAlternarPlayPauseFundo}
                className="p-2 rounded-lg bg-macaonico-dourado/20 text-macaonico-dourado hover:bg-macaonico-dourado/30 transition-colors"
                title={tocandoFundo ? 'Pausar Fundo' : 'Tocar Fundo'}
              >
                {tocandoFundo ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
              </button>

              <button
                type="button"
                onClick={() => {
                  onRetomarEsteira();
                  onFechar();
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-macaonico-dourado text-black font-bold text-xs hover:bg-yellow-400 transition-colors shadow-sm"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Retomar Esteira</span>
              </button>
            </div>
          </div>
        )}

        {/* Abas e Filtro */}
        <div className="p-3 sm:p-4 border-b border-white/10 shrink-0 space-y-3 bg-[#050b16]/70">
          <div className="grid grid-cols-2 gap-2 bg-primaria-800/80 p-1 rounded-xl border border-white/10">
            <button
              type="button"
              onClick={() => setAba('SUGERIDAS')}
              className={`py-1.5 px-3 rounded-lg text-xs font-bold transition-all ${
                aba === 'SUGERIDAS'
                  ? 'bg-macaonico-dourado text-black shadow-sm'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              Trilhas Recomendadas
            </button>
            <button
              type="button"
              onClick={() => setAba('ACERVO')}
              className={`py-1.5 px-3 rounded-lg text-xs font-bold transition-all ${
                aba === 'ACERVO'
                  ? 'bg-macaonico-dourado text-black shadow-sm'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              Todo o Acervo
            </button>
          </div>

          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Buscar por título ou compositor..."
              className="w-full bg-[#0a1428] border border-white/15 rounded-xl pl-9 pr-3 py-2 text-xs text-white focus:border-macaonico-dourado outline-none placeholder:text-slate-500"
            />
          </div>
        </div>

        {/* Lista de Músicas */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-2 min-h-0">
          {carregando ? (
            <div className="py-10 text-center text-slate-400 text-xs">
              <Sparkles className="w-6 h-6 text-macaonico-dourado/50 mx-auto mb-2 animate-pulse" />
              Carregando trilhas de fundo...
            </div>
          ) : listaFiltrada.length === 0 ? (
            <div className="py-10 text-center text-slate-400 text-xs">
              Nenhuma música encontrada para os critérios informados.
            </div>
          ) : (
            listaFiltrada.map((musica) => {
              const ehEsta = musicaFundoAtiva?.id === musica.id;
              return (
                <div
                  key={musica.id}
                  onClick={() => onSelecionarTrilhaFundo(musica)}
                  className={`flex items-center justify-between p-3 rounded-xl border transition-all cursor-pointer ${
                    ehEsta
                      ? 'bg-macaonico-dourado/15 border-macaonico-dourado/50 shadow-sm'
                      : 'bg-white/5 border-white/10 hover:border-macaonico-dourado/30 hover:bg-white/10'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0 pr-2">
                    <div
                      className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
                        ehEsta
                          ? 'bg-macaonico-dourado text-black font-bold'
                          : 'bg-white/5 text-slate-300'
                      }`}
                    >
                      {ehEsta && tocandoFundo ? (
                        <Volume2 className="w-4 h-4 animate-pulse text-black" />
                      ) : (
                        <Music className="w-4 h-4 text-macaonico-dourado" />
                      )}
                    </div>

                    <div className="min-w-0">
                      <p
                        className={`text-xs sm:text-sm font-semibold truncate ${
                          ehEsta ? 'text-macaonico-dourado font-bold' : 'text-white'
                        }`}
                      >
                        {musica.titulo}
                      </p>
                      <p className="text-[11px] text-slate-400 truncate">
                        {musica.autor_artista || 'Autor não informado'}
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (ehEsta) {
                        onAlternarPlayPauseFundo();
                      } else {
                        onSelecionarTrilhaFundo(musica);
                      }
                    }}
                    className={`flex items-center justify-center w-8 h-8 rounded-lg shrink-0 transition-colors ${
                      ehEsta && tocandoFundo
                        ? 'bg-macaonico-dourado text-black'
                        : 'bg-white/10 text-slate-200 hover:text-white hover:bg-macaonico-dourado/20'
                    }`}
                  >
                    {ehEsta && tocandoFundo ? (
                      <Pause className="w-4 h-4" />
                    ) : (
                      <Play className="w-4 h-4 fill-current ml-0.5" />
                    )}
                  </button>
                </div>
              );
            })
          )}
        </div>

        {/* Rodapé explicativo */}
        <div className="p-3 bg-[#0a1428] border-t border-white/10 flex items-center justify-between text-[11px] text-slate-400 shrink-0">
          <span>Ao tocar uma trilha, a esteira ritualística é mantida em espera.</span>
          <button
            type="button"
            onClick={onFechar}
            className="text-xs text-macaonico-dourado hover:underline font-medium"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};
