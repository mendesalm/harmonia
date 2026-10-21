import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { GoogleOAuthProvider } from '@react-oauth/google';
import './index.css';
import { inicializarDispositivoNativo, configurarBotaoVoltarNativo } from './compartilhado/utilitarios/dispositivoNativo';

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';
const googleOAuthHabilitado =
  Boolean(GOOGLE_CLIENT_ID) && GOOGLE_CLIENT_ID !== 'COLOQUE_SEU_CLIENT_ID_AQUI';

// Inicialização de hardware móvel (StatusBar, Splash, Keyboard, Back Button)
inicializarDispositivoNativo();
configurarBotaoVoltarNativo();

// Força atualização imediata e recarregamento único quando um novo Service Worker assume o controle
if ('serviceWorker' in navigator) {
  let recarregandoPorAtualizacao = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (!recarregandoPorAtualizacao) {
      recarregandoPorAtualizacao = true;
      window.location.reload();
    }
  });

  navigator.serviceWorker.getRegistrations().then((registrations) => {
    for (const reg of registrations) {
      reg.update().then(() => {
        if (reg.waiting) {
          reg.waiting.postMessage({ type: 'SKIP_WAITING' });
        }
      });
    }
  });
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    {googleOAuthHabilitado ? (
      <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
        <App />
      </GoogleOAuthProvider>
    ) : (
      <App />
    )}
  </React.StrictMode>,
);
