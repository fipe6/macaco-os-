import { useState } from 'react';
import { MACACO, clp } from '../theme.js';
import { Card, SectionTitle, Progress, Trend, Dot, Icon } from '../components/ui.jsx';
import { Screen } from '../components/Screen.jsx';
import { sendReporteWhatsApp } from '../services/webhook.js';

export default function ReportesScreen() {
  const [tab, setTab] = useState('Mensual');
  const [sending, setSending] = useState(false);

  const enviarWsp = async () => {
    setSending(true);
    await sendReporteWhatsApp(tab.toLowerCase(), { tipo: tab });
    setSending(false);
  };

  return (
    <Screen>
      <div style={{ padding: '6px 0 14px' }}>
        <div style={{ fontSize: 11, color: MACACO.primary, fontWeight: 700, letterSpacing: '0.16em', textTransform: 'uppercase' }}>Análisis</div>
        <div style={{ fontSize: 26, fontWeight: 800, letterSpacing: '-0.02em', marginTop: 4 }}>Reportes</div>
      </div>

      <div style={{
        display: 'flex', background: MACACO.card,
        border: `1px solid ${MACACO.border}`, borderRadius: 12, padding: 4,
        marginBottom: 16,
      }}>
        {['Diario', 'Semanal', 'Mensual'].map(t => {
          const active = tab === t;
          return (
            <button key={t} onClick={() => setTab(t)}
              style={{
                flex: 1, padding: '9px',
                background: active ? MACACO.cardElev : 'transparent',
                color: active ? '#fff' : MACACO.textDim,
                border: 'none', borderRadius: 9,
                fontSize: 12.5, fontWeight: 600, cursor: 'pointer',
                fontFamily: 'inherit',
                boxShadow: active ? `inset 0 0 0 1px ${MACACO.border}` : 'none',
              }}
            >{t}</button>
          );
        })}
      </div>

      <div style={{ animation: 'fadeUp 320ms cubic-bezier(.2,.7,.2,1)' }}>
        {tab === 'Diario' && <ReporteDiario />}
        {tab === 'Semanal' && <ReporteSemanal />}
        {tab === 'Mensual' && <ReporteMensual />}
      </div>

      <button onClick={enviarWsp} disabled={sending} style={{
        width: '100%', padding: '14px', marginTop: 16,
        background: '#25D366', color: '#fff', border: 'none', borderRadius: 12,
        fontSize: 13.5, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8,
        boxShadow: '0 0 24px rgba(37,211,102,0.3)',
        opacity: sending ? 0.7 : 1,
      }}>
        <Icon.whatsapp size={16}/> {sending ? 'Enviando...' : 'Enviar reporte a WhatsApp'}
      </button>
    </Screen>
  );
}

