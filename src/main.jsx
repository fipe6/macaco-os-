import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import { AppProvider } from './store.jsx';
import { AuthProvider, useAuth } from './AuthProvider.jsx';
import { IOSDevice } from './components/IOSDevice.jsx';
import LoginScreen from './screens/LoginScreen.jsx';
import './styles.css';
import { DEMO } from './demo.js';

// En la demo (página de revisión) el visor no muestra confirm()/alert():
// se confirma solo y los avisos salen como un aviso flotante.
if (DEMO) {
  window.confirm = () => true;
  window.alert = (msg) => {
    const d = document.createElement('div');
    d.textContent = String(msg);
    d.style.cssText = 'position:fixed;left:16px;right:16px;bottom:110px;z-index:9999;padding:12px 14px;border-radius:12px;background:#FF4D4D;color:#fff;font:600 13px Inter,system-ui,sans-serif;text-align:center';
    document.body.appendChild(d);
    setTimeout(() => d.remove(), 3500);
  };
}

function Gate() {
  const { session } = useAuth();

  // undefined = todavía verificando la sesión guardada
  if (session === undefined) return null;

  if (!session) {
    const isMobile = typeof window !== 'undefined' && window.matchMedia('(max-width: 480px)').matches;
    return (
      <div style={{
        minHeight: '100vh', display: 'flex', justifyContent: 'center',
        alignItems: 'flex-start', padding: isMobile ? 0 : '40px 16px 80px',
      }}>
        <IOSDevice width={390} height={844} dark>
          <LoginScreen />
        </IOSDevice>
      </div>
    );
  }

  return (
    <AppProvider>
      <App />
    </AppProvider>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <AuthProvider>
      <Gate />
    </AuthProvider>
  </React.StrictMode>
);
