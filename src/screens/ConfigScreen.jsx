import { useState } from 'react';
import { MACACO, clp } from '../theme.js';
import { Card, SectionTitle, Dot, Icon } from '../components/ui.jsx';
import { Screen } from '../components/Screen.jsx';
import { flushQueue } from '../services/webhook.js';
import { useApp } from '../store.jsx';

export default function ConfigScreen() {
  const { config, setConfig, caja, ajustarCaja } = useApp();
  const [syncing,  setSyncing]  = useState(false);
  const [lastSync, setLastSync] = useState('—');
  const [editMeta, setEditMeta] = useState(false);

  const n8nUrl = import.meta.env.VITE_N8N_BASE_URL;
  const n8nOk  = !!n8nUrl;

  const conns = [
    { name: 'n8n (webhooks)',  desc: n8nOk ? n8nUrl : 'Configura VITE_N8N_BASE_URL en .env.local', status: n8nOk ? 'on' : 'warn', icon: '⚡' },
    { name: 'Google Sheets',   desc: 'Vía workflow n8n',               status: n8nOk ? 'on' : 'off', icon: '📊' },
    { name: 'Claude AI',       desc: 'Análisis automáticos vía n8n',   status: n8nOk ? 'on' : 'off', icon: '🤖' },
    { name: 'WhatsApp',        desc: 'Vía workflow n8n',               status: 'warn',               icon: '💬' },
    { name: 'Google Calendar', desc: 'Sin conectar',                   status: 'off',                icon: '🗓'  },
  ];

  const handleSync = async () => {
    setSyncing(true);
    const res = await flushQueue();
    setSyncing(false);
    setLastSync(new Date().toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' }));
    if (res.sent > 0) {
      alert(`Sincronizados ${res.sent} eventos. Pendientes: ${res.remaining}.`);
    } else if (res.remaining > 0) {
      alert(`No se pudo sincronizar. ${res.remaining} eventos en cola.`);
    } else {
      alert('Todo al día — sin eventos pendientes.');
    }
  };

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
      <SectionTitle>Conexiones</SectionTitle>
      <Card padding={0} style={{ marginBottom: 18 }}>
        {conns.map((c, i) => (
          <div key={c.name} style={{
            display: 'flex', alignItems: 'center', gap: 12,
            padding: '14px',
            borderBottom: i === conns.length - 1 ? 'none' : `1px solid ${MACACO.borderSoft}`,
          }}>
            <div style={{
              width: 36, height: 36, borderRadius: 10,
              background: 'rgba(255,255,255,0.04)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 17,
            }}>{c.icon}</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13.5, fontWeight: 600 }}>{c.name}</div>
              <div style={{ fontSize: 11.5, color: MACACO.textMuted, marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.desc}</div>
            </div>
            <StatusBadge status={c.status} />
          </div>
        ))}
      </Card>

      {/* Sistema */}
      <SectionTitle>Sistema</SectionTitle>
      <Card style={{ marginBottom: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
          <Icon.monkey size={36} />
          <div>
            <div style={{ fontSize: 15, fontWeight: 700 }}>Macaco OS v1.1</div>
            <div style={{ fontSize: 11.5, color: MACACO.textMuted }}>Fase 1 — Persistencia real activa</div>
          </div>
        </div>
        <div style={{
          display: 'flex', justifyContent: 'space-between',
          padding: '8px 0', borderTop: `1px solid ${MACACO.borderSoft}`,
          fontSize: 11.5, color: MACACO.textDim,
        }}>
          <span>Última sincronización manual</span>
          <span style={{ color: MACACO.success, fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 5 }}>
            <Dot color={MACACO.success} size={5}/> {lastSync}
          </span>
        </div>
      </Card>

      <button onClick={handleSync} disabled={syncing} style={{
        width: '100%', padding: '14px', background: MACACO.primary,
        color: '#0A0A0F', border: 'none', borderRadius: 12,
        fontSize: 12.5, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6,
        boxShadow: `0 0 18px ${MACACO.primary}44`,
        opacity: syncing ? 0.7 : 1,
      }}>
        <Icon.refresh size={14}/> {syncing ? 'Sincronizando...' : 'Reintentar cola de eventos'}
      </button>

      {editMeta && (
        <EditMetasSheet config={config} onClose={() => setEditMeta(false)} onSave={(cambios) => { setConfig(cambios); setEditMeta(false); }} />
      )}
    </Screen>
  );
}

function StatusBadge({ status }) {
  const cfg = {
    on:   { c: MACACO.success, l: 'Conectado'    },
    warn: { c: MACACO.primary, l: 'Pendiente'    },
    off:  { c: MACACO.danger,  l: 'Sin conectar' },
  }[status];
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      padding: '4px 9px', borderRadius: 999,
      background: cfg.c + '18', color: cfg.c,
      fontSize: 10.5, fontWeight: 700, letterSpacing: '0.04em',
    }}>
      <Dot color={cfg.c} size={6}/> {cfg.l}
    </span>
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
