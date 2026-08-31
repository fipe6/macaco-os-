import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import { AppProvider } from './store.jsx';
import { AuthProvider, useAuth } from './AuthProvider.jsx';
import { IOSDevice } from './components/IOSDevice.jsx';
import LoginScreen from './screens/LoginScreen.jsx';
import './styles.css';

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
