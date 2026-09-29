import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

import { inicializarDispositivoNativo, configurarBotaoVoltarNativo } from './compartilhado/utilitarios/dispositivoNativo';

// Inicialização de hardware móvel (StatusBar, Splash, Keyboard, Back Button)
inicializarDispositivoNativo();
configurarBotaoVoltarNativo();

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
