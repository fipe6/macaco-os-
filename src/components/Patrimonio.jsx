// Patrimonio del negocio: anillos de cuánto de la deuda se cubre, burbujas con
// cada parte, barra "lo que juntarías vs la deuda" y productos a costo.
// Los números salen de patrimonio() en domain/finanzas.js.
import { MACACO, clp, clpCompact } from '../theme.js';
import { Card } from './ui.jsx';

const rotulo = { fontSize: 11, color: MACACO.textDim, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase' };
const C = { disponible: MACACO.verde, enCamino: MACACO.lavanda, productos: '#E6E6EA', incierto: 'rgba(255,255,255,0.55)', deuda: MACACO.danger };

// Arco que crece desde arriba, en el sentido del reloj.
function Arco({ r, frac, color }) {
  const L = 2 * Math.PI * r;
  const largo = Math.max(0, Math.min(1, frac)) * L;
  return (
    <>
      <circle cx="180" cy="185" r={r} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="11" />
      {largo > 0 && (
        <circle cx="180" cy="185" r={r} fill="none" stroke={color} strokeWidth="11" strokeLinecap="round"
          strokeDasharray={`${largo} ${L}`} transform="rotate(-90 180 185)">
          <animate attributeName="stroke-dasharray" from={`0 ${L}`} to={`${largo} ${L}`} dur="0.9s" fill="freeze" />
        </circle>
      )}
    </>
  );
}

function Burbuja({ x, y, valor, label, color, punteada, relleno }) {
  // Línea hacia el anillo exterior.
  const dx = 180 - x, dy = 185 - y, d = Math.hypot(dx, dy);
  const desde = 36 / d, hasta = (d - 104) / d;
  return (
    <g>
      {hasta > desde && (
        <line x1={x + dx * desde} y1={y + dy * desde} x2={x + dx * hasta} y2={y + dy * hasta}
          stroke="rgba(255,255,255,0.18)" strokeWidth="1" />
      )}
      <circle cx={x} cy={y} r="34" fill={relleno || MACACO.card} stroke={color} strokeWidth="1.6"
        strokeDasharray={punteada ? '4 4' : undefined} />
      <text x={x} y={y + 1} textAnchor="middle" fill={MACACO.text} fontSize="13.5" fontWeight="700">{valor}</text>
      <text x={x} y={y + 16} textAnchor="middle" fill={MACACO.textDim} fontSize="9">{label}</text>
    </g>
  );
}

function Fila({ label, valor, color, fuerte }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', padding: '5px 0', fontSize: 12.5 }}>
      <span style={{ color: MACACO.textDim }}>{label}</span>
      <span style={{ fontWeight: fuerte ? 800 : 700, color: color || MACACO.text, fontVariantNumeric: 'tabular-nums' }}>{valor}</span>
    </div>
  );
}

