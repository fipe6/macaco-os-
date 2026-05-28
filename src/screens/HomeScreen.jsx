import { useState } from 'react';
import { MACACO, clp, clpCompact } from '../theme.js';
import { Card, SectionTitle, Progress, Trend, Dot, Icon } from '../components/ui.jsx';
import { Screen, GreetingHeader } from '../components/Screen.jsx';

const OCT_PAST = [
  { d: 1,  dow: 'Mié', s: 52000 },{ d: 2,  dow: 'Jue', s: 0 },
  { d: 3,  dow: 'Vie', s: 87000 },{ d: 4,  dow: 'Sáb', s: 145000 },
  { d: 5,  dow: 'Dom', s: 30000 },{ d: 6,  dow: 'Lun', s: 68000 },
  { d: 7,  dow: 'Mar', s: 73000 },{ d: 8,  dow: 'Mié', s: 112000 },
  { d: 9,  dow: 'Jue', s: 48000 },{ d: 10, dow: 'Vie', s: 95000 },
  { d: 11, dow: 'Sáb', s: 162000 },{ d: 12, dow: 'Dom', s: 0 },
  { d: 13, dow: 'Lun', s: 58000 },{ d: 14, dow: 'Mar', s: 44000 },
  { d: 15, dow: 'Mié', s: 76000 },{ d: 16, dow: 'Jue', s: 123000 },
  { d: 17, dow: 'Vie', s: 89000 },{ d: 18, dow: 'Sáb', s: 156000 },
  { d: 19, dow: 'Dom', s: 25000 },{ d: 20, dow: 'Lun', s: 67000 },
  { d: 21, dow: 'Mar', s: 54000 },{ d: 22, dow: 'Mié', s: 98000 },
  { d: 23, dow: 'Jue', s: 71000 },{ d: 24, dow: 'Vie', s: 127000, today: true },
];
const OCT_UPCOMING = [
  { d: 25, dow: 'Sáb' },{ d: 26, dow: 'Dom' },{ d: 27, dow: 'Lun' },
  { d: 28, dow: 'Mar' },{ d: 29, dow: 'Mié' },
];
const DAILY_GOAL = 700_000;
const MONTH_GOAL = 10_000_000;

