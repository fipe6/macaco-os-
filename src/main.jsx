import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import { AppProvider } from './store.jsx';
import './styles.css';
import { registerSW } from 'virtual:pwa-register';

// Cuando el service worker detecta una nueva versión, recarga automáticamente
registerSW({
  onRegisteredSW(swUrl, r) {
    // Revisamos por actualizaciones cada hora
    if (r) setInterval(() => r.update(), 60 * 60 * 1000);
  },
  onNeedRefresh() {
    // Nueva versión disponible → recargar sin preguntar
    window.location.reload();
  },
  immediate: true,
});

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <AppProvider>
      <App />
    </AppProvider>
  </React.StrictMode>
);
