import { MACACO, clp } from '../theme.js';
import { Card, SectionTitle, Progress, Dot, Icon } from '../components/ui.jsx';
import { Screen } from '../components/Screen.jsx';

export default function FinanzasScreen() {
  const debts = [
    { who: 'Benjamín', amt: 500_000, rate: 10, interest: 50_000, label: 'PAGAR PRIMERO', level: 'urgent', order: 1 },
    { who: 'Valcárce', amt: 700_000, rate: 10, interest: 70_000, label: 'PAGAR SEGUNDO', level: 'urgent', order: 2 },
    { who: 'Alejandro', amt: 150_000, rate: 0, label: 'Sin interés', level: 'medium' },
    { who: 'Roxana', amt: 1_800_000, rate: 0, label: 'Sin interés · largo plazo', level: 'low' },
  ];
  const totalDebt = debts.reduce((s, d) => s + d.amt, 0);

  return (
    <Screen>
      <div style={{ padding: '6px 0 16px' }}>
        <div style={{ fontSize: 11, color: MACACO.primary, fontWeight: 700, letterSpacing: '0.16em', textTransform: 'uppercase' }}>
          Salud financiera
        </div>
        <div style={{ fontSize: 26, fontWeight: 800, letterSpacing: '-0.02em', marginTop: 4 }}>Finanzas</div>
      </div>

      <Card style={{ marginBottom: 18 }} padding={18}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
          <div style={{ fontSize: 11, color: MACACO.textDim, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase' }}>Caja disponible</div>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            padding: '4px 10px', borderRadius: 999,
            background: 'rgba(245,197,24,0.1)', color: MACACO.primary,
            fontSize: 11, fontWeight: 600,
          }}>
            <Dot color={MACACO.primary} size={6} /> Saludable
          </div>
        </div>
        <div style={{ fontSize: 34, fontWeight: 800, letterSpacing: '-0.03em', color: MACACO.primary }}>$503.000</div>
        <div style={{ marginTop: 14, position: 'relative', height: 6, background: 'rgba(255,255,255,0.06)', borderRadius: 999 }}>
          <div style={{
            position: 'absolute', left: 0, top: 0, bottom: 0, width: '100%',
            background: `linear-gradient(90deg, ${MACACO.danger} 0%, ${MACACO.primary} 60%, ${MACACO.success} 100%)`,
            borderRadius: 999, opacity: 0.4,
          }} />
          <div style={{ position: 'absolute', left: 'calc(100% * 0.503 / 0.84)', top: -4, width: 14, height: 14, borderRadius: 999, background: MACACO.primary, border: `2px solid ${MACACO.bg}`, boxShadow: `0 0 12px ${MACACO.primary}` }} />
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8, fontSize: 11, color: MACACO.textMuted }}>
          <span>Crítico $0</span>
          <span style={{ color: MACACO.danger }}>Mín $300k</span>
          <span>Cómodo $800k</span>
        </div>
      </Card>

      <SectionTitle right={clp(totalDebt) + ' total'}>Deudas</SectionTitle>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 18 }}>
        {debts.map((d, i) => <DebtCard key={i} d={d} />)}
      </div>

      <Card style={{ marginBottom: 18, background: 'linear-gradient(135deg, rgba(255,77,77,0.04), transparent)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 8 }}>
          <div style={{ fontSize: 12, color: MACACO.textDim, fontWeight: 600 }}>Plan eliminar deuda</div>
          <div style={{ fontSize: 11, color: MACACO.danger, fontWeight: 600 }}>0% eliminada</div>
        </div>
        <Progress value={0} color={MACACO.danger} height={6} />
        <div style={{ marginTop: 8, fontSize: 11.5, color: MACACO.textMuted }}>
          Meta: $3.150.000 · 0 de 4 deudas pagadas
        </div>
      </Card>

      <SectionTitle>Cuentas por cobrar</SectionTitle>
      <Card style={{ marginBottom: 18 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: 22, fontWeight: 800, color: MACACO.cyan }}>$322.000</div>
            <div style={{ fontSize: 12, color: MACACO.textDim, marginTop: 2 }}>3 clientes pendientes</div>
          </div>
          <button style={{
            background: 'transparent', border: `1px solid ${MACACO.border}`,
            color: '#fff', fontSize: 12, fontWeight: 600, padding: '8px 14px',
            borderRadius: 999, cursor: 'pointer', fontFamily: 'inherit',
            display: 'inline-flex', alignItems: 'center', gap: 6,
          }}>
            Ver detalle <Icon.arrowRight size={11}/>
          </button>
        </div>
      </Card>

      <SectionTitle>Objetivos</SectionTitle>
      <Card style={{ marginBottom: 10 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 6 }}>
          <div style={{ fontSize: 13, fontWeight: 600 }}>Eliminar deuda total</div>
          <div style={{ fontSize: 12, color: MACACO.textMuted }}>$0 / $3.150.000</div>
        </div>
        <Progress value={0} color={MACACO.danger} height={6} />
      </Card>
      <Card>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 6 }}>
          <div style={{ fontSize: 13, fontWeight: 600 }}>Fondo auto</div>
          <div style={{ fontSize: 12, color: MACACO.textMuted }}>$0 / $4.000.000</div>
        </div>
        <Progress value={0} color={MACACO.cyan} height={6} />
      </Card>
    </Screen>
  );
}