export default function HomeScreen({ go }) {
  const today = 'Vie 24 Oct';
  const monthlySales = 1_860_000;
  const monthlyGoal = 10_000_000;
  const pct = (monthlySales / monthlyGoal) * 100;

  const kpis = [
    { label: 'Ventas hoy', value: '$127.000', trend: 12, accent: MACACO.success, badge: '4 ventas' },
    { label: 'Meta diaria', value: '$700.000', sub: '18% logrado', accent: MACACO.danger, deficit: '-$573k' },
    { label: 'Caja', value: '$503.000', sub: 'Disponible', accent: MACACO.primary },
    { label: 'Inventario', value: '$1.050.000', sub: 'Costo · 9 SKUs', accent: MACACO.cyan },
  ];

  return (
    <Screen>
      <GreetingHeader
        title="Macaco OS"
        subtitle="Buenos días, Felipe"
        right={
          <>
            <div style={{ fontSize: 12, color: MACACO.textMuted, fontWeight: 500 }}>{today}</div>
            <div style={{ fontSize: 11, color: MACACO.success, fontWeight: 600, marginTop: 2, display: 'flex', alignItems: 'center', gap: 4, justifyContent: 'flex-end' }}>
              <Dot color={MACACO.success} size={6} /> En vivo
            </div>
          </>
        }
      />

      <div style={{
        display: 'flex', gap: 10, overflowX: 'auto', padding: '0 0 6px',
        margin: '0 -16px 18px', paddingLeft: 16, paddingRight: 16,
        scrollbarWidth: 'none',
      }}>
        {kpis.map((k, i) => (
          <div key={i} style={{
            flex: '0 0 auto', width: 158,
            background: MACACO.card, border: `1px solid ${MACACO.border}`,
            borderRadius: 16, padding: 14,
            boxShadow: '0 2px 12px rgba(0,0,0,0.4)',
            position: 'relative', overflow: 'hidden',
          }}>
            <div style={{
              position: 'absolute', top: 0, left: 0, width: 3, height: 28,
              background: k.accent, borderRadius: '0 4px 4px 0',
              boxShadow: `0 0 12px ${k.accent}`,
            }} />
            <div style={{ fontSize: 10.5, color: MACACO.textDim, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
              {k.label}
            </div>
            <div style={{ fontSize: 22, fontWeight: 700, letterSpacing: '-0.02em', marginTop: 6, fontVariantNumeric: 'tabular-nums' }}>
              {k.value}
            </div>
            <div style={{ marginTop: 6, display: 'flex', alignItems: 'center', gap: 6 }}>
              {k.trend !== undefined && <Trend value={k.trend} />}
              {k.deficit && (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: MACACO.danger, fontSize: 11, fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>
                  {k.deficit}
                </span>
              )}
              {!k.deficit && k.sub && k.trend === undefined && (
                <span style={{ fontSize: 11, color: MACACO.textMuted, fontWeight: 500 }}>{k.sub}</span>
              )}
              {k.trend !== undefined && k.badge && (
                <span style={{ fontSize: 11, color: MACACO.textMuted, fontWeight: 500 }}>· {k.badge}</span>
              )}
              {k.deficit && k.sub && (
                <span style={{ fontSize: 11, color: MACACO.textMuted, fontWeight: 500 }}>· {k.sub}</span>
              )}
            </div>
          </div>
        ))}
      </div>

      <Card style={{ marginBottom: 12 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 4 }}>
          <div style={{ fontSize: 13, fontWeight: 600 }}>Octubre 2026</div>
          <div style={{ fontSize: 11, color: MACACO.textMuted, fontWeight: 600, letterSpacing: '0.08em' }}>META · $10M</div>
        </div>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 12 }}>
          <div style={{ fontSize: 28, fontWeight: 800, letterSpacing: '-0.03em', fontVariantNumeric: 'tabular-nums' }}>$1.860.000</div>
          <div style={{ fontSize: 14, color: MACACO.primary, fontWeight: 600 }}>{pct.toFixed(1)}%</div>
        </div>
        <Progress value={pct} color={MACACO.primary} height={10} />
        <div style={{
          marginTop: 10, display: 'flex', justifyContent: 'space-between',
          fontSize: 11.5, color: MACACO.textDim, fontVariantNumeric: 'tabular-nums',
        }}>
          <span>Faltan <b style={{ color: '#fff', fontWeight: 600 }}>$8.140.000</b></span>
          <span>7 días restantes</span>
        </div>
      </Card>

      <Card
        accent={'#3d1414'}
        style={{ marginBottom: 14, background: 'linear-gradient(135deg, rgba(255,77,77,0.08), rgba(255,77,77,0.02))' }}
        glow
      >
        <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
          <div style={{
            width: 32, height: 32, borderRadius: 10, flexShrink: 0,
            background: 'rgba(255,77,77,0.15)', color: MACACO.danger,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Icon.warn size={18} />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 10.5, color: MACACO.danger, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', marginBottom: 4 }}>
              Deuda con interés · Prioridad 1
            </div>
            <div style={{ fontSize: 13.5, lineHeight: 1.45, color: '#fff' }}>
              <b style={{ fontVariantNumeric: 'tabular-nums' }}>$1.200.000</b> destruyendo{' '}
              <b style={{ color: MACACO.danger, fontVariantNumeric: 'tabular-nums' }}>$120.000/mes</b> en interés.
            </div>
            <button
              onClick={() => go('finanzas')}
              style={{
                marginTop: 10, background: 'transparent',
                border: `1px solid rgba(255,77,77,0.4)`,
                color: MACACO.danger, fontSize: 11.5, fontWeight: 600,
                padding: '6px 12px', borderRadius: 999, cursor: 'pointer',
                display: 'inline-flex', alignItems: 'center', gap: 6,
                fontFamily: 'inherit',
              }}
            >
              Ver plan de pago <Icon.arrowRight size={12} />
            </button>
          </div>
        </div>
      </Card>

      <DiaADia />
    </Screen>
  );
}

function DiaADia() {
  const [tab, setTab] = useState('pasados');
  const totalSoFar = OCT_PAST.reduce((s, x) => s + x.s, 0);
  const bestDay = Math.max(...OCT_PAST.map(d => d.s));
  const hitDays = OCT_PAST.filter(d => d.s >= DAILY_GOAL).length;

  const allDays = [
    ...OCT_PAST.map(p => ({ ...p, type: p.today ? 'today' : 'past' })),
    ...OCT_UPCOMING.map(u => ({ ...u, s: 0, type: 'future' })),
    { d: 30, dow: 'Jue', s: 0, type: 'far' },
    { d: 31, dow: 'Vie', s: 0, type: 'far' },
  ];

  return (
    <>
      <SectionTitle right={`acum ${clpCompact(totalSoFar)}`}>Día a día · Octubre</SectionTitle>
      <Card style={{ marginBottom: 14 }} padding={16}>
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 2, height: 56, marginBottom: 6 }}>
          {allDays.map((d, i) => {
            const ratio = Math.min(1, d.s / DAILY_GOAL);
            let color, h, dashed = false;
            if (d.type === 'today') { color = MACACO.primary; h = Math.max(8, ratio * 50); }
            else if (d.type === 'past') {
              color = d.s === 0 ? 'rgba(255,77,77,0.35)'
                : d.s >= DAILY_GOAL ? MACACO.success
                : ratio > 0.15 ? MACACO.cyan
                : 'rgba(0,212,255,0.35)';
              h = d.s === 0 ? 6 : Math.max(8, ratio * 50);
            } else if (d.type === 'future') {
              color = 'rgba(245,197,24,0.10)'; h = 50; dashed = true;
            } else {
              color = 'rgba(255,255,255,0.04)'; h = 50;
            }
            return (
              <div key={i} style={{ flex: 1, height: 50, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
                <div style={{
                  width: '100%', height: h, background: color, borderRadius: 2,
                  border: dashed ? '1px dashed rgba(245,197,24,0.4)' : 'none',
                  boxSizing: 'border-box',
                  boxShadow: d.type === 'today' ? `0 0 8px ${MACACO.primary}aa` : 'none',
                }} />
              </div>
            );
          })}
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 9, color: MACACO.textMuted, fontFamily: 'JetBrains Mono, monospace', marginBottom: 12, letterSpacing: '0.04em' }}>
          <span>01</span><span>08</span><span>15</span><span>22</span><span style={{ color: MACACO.primary, fontWeight: 700 }}>24·HOY</span><span>29</span><span>31</span>
        </div>

        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8,
          padding: '10px 0', borderTop: `1px solid ${MACACO.borderSoft}`, borderBottom: `1px solid ${MACACO.borderSoft}`,
          marginBottom: 12,
        }}>
          <MiniStat label="Mejor día" value={clpCompact(bestDay)} accent={MACACO.success} />
          <MiniStat label="Promedio" value={clpCompact(totalSoFar / OCT_PAST.length)} accent={MACACO.cyan} />
          <MiniStat label="Meta lograda" value={`${hitDays} / ${OCT_PAST.length}`} accent={MACACO.danger} />
        </div>

        <div style={{
          display: 'flex', gap: 4, padding: 3, marginBottom: 12,
          background: 'rgba(255,255,255,0.04)', borderRadius: 10,
        }}>
          {[['pasados', 'Pasados', OCT_PAST.length], ['proximos', 'Próximos', OCT_UPCOMING.length]].map(([id, label, n]) => {
            const active = tab === id;
            return (
              <button key={id} onClick={() => setTab(id)} style={{
                flex: 1, padding: '8px',
                background: active ? MACACO.cardElev : 'transparent',
                border: 'none', borderRadius: 7,
                color: active ? '#fff' : MACACO.textDim,
                fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                boxShadow: active ? `inset 0 0 0 1px ${MACACO.border}` : 'none',
                transition: '150ms',
              }}>
                {label}
                <span style={{
                  background: active ? 'rgba(245,197,24,0.16)' : 'rgba(255,255,255,0.05)',
                  color: active ? MACACO.primary : MACACO.textMuted,
                  padding: '1px 7px', borderRadius: 999, fontSize: 10, fontWeight: 700,
                }}>{n}</span>
              </button>
            );
          })}
        </div>

        {tab === 'pasados'
          ? <PasadosList past={[...OCT_PAST].reverse()} />
          : <ProximosList upcoming={OCT_UPCOMING} totalSoFar={totalSoFar} />
        }
      </Card>
    </>
  );
}

