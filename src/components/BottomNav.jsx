import { MACACO } from '../theme.js';
import { Icon } from './ui.jsx';

export function BottomNav({ active, go }) {
  const items = [
    { id: 'home',       label: 'Home',       icon: Icon.home },
    { id: 'venta',      label: 'Venta',      icon: Icon.plus, big: true },
    { id: 'finanzas',   label: 'Finanzas',   icon: Icon.wallet },
    { id: 'inventario', label: 'Stock',      icon: Icon.box },
    { id: 'reportes',   label: 'Reportes',   icon: Icon.chart },
    { id: 'config',     label: 'Sistema',    icon: Icon.settings },
  ];

  return (
    <div style={{
      position: 'absolute', left: 0, right: 0, bottom: 0, zIndex: 25,
      paddingBottom: 22,
      background: 'linear-gradient(180deg, rgba(10,10,15,0) 0%, rgba(10,10,15,0.92) 40%, #0A0A0F 100%)',
      pointerEvents: 'none',
    }}>
      <div style={{
        margin: '0 10px', pointerEvents: 'auto',
        background: 'rgba(18,18,26,0.94)',
        backdropFilter: 'blur(20px) saturate(160%)',
        WebkitBackdropFilter: 'blur(20px) saturate(160%)',
        border: `1px solid ${MACACO.border}`,
        borderRadius: 22,
        padding: '8px 4px',
        display: 'flex', justifyContent: 'space-around', alignItems: 'center',
        boxShadow: '0 10px 30px rgba(0,0,0,0.5), 0 0 0 0.5px rgba(255,255,255,0.04)',
      }}>
        {items.map(item => {
          const isActive = active === item.id;
          return (
            <button
              key={item.id}
              onClick={() => go(item.id)}
              style={{
                flex: 1, background: 'transparent', border: 'none',
                padding: '6px 2px', cursor: 'pointer',
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3,
                color: isActive ? MACACO.primary : 'rgba(255,255,255,0.5)',
                fontFamily: 'inherit', position: 'relative',
                transition: '160ms',
              }}
            >
              {isActive && !item.big && (
                <span style={{
                  position: 'absolute', top: -1, left: '50%', transform: 'translateX(-50%)',
                  width: 20, height: 2, background: MACACO.primary, borderRadius: 999,
                  boxShadow: `0 0 8px ${MACACO.primary}`,
                }}/>
              )}
              <span style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                ...(item.big ? {
                  width: 36, height: 36, borderRadius: 12,
                  background: isActive ? MACACO.primary : 'rgba(245,197,24,0.12)',
                  color: isActive ? '#0A0A0F' : MACACO.primary,
                  boxShadow: isActive ? `0 0 18px ${MACACO.primary}66` : 'none',
                  marginTop: -2,
                } : {}),
              }}>
                <item.icon size={item.big ? 22 : 20} />
              </span>
              <span style={{
                fontSize: 9, fontWeight: isActive ? 700 : 500,
                letterSpacing: '0.03em',
              }}>{item.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
