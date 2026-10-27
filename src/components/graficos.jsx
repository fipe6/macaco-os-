// Gráficos de Macaco OS — SVG + CSS, sin librerías. Entran con una animación
// corta (ver styles.css; respetan "reducir movimiento"). Texto siempre en los
// tonos de texto; el color va en las marcas.
import { useEffect, useRef, useState } from 'react';
import { MACACO, clp, clpCompact } from '../theme.js';

const reducido = () => typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

// Número que cuenta desde 0 hasta su valor.
export function NumeroAnimado({ valor, formato = clp, ms = 900, style }) {
  const [v, setV] = useState(reducido() ? valor : 0);
  const desde = useRef(0);
  useEffect(() => {
    if (reducido()) { setV(valor); return; }
    const inicio = performance.now(), de = desde.current;
    let raf;
    const paso = (t) => {
      const k = Math.min(1, (t - inicio) / ms);
      const e = 1 - Math.pow(1 - k, 3);
      setV(de + (valor - de) * e);
      if (k < 1) raf = requestAnimationFrame(paso); else desde.current = valor;
    };
    raf = requestAnimationFrame(paso);
    return () => cancelAnimationFrame(raf);
  }, [valor, ms]);
  return <span style={{ fontVariantNumeric: 'tabular-nums', ...style }}>{formato(Math.round(v))}</span>;
}

const etiqueta = { fontSize: 10, fill: MACACO.textMuted, fontFamily: 'Inter, system-ui, sans-serif' };
const valorTxt = { fontSize: 10.5, fontWeight: 700, fill: MACACO.text, fontFamily: 'Inter, system-ui, sans-serif' };

// Cascada del resultado: ventas → − costo → − gastos → ganancia.
export function Cascada({ ventas, costo, gastos, ganancia }) {
  const W = 340, H = 170, top = 22, base = 136;
  const min = Math.min(0, ganancia), max = Math.max(ventas, 1);
  const y = (v) => top + (max - v) / (max - min) * (base - top);
  const cero = y(0);
  const pasos = [
    { label: 'Ventas', de: 0, a: ventas, color: MACACO.serieVentas, txt: clpCompact(ventas) },
    { label: 'Costo', de: ventas - costo, a: ventas, color: MACACO.serieNeutra, txt: '−' + clpCompact(costo) },
    { label: 'Gastos', de: ventas - costo - gastos, a: ventas - costo, color: MACACO.serieNeutra, txt: '−' + clpCompact(gastos) },
    { label: 'Ganancia', de: Math.min(0, ganancia), a: Math.max(0, ganancia), color: ganancia >= 0 ? MACACO.serieGanancia : MACACO.danger, txt: (ganancia < 0 ? '−' : '') + clpCompact(Math.abs(ganancia)) },
  ];
  const niveles = [ventas, ventas - costo, ventas - costo - gastos];
  const ancho = 52, hueco = (W - ancho * 4) / 4;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" role="img" aria-label="Cascada del resultado del mes" style={{ display: 'block', overflow: 'visible' }}>
      <line x1="0" x2={W} y1={cero} y2={cero} stroke="rgba(255,255,255,0.12)" />
      {pasos.map((p, i) => {
        const x = hueco / 2 + i * (ancho + hueco);
        const y1 = y(p.a), y2 = y(p.de);
        const alto = Math.max(2, y2 - y1);
        return (
          <g key={p.label}>
            {i > 0 && (
              // conector: donde terminó el paso anterior
              <line x1={x - hueco} x2={x} y1={y(niveles[i - 1])} y2={y(niveles[i - 1])}
                stroke="rgba(255,255,255,0.18)" strokeDasharray="2 3" />
            )}
            <rect className="anim" x={x} y={y1} width={ancho} height={alto} rx="4" fill={p.color}
              style={{ transformOrigin: `0 ${i === 0 || i === 3 ? cero : y2}px`, transformBox: 'view-box', animation: `crecerY 650ms ${120 + i * 160}ms cubic-bezier(.2,.7,.2,1) both` }} />
            <text className="anim" x={x + ancho / 2} y={y1 - 6} textAnchor="middle"
              style={{ ...valorTxt, animation: `aparecer 400ms ${400 + i * 160}ms both` }}>{p.txt}</text>
            <text x={x + ancho / 2} y={H - 8} textAnchor="middle" style={etiqueta}>{p.label}</text>
          </g>
        );
      })}
    </svg>
  );
}