function DebtCard({ d }) {
  const palette = {
    urgent: { bg: 'linear-gradient(135deg, rgba(255,77,77,0.10), rgba(255,77,77,0.02))', border: 'rgba(255,77,77,0.35)', accent: MACACO.danger, tag: 'URGENTE' },
    medium: { bg: MACACO.card, border: 'rgba(255,159,64,0.3)', accent: MACACO.orange, tag: 'MEDIA' },
    low: { bg: MACACO.card, border: MACACO.border, accent: 'rgba(255,255,255,0.4)', tag: 'BAJA' },
  }[d.level];

  return (
    <div style={{
      background: palette.bg, border: `1px solid ${palette.border}`,
      borderRadius: 16, padding: 14, position: 'relative',
      boxShadow: d.level === 'urgent' ? `0 0 24px rgba(255,77,77,0.08)` : 'none',
    }}>
      {d.level === 'urgent' && (
        <div style={{
          position: 'absolute', left: 0, top: 14, bottom: 14, width: 3,
          background: palette.accent, borderRadius: '0 4px 4px 0',
          boxShadow: `0 0 12px ${palette.accent}`,
        }} />
      )}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ fontSize: 15, fontWeight: 700 }}>{d.who}</div>
          <span style={{
            fontSize: 9.5, fontWeight: 700, letterSpacing: '0.12em',
            padding: '2px 7px', borderRadius: 4,
            background: d.level === 'urgent' ? 'rgba(255,77,77,0.18)' : d.level === 'medium' ? 'rgba(255,159,64,0.18)' : 'rgba(255,255,255,0.06)',
            color: palette.accent,
          }}>{palette.tag}</span>
        </div>
        {d.order && (
          <div style={{
            width: 22, height: 22, borderRadius: 999, background: 'rgba(255,77,77,0.18)',
            color: MACACO.danger, fontSize: 11, fontWeight: 800,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>{d.order}</div>
        )}
      </div>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
        <div style={{ fontSize: 24, fontWeight: 800, fontVariantNumeric: 'tabular-nums' }}>{clp(d.amt)}</div>
        <div style={{ fontSize: 12, fontWeight: 600, color: d.rate ? MACACO.danger : MACACO.textMuted }}>
          {d.rate ? d.rate + '% / mes' : 'Sin interés'}
        </div>
      </div>
      {d.interest && (
        <div style={{
          marginTop: 10, padding: '8px 10px', borderRadius: 10,
          background: 'rgba(255,77,77,0.08)', display: 'flex',
          justifyContent: 'space-between', alignItems: 'center',
        }}>
          <span style={{ fontSize: 11.5, color: MACACO.textDim }}>Interés mensual</span>
          <span style={{ fontSize: 13, fontWeight: 700, color: MACACO.danger }}>-{clp(d.interest)}</span>
        </div>
      )}
      <div style={{ marginTop: 10, fontSize: 11, color: MACACO.textMuted, fontWeight: 600 }}>{d.label}</div>
    </div>
  );
}