function MiniStat({ label, value, accent }) {
  return (
    <div style={{ textAlign: 'center' }}>
      <div style={{ fontSize: 9.5, color: MACACO.textMuted, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase' }}>{label}</div>
      <div style={{ fontSize: 14, fontWeight: 700, color: accent || '#fff', marginTop: 3, fontVariantNumeric: 'tabular-nums' }}>{value}</div>
    </div>
  );
}

function PasadosList({ past }) {
  const [expanded, setExpanded] = useState(false);
  const visible = expanded ? past : past.slice(0, 6);
  return (
    <>
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        {visible.map((p, idx) => {
          const pct = Math.min(100, (p.s / DAILY_GOAL) * 100);
          const hit = p.s >= DAILY_GOAL;
          const zero = p.s === 0;
          return (
            <div key={p.d} style={{
              display: 'flex', alignItems: 'center', gap: 12,
              padding: '10px 0',
              borderBottom: idx === visible.length - 1 ? 'none' : `1px solid ${MACACO.borderSoft}`,
            }}>
              <div style={{
                width: 38, textAlign: 'center',
                background: p.today ? 'rgba(245,197,24,0.12)' : 'rgba(255,255,255,0.03)',
                borderRadius: 8, padding: '4px 0',
                border: p.today ? '1px solid rgba(245,197,24,0.3)' : '1px solid transparent',
              }}>
                <div style={{ fontSize: 9, color: p.today ? MACACO.primary : MACACO.textMuted, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                  {p.dow}
                </div>
                <div style={{ fontSize: 14, fontWeight: 800, color: p.today ? MACACO.primary : '#fff', fontVariantNumeric: 'tabular-nums', lineHeight: 1 }}>
                  {String(p.d).padStart(2, '0')}
                </div>
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ height: 5, background: 'rgba(255,255,255,0.05)', borderRadius: 999, overflow: 'hidden', position: 'relative' }}>
                  {!zero && (
                    <div style={{
                      width: pct + '%', height: '100%',
                      background: p.today ? MACACO.primary : hit ? MACACO.success : MACACO.cyan,
                      borderRadius: 999,
                      boxShadow: p.today ? `0 0 8px ${MACACO.primary}88` : 'none',
                    }} />
                  )}
                </div>
                <div style={{ fontSize: 10, color: MACACO.textMuted, marginTop: 4, fontFamily: 'JetBrains Mono, monospace', letterSpacing: '0.02em' }}>
                  {zero ? 'Sin ventas' : hit ? '✓ superó la meta' : `${pct.toFixed(0)}% de meta diaria`}
                </div>
              </div>
              <div style={{ textAlign: 'right', minWidth: 78 }}>
                <div style={{
                  fontSize: 13.5, fontWeight: 700, fontVariantNumeric: 'tabular-nums',
                  color: zero ? MACACO.textMuted : hit ? MACACO.success : '#fff',
                }}>{clp(p.s)}</div>
                <div style={{
                  fontSize: 10, fontWeight: 600, marginTop: 2, fontVariantNumeric: 'tabular-nums',
                  color: zero ? MACACO.danger : hit ? MACACO.success : MACACO.textMuted,
                }}>
                  {zero ? '—' : hit ? `+${clpCompact(p.s - DAILY_GOAL)}` : `-${clpCompact(DAILY_GOAL - p.s)}`}
                </div>
              </div>
            </div>
          );
        })}
      </div>
      <button onClick={() => setExpanded(e => !e)} style={{
        marginTop: 12, width: '100%', padding: '10px',
        background: 'transparent', border: `1px solid ${MACACO.border}`,
        borderRadius: 10, color: MACACO.textDim,
        fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6,
      }}>
        {expanded ? 'Ver menos' : `Ver los ${past.length} días`}
      </button>
    </>
  );
}

function ProximosList({ upcoming, totalSoFar }) {
  let cum = totalSoFar;
  const cards = upcoming.map((u) => {
    cum += DAILY_GOAL;
    return { ...u, cum, pct: (cum / MONTH_GOAL) * 100, deficit: MONTH_GOAL - cum };
  });
  return (
    <>
      <div style={{
        padding: '10px 12px', borderRadius: 10,
        background: 'rgba(0,212,255,0.06)', border: '1px solid rgba(0,212,255,0.18)',
        marginBottom: 10,
      }}>
        <div style={{ fontSize: 11.5, color: MACACO.textDim, lineHeight: 1.45 }}>
          Si vendes <b style={{ color: '#fff' }}>$700.000</b> cada día Oct 25–29, terminarías la semana en{' '}
          <b style={{ color: MACACO.cyan }}>{clp(cards[cards.length - 1].cum)}</b>.
        </div>
      </div>
      <div style={{
        display: 'flex', gap: 10, overflowX: 'auto',
        margin: '0 -16px', padding: '4px 16px 8px', scrollbarWidth: 'none',
      }}>
        {cards.map((c, i) => (
          <div key={c.d} style={{
            flex: '0 0 auto', width: 162,
            background: 'linear-gradient(180deg, rgba(245,197,24,0.07), rgba(245,197,24,0.01))',
            border: '1px dashed rgba(245,197,24,0.32)',
            borderRadius: 14, padding: 14, position: 'relative',
          }}>
            <div style={{ fontSize: 9.5, color: MACACO.primary, letterSpacing: '0.14em', fontWeight: 700, textTransform: 'uppercase' }}>{c.dow}</div>
            <div style={{ fontSize: 26, fontWeight: 800, color: '#fff', marginTop: 2 }}>{String(c.d).padStart(2, '0')}</div>
            <div style={{ marginTop: 10, fontSize: 9, color: MACACO.textMuted, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase' }}>Meta del día</div>
            <div style={{ fontSize: 15, fontWeight: 800, color: MACACO.primary, marginTop: 2 }}>$700.000</div>
            <div style={{ marginTop: 8, fontSize: 9, color: MACACO.textMuted, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase' }}>Acum si cumple</div>
            <div style={{ fontSize: 14, fontWeight: 700, color: MACACO.cyan, marginTop: 2 }}>{clp(c.cum)}</div>
            <div style={{ marginTop: 6 }}><Progress value={c.pct} color={MACACO.cyan} height={4} glow={false} animate={false} /></div>
          </div>
        ))}
      </div>
    </>
  );
}
