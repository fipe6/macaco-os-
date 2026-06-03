import { useState, useEffect } from 'react';
import { MACACO } from './theme.js';
import { IOSDevice } from './components/IOSDevice.jsx';
import { BottomNav } from './components/BottomNav.jsx';
import { Icon } from './components/ui.jsx';
import HomeScreen from './screens/HomeScreen.jsx';
import VentaScreen from './screens/VentaScreen.jsx';
import FinanzasScreen from './screens/FinanzasScreen.jsx';
import InventarioScreen from './screens/InventarioScreen.jsx';
import ReportesScreen from './screens/ReportesScreen.jsx';
import ConfigScreen from './screens/ConfigScreen.jsx';
import GastoScreen from './screens/GastoScreen.jsx';
import { flushQueue } from './services/webhook.js';

export default function App() {
  const [screen, setScreen] = useState('home');
  const go = (s) => setScreen(s);

  // intentar enviar eventos en cola al volver online
  useEffect(() => {
    const onOnline = () => flushQueue();
    window.addEventListener('online', onOnline);
    if (navigator.onLine) flushQueue();
    return () => window.removeEventListener('online', onOnline);
  }, []);

  const screens = {
    home: <HomeScreen go={go} />,
    venta: <VentaScreen go={go} />,
    gasto: <GastoScreen go={go} />,
    finanzas: <FinanzasScreen go={go} />,
    inventario: <InventarioScreen go={go} />,
    reportes: <ReportesScreen go={go} />,
    config: <ConfigScreen go={go} />,
  };

  const isMobile = typeof window !== 'undefined' && window.matchMedia('(max-width: 480px)').matches;

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', justifyContent: 'center',
      alignItems: 'flex-start', padding: isMobile ? 0 : '40px 16px 80px',
    }}>
      <IOSDevice width={390} height={844} dark>
        <div style={{
          position: 'absolute', inset: 0, background: MACACO.bg, overflow: 'hidden',
        }}>
          <div
            key={screen}
            style={{
              position: 'absolute',
              top: isMobile ? 0 : 54, left: 0, right: 0, bottom: 0,
              overflowY: 'auto',
              animation: 'screenIn 320ms cubic-bezier(.2,.7,.2,1)',
            }}
          >
            {screens[screen]}
          </div>

          {screen === 'home' && (
            <div style={{
              position: 'absolute', right: 18, bottom: 102, zIndex: 30,
              display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 10,
              animation: 'fabIn 400ms cubic-bezier(.2,.7,.2,1) both',
            }}>
              <button
                onClick={() => go('gasto')}
                style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  padding: '11px 16px', borderRadius: 999,
                  background: MACACO.cardElev, color: MACACO.orange,
                  border: `1px solid rgba(255,159,64,0.35)`, cursor: 'pointer',
                  fontFamily: 'inherit', fontSize: 12, fontWeight: 700,
                  letterSpacing: '0.04em',
                  boxShadow: `0 4px 16px rgba(0,0,0,0.4), 0 0 20px rgba(255,159,64,0.15)`,
                }}
              >
                <span style={{
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                  width: 20, height: 20, borderRadius: 999,
                  background: 'rgba(255,159,64,0.18)', color: MACACO.orange,
                }}>
                  <Icon.minus size={12} />
                </span>
                REGISTRAR GASTO
              </button>
              <button
                onClick={() => go('venta')}
                style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  padding: '14px 18px', borderRadius: 999,
                  background: MACACO.primary, color: '#0A0A0F',
                  border: 'none', cursor: 'pointer',
                  fontFamily: 'inherit', fontSize: 13, fontWeight: 800,
                  letterSpacing: '0.04em',
                  boxShadow: `0 8px 24px rgba(245,197,24,0.4), 0 0 30px rgba(245,197,24,0.3)`,
                }}
              >
                <span style={{
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                  width: 22, height: 22, borderRadius: 999, background: '#0A0A0F',
                  color: MACACO.primary,
                }}>
                  <Icon.plus size={14} />
                </span>
                REGISTRAR VENTA
              </button>
            </div>
          )}

          <BottomNav active={screen} go={go} />
        </div>
      </IOSDevice>
    </div>
  );
}
