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
import { PaginaDashboard } from './modulos/dashboard/PaginaDashboard';

export const App: React.FC = () => {
  return (
    <ProvedorAutenticacao>
      <ProvedorTenant>
        <Router>
          <div className="h-screen max-h-screen w-screen overflow-hidden flex flex-col bg-[#080808] text-slate-100 selection:bg-macaonico-dourado selection:text-black font-inter">
            <main className="flex-1 min-h-0 overflow-hidden relative">
              <Routes>
                {/* Rota Pública de Login */}
                <Route path="/login" element={<PaginaLogin />} />

                {/* Rotas Protegidas por Autenticação JWT */}
                <Route
                  path="/"
                  element={
                    <RotaProtegida>
                      <PaginaDashboard />
                    </RotaProtegida>
                  }
                />
                <Route
                  path="/player"
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
                      <div className="h-full overflow-y-auto pb-16">
                        <PaginaSessoes />
                      </div>
                    </RotaProtegida>
                  }
                />
                <Route
                  path="/eventos"
                  element={
                    <RotaProtegida>
                      <div className="h-full overflow-y-auto pb-16">
                        <PaginaEventos />
                      </div>
                    </RotaProtegida>
                  }
                />
                <Route
                  path="/musicas"
                  element={
                    <RotaProtegida>
                      <div className="h-full overflow-y-auto pb-16">
                        <PaginaMusicas />
                      </div>
                    </RotaProtegida>
                  }
                />

                {/* Fallback */}
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </main>
            <Navbar />
          </div>
        </Router>
      </ProvedorTenant>
    </ProvedorAutenticacao>
  );
};

export default App;
