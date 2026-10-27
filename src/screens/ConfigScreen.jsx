import { useState } from 'react';
import { MACACO, clp } from '../theme.js';
import { Card, SectionTitle, Dot, Icon } from '../components/ui.jsx';
import { Screen } from '../components/Screen.jsx';
import { useApp } from '../store.jsx';
import { useAuth } from '../AuthProvider.jsx';
import { DEMO, reiniciarDemo } from '../demo.js';

export default function ConfigScreen() {
  const { config, setConfig, caja, ajustarCaja, sync, reintentarSync } = useApp();
  const { session, signOut } = useAuth();
  const [editMeta, setEditMeta] = useState(false);
  const [reintentando, setReintentando] = useState(false);

  const reintentar = async () => {
    setReintentando(true);
    await reintentarSync();
    setReintentando(false);
  };

  const ultimoOk = sync.ultimoOk
    ? new Date(sync.ultimoOk).toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' })
    : '—';
  const syncColor = sync.pendientes === 0 ? MACACO.success : sync.error ? MACACO.danger : MACACO.primary;
  const syncTexto = sync.pendientes === 0
    ? 'Todo guardado en Supabase'
    : `${sync.pendientes} cambio${sync.pendientes > 1 ? 's' : ''} guardado${sync.pendientes > 1 ? 's' : ''} en el celular, por enviar`;

  return (
    <Screen>
      <div style={{ padding: '6px 0 14px' }}>
        <div style={{ fontSize: 11, color: MACACO.primary, fontWeight: 700, letterSpacing: '0.16em', textTransform: 'uppercase' }}>Sistema</div>
        <div style={{ fontSize: 26, fontWeight: 800, letterSpacing: '-0.02em', marginTop: 4 }}>Configuración</div>
      </div>

      {/* Metas */}
      <SectionTitle right={
        <button onClick={() => setEditMeta(true)} style={{
          background: 'transparent', border: `1px solid ${MACACO.border}`,
          color: MACACO.textMuted, fontSize: 10, fontWeight: 600,
          padding: '3px 8px', borderRadius: 6, cursor: 'pointer', fontFamily: 'inherit',
        }}>Editar</button>
      }>Metas configuradas</SectionTitle>
      <Card padding={0} style={{ marginBottom: 18 }}>
        {[
          { k: 'Meta mensual',        v: clp(config.metaMensual) },
          { k: 'Meta diaria',         v: clp(config.metaDiaria) },
          { k: 'Colchón mínimo caja', v: clp(config.colchonMinimo) },
          { k: 'Alerta stock bajo',   v: `${config.alertaStockBajo} unidades` },
        ].map((r, i, arr) => (
          <div key={r.k} style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            padding: '14px',
            borderBottom: i === arr.length - 1 ? 'none' : `1px solid ${MACACO.borderSoft}`,
          }}>
            <span style={{ fontSize: 13, color: MACACO.textDim }}>{r.k}</span>
            <span style={{ fontSize: 13, fontWeight: 600 }}>{r.v}</span>
          </div>
        ))}
      </Card>

      {/* Caja */}
      <SectionTitle>Caja actual</SectionTitle>
      <Card style={{ marginBottom: 18 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: 24, fontWeight: 800, color: MACACO.primary, fontVariantNumeric: 'tabular-nums' }}>{clp(caja)}</div>
            <div style={{ fontSize: 11.5, color: MACACO.textMuted, marginTop: 4 }}>Se actualiza con ventas y pagos</div>
          </div>
          <button onClick={() => {
            const val = prompt('Ingresa el valor real de caja:');
            const num = parseInt((val || '').replace(/\D/g,''), 10);
            if (!isNaN(num)) ajustarCaja(num);
          }} style={{
            background: 'transparent', border: `1px solid ${MACACO.border}`,
            color: MACACO.textMuted, fontSize: 11, fontWeight: 600,
            padding: '8px 12px', borderRadius: 8, cursor: 'pointer', fontFamily: 'inherit',
          }}>Ajustar</button>
        </div>
      </Card>

      {/* Conexiones */}
      {/* Guardado */}
      <SectionTitle>Guardado</SectionTitle>
      <Card style={{ marginBottom: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
          <Icon.monkey size={36} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 15, fontWeight: 700 }}>Macaco OS v2</div>
            <div style={{ fontSize: 11.5, color: syncColor, fontWeight: 600, marginTop: 2, display: 'flex', alignItems: 'center', gap: 5 }}>
              <Dot color={syncColor} size={6}/> {syncTexto}
            </div>
          </div>
        </div>
        <div style={{
          fontSize: 11.5, color: MACACO.textDim, lineHeight: 1.45,
          padding: '8px 0', borderTop: `1px solid ${MACACO.borderSoft}`,
        }}>
          Cada venta, gasto o ajuste se guarda primero en este celular y se envía a Supabase.
          Si no hay señal, se reintenta solo hasta que llegue.
        </div>
        <div style={{
          display: 'flex', justifyContent: 'space-between',
          padding: '8px 0 0', borderTop: `1px solid ${MACACO.borderSoft}`,
          fontSize: 11.5, color: MACACO.textDim,
        }}>
          <span>Último guardado confirmado</span>
          <span style={{ color: MACACO.text, fontWeight: 600 }}>{ultimoOk}</span>
        </div>
        {sync.error && sync.pendientes > 0 && (
          <div style={{ fontSize: 11, color: MACACO.danger, marginTop: 6 }}>Último error: {sync.error}</div>
        )}
      </Card>

      {sync.pendientes > 0 && (
        <button onClick={reintentar} disabled={reintentando} style={{
          width: '100%', padding: '14px', background: MACACO.primary,
          color: '#0A0A0F', border: 'none', borderRadius: 12,
          fontSize: 12.5, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6,
          opacity: reintentando ? 0.7 : 1,
        }}>
          <Icon.refresh size={14}/> {reintentando ? 'Enviando...' : 'Enviar ahora'}
        </button>
      )}

      {DEMO && (
        <button onClick={reiniciarDemo} style={{
          width: '100%', padding: '13px', marginTop: 10,
          background: 'transparent', border: `1px dashed ${MACACO.primary}`,
          color: MACACO.primary, borderRadius: 12,
          fontSize: 12.5, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
        }}>
          Reiniciar demo (volver a la copia original)
        </button>
      )}

      {session?.user?.email && (
        <div style={{ fontSize: 11, color: MACACO.textMuted, textAlign: 'center', marginTop: 14 }}>
          Sesión: {session.user.email}
        </div>
      )}
      <button onClick={() => { if (confirm('¿Cerrar sesión?')) signOut(); }} style={{
        width: '100%', padding: '13px', marginTop: 10,
        background: 'transparent', border: `1px solid ${MACACO.border}`,
        color: MACACO.danger, borderRadius: 12,
        fontSize: 12.5, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
      }}>
        Cerrar sesión
      </button>

      {editMeta && (
        <EditMetasSheet config={config} onClose={() => setEditMeta(false)} onSave={(cambios) => { setConfig(cambios); setEditMeta(false); }} />
      )}
    </Screen>
  );
}