// Barras agrupadas por mes: ventas y ganancia. Tocar un mes muestra sus cifras.
export function BarrasMeses({ datos, onElegir, elegido }) {
  const W = 340, H = 150, top = 10, base = 118;
  const max = Math.max(1, ...datos.map(d => Math.max(d.ventas, d.ganancia)));
  const min = Math.min(0, ...datos.map(d => d.ganancia));
  const y = (v) => top + (max - v) / (max - min) * (base - top);
  const cero = y(0);
  const col = W / datos.length, b = Math.min(18, col / 3.2);
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" role="img" aria-label="Ventas y ganancia por mes" style={{ display: 'block' }}>
      {[0.5, 1].map(f => (
        <g key={f}>
          <line x1="0" x2={W} y1={y(max * f)} y2={y(max * f)} stroke="rgba(255,255,255,0.05)" strokeDasharray="3 4" />
          <text x={W} y={y(max * f) - 3} textAnchor="end" style={etiqueta}>{clpCompact(max * f)}</text>
        </g>
      ))}
      <line x1="0" x2={W} y1={cero} y2={cero} stroke="rgba(255,255,255,0.12)" />
      {datos.map((d, i) => {
        const cx = col * i + col / 2;
        const activo = elegido === i;
        const barras = [
          { v: d.ventas, x: cx - b - 1, color: MACACO.serieVentas },
          { v: d.ganancia, x: cx + 1, color: d.ganancia >= 0 ? MACACO.serieGanancia : MACACO.danger },
        ];
        return (
          <g key={d.key} onClick={() => onElegir?.(i)} style={{ cursor: 'pointer' }}>
            <rect x={col * i} y="0" width={col} height={H} fill={activo ? 'rgba(255,255,255,0.04)' : 'transparent'} rx="6" />
            {barras.map((r, j) => {
              const y1 = Math.min(y(r.v), cero), alto = Math.max(r.v === 0 ? 0 : 2, Math.abs(y(r.v) - cero));
              return (
                <rect key={j} className="anim" x={r.x} y={y1} width={b} height={alto} rx="3" fill={r.color}
                  opacity={elegido == null || activo ? 1 : 0.45}
                  style={{ transformOrigin: `0 ${cero}px`, transformBox: 'view-box', animation: `crecerY 600ms ${i * 70 + j * 60}ms cubic-bezier(.2,.7,.2,1) both`, transition: 'opacity 200ms' }} />
              );
            })}
            <text x={cx} y={H - 8} textAnchor="middle" style={{ ...etiqueta, fill: activo ? MACACO.text : MACACO.textMuted, fontWeight: activo ? 700 : 400 }}>{d.label}</text>
          </g>
        );
      })}
    </svg>
  );
}

// Barras horizontales (una sola serie): categoría, barra y monto.
export function BarrasCategorias({ items, color = MACACO.serieGastos, max: maxFilas = 6 }) {
  const visibles = items.slice(0, maxFilas);
  const resto = items.slice(maxFilas);
  const filas = resto.length
    ? [...visibles, { categoria: `Otros (${resto.length})`, monto: resto.reduce((n, x) => n + x.monto, 0), pct: resto.reduce((n, x) => n + x.pct, 0) }]
    : visibles;
  const max = Math.max(1, ...filas.map(f => f.monto));
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {filas.map((f, i) => (
        <div key={f.categoria}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, fontSize: 12, marginBottom: 4 }}>
            <span style={{ color: MACACO.textDim, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.categoria}</span>
            <span style={{ fontWeight: 700, fontVariantNumeric: 'tabular-nums', flexShrink: 0 }}>
              {clp(f.monto)} <span style={{ color: MACACO.textMuted, fontWeight: 500 }}>· {Math.round(f.pct * 100)}%</span>
            </span>
          </div>
          <div style={{ height: 8, borderRadius: 999, background: 'rgba(255,255,255,0.05)' }}>
            <div className="anim" style={{
              width: `${f.monto / max * 100}%`, height: '100%', borderRadius: 999, background: color,
              transformOrigin: 'left', animation: `crecerX 700ms ${i * 90}ms cubic-bezier(.2,.7,.2,1) both`,
            }} />
          </div>
        </div>
      ))}
    </div>
  );
}

