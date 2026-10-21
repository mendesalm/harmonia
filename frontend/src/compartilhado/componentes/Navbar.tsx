import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { PlayCircle, Library, LayoutTemplate, LogOut, Shield, ListOrdered, Download, Home } from 'lucide-react';
import { useAuth } from '../contextos/ContextoAutenticacao';
import { usePwaInstall } from '../hooks/usePwaInstall';

/**
 * Barra de navegação inferior (Bottom Navigation) responsiva e otimizada para dispositivos móveis (PWA/Capacitor)
 * e telas desktop. Garante áreas de toque >= 48px e adaptação fluida em telas de 320px+.
 */
export const Navbar: React.FC = () => {
  const { usuario, logout } = useAuth();
  const { podeInstalar, dispararInstalacao } = usePwaInstall();
  const location = useLocation();
  
  if (!usuario) return null;
  
  const ehSuperAdmin =
    usuario?.tipo === 'ADMIN' ||
    usuario?.permissoes?.includes('super_admin') ||
    (usuario as any)?.role === 'super_admin';

  const possuiLojaVinculada = Boolean(usuario?.organizacao_id);
  const emModoAdmin = location.pathname.startsWith('/admin');

  const linksMestre = [
    { to: '/', label: 'Início', icon: Home },
    { to: '/player', label: 'Player', icon: PlayCircle },
    { to: '/sessoes', label: 'Sessões', icon: ListOrdered },
    { to: '/eventos', label: 'Momentos', icon: LayoutTemplate },
    { to: '/musicas', label: 'Acervo', icon: Library },
  ];

  if (ehSuperAdmin) {
    linksMestre.push({ to: '/admin', label: 'Admin', icon: Shield });
  }

  const linksAdmin = [
    { to: '/admin', label: 'Painel', icon: Shield },
    { to: '/admin/lojas', label: 'Lojas', icon: LayoutTemplate },
    { to: '/admin/templates', label: 'Ritos', icon: Library },
    { to: '/admin/eventos', label: 'Eventos', icon: ListOrdered },
  ];

  if (possuiLojaVinculada) {
    linksAdmin.push({ to: '/', label: 'Loja', icon: PlayCircle });
  }

  const links = (emModoAdmin || (ehSuperAdmin && !possuiLojaVinculada)) ? linksAdmin : linksMestre;

  return (
    <nav className="relative z-40 w-full min-h-[3.75rem] sm:min-h-[4.25rem] pb-safe bg-[#070e1c]/95 backdrop-blur-md border-t border-[rgba(221,185,107,0.2)] flex items-stretch justify-around px-1 sm:px-4 shadow-[0_-10px_20px_rgba(0,0,0,0.8)] shrink-0">
      
      {links.map((link) => {
        const Icon = link.icon;
        return (
          <NavLink
            key={link.to}
            to={link.to}
            end={link.to === '/' || link.to === '/admin'}
            className={({ isActive }) =>
              `flex flex-col items-center justify-center flex-1 min-w-0 max-w-[6rem] py-1.5 px-1 transition-all relative select-none ${
                isActive ? 'text-macaonico-dourado' : 'text-macaonico-inactive hover:text-slate-300 active:text-slate-200'
              }`
            }
          >
            {({ isActive }) => (
              <>
                {/* Indicador superior luminoso da aba ativa */}
                {isActive && (
                  <div className="absolute top-0 left-1/2 -translate-x-1/2 w-7 sm:w-9 h-[2px] bg-macaonico-dourado shadow-[0_0_8px_rgba(212,175,55,1)]"></div>
                )}
                
                <Icon size={isActive ? 22 : 20} strokeWidth={isActive ? 1.75 : 1.25} className="mb-0.5 sm:mb-1 shrink-0" />
                <span className={`text-[9px] sm:text-[10px] font-cinzel uppercase tracking-wide truncate w-full text-center ${isActive ? 'font-bold' : ''}`}>
                  {link.label}
                </span>
                
                {isActive && (
                   <div className="absolute bottom-1 w-6 h-6 bg-macaonico-dourado/20 blur-md rounded-full -z-10"></div>
                )}
              </>
            )}
          </NavLink>
        );
      })}

      {podeInstalar && (
        <button 
          onClick={dispararInstalacao}
          className="flex flex-col items-center justify-center flex-1 min-w-0 max-w-[5.5rem] py-1.5 px-1 text-macaonico-dourado hover:text-yellow-300 transition-all animate-pulse select-none"
          title="Instalar Aplicativo Harmonia"
        >
          <Download size={20} strokeWidth={1.5} className="mb-0.5 sm:mb-1 shrink-0" />
          <span className="text-[9px] sm:text-[10px] font-cinzel uppercase tracking-wide font-bold truncate w-full text-center">
            Instalar
          </span>
        </button>
      )}

      {/* Botão de encerramento de sessão */}
      <button 
        onClick={logout}
        className="flex flex-col items-center justify-center flex-1 min-w-0 max-w-[5rem] py-1.5 px-1 text-macaonico-inactive hover:text-red-400 active:text-red-300 transition-all select-none"
        title="Sair da Estação Harmonia"
      >
        <LogOut size={20} strokeWidth={1.25} className="mb-0.5 sm:mb-1 shrink-0" />
        <span className="text-[9px] sm:text-[10px] font-cinzel uppercase tracking-wide truncate w-full text-center">
          Sair
        </span>
      </button>

    </nav>
  );
};
