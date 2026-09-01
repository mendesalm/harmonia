import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { PlayCircle, Library, LayoutTemplate, KeyRound, LogOut, Settings } from 'lucide-react';
import { useAuth } from '../contextos/ContextoAutenticacao';

export const Navbar: React.FC = () => {
  const { logout } = useAuth();
  // If we wanted to keep the store selector, we could add a settings modal. For now, we will add a simple settings button that triggers logout for simplicity, or just keep the basic tabs.

  const links = [
    { to: '/', label: 'Player', icon: PlayCircle },
    { to: '/eventos', label: 'Momentos', icon: LayoutTemplate },
    { to: '/musicas', label: 'Acervo', icon: Library },
  ];

  return (
    <nav className="relative z-50 w-full h-16 bg-[#060606] border-t border-macaonico-inactive/30 flex items-center justify-around px-2 shadow-[0_-10px_20px_rgba(0,0,0,0.5)] shrink-0">
      
      {links.map((link) => {
        const Icon = link.icon;
        return (
          <NavLink
            key={link.to}
            to={link.to}
            className={({ isActive }) =>
              `flex flex-col items-center justify-center w-20 h-full transition-all relative ${
                isActive ? 'text-macaonico-dourado' : 'text-macaonico-inactive hover:text-slate-400'
              }`
            }
          >
            {({ isActive }) => (
              <>
                {/* Active Glow Indicator */}
                {isActive && (
                  <div className="absolute -top-px left-1/2 -translate-x-1/2 w-8 h-[2px] bg-macaonico-dourado shadow-[0_0_8px_rgba(212,175,55,1)]"></div>
                )}
                
                <Icon size={isActive ? 24 : 22} strokeWidth={isActive ? 1.5 : 1} className="mb-1" />
                <span className={`text-[9px] font-cinzel uppercase tracking-wider ${isActive ? 'font-bold' : ''}`}>
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

      {/* Settings / Profile Toggle */}
      <button 
        onClick={logout}
        className="flex flex-col items-center justify-center w-20 h-full text-macaonico-inactive hover:text-slate-400 transition-all"
      >
        <LogOut size={22} strokeWidth={1} className="mb-1" />
        <span className="text-[9px] font-cinzel uppercase tracking-wider">
          Sair
        </span>
      </button>

    </nav>
  );
};