function EditMetasSheet({ config, onClose, onSave }) {
  const [metaMensual,     setMetaMensual]     = useState(config.metaMensual);
  const [metaDiaria,      setMetaDiaria]      = useState(config.metaDiaria);
  const [colchonMinimo,   setColchonMinimo]   = useState(config.colchonMinimo);
  const [alertaStockBajo, setAlertaStockBajo] = useState(config.alertaStockBajo);

  const numInput = (label, val, setVal) => (
    <div style={{ marginBottom: 14 }}>
      <label style={{ fontSize: 11, color: MACACO.textDim, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>{label}</label>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 4,
        background: MACACO.cardElev, border: `1px solid ${MACACO.border}`,
        borderRadius: 10, padding: '10px 12px',
      }}>
        <span style={{ color: MACACO.textMuted, fontSize: 15, fontWeight: 600 }}>$</span>
        <input
          type="text" inputMode="numeric"
          value={val === 0 ? '' : val.toLocaleString('es-CL')}
          placeholder="0"
          onChange={e => setVal(parseInt(e.target.value.replace(/\D/g, ''), 10) || 0)}
          style={{
            flex: 1, background: 'transparent', border: 'none', color: '#fff',
            fontSize: 16, fontWeight: 700, outline: 'none',
            padding: 0, fontFamily: 'inherit',
          }}
        />
      </div>
    </div>
  );

  return (
    <div style={{ position: 'absolute', inset: 0, zIndex: 100, animation: 'fadeUp 220ms' }}>
      <div onClick={onClose} style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }} />
      <div style={{
        position: 'absolute', left: 0, right: 0, bottom: 0,
        background: MACACO.bg, borderTopLeftRadius: 24, borderTopRightRadius: 24,
        border: `1px solid ${MACACO.border}`, borderBottom: 'none',
        padding: '14px 18px 32px', maxHeight: '90%', overflowY: 'auto',
        boxShadow: '0 -20px 50px rgba(0,0,0,0.6)',
        animation: 'sheetUp 320ms cubic-bezier(.2,.7,.2,1)',
      }}>
        <div style={{ width: 36, height: 4, borderRadius: 999, background: 'rgba(255,255,255,0.18)', margin: '0 auto 16px' }}/>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
          <div>
            <div style={{ fontSize: 10.5, color: MACACO.primary, fontWeight: 700, letterSpacing: '0.16em', textTransform: 'uppercase' }}>Configuración</div>
            <div style={{ fontSize: 20, fontWeight: 800, marginTop: 4 }}>Editar metas</div>
          </div>
          <button onClick={onClose} style={{
            width: 32, height: 32, borderRadius: 999,
            background: MACACO.cardElev, border: `1px solid ${MACACO.border}`,
            color: '#fff', fontSize: 18, cursor: 'pointer', fontFamily: 'inherit',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>×</button>
        </div>

        {numInput('Meta mensual',        metaMensual,   setMetaMensual)}
        {numInput('Meta diaria',         metaDiaria,    setMetaDiaria)}
        {numInput('Colchón mínimo caja', colchonMinimo, setColchonMinimo)}

        <div style={{ marginBottom: 18 }}>
          <label style={{ fontSize: 11, color: MACACO.textDim, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>Alerta stock bajo (unidades)</label>
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            background: MACACO.cardElev, border: `1px solid ${MACACO.border}`,
            borderRadius: 10, padding: '8px 12px',
          }}>
            <button onClick={() => setAlertaStockBajo(v => Math.max(1, v - 1))} style={{
              width: 34, height: 34, borderRadius: 8,
              background: MACACO.bg, border: `1px solid ${MACACO.border}`,
              color: '#fff', fontSize: 18, cursor: 'pointer', fontFamily: 'inherit',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>−</button>
            <div style={{ fontSize: 22, fontWeight: 800 }}>{alertaStockBajo} <span style={{ fontSize: 11, color: MACACO.textMuted, fontWeight: 500 }}>UND</span></div>
            <button onClick={() => setAlertaStockBajo(v => v + 1)} style={{
              width: 34, height: 34, borderRadius: 8,
              background: MACACO.bg, border: `1px solid ${MACACO.border}`,
              color: '#fff', fontSize: 18, cursor: 'pointer', fontFamily: 'inherit',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>+</button>
          </div>
        </div>

        <button
          onClick={() => onSave({ metaMensual, metaDiaria, colchonMinimo, alertaStockBajo })}
          style={{
            width: '100%', padding: '15px',
            background: MACACO.primary, color: '#0A0A0F',
            border: 'none', borderRadius: 12,
            fontSize: 13.5, fontWeight: 800, letterSpacing: '0.04em',
            cursor: 'pointer', fontFamily: 'inherit',
            boxShadow: `0 0 20px ${MACACO.primary}44`,
          }}
        >
          GUARDAR CAMBIOS
        </button>
      </div>
    </div>
  );
}
