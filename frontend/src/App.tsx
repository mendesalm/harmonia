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
import PaginaAssinatura from './modulos/assinatura/PaginaAssinatura';

import { PaginaDashboardAdmin } from './modulos/admin/PaginaDashboardAdmin';
import { PaginaLojasAdmin } from './modulos/admin/PaginaLojasAdmin';
import { PaginaRitosAdmin } from './modulos/admin/PaginaRitosAdmin';
import { PaginaEventosAdmin } from './modulos/admin/PaginaEventosAdmin';
import { useAuth } from './compartilhado/contextos/ContextoAutenticacao';

const RotaRaiz = () => {
  const { usuario } = useAuth();
  if (usuario?.tipo === 'ADMIN') {
    return <Navigate to="/admin" replace />;
  }
  return <PaginaDashboard />;
};

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

                {/* Área do Admin (Global) */}
                <Route
                  path="/admin"
                  element={
                    <RotaProtegida>
                      <PaginaDashboardAdmin />
                    </RotaProtegida>
                  }
                />
                <Route
                  path="/admin/lojas"
                  element={
                    <RotaProtegida>
                      <PaginaLojasAdmin />
                    </RotaProtegida>
                  }
                />
                <Route
                  path="/admin/templates"
                  element={
                    <RotaProtegida>
                      <PaginaRitosAdmin />
                    </RotaProtegida>
                  }
                />
                <Route
                  path="/admin/eventos"
                  element={
                    <RotaProtegida>
                      <PaginaEventosAdmin />
                    </RotaProtegida>
                  }
                />
                <Route
                  path="/admin/musicas"
                  element={
                    <RotaProtegida>
                      <div className="h-full overflow-y-auto pb-16">
                        <PaginaMusicas />
                      </div>
                    </RotaProtegida>
                  }
                />

                {/* Área do Mestre de Harmonia (Tenant) */}
                <Route
                  path="/"
                  element={
                    <RotaProtegida>
                      <RotaRaiz />
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
                <Route
                  path="/assinatura"
                  element={
                    <RotaProtegida>
                      <div className="h-full overflow-y-auto pb-16">
                        <PaginaAssinatura />
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
