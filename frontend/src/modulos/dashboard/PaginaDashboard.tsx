import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Music, ListOrdered, CalendarHeart, PlayCircle, ShieldCheck, Compass } from 'lucide-react';
import { useTenant } from '../../compartilhado/contextos/ContextoTenant';
import { ModalSelecaoSessao } from '../player/ModalSelecaoSessao';

/**
 * Painel Operacional principal do Mestre de Harmonia.
 * Layout responsivo Mobile-First com acesso rápido ao Player Sequencial e cadastros da Loja.
 */
export const PaginaDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { lojaAtiva } = useTenant();
  const [modalSessaoAberto, setModalSessaoAberto] = useState(false);

  const nomeLoja = lojaAtiva?.nome || "Loja Maçônica";
  const rito = lojaAtiva?.rito_padrao || "Rito Escocês Antigo e Aceito";
  const validade = lojaAtiva?.validade_assinatura
    ? new Date(lojaAtiva.validade_assinatura).toLocaleDateString('pt-BR')
    : 'Assinatura Ativa';

  const iniciarSequenciaPlayer = () => {
    setModalSessaoAberto(true);
  };

  return (
    <div className="h-full w-full flex flex-col bg-macaonico-surface overflow-y-auto text-slate-100 relative">
      {/* Textura sutil de fundo */}
      <div className="fixed inset-0 bg-[url('https://www.transparenttextures.com/patterns/black-scales.png')] opacity-20 pointer-events-none z-0"></div>

      {/* Conteúdo Principal Responsivo */}
      <div className="relative z-10 w-full max-w-5xl mx-auto flex flex-col p-4 sm:p-6 md:p-8 space-y-5 sm:space-y-6 pb-8">
        {/* Cabeçalho Compacto no Mobile */}
        <header className="text-center pt-1 sm:pt-2">
          <p className="text-[11px] sm:text-xs uppercase tracking-[0.25em] text-macaonico-dourado/80 font-semibold mb-1">
            Estação Musical Ritualística
          </p>
          <h1 className="text-xl sm:text-3xl font-bold text-macaonico-dourado font-cinzel tracking-wider uppercase drop-shadow-md">
            Console de Harmonia
          </h1>
        </header>

        {/* CTA Principal no Topo para Ergonomia Mobile */}
        <section className="bg-gradient-to-br from-[#0e1c36] via-[#0a1428] to-[#070f1e] border border-macaonico-dourado/40 rounded-2xl p-4 sm:p-6 shadow-2xl flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="text-center sm:text-left">
            <h2 className="text-base sm:text-lg font-bold text-white font-cinzel flex items-center justify-center sm:justify-start gap-2">
              <Compass className="w-5 h-5 text-macaonico-dourado shrink-0" />
              Condução Musical de Sessão
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 mt-1">
              Selecione o roteiro ritualístico da Loja e inicie a execução sincronizada dos momentos.
            </p>
          </div>
          <button
            onClick={iniciarSequenciaPlayer}
            className="w-full sm:w-auto shrink-0 flex items-center justify-center gap-3 bg-gradient-to-r from-yellow-600 via-macaonico-dourado to-yellow-600 hover:from-yellow-500 hover:via-yellow-400 hover:to-yellow-500 text-black px-6 sm:px-8 py-3.5 sm:py-4 rounded-xl sm:rounded-full text-base sm:text-lg font-bold shadow-[0_0_20px_rgba(212,175,55,0.4)] active:scale-95 transition-all font-cinzel tracking-wider"
          >
            <PlayCircle className="w-6 h-6 shrink-0" />
            <span>Iniciar Player</span>
          </button>
        </section>

        {/* SEÇÃO 1: Informações da Oficina */}
        <section className="bg-sigma-bg/70 backdrop-blur-md border border-macaonico-dourado/25 rounded-2xl p-4 sm:p-6 shadow-xl">
          <div className="flex items-center justify-between border-b border-macaonico-dourado/20 pb-2.5 mb-4">
            <h2 className="text-base sm:text-lg font-bold text-macaonico-dourado font-cinzel">
              Dados da Oficina
            </h2>
            <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-400 bg-emerald-950/60 border border-emerald-500/30 px-2.5 py-1 rounded-full">
              <ShieldCheck className="w-3.5 h-3.5" />
              {validade}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            <div className="bg-sigma-surface/80 border border-white/5 rounded-xl p-3.5">
              <p className="text-xs text-slate-400 uppercase tracking-wider">Oficina / Loja</p>
              <p className="text-sm sm:text-base font-semibold text-white mt-0.5 truncate">{nomeLoja}</p>
            </div>
            <div className="bg-sigma-surface/80 border border-white/5 rounded-xl p-3.5">
              <p className="text-xs text-slate-400 uppercase tracking-wider">Rito Padrão</p>
              <p className="text-sm sm:text-base font-semibold text-white mt-0.5 truncate">{rito}</p>
            </div>
          </div>
        </section>

        {/* SEÇÃO 2: Cadastros Operacionais */}
        <section className="bg-sigma-bg/70 backdrop-blur-md border border-macaonico-dourado/25 rounded-2xl p-4 sm:p-6 shadow-xl">
          <h2 className="text-base sm:text-lg font-bold text-macaonico-dourado mb-4 border-b border-macaonico-dourado/20 pb-2.5 font-cinzel">
            Gestão Musical da Loja
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
            <button
              onClick={() => navigate('/sessoes')}
              className="flex sm:flex-col items-center sm:justify-center gap-3.5 sm:gap-3 bg-sigma-surface/90 hover:bg-sigma-elevated border border-white/10 hover:border-macaonico-dourado rounded-xl p-4 sm:p-6 transition-all text-left sm:text-center group active:scale-[0.99]"
            >
              <div className="w-12 h-12 rounded-xl bg-macaonico-dourado/10 border border-macaonico-dourado/30 flex items-center justify-center shrink-0">
                <ListOrdered className="w-6 h-6 text-macaonico-dourado group-hover:scale-110 transition-transform" />
              </div>
              <div>
                <span className="block font-semibold text-white text-sm sm:text-base tracking-wide">
                  Sessões e Roteiros
                </span>
                <span className="block text-xs text-slate-400 mt-0.5">
                  Sequência de momentos da Loja
                </span>
              </div>
            </button>

            <button
              onClick={() => navigate('/eventos')}
              className="flex sm:flex-col items-center sm:justify-center gap-3.5 sm:gap-3 bg-sigma-surface/90 hover:bg-sigma-elevated border border-white/10 hover:border-macaonico-dourado rounded-xl p-4 sm:p-6 transition-all text-left sm:text-center group active:scale-[0.99]"
            >
              <div className="w-12 h-12 rounded-xl bg-macaonico-dourado/10 border border-macaonico-dourado/30 flex items-center justify-center shrink-0">
                <CalendarHeart className="w-6 h-6 text-macaonico-dourado group-hover:scale-110 transition-transform" />
              </div>
              <div>
                <span className="block font-semibold text-white text-sm sm:text-base tracking-wide">
                  Momentos Ritualísticos
                </span>
                <span className="block text-xs text-slate-400 mt-0.5">
                  Playlists por evento da sessão
                </span>
              </div>
            </button>

            <button
              onClick={() => navigate('/musicas')}
              className="flex sm:flex-col items-center sm:justify-center gap-3.5 sm:gap-3 bg-sigma-surface/90 hover:bg-sigma-elevated border border-white/10 hover:border-macaonico-dourado rounded-xl p-4 sm:p-6 transition-all text-left sm:text-center group active:scale-[0.99]"
            >
              <div className="w-12 h-12 rounded-xl bg-macaonico-dourado/10 border border-macaonico-dourado/30 flex items-center justify-center shrink-0">
                <Music className="w-6 h-6 text-macaonico-dourado group-hover:scale-110 transition-transform" />
              </div>
              <div>
                <span className="block font-semibold text-white text-sm sm:text-base tracking-wide">
                  Acervo de Músicas
                </span>
                <span className="block text-xs text-slate-400 mt-0.5">
                  Músicas locais, globais e YouTube
                </span>
              </div>
            </button>
          </div>
        </section>
      </div>

      {modalSessaoAberto && (
        <ModalSelecaoSessao onFechar={() => setModalSessaoAberto(false)} />
      )}
    </div>
  );
};
