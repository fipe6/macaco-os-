// Cabina — el tablero de Kairos llevado a Macaco: salud del negocio (0–100),
// telemetría de ventas 30 días, vigía de pico/caída y la jugada maestra del
// Timonel. Todo sale de domain/kairos.js; sin datos muestra "sin señal".
import { MACACO, clpCompact } from '../theme.js';
import { Card, Icon } from './ui.jsx';

const colorPuntaje = (p) => (p >= 75 ? MACACO.success : p >= 50 ? MACACO.primary : MACACO.danger);

function Medidor({ puntaje, size = 112 }) {
  const r = 44, c = 2 * Math.PI * r;
  const arco = 0.75;                       // 270°
  const valor = puntaje ?? 0;
  const color = puntaje == null ? MACACO.textMuted : colorPuntaje(valor);
  return (
    <div style={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
      <svg viewBox="0 0 100 100" width={size} height={size} style={{ transform: 'rotate(135deg)' }}>
        <circle cx="50" cy="50" r={r} fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth="8"
          strokeDasharray={`${c * arco} ${c}`} strokeLinecap="round" />
        <circle cx="50" cy="50" r={r} fill="none" stroke={color} strokeWidth="8"
          strokeDasharray={`${c * arco * valor / 100} ${c}`} strokeLinecap="round"
          style={{ filter: `drop-shadow(0 0 4px ${color}88)`, transition: 'stroke-dasharray 900ms cubic-bezier(.2,.7,.2,1)' }} />
      </svg>
      <div style={{
        position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
      }}>
        <div style={{ fontSize: 30, fontWeight: 800, letterSpacing: '-0.03em', fontVariantNumeric: 'tabular-nums', color: puntaje == null ? MACACO.textMuted : '#fff' }}>
          {puntaje ?? '—'}
        </div>
        <div style={{ fontSize: 8.5, fontWeight: 800, letterSpacing: '0.16em', color: MACACO.textMuted, marginTop: -2 }}>SALUD /100</div>
      </div>
    </div>
  );
}

function Telemetria({ serie }) {
  const w = 300, h = 54;
  const max = Math.max(1, ...serie.map(d => d.total));
  const x = (i) => (i / (serie.length - 1)) * w;
  const y = (v) => h - 4 - (v / max) * (h - 10);
  const linea = serie.map((d, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(d.total).toFixed(1)}`).join(' ');
  const area = `${linea} L${w},${h} L0,${h} Z`;
  const ultimo = serie[serie.length - 1];
  return (
    <svg viewBox={`0 0 ${w} ${h}`} width="100%" height={h} preserveAspectRatio="none" style={{ display: 'block' }}>
      <defs>
        <linearGradient id="tel-g" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor={MACACO.cyan} stopOpacity="0.35" />
          <stop offset="100%" stopColor={MACACO.cyan} stopOpacity="0" />
        </linearGradient>
      </defs>
      {[0.33, 0.66].map(f => (
        <line key={f} x1="0" x2={w} y1={h * f} y2={h * f} stroke="rgba(255,255,255,0.05)" strokeDasharray="3 4" />
      ))}
      <path d={area} fill="url(#tel-g)" />
      <path d={linea} fill="none" stroke={MACACO.cyan} strokeWidth="1.8" vectorEffect="non-scaling-stroke"
        style={{ filter: `drop-shadow(0 0 3px ${MACACO.cyan}88)` }} />
      <circle cx={x(serie.length - 1)} cy={y(ultimo.total)} r="3" fill={MACACO.primary} />
    </svg>
  );
}

function Etiqueta({ children, color = MACACO.textMuted }) {
  return (
    <div style={{ fontSize: 9.5, fontWeight: 800, letterSpacing: '0.16em', textTransform: 'uppercase', color }}>
      {children}
    </div>
  );
}

export function Cabina({ salud, serie, vigia, jugada, pendientes, altas, go }) {
  const semana = serie.slice(-7).reduce((n, d) => n + d.total, 0);
  const cambio = vigia ? Math.round(vigia.cambio * 100) : null;
  const colorCambio = cambio == null ? MACACO.textMuted : cambio >= 0 ? MACACO.success : MACACO.danger;

  return (
    <Card padding={0} style={{ marginBottom: 14, overflow: 'hidden' }}
          accent={vigia?.tipo === 'caida' ? 'rgba(255,77,77,0.35)' : undefined}>
      {/* Barra superior tipo cabina */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '9px 14px', borderBottom: `1px solid ${MACACO.borderSoft}`,
        background: 'linear-gradient(90deg, rgba(245,197,24,0.07), rgba(0,212,255,0.04))',
      }}>
        <Etiqueta color={MACACO.primary}>Cabina · Kairos</Etiqueta>
        <span style={{ fontSize: 9.5, fontWeight: 700, letterSpacing: '0.1em', color: MACACO.textMuted, fontVariantNumeric: 'tabular-nums' }}>
          FUENTE O SILENCIO
        </span>
      </div>

      {/* Salud + componentes */}
      <div style={{ display: 'flex', gap: 14, alignItems: 'center', padding: '14px 14px 10px' }}>
        <Medidor puntaje={salud.puntaje} />
        <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 7 }}>
          {salud.componentes.length === 0 && (
            <div style={{ fontSize: 11.5, color: MACACO.textMuted, lineHeight: 1.4 }}>Sin datos suficientes para medir.</div>
          )}
          {salud.componentes.map(c => (
            <div key={c.id} title={c.detalle}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10.5, marginBottom: 3 }}>
                <span style={{ color: MACACO.textDim, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.nombre}</span>
                <span style={{ fontWeight: 700, fontVariantNumeric: 'tabular-nums', color: colorPuntaje(c.valor * 100) }}>{Math.round(c.valor * 100)}</span>
              </div>
              <div style={{ height: 4, borderRadius: 999, background: 'rgba(255,255,255,0.06)' }}>
                <div style={{ width: `${c.valor * 100}%`, height: '100%', borderRadius: 999, background: colorPuntaje(c.valor * 100) }} />
              </div>
            </div>
          ))}
        </div>
      </div>
      {salud.peor && salud.peor.valor < 0.6 && (
        <div style={{ padding: '0 14px 10px', fontSize: 11, color: MACACO.textDim }}>
          Lo que más baja el puntaje: <b style={{ color: '#fff' }}>{salud.peor.nombre.toLowerCase()}</b> · {salud.peor.detalle}
        </div>
      )}

      {/* Telemetría */}
      <div style={{ padding: '10px 14px 12px', borderTop: `1px solid ${MACACO.borderSoft}` }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 6 }}>
          <Etiqueta>Telemetría · ventas 30 días</Etiqueta>
          <span style={{ fontSize: 11, fontVariantNumeric: 'tabular-nums', color: MACACO.textDim }}>
            7 días <b style={{ color: '#fff' }}>{clpCompact(semana)}</b>
            {cambio != null && <b style={{ color: colorCambio, marginLeft: 6 }}>{cambio > 0 ? '▲ +' : cambio < 0 ? '▼ ' : ''}{cambio}%</b>}
          </span>
        </div>
        <Telemetria serie={serie} />
      </div>

      {/* Vigía */}
      {vigia && vigia.tipo !== 'normal' && (
        <button onClick={() => go('corteza')} style={{
          width: '100%', textAlign: 'left', cursor: 'pointer', fontFamily: 'inherit',
          border: 'none', borderTop: `1px solid ${MACACO.borderSoft}`,
          background: vigia.tipo === 'caida' ? 'rgba(255,77,77,0.08)' : 'rgba(0,230,118,0.07)',
          padding: '11px 14px', color: '#fff',
        }}>
          <Etiqueta color={vigia.tipo === 'caida' ? MACACO.danger : MACACO.success}>
            {vigia.tipo === 'caida' ? '▼ Vigía de caída' : '▲ Vigía de pico'}
          </Etiqueta>
          <div style={{ fontSize: 13, fontWeight: 700, marginTop: 4 }}>{vigia.titulo}</div>
          <div style={{ fontSize: 11.5, color: MACACO.textDim, marginTop: 3 }}>1. {vigia.acciones[0]}</div>
        </button>
      )}

      {/* Jugada maestra */}
      {jugada && (
        <button onClick={() => go('corteza')} style={{
          width: '100%', textAlign: 'left', cursor: 'pointer', fontFamily: 'inherit',
          border: 'none', borderTop: `1px solid ${MACACO.borderSoft}`,
          background: 'rgba(245,197,24,0.06)', padding: '11px 14px', color: '#fff',
          display: 'flex', gap: 10, alignItems: 'center',
        }}>
          <div style={{ fontSize: 20, flexShrink: 0 }}>🧭</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <Etiqueta color={MACACO.primary}>Jugada maestra · Timonel</Etiqueta>
            <div style={{ fontSize: 13, fontWeight: 700, marginTop: 4, lineHeight: 1.35 }}>{jugada.titulo}</div>
            <div style={{ fontSize: 11.5, color: MACACO.textDim, marginTop: 3 }}>{jugada.porque[1] || jugada.porque[0]}</div>
          </div>
        </button>
      )}

      {/* Corteza */}
      <button onClick={() => go('corteza')} style={{
        width: '100%', cursor: 'pointer', fontFamily: 'inherit', border: 'none',
        borderTop: `1px solid ${MACACO.borderSoft}`, background: 'transparent',
        padding: '11px 14px', color: '#fff', display: 'flex', alignItems: 'center', gap: 10,
      }}>
        <span style={{ fontSize: 15 }}>🧠</span>
        <span style={{ flex: 1, textAlign: 'left', fontSize: 12.5 }}>
          {pendientes === 0
            ? <span style={{ color: MACACO.textDim }}>Corteza: sin decisiones pendientes</span>
            : <>Corteza: <b>{pendientes}</b> {pendientes > 1 ? 'decisiones' : 'decisión'} por revisar
                {altas > 0 && <span style={{ color: MACACO.danger }}> · {altas} alta{altas > 1 ? 's' : ''}</span>}</>}
        </span>
        <span style={{ color: MACACO.textMuted }}><Icon.arrowRight size={15} /></span>
      </button>
    </Card>
  );
}
