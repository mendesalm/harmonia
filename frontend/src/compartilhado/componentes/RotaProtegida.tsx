import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contextos/ContextoAutenticacao';

export const RotaProtegida: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { autenticado, carregando } = useAuth();
  const location = useLocation();

  if (carregando) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-primaria-900 text-macaonico-cianoSigma">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-macaonico-cianoSigma border-t-transparent rounded-full animate-spin" />
          <p className="text-xs text-slate-400 font-sans tracking-wide">Validando credenciais do Sigma...</p>
        </div>
      </div>
    );
  }

  if (!autenticado) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <>{children}</>;
};
