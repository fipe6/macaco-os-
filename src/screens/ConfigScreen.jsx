import { useState } from 'react';
import { MACACO } from '../theme.js';
import { Card, SectionTitle, Dot, Icon } from '../components/ui.jsx';
import { Screen } from '../components/Screen.jsx';
import { flushQueue } from '../services/webhook.js';

export default function ConfigScreen() {
  const [syncing, setSyncing] = useState(false);
  const [lastSync, setLastSync] = useState('hace 2 min');

  const n8nUrl = import.meta.env.VITE_N8N_BASE_URL;
  const n8nOk = !!n8nUrl;

  const conns = [
    { name: 'n8n (webhooks)', desc: n8nOk ? n8nUrl : 'Configura VITE_N8N_BASE_URL en .env.local', status: n8nOk ? 'on' : 'warn', icon: '⚡' },
    { name: 'Google Sheets', desc: 'Vía workflow n8n', status: n8nOk ? 'on' : 'off', icon: '📊' },
    { name: 'Claude AI', desc: 'Análisis automáticos vía n8n', status: n8nOk ? 'on' : 'off', icon: '🤖' },
    { name: 'WhatsApp', desc: 'Vía workflow n8n', status: 'warn', icon: '💬' },
    { name: 'Google Calendar', desc: 'Sin conectar', status: 'off', icon: '🗓' },
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
      alert('Todo al día.');
    }
  };

  return (
    <Screen>
      <div style={{ padding: '6px 0 14px' }}>
        <div style={{ fontSize: 11, color: MACACO.primary, fontWeight: 700, letterSpacing: '0.16em', textTransform: 'uppercase' }}>Sistema</div>
        <div style={{ fontSize: 26, fontWeight: 800, letterSpacing: '-0.02em', marginTop: 4 }}>Configuración</div>
      </div>

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
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 17,
            }}>{c.icon}</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13.5, fontWeight: 600 }}>{c.name}</div>
              <div style={{ fontSize: 11.5, color: MACACO.textMuted, marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.desc}</div>
            </div>
            <StatusBadge status={c.status} />
          </div>
        ))}
      </Card>

      <SectionTitle>Metas configuradas</SectionTitle>
      <Card padding={0} style={{ marginBottom: 18 }}>
        {[
          { k: 'Meta mensual', v: '$10.000.000' },
          { k: 'Colchón mínimo caja', v: '$300.000' },
          { k: 'Alerta stock bajo', v: '3 unidades' },
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

      <SectionTitle>Sistema</SectionTitle>
      <Card style={{ marginBottom: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
          <Icon.monkey size={36} />
          <div>
            <div style={{ fontSize: 15, fontWeight: 700 }}>Macaco OS v1.0</div>
            <div style={{ fontSize: 11.5, color: MACACO.textMuted }}>Fase 1 — Fundación</div>
          </div>
        </div>
        <div style={{
          display: 'flex', justifyContent: 'space-between',
          padding: '8px 0', borderTop: `1px solid ${MACACO.borderSoft}`,
          fontSize: 11.5, color: MACACO.textDim,
        }}>
          <span>Última sincronización</span>
          <span style={{ color: MACACO.success, fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 5 }}>
            <Dot color={MACACO.success} size={5}/> {lastSync}
          </span>
        </div>
      </Card>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 10 }}>
        <button onClick={handleSync} disabled={syncing} style={{
          padding: '14px', background: MACACO.primary,
          color: '#0A0A0F', border: 'none', borderRadius: 12,
          fontSize: 12.5, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6,
          boxShadow: `0 0 18px ${MACACO.primary}44`,
          opacity: syncing ? 0.7 : 1,
        }}>
          <Icon.refresh size={14}/> {syncing ? 'Sincronizando...' : 'Reintentar cola de eventos'}
        </button>
      </div>
    </Screen>
  );
}

function StatusBadge({ status }) {
  const cfg = {
    on: { c: MACACO.success, l: 'Conectado' },
    warn: { c: MACACO.primary, l: 'Pendiente' },
    off: { c: MACACO.danger, l: 'Sin conectar' },
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