function ReporteDiario() {
  return (
    <>
      <Card style={{ marginBottom: 12 }} padding={18}>
        <div style={{ fontSize: 11, color: MACACO.textDim, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase' }}>Ventas hoy</div>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginTop: 6 }}>
          <div style={{ fontSize: 32, fontWeight: 800, letterSpacing: '-0.03em' }}>$127.000</div>
          <Trend value={12} />
        </div>
        <div style={{ fontSize: 11.5, color: MACACO.textMuted, marginTop: 4 }}>vs ayer</div>
      </Card>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
        <KpiTile label="Transacciones" value="4" />
        <KpiTile label="Ticket promedio" value="$31.750" />
      </div>
      <Card style={{ marginBottom: 12 }}>
        <SectionTitle style={{ marginBottom: 10 }}>Más vendido</SectionTitle>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontSize: 15, fontWeight: 700 }}>Proteína Grizzly</div>
            <div style={{ fontSize: 12, color: MACACO.textMuted, marginTop: 2 }}>3 unidades vendidas</div>
          </div>
          <div style={{
            padding: '6px 12px', borderRadius: 999,
            background: 'rgba(245,197,24,0.12)', color: MACACO.primary,
            fontSize: 12, fontWeight: 700,
          }}>×3</div>
        </div>
      </Card>
      <Card style={{ background: 'linear-gradient(135deg, rgba(0,212,255,0.08), rgba(0,212,255,0.02))', borderColor: 'rgba(0,212,255,0.25)' }}>
        <div style={{ fontSize: 11, color: MACACO.cyan, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', marginBottom: 6 }}>Foco del día</div>
        <div style={{ fontSize: 14, lineHeight: 1.45 }}>
          Cobrar <b>$322.000</b> en cuentas pendientes
        </div>
      </Card>
    </>
  );
}

function ReporteSemanal() {
  const days = [
    { d: 'Lun', v: 42000 },{ d: 'Mar', v: 58000 },{ d: 'Mié', v: 81000 },
    { d: 'Jue', v: 35000 },{ d: 'Vie', v: 37000 },{ d: 'Sáb', v: 127000 },{ d: 'Dom', v: 0 },
  ];
  const max = Math.max(...days.map(d => d.v));
  return (
    <>
      <Card style={{ marginBottom: 12 }} padding={18}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
          <div>
            <div style={{ fontSize: 11, color: MACACO.textDim, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase' }}>Ventas semana</div>
            <div style={{ fontSize: 28, fontWeight: 800, marginTop: 4 }}>$380.000</div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 11, color: MACACO.textDim }}>Meta $490k</div>
            <div style={{ fontSize: 16, fontWeight: 700, color: MACACO.primary, marginTop: 2 }}>77.5%</div>
          </div>
        </div>
        <div style={{ marginTop: 14 }}><Progress value={77.5} color={MACACO.primary} height={6} /></div>
      </Card>
      <Card style={{ marginBottom: 12 }}>
        <SectionTitle style={{ marginBottom: 14 }}>Últimos 7 días</SectionTitle>
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, height: 110 }}>
          {days.map((d, i) => {
            const h = d.v === 0 ? 4 : (d.v / max) * 90 + 8;
            const isToday = i === 5;
            return (
              <div key={d.d} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                <div style={{ fontSize: 9, color: isToday ? MACACO.primary : MACACO.textMuted, fontWeight: 600 }}>
                  {d.v >= 1000 ? Math.round(d.v / 1000) + 'k' : ''}
                </div>
                <div style={{
                  width: '100%', height: h, borderRadius: 4,
                  background: isToday ? MACACO.primary : 'rgba(245,197,24,0.25)',
                  boxShadow: isToday ? `0 0 10px ${MACACO.primary}88` : 'none',
                }} />
                <div style={{ fontSize: 10.5, color: isToday ? '#fff' : MACACO.textMuted, fontWeight: isToday ? 700 : 500 }}>{d.d}</div>
              </div>
            );
          })}
        </div>
      </Card>
      <SectionTitle>Top 3 productos</SectionTitle>
      <Card padding={0} style={{ marginBottom: 12 }}>
        {[
          { n: 'Proteína Grizzly', q: 8, v: 288000 },
          { n: 'Creatina D. Pharma', q: 5, v: 87500 },
          { n: 'Omega 3', q: 3, v: 39000 },
        ].map((p, i, arr) => (
          <div key={i} style={{
            display: 'flex', alignItems: 'center', padding: '12px 14px',
            borderBottom: i === arr.length - 1 ? 'none' : `1px solid ${MACACO.borderSoft}`,
          }}>
            <div style={{
              width: 22, height: 22, borderRadius: 999,
              background: i === 0 ? 'rgba(245,197,24,0.2)' : 'rgba(255,255,255,0.06)',
              color: i === 0 ? MACACO.primary : MACACO.textDim,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 11, fontWeight: 800, marginRight: 12,
            }}>{i+1}</div>
            <div style={{ flex: 1, fontSize: 13, fontWeight: 500 }}>{p.n}</div>
            <div style={{ fontSize: 12, color: MACACO.textMuted, marginRight: 12 }}>×{p.q}</div>
            <div style={{ fontSize: 13, fontWeight: 700 }}>{clp(p.v)}</div>
          </div>
        ))}
      </Card>
    </>
  );
}

function ReporteMensual() {
  return (
    <>
      <Card style={{ marginBottom: 12 }} padding={18}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <div style={{ fontSize: 11, color: MACACO.textDim, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase' }}>Mayo 2026</div>
            <div style={{ fontSize: 32, fontWeight: 800, marginTop: 6 }}>$1.126.000</div>
            <div style={{ fontSize: 12, color: MACACO.textMuted, marginTop: 4 }}>de $10.000.000 meta</div>
          </div>
          <div style={{
            padding: '6px 10px', borderRadius: 8,
            background: 'rgba(255,77,77,0.12)', color: MACACO.danger,
            fontSize: 10, fontWeight: 700, letterSpacing: '0.12em',
            display: 'flex', alignItems: 'center', gap: 4,
          }}>
            <Dot color={MACACO.danger} size={6}/> FASE 1
          </div>
        </div>
        <div style={{ marginTop: 14 }}>
          <Progress value={11.3} color={MACACO.primary} height={10} />
          <div style={{ marginTop: 6, fontSize: 11, color: MACACO.textMuted, textAlign: 'right' }}>11.3%</div>
        </div>
      </Card>
      <SectionTitle>KPIs clave</SectionTitle>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
        <KpiTile label="Margen neto" value="48%" color={MACACO.success} />
        <KpiTile label="Rotación inv." value="1.07×" color={MACACO.cyan} />
        <KpiTile label="Solvencia" value="0.59×" color={MACACO.danger} />
        <KpiTile label="Ticket prom." value="$28.150" />
      </div>
      <Card style={{ background: 'linear-gradient(135deg, rgba(245,197,24,0.06), transparent)', borderColor: 'rgba(245,197,24,0.25)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
          <Dot color={MACACO.danger} size={8}/>
          <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: MACACO.primary }}>Fase 1 — Fundación</div>
        </div>
        <div style={{ fontSize: 13, color: MACACO.textDim, lineHeight: 1.5 }}>
          Construir caja sólida, eliminar deuda con interés, estabilizar inventario sobre 9 SKUs.
        </div>
      </Card>
    </>
  );
}

function KpiTile({ label, value, color }) {
  return (
    <div style={{
      background: MACACO.card, border: `1px solid ${MACACO.border}`,
      borderRadius: 12, padding: 14,
    }}>
      <div style={{ fontSize: 10.5, color: MACACO.textDim, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase' }}>{label}</div>
      <div style={{ fontSize: 22, fontWeight: 800, color: color || '#fff', marginTop: 6 }}>{value}</div>
    </div>
  );
}
