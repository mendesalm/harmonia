import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Settings, RefreshCw, Music, ListOrdered, CalendarHeart, PlayCircle } from 'lucide-react';
import { useTenant } from '../../compartilhado/contextos/ContextoTenant';
import { ModalSelecaoSessao } from '../player/ModalSelecaoSessao';

export const PaginaDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { tenant } = useTenant();
  const [modalSessaoAberto, setModalSessaoAberto] = useState(false);

  // Mocks fallback case the tenant isn't fully loaded yet
  const nomeLoja = tenant?.nome || "Loja Maçônica";
  const rito = tenant?.rito_padrao || "Rito Indefinido";
  const validade = tenant?.validade_assinatura ? new Date(tenant.validade_assinatura).toLocaleDateString('pt-BR') : 'Assinatura Vitalícia';

  const iniciarSequenciaPlayer = () => {
    setModalSessaoAberto(true);
  };

  return (
    <div className="h-full w-full flex flex-col bg-macaonico-surface overflow-hidden text-slate-100 relative p-1 pb-0">
      
      {/* Outer Golden Border to match the design */}
      <div className="absolute inset-1 border-[1.5px] border-macaonico-dourado/40 pointer-events-none z-50 rounded-sm">
         {/* Corner Decorations */}
         <div className="absolute top-0 left-0 w-4 h-4 border-t-[1.5px] border-l-[1.5px] border-macaonico-dourado -translate-x-[2px] -translate-y-[2px]"></div>
         <div className="absolute top-0 right-0 w-4 h-4 border-t-[1.5px] border-r-[1.5px] border-macaonico-dourado translate-x-[2px] -translate-y-[2px]"></div>
         <div className="absolute bottom-0 left-0 w-4 h-4 border-b-[1.5px] border-l-[1.5px] border-macaonico-dourado -translate-x-[2px] translate-y-[2px]"></div>
         <div className="absolute bottom-0 right-0 w-4 h-4 border-b-[1.5px] border-r-[1.5px] border-macaonico-dourado translate-x-[2px] translate-y-[2px]"></div>
      </div>

      {/* Global Background Texture */}
      <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/black-scales.png')] opacity-20 pointer-events-none z-0"></div>

      {/* Main Content Area */}
      <div className="relative z-10 min-h-full flex flex-col p-6 space-y-6 pb-20 md:pb-6 overflow-y-auto">
        <h1 className="text-3xl font-bold text-macaonico-dourado font-cinzel mb-4 tracking-wider uppercase text-center mt-4 shadow-black drop-shadow-md">
          Dashboard Operacional
        </h1>

        {/* SEÇÃO 1: Informações do Assinante */}
        <section className="bg-black/60 backdrop-blur-md border border-macaonico-dourado/30 rounded-xl p-6 shadow-2xl">
          <h2 className="text-xl font-bold text-macaonico-dourado mb-4 border-b border-macaonico-dourado/20 pb-2 font-cinzel">Informações da Loja</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-400">Nome da Loja</p>
              <p className="text-lg font-medium text-white">{nomeLoja}</p>
            </div>
            <div>
              <p className="text-sm text-gray-400">Rito Praticado</p>
              <p className="text-lg font-medium text-white">{rito}</p>
            </div>
            <div>
              <p className="text-sm text-gray-400">Validade da Assinatura</p>
              <p className="text-lg font-medium text-green-400">{validade}</p>
            </div>
          </div>
          
          <div className="flex flex-wrap gap-4 mt-6">
            <button className="flex items-center gap-2 bg-gray-900/80 hover:bg-gray-800 text-white px-4 py-2 rounded-lg border border-gray-700 transition-colors z-20">
              <Settings className="w-5 h-5" />
              Editar Configurações
            </button>
            <button className="flex items-center gap-2 bg-macaonico-dourado/10 hover:bg-macaonico-dourado/20 text-macaonico-dourado border border-macaonico-dourado/50 px-4 py-2 rounded-lg transition-colors z-20">
              <RefreshCw className="w-5 h-5" />
              Renovar Assinatura
            </button>
          </div>
        </section>

        {/* SEÇÃO 2: Cadastros */}
        <section className="bg-black/60 backdrop-blur-md border border-macaonico-dourado/30 rounded-xl p-6 shadow-2xl">
          <h2 className="text-xl font-bold text-macaonico-dourado mb-4 border-b border-macaonico-dourado/20 pb-2 font-cinzel">Cadastros Operacionais</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <button 
              onClick={() => navigate('/musicas')}
              className="flex flex-col items-center justify-center gap-3 bg-gray-900/50 hover:bg-black/80 border border-gray-800 rounded-xl p-6 transition-all hover:border-macaonico-dourado hover:shadow-[0_0_15px_rgba(212,175,55,0.3)] group z-20"
            >
              <Music className="w-10 h-10 text-macaonico-dourado group-hover:scale-110 transition-transform" />
              <span className="font-semibold text-white tracking-wide">Acervo de Músicas</span>
            </button>
            
            <button 
              onClick={() => navigate('/sessoes')}
              className="flex flex-col items-center justify-center gap-3 bg-gray-900/50 hover:bg-black/80 border border-gray-800 rounded-xl p-6 transition-all hover:border-macaonico-dourado hover:shadow-[0_0_15px_rgba(212,175,55,0.3)] group z-20"
            >
              <ListOrdered className="w-10 h-10 text-macaonico-dourado group-hover:scale-110 transition-transform" />
              <span className="font-semibold text-white tracking-wide">Sessões / Roteiros</span>
            </button>

            <button 
              onClick={() => navigate('/eventos')}
              className="flex flex-col items-center justify-center gap-3 bg-gray-900/50 hover:bg-black/80 border border-gray-800 rounded-xl p-6 transition-all hover:border-macaonico-dourado hover:shadow-[0_0_15px_rgba(212,175,55,0.3)] group z-20"
            >
              <CalendarHeart className="w-10 h-10 text-macaonico-dourado group-hover:scale-110 transition-transform" />
              <span className="font-semibold text-white tracking-wide">Eventos Ritualísticos</span>
            </button>
          </div>
        </section>

        {/* SEÇÃO 3: Acesso ao Player */}
        <section className="mt-8 flex justify-center pb-8">
          <button 
            onClick={iniciarSequenciaPlayer}
            className="flex items-center gap-4 bg-gradient-to-r from-yellow-600 via-macaonico-dourado to-yellow-600 hover:from-yellow-500 hover:via-yellow-400 hover:to-yellow-500 text-black px-10 py-5 rounded-full text-xl font-bold shadow-[0_0_20px_rgba(212,175,55,0.5)] hover:shadow-[0_0_30px_rgba(212,175,55,0.8)] hover:scale-105 transition-all font-cinzel tracking-wider z-20"
          >
            <PlayCircle className="w-8 h-8" />
            Acessar Player Harmonia
          </button>
        </section>
      </div>
      
      {modalSessaoAberto && (
        <ModalSelecaoSessao onFechar={() => setModalSessaoAberto(false)} />
      )}
    </div>
  );
};
