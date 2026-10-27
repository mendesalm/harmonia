import React, { useState, useEffect } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  PlayCircle,
  Library,
  LayoutTemplate,
  LogOut,
  Shield,
  ListOrdered,
  Download,
  Home,
  Menu,
  X,
  Music,
} from 'lucide-react';
import { useAuth } from '../contextos/ContextoAutenticacao';
import { usePwaInstall } from '../hooks/usePwaInstall';
import { feedbackTatil } from '../utilitarios/dispositivoNativo';

/**
 * Barra de navegação do Harmonia:
 * - Em telas normais: bottom bar consistente.
 * - Na tela do Player (`/player`) e em dispositivos móveis: compactada em modo "Menu Sanduíche" flutuante retrátil,
 *   liberando 100% da área útil da tela para a condução musical e abrindo em gaveta lateral/overlay quando acionado.
 */
export const Navbar: React.FC = () => {
  const { usuario, logout } = useAuth();
  const { podeInstalar, dispararInstalacao } = usePwaInstall();
  const location = useLocation();
  const [menuSanduicheAberto, setMenuSanduicheAberto] = useState(false);

  useEffect(() => {
    const escutarAbertura = () => setMenuSanduicheAberto(true);
    window.addEventListener('harmonia:abrir-menu', escutarAbertura);
    return () => window.removeEventListener('harmonia:abrir-menu', escutarAbertura);
  }, []);

  if (!usuario) return null;

  const noPlayer = location.pathname.startsWith('/player');

  const ehSuperAdmin =
    usuario?.tipo === 'ADMIN' ||
    usuario?.permissoes?.includes('super_admin') ||
    (usuario as any)?.role === 'super_admin';

  const possuiLojaVinculada = Boolean(usuario?.organizacao_id);
  const emModoAdmin = location.pathname.startsWith('/admin');

  const linksMestre = [
    { to: '/', label: 'Início', icon: Home },
    { to: '/preparar-sessao', label: noPlayer ? 'Trocar Sessão' : 'Player', icon: PlayCircle },
    { to: '/sessoes', label: 'Sessões', icon: ListOrdered },
    { to: '/eventos', label: 'Momentos', icon: LayoutTemplate },
    { to: '/musicas', label: 'Acervo', icon: Library },
  ];

  if (ehSuperAdmin) {
    linksMestre.push({ to: '/admin', label: 'Admin', icon: Shield });
  }

  const linksAdmin = [
    { to: '/admin', label: 'Painel', icon: Shield },
    { to: '/admin/musicas', label: 'Curadoria', icon: Music },
    { to: '/admin/lojas', label: 'Lojas', icon: LayoutTemplate },
    { to: '/admin/templates', label: 'Ritos', icon: Library },
    { to: '/admin/eventos', label: 'Eventos', icon: ListOrdered },
  ];

  if (possuiLojaVinculada) {
    linksAdmin.push({ to: '/', label: 'Loja', icon: PlayCircle });
  }

  const links = emModoAdmin || (ehSuperAdmin && !possuiLojaVinculada) ? linksAdmin : linksMestre;

  // Quando na página do player, a abertura é acionada pelo menu sanduíche oficial no cabeçalho
  if (noPlayer) {
    return (
      <>
        {/* Gaveta / Drawer do Menu Sanduíche */}
        {menuSanduicheAberto && (
          <div
            style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 10000 }}
            className="flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/75 backdrop-blur-md animate-in fade-in duration-200"
            onClick={() => setMenuSanduicheAberto(false)}
          >
            <div
              className="bg-[#070e1c] border-t sm:border border-macaonico-dourado/40 rounded-t-3xl sm:rounded-2xl w-full max-w-sm p-4 sm:p-5 shadow-[0_25px_60px_rgba(0,0,0,0.95)] animate-in slide-in-from-bottom sm:zoom-in-95 duration-200"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between pb-3 mb-3 border-b border-white/10">
                <span className="text-xs font-cinzel font-bold text-macaonico-dourado uppercase tracking-widest">
                  Menu Harmonia
                </span>
                <button
                  type="button"
                  onClick={() => setMenuSanduicheAberto(false)}
                  className="p-1 rounded-lg text-slate-400 hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="grid grid-cols-2 gap-2">
                {links.map((link) => {
                  const Icon = link.icon;
                  return (
                    <NavLink
                      key={link.to}
                      to={link.to}
                      end={link.to === '/' || link.to === '/admin'}
                      onClick={() => setMenuSanduicheAberto(false)}
                      className={({ isActive }) =>
                        `flex items-center gap-2.5 p-3 rounded-xl border text-xs font-semibold transition-all ${
                          isActive
                            ? 'bg-macaonico-dourado/20 border-macaonico-dourado text-macaonico-dourado font-bold'
                            : 'bg-white/5 border-white/10 text-slate-300 hover:bg-white/10 hover:text-white'
                        }`
                      }
                    >
                      <Icon className="w-4 h-4 shrink-0" />
                      <span className="font-cinzel truncate">{link.label}</span>
                    </NavLink>
                  );
                })}
              </div>

              {podeInstalar && (
                <button
                  type="button"
                  onClick={() => {
                    setMenuSanduicheAberto(false);
                    dispararInstalacao();
                  }}
                  className="w-full mt-3 flex items-center justify-center gap-2 p-2.5 rounded-xl bg-macaonico-dourado/15 border border-macaonico-dourado/40 text-macaonico-dourado text-xs font-bold font-cinzel"
                >
                  <Download className="w-4 h-4" />
                  <span>Instalar App</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => {
                  setMenuSanduicheAberto(false);
                  logout();
                }}
                className="w-full mt-2 flex items-center justify-center gap-2 p-2.5 rounded-xl bg-red-950/30 border border-red-500/30 text-red-300 hover:bg-red-900/40 text-xs font-semibold"
              >
                <LogOut className="w-4 h-4" />
                <span>Sair da Sessão</span>
              </button>
            </div>
          </div>
        )}
      </>
    );
  }

  // Nas demais páginas do sistema, mantém a navegação padrão inferior
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
                isActive
                  ? 'text-macaonico-dourado'
                  : 'text-macaonico-inactive hover:text-slate-300 active:text-slate-200'
              }`
            }
          >
            {({ isActive }) => (
              <>
                {isActive && (
                  <div className="absolute top-0 left-1/2 -translate-x-1/2 w-7 sm:w-9 h-[2px] bg-macaonico-dourado shadow-[0_0_8px_rgba(212,175,55,1)]"></div>
                )}
                <Icon
                  size={isActive ? 22 : 20}
                  strokeWidth={isActive ? 1.75 : 1.25}
                  className="mb-0.5 sm:mb-1 shrink-0"
                />
                <span
                  className={`text-[9px] sm:text-[10px] font-cinzel uppercase tracking-wide truncate w-full text-center ${
                    isActive ? 'font-bold' : ''
                  }`}
                >
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