export function Patrimonio({ datos }) {
  const { disponible, enCamino, stockCosto, stockVenta, incierto, deuda, seguro, neto, netoSiVendes, cubre, productos } = datos;
  const pct = cubre ? Math.round(cubre.seguro * 100) : null;

  // Barra: todo contra la deuda (o contra el total si no hay deuda o la supera).
  const escala = Math.max(deuda, seguro + incierto, 1);
  const tramos = [
    { id: 'disponible', v: disponible },
    { id: 'enCamino', v: enCamino },
    { id: 'productos', v: stockCosto },
  ];
  const maxProd = Math.max(...productos.map(p => p.costo), 1);

  return (
    <>
      <Card style={{ marginBottom: 14 }} padding={16}>
        <div style={rotulo}>Patrimonio del negocio</div>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginTop: 6 }}>
          <span style={{ fontSize: 30, fontWeight: 800, letterSpacing: '-0.03em', color: neto >= 0 ? MACACO.text : MACACO.danger, fontVariantNumeric: 'tabular-nums' }}>{clp(neto)}</span>
          <span style={{ fontSize: 12, color: MACACO.textMuted }}>neto, a costo</span>
        </div>

        <svg viewBox="0 0 360 370" style={{ width: '100%', maxWidth: 380, display: 'block', margin: '6px auto 0' }}
          role="img" aria-label={`Caja ${clp(disponible)}, en camino ${clp(enCamino)}, productos a costo ${clp(stockCosto)}, deuda ${clp(deuda)}`}>
          {cubre ? (
            <>
              <Arco r={92} frac={cubre.seguro} color={C.productos} />
              <Arco r={76} frac={enCamino > 0 ? cubre.conCamino : 0} color={C.enCamino} />
              <Arco r={60} frac={cubre.disponible} color={C.disponible} />
              <text x="180" y="190" textAnchor="middle" fill={MACACO.text} fontSize="40" fontWeight="700" letterSpacing="-1">{pct}%</text>
              <text x="180" y="210" textAnchor="middle" fill={MACACO.textDim} fontSize="10.5">de la deuda</text>
              <text x="180" y="224" textAnchor="middle" fill={MACACO.textDim} fontSize="10.5">cubierto a costo</text>
            </>
          ) : (
            <>
              <Arco r={92} frac={1} color={C.disponible} />
              <text x="180" y="190" textAnchor="middle" fill={MACACO.text} fontSize="24" fontWeight="700">Sin deudas</text>
            </>
          )}
          <Burbuja x={180} y={40} valor={clpCompact(disponible)} label="Caja" color={C.disponible} relleno="rgba(63,203,127,0.10)" />
          {enCamino > 0 && <Burbuja x={318} y={150} valor={clpCompact(enCamino)} label="En camino" color={C.enCamino} relleno="rgba(153,132,216,0.12)" />}
          <Burbuja x={272} y={322} valor={clpCompact(deuda)} label="Deuda" color={C.deuda} relleno="rgba(255,77,77,0.08)" />
          <Burbuja x={88} y={322} valor={clpCompact(stockCosto)} label="Productos" color={C.productos} />
          <Burbuja x={42} y={150} valor={clpCompact(incierto)} label="Si vendes" color={C.incierto} punteada />
        </svg>

        <div style={{ marginTop: 6 }}>
          <Fila label="Caja disponible" valor={clp(disponible)} color={C.disponible} />
          {enCamino > 0 && <Fila label="Pedidos pagados en camino" valor={clp(enCamino)} color={C.enCamino} />}
          <Fila label="Productos a costo" valor={clp(stockCosto)} />
          <Fila label="Productos a precio de venta (aprox.)" valor={`~${clp(stockVenta)}`} color={MACACO.cyan} />
          <Fila label="Deuda" valor={`−${clp(deuda)}`} color={MACACO.danger} />
          <div style={{ borderTop: `1px solid ${MACACO.border}`, marginTop: 6, paddingTop: 4 }}>
            <Fila label="Neto si vendes todo (aprox.)" valor={clp(netoSiVendes)} color={netoSiVendes >= 0 ? MACACO.success : MACACO.danger} fuerte />
          </div>
        </div>
      </Card>

      <Card style={{ marginBottom: 14 }} padding={16}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
          <div style={rotulo}>Lo que juntarías vs la deuda</div>
        </div>
        <div style={{ position: 'relative', marginTop: 22 }}>
          <div style={{ display: 'flex', height: 18, borderRadius: 999, overflow: 'hidden', background: 'rgba(255,255,255,0.06)' }}>
            {tramos.map(t => t.v > 0 && (
              <div key={t.id} className="anim" style={{
                width: `${t.v / escala * 100}%`, background: C[t.id], transformOrigin: 'left',
                animation: 'crecerX 900ms cubic-bezier(.2,.7,.2,1) both',
              }} />
            ))}
            {incierto > 0 && (
              <div style={{ width: `${incierto / escala * 100}%`, border: `1.5px dashed ${C.incierto}`, borderRadius: 4, boxSizing: 'border-box' }} />
            )}
          </div>
          {deuda > 0 && (
            <div style={{ position: 'absolute', top: -18, bottom: -6, left: `calc(${Math.min(100, deuda / escala * 100)}% - 1px)`, width: 2, background: '#fff' }}>
              <span style={{ position: 'absolute', top: -2, right: 6, fontSize: 9.5, fontWeight: 700, letterSpacing: '0.12em', color: MACACO.text, whiteSpace: 'nowrap' }}>DEUDA</span>
            </div>
          )}
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px 16px', marginTop: 14, fontSize: 11.5, color: MACACO.textDim }}>
          {[['Caja', C.disponible], enCamino > 0 && ['En camino', C.enCamino], ['Productos', C.productos]].filter(Boolean).map(([l, c]) => (
            <span key={l} style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <span style={{ width: 9, height: 9, borderRadius: 9, background: c }} />{l}
            </span>
          ))}
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <span style={{ width: 9, height: 9, borderRadius: 9, border: `1.5px solid ${C.incierto}`, boxSizing: 'border-box' }} />Si vendes todo
          </span>
        </div>
      </Card>

      {productos.length > 0 && (
        <Card style={{ marginBottom: 14 }} padding={16}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 10 }}>
            <div style={rotulo}>Productos · a costo</div>
            <span style={{ fontSize: 11, color: MACACO.textMuted }}>venta aprox.</span>
          </div>
          {productos.slice(0, 10).map(p => (
            <div key={p.id} style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1.2fr) minmax(0,1fr) auto', alignItems: 'center', gap: 10, padding: '6px 0' }}>
              <span style={{ fontSize: 12.5, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.nombre}</span>
              <span style={{ display: 'block', height: 9, borderRadius: 999, border: '1.5px solid rgba(255,255,255,0.55)', boxSizing: 'border-box', width: `${Math.max(8, p.costo / maxProd * 100)}%` }} />
              <span style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums', lineHeight: 1.2 }}>
                <span style={{ fontSize: 13, fontWeight: 700 }}>{clpCompact(p.costo)}</span>
                <span style={{ display: 'block', fontSize: 10.5, color: MACACO.cyan }}>~{clpCompact(p.venta)}</span>
              </span>
            </div>
          ))}
          {productos.length > 10 && (
            <div style={{ fontSize: 11, color: MACACO.textMuted, marginTop: 6 }}>y {productos.length - 10} productos más · total {clp(stockCosto)} a costo</div>
          )}
        </Card>
      )}
    </>
  );
}