// Dos líneas acumuladas en el mes: entra (ventas) y sale (gastos + compras).
export function LineasAcumuladas({ serie }) {
  const W = 340, H = 140, top = 14, base = 112, der = 4;
  if (!serie.length) return null;
  const max = Math.max(1, ...serie.map(d => Math.max(d.entra, d.sale)));
  const x = (i) => serie.length === 1 ? W / 2 : (i / (serie.length - 1)) * (W - der);
  const y = (v) => base - (v / max) * (base - top);
  const camino = (k) => serie.map((d, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(d[k]).toFixed(1)}`).join(' ');
  const ult = serie[serie.length - 1];
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" role="img" aria-label="Entradas y salidas acumuladas del mes" style={{ display: 'block', overflow: 'visible' }}>
      <defs>
        <linearGradient id="acum-g" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor={MACACO.serieVentas} stopOpacity="0.28" />
          <stop offset="100%" stopColor={MACACO.serieVentas} stopOpacity="0" />
        </linearGradient>
      </defs>
      {[0.5, 1].map(f => (
        <line key={f} x1="0" x2={W} y1={y(max * f)} y2={y(max * f)} stroke="rgba(255,255,255,0.05)" strokeDasharray="3 4" />
      ))}
      <path className="anim" d={`${camino('entra')} L${x(serie.length - 1)},${base} L0,${base} Z`} fill="url(#acum-g)"
        style={{ animation: 'aparecer 700ms 500ms both' }} />
      <path className="anim" d={camino('sale')} fill="none" stroke="rgba(255,255,255,0.45)" strokeWidth="2" strokeDasharray="5 4"
        style={{ animation: 'aparecer 600ms 300ms both' }} />
      <path className="anim" d={camino('entra')} fill="none" stroke={MACACO.serieVentas} strokeWidth="2" pathLength="1000"
        strokeDasharray="1000" style={{ '--largo': 1000, animation: 'trazo 1100ms cubic-bezier(.4,0,.2,1) both' }} />
      <circle cx={x(serie.length - 1)} cy={y(ult.entra)} r="4" fill={MACACO.serieVentas} stroke={MACACO.card} strokeWidth="2" />
      <circle cx={x(serie.length - 1)} cy={y(ult.sale)} r="4" fill="rgba(255,255,255,0.7)" stroke={MACACO.card} strokeWidth="2" />
      <line x1="0" x2={W} y1={base} y2={base} stroke="rgba(255,255,255,0.12)" />
      <text x="0" y={H - 6} style={etiqueta}>Día 1</text>
      <text x={W} y={H - 6} textAnchor="end" style={etiqueta}>Hoy · día {ult.dia}</text>
    </svg>
  );
}

// Leyenda simple (para gráficos con 2 series).
export function Leyenda({ items }) {
  return (
    <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', fontSize: 11, color: MACACO.textDim }}>
      {items.map(it => (
        <span key={it.label} style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          <span style={{
            width: 14, height: it.linea ? 0 : 8, borderRadius: 2, background: it.linea ? 'transparent' : it.color,
            borderTop: it.linea ? `2px ${it.punteada ? 'dashed' : 'solid'} ${it.color}` : 'none',
          }} />
          {it.label}
        </span>
      ))}
    </div>
  );
}
