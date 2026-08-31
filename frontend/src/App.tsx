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
          <div className="h-screen max-h-screen w-screen overflow-hidden flex flex-col bg-[#040811] text-slate-100 selection:bg-cyan-500 selection:text-black">
            <Navbar />
            <main className="flex-1 min-h-0 overflow-hidden">
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
          </div>
        </Router>
      </ProvedorTenant>
    </ProvedorAutenticacao>
  );
};

export default App;
