import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Trash2 } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  temErro: boolean;
  erro: Error | null;
}

/**
 * Componente ErrorBoundary para captura global de exceções no React.
 * Evita tela preta/branca caso ocorra falha de chunk ou exceção de renderização.
 */
export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    temErro: false,
    erro: null,
  };

  public static getDerivedStateFromError(erro: Error): State {
    return { temErro: true, erro };
  }

  public componentDidCatch(erro: Error, infoErro: ErrorInfo) {
    console.error('ErrorBoundary capturou uma falha não tratada:', erro, infoErro);
    // Se for erro de chunk desatualizado do Vite/Webpack, recarrega automaticamente uma vez
    const mensagem = erro?.message || '';
    if (
      mensagem.includes('Failed to fetch dynamically imported module') ||
      mensagem.includes('Importing a module script failed') ||
      mensagem.includes('Loading chunk')
    ) {
      const recarregou = sessionStorage.getItem('@harmonia:recarregou_chunk');
      if (!recarregou) {
        sessionStorage.setItem('@harmonia:recarregou_chunk', 'true');
        window.location.reload();
      }
    }
  }

  private handleRecarregar = () => {
    window.location.reload();
  };

  private handleLimparCacheERecarregar = () => {
    try {
      localStorage.clear();
      sessionStorage.clear();
    } catch {
      /* ignora */
    }
    window.location.href = '/';
  };

  public render() {
    if (this.state.temErro) {
      return (
        <div className="min-h-screen w-full flex items-center justify-center bg-[#050811] text-slate-100 p-4">
          <div className="max-w-md w-full bg-[#0a1020] border border-amber-500/40 rounded-2xl p-6 shadow-2xl text-center space-y-4">
            <div className="w-14 h-14 mx-auto rounded-full bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <AlertTriangle className="w-7 h-7" />
            </div>

            <div className="space-y-1">
              <h2 className="text-lg font-cinzel font-bold text-amber-400">
                Instabilidade Temporária no Console
              </h2>
              <p className="text-xs text-slate-400 font-inter">
                Ocorreu uma falha ao renderizar a interface ritualística.
              </p>
            </div>

            {this.state.erro && (
              <div className="p-3 bg-black/50 border border-slate-800 rounded-lg text-left overflow-auto max-h-36">
                <p className="text-[11px] font-mono text-rose-400 break-words">
                  {this.state.erro.toString()}
                </p>
              </div>
            )}

            <div className="flex flex-col sm:flex-row items-center justify-center gap-2 pt-2">
              <button
                type="button"
                onClick={this.handleRecarregar}
                className="w-full sm:w-auto flex-1 flex items-center justify-center gap-2 py-2.5 px-4 bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-black font-semibold rounded-xl text-xs transition-all shadow-md active:scale-95"
              >
                <RefreshCw className="w-4 h-4" />
                <span>Recarregar</span>
              </button>

              <button
                type="button"
                onClick={this.handleLimparCacheERecarregar}
                className="w-full sm:w-auto flex items-center justify-center gap-2 py-2.5 px-3 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs transition-all border border-slate-700 active:scale-95"
                title="Limpar dados temporários salvos e reiniciar"
              >
                <Trash2 className="w-4 h-4 text-slate-400" />
                <span>Limpar Cache</span>
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
