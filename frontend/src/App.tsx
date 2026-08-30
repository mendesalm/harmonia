import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ProvedorAutenticacao } from './compartilhado/contextos/ContextoAutenticacao';
import { ProvedorTenant } from './compartilhado/contextos/ContextoTenant';
import { RotaProtegida } from './compartilhado/componentes/RotaProtegida';
import { Navbar } from './compartilhado/componentes/Navbar';
import { PaginaLogin } from './modulos/auth/PaginaLogin';
import { PaginaPlayerHarmonia } from './modulos/player/PaginaPlayerHarmonia';
import { PaginaSessoes } from './modulos/sessoes/PaginaSessoes';
import { PaginaEventos } from './modulos/eventos/PaginaEventos';
import { PaginaMusicas } from './modulos/musicas/PaginaMusicas';

export const App: React.FC = () => {
  return (
    <ProvedorAutenticacao>
      <ProvedorTenant>
        <Router>
          <div className="min-h-screen flex flex-col bg-primaria-900 text-slate-100 selection:bg-macaonico-cianoSigma selection:text-black">
            <Navbar />
            <main className="flex-1 pb-16">
              <Routes>
                {/* Rota Pública de Login */}
                <Route path="/login" element={<PaginaLogin />} />

                {/* Rotas Protegidas por Autenticação JWT */}
                <Route
                  path="/"
                  element={
                    <RotaProtegida>
                      <PaginaPlayerHarmonia />
                    </RotaProtegida>
                  }
                />
                <Route
                  path="/sessoes"
                  element={
                    <RotaProtegida>
                      <PaginaSessoes />
                    </RotaProtegida>
                  }
                />
                <Route
                  path="/eventos"
                  element={
                    <RotaProtegida>
                      <PaginaEventos />
                    </RotaProtegida>
                  }
                />
                <Route
                  path="/musicas"
                  element={
                    <RotaProtegida>
                      <PaginaMusicas />
                    </RotaProtegida>
                  }
                />

                {/* Fallback */}
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </main>
            <footer className="border-t border-white/5 py-4 text-center text-xs text-slate-500 font-sans">
              Harmonia v2.0 • Gerenciador de Acervo e Player para Mestres de Harmonia • Desenvolvido em PT-BR
            </footer>
          </div>
        </Router>
      </ProvedorTenant>
    </ProvedorAutenticacao>
  );
};

export default App;
