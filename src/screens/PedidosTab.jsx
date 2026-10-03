import { useState } from 'react';
import { MACACO, clp, clpCompact } from '../theme.js';
import { Card, SectionTitle, Dot, Icon } from '../components/ui.jsx';
import {
  useApp, hoyISO, diasEntre, sumarDias, resumenProveedores, sugerenciasReposicion, PROVEEDORES_BASE,
} from '../store.jsx';

const labelStyle = {
  fontSize: 11, color: MACACO.textDim, fontWeight: 600, letterSpacing: '0.1em',
  textTransform: 'uppercase', display: 'block', marginBottom: 6,
};
const inputStyle = {
  width: '100%', boxSizing: 'border-box',
  background: MACACO.cardElev, border: `1px solid ${MACACO.border}`,
  borderRadius: 10, padding: '12px 14px',
  color: '#fff', fontSize: 15, fontWeight: 500,
  outline: 'none', fontFamily: 'inherit', colorScheme: 'dark',
};

const fechaCorta = (iso) => {
  if (!iso) return '—';
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('es-CL', { day: 'numeric', month: 'short' });
};

const ESTADO = {
  pedido:    { label: 'Pedido',    color: MACACO.primary },
  en_camino: { label: 'En camino', color: MACACO.cyan },
  recibido:  { label: 'Recibido',  color: MACACO.success },
  cancelado: { label: 'Cancelado', color: MACACO.textMuted },
};

// Las líneas de un mismo pedido (mismo ordenId) se muestran juntas.
function agruparOrdenes(lista) {
  const m = new Map();
  lista.forEach(p => {
    const k = p.ordenId || p.id;
    if (!m.has(k)) {
      m.set(k, {
        key: k, proveedor: p.proveedor, fechaPedido: p.fechaPedido, fechaEstimada: p.fechaEstimada,
        fechaLlegada: p.fechaLlegada, estado: p.estado, tracking: p.tracking, lineas: [],
      });
    }
    m.get(k).lineas.push(p);
  });
  return [...m.values()];
}
const totalOrden = (o) => o.lineas.reduce((n, l) => n + (l.costoUnitario || 0) * l.cantidad, 0);
const unidadesOrden = (o) => o.lineas.reduce((n, l) => n + l.cantidad, 0);

export default function PedidosTab() {
  const { productos, ventas, pedidos, caja, registrarOrden, cancelarOrden, actualizarPedido, eliminarPedido, recibirPedido } = useApp();
  const [nuevo, setNuevo]     = useState(null);   // null | objeto con datos precargados
  const [recibir, setRecibir] = useState(null);   // orden a recibir
  const hoy = hoyISO();

  const resumen = resumenProveedores(pedidos);
  // Los proveedores habituales siempre aparecen, aunque no tengan pedidos todavía.
  const nombresProv = [...PROVEEDORES_BASE];
  resumen.forEach(g => { if (!nombresProv.some(n => n.toLowerCase() === g.proveedor.toLowerCase())) nombresProv.push(g.proveedor); });
  const proveedores = nombresProv.map(n =>
    resumen.find(g => g.proveedor.toLowerCase() === n.toLowerCase())
    || { proveedor: n, promedio: null, min: null, max: null, recibidos: 0, enCamino: 0, invertido: 0, pedidos: 0 });

  const sugerencias = sugerenciasReposicion({ productos, ventas, pedidos }).slice(0, 6);
  const activos = agruparOrdenes(pedidos.filter(p => p.estado === 'pedido' || p.estado === 'en_camino'))
    .sort((a, b) => (a.fechaEstimada || '9999').localeCompare(b.fechaEstimada || '9999'));
  const historial = agruparOrdenes(pedidos.filter(p => p.estado === 'recibido' || p.estado === 'cancelado')).slice(0, 15);
  const invertidoTotal = resumen.reduce((n, g) => n + g.invertido, 0);

  const guardarPedido = (orden) => {
    registrarOrden(orden);
    setNuevo(null);
  };

  return (
    <>
      <button
        onClick={() => setNuevo({})}
        style={{
          width: '100%', padding: '14px', marginBottom: 16,
          background: MACACO.primary, color: '#0A0A0F', border: 'none', borderRadius: 12,
          fontSize: 13.5, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', letterSpacing: '0.03em',
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          boxShadow: `0 0 18px ${MACACO.primary}44`,
        }}
      >
        <Icon.plus size={15} /> NUEVO PEDIDO A PROVEEDOR
      </button>

      {/* Cuándo pedir */}
      <SectionTitle>Cuándo pedir</SectionTitle>
      {sugerencias.length === 0 ? (
        <Card style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 12, color: MACACO.textMuted, lineHeight: 1.5, textAlign: 'center', padding: '6px 0' }}>
            Aquí aparecerán los productos que conviene pedir, calculados con tu ritmo de ventas y la demora real de cada proveedor.
          </div>
        </Card>
      ) : (
        <Card padding={0} style={{ marginBottom: 16 }}>
          {sugerencias.map((s, i) => {
            const ya    = s.diasParaPedir <= 0;
            const color = ya ? MACACO.danger : s.diasParaPedir <= 7 ? MACACO.primary : MACACO.textDim;
            return (
              <div key={s.id} style={{
                padding: '13px 14px',
                borderBottom: i === sugerencias.length - 1 ? 'none' : `1px solid ${MACACO.borderSoft}`,
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 10 }}>
                  <div style={{ fontSize: 13.5, fontWeight: 600, minWidth: 0 }}>{s.nombre}</div>
                  <div style={{ fontSize: 12, fontWeight: 800, color, flexShrink: 0 }}>
                    {ya ? 'PEDIR YA' : `Pedir en ${s.diasParaPedir} d`}
                  </div>
                </div>
                <div style={{ fontSize: 11, color: MACACO.textMuted, marginTop: 4, lineHeight: 1.5 }}>
                  Stock {s.stock} u · vendes {s.ritmo.toFixed(2)}/día · alcanza ~{s.diasStock} días
                  <br />
                  {s.proveedor
                    ? <>{s.proveedor} demora {s.leadEstimado ? 'sin historial, se asumen ' : ''}<b style={{ color: '#fff' }}>{s.lead} días</b></>
                    : <>Sin proveedor registrado · se asumen <b style={{ color: '#fff' }}>{s.lead} días</b></>}
                  {s.enCamino > 0 && <> · {s.enCamino} u ya en camino</>}
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 }}>
                  <div style={{ fontSize: 12, color: MACACO.textDim }}>
                    Sugerido: <b style={{ color: '#fff' }}>{s.cantidad} u</b> · ≈ {clpCompact(s.inversion)}
                  </div>
                  <button
                    onClick={() => setNuevo({ productoId: s.id, proveedor: s.proveedor || '', cantidad: s.cantidad })}
                    style={{
                      fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', padding: '5px 10px',
                      borderRadius: 6, cursor: 'pointer', fontFamily: 'inherit',
                      background: 'rgba(245,197,24,0.1)', color: MACACO.primary,
                      border: '1px solid rgba(245,197,24,0.25)',
                    }}
                  >PEDIR</button>
                </div>
              </div>
            );
          })}
        </Card>
      )}

      {/* En camino */}
      <SectionTitle right={activos.length ? `${activos.length} activo${activos.length > 1 ? 's' : ''}` : undefined}>En camino</SectionTitle>
      {activos.length === 0 ? (
        <Card style={{ marginBottom: 16 }}>
          <div style={{ textAlign: 'center', padding: '6px 0', color: MACACO.textMuted, fontSize: 12.5 }}>Sin pedidos pendientes</div>
        </Card>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 16 }}>
          {activos.map(o => {
            const est   = ESTADO[o.estado];
            const lleva = diasEntre(o.fechaPedido, hoy);
            const resta = o.fechaEstimada ? diasEntre(hoy, o.fechaEstimada) : null;
            const atrasado = resta !== null && resta < 0;
            const total = totalOrden(o);
            return (
              <Card key={o.key} padding={14} accent={atrasado ? 'rgba(255,77,77,0.35)' : undefined}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 }}>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: 700 }}>{o.proveedor}</div>
                    <div style={{ fontSize: 11.5, color: MACACO.textMuted, marginTop: 3 }}>
                      Pedido {fechaCorta(o.fechaPedido)} · {unidadesOrden(o)} u{total > 0 ? ` · ${clp(total)}` : ''}{o.lineas.some(l => l.gastoId) ? ' · pagado' : ''}
                    </div>
                  </div>
                  <span style={{
                    fontSize: 10, fontWeight: 700, padding: '3px 8px', borderRadius: 999, flexShrink: 0,
                    background: est.color + '1F', color: est.color, textTransform: 'uppercase', letterSpacing: '0.06em',
                  }}>{est.label}</span>
                </div>

                <div style={{ marginTop: 10, padding: '8px 10px', borderRadius: 10, background: 'rgba(255,255,255,0.03)' }}>
                  {o.lineas.map(l => (
                    <div key={l.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5, padding: '2px 0' }}>
                      <span>{l.producto}</span>
                      <span style={{ color: MACACO.textDim }}>×{l.cantidad}</span>
                    </div>
                  ))}
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 10, fontSize: 12 }}>
                  <span style={{ color: MACACO.textDim }}>Lleva {lleva} día{lleva !== 1 ? 's' : ''}</span>
                  <span style={{ fontWeight: 700, color: atrasado ? MACACO.danger : MACACO.textDim }}>
                    {resta === null ? 'sin fecha estimada'
                      : atrasado ? `atrasado ${-resta} día${-resta !== 1 ? 's' : ''}`
                      : resta === 0 ? 'llega hoy' : `llega en ${resta} día${resta !== 1 ? 's' : ''}`}
                  </span>
                </div>
                {o.tracking && <div style={{ fontSize: 11, color: MACACO.textMuted, marginTop: 6 }}>Seguimiento: {o.tracking}</div>}
                <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                  {o.estado === 'pedido' && (
                    <button
                      onClick={() => o.lineas.forEach(l => actualizarPedido(l.id, { estado: 'en_camino', fechaEnvio: hoy }))}
                      style={btn(MACACO.cyan)}
                    >MARCAR EN CAMINO</button>
                  )}
                  <button onClick={() => setRecibir(o)} style={btn(MACACO.success, true)}>RECIBIDO</button>
                  <button
                    onClick={() => { if (window.confirm(o.lineas.some(l => l.gastoId) ? '¿Cancelar este pedido? Se devuelve lo pagado a la caja.' : '¿Cancelar este pedido?')) cancelarOrden(o.key); }}
                    style={{ ...btn(MACACO.textMuted), flex: 'none', padding: '9px 12px' }}
                  >✕</button>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Proveedores */}
      <SectionTitle right={invertidoTotal > 0 ? clp(invertidoTotal) + ' invertido' : undefined}>Proveedores</SectionTitle>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 6 }}>
        {proveedores.map(g => (
          <div
            key={g.proveedor}
            onClick={() => setNuevo({ proveedor: g.proveedor })}
            style={{ background: MACACO.card, border: `1px solid ${MACACO.border}`, borderRadius: 14, padding: 14, cursor: 'pointer' }}
          >
            <div style={{ fontSize: 12, fontWeight: 700, color: MACACO.textDim, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{g.proveedor}</div>
            <div style={{ fontSize: 24, fontWeight: 800, marginTop: 6, fontVariantNumeric: 'tabular-nums', color: g.promedio === null ? MACACO.textMuted : '#fff' }}>
              {g.promedio === null ? '—' : `${g.promedio} d`}
            </div>
            <div style={{ fontSize: 10.5, color: MACACO.textMuted, marginTop: 2 }}>
              {g.promedio === null ? 'sin entregas aún' : `demora prom. (${g.min}–${g.max} d)`}
            </div>
            <div style={{ height: 1, background: MACACO.borderSoft, margin: '10px 0' }} />
            <div style={{ fontSize: 11, color: MACACO.textDim, lineHeight: 1.6 }}>
              Invertido <b style={{ color: '#fff' }}>{clpCompact(g.invertido)}</b><br />
              {g.recibidos} entrega{g.recibidos !== 1 ? 's' : ''}{g.enCamino > 0 ? ` · ${g.enCamino} en curso` : ''}
            </div>
          </div>
        ))}
      </div>
      <div style={{ fontSize: 10.5, color: MACACO.textMuted, margin: '0 4px 16px' }}>Toca un proveedor para hacerle un pedido.</div>

      {/* Historial */}
      {historial.length > 0 && (
        <>
          <SectionTitle>Historial</SectionTitle>
          <Card padding={0} style={{ marginBottom: 16 }}>
            {historial.map((o, i) => {
              const est  = ESTADO[o.estado];
              const dias = o.estado === 'recibido' && o.fechaLlegada ? diasEntre(o.fechaPedido, o.fechaLlegada) : null;
              const total = totalOrden(o);
              return (
                <div key={o.key} style={{
                  display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px',
                  borderBottom: i === historial.length - 1 ? 'none' : `1px solid ${MACACO.borderSoft}`,
                }}>
                  <Dot color={est.color} size={7} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 600 }}>{o.proveedor}</div>
                    <div style={{ fontSize: 11, color: MACACO.textMuted, marginTop: 1, lineHeight: 1.4 }}>
                      {o.lineas.map(l => `${l.producto} ×${l.cantidad}`).join(', ')}
                    </div>
                    <div style={{ fontSize: 10.5, color: MACACO.textMuted, marginTop: 1 }}>
                      {fechaCorta(o.fechaPedido)}{o.fechaLlegada ? ` → ${fechaCorta(o.fechaLlegada)}` : ''}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: est.color }}>{dias !== null ? `${dias} d` : est.label}</div>
                    {total > 0 && <div style={{ fontSize: 10.5, color: MACACO.textMuted, marginTop: 1 }}>{clpCompact(total)}</div>}
                  </div>
                  <button
                    onClick={() => { if (window.confirm('¿Borrar este pedido del historial? Si ya entró stock, no se descuenta.')) o.lineas.forEach(l => eliminarPedido(l.id)); }}
                    aria-label="Borrar"
                    style={{ background: 'transparent', border: 'none', color: MACACO.textMuted, fontSize: 16, cursor: 'pointer', padding: 4 }}
                  >×</button>
                </div>
              );
            })}
          </Card>
        </>
      )}

      {nuevo && (
        <NuevoPedidoSheet
          inicial={nuevo}
          productos={productos}
          proveedores={proveedores}
          caja={caja}
          onClose={() => setNuevo(null)}
          onSave={guardarPedido}
        />
      )}
      {recibir && (
        <RecibirSheet
          orden={recibir}
          onClose={() => setRecibir(null)}
          onConfirm={(fecha) => { recibir.lineas.forEach(l => recibirPedido(l.id, fecha)); setRecibir(null); }}
        />
      )}
    </>
  );
}

function btn(color, solid = false) {
  return {
    flex: 1, padding: '9px 8px', borderRadius: 9, cursor: 'pointer', fontFamily: 'inherit',
    fontSize: 11, fontWeight: 700, letterSpacing: '0.05em',
    background: solid ? color : color + '14',
    color: solid ? '#0A0A0F' : color,
    border: `1px solid ${solid ? color : color + '44'}`,
  };
}

function Sheet({ titulo, subtitulo, onClose, children }) {
  return (
    <div style={{ position: 'absolute', inset: 0, zIndex: 100, animation: 'fadeUp 220ms' }}>
      <div onClick={onClose} style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }} />
      <div style={{
        position: 'absolute', left: 0, right: 0, bottom: 0, maxHeight: '92%', overflowY: 'auto',
        background: MACACO.bg, borderTopLeftRadius: 24, borderTopRightRadius: 24,
        border: `1px solid ${MACACO.border}`, borderBottom: 'none',
        padding: '14px 18px 32px', boxShadow: '0 -20px 50px rgba(0,0,0,0.6)',
        animation: 'sheetUp 320ms cubic-bezier(.2,.7,.2,1)',
      }}>
        <div style={{ width: 36, height: 4, borderRadius: 999, background: 'rgba(255,255,255,0.18)', margin: '0 auto 16px' }} />
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 18 }}>
          <div>
            <div style={{ fontSize: 10.5, color: MACACO.primary, fontWeight: 700, letterSpacing: '0.16em', textTransform: 'uppercase' }}>{titulo}</div>
            {subtitulo && <div style={{ fontSize: 20, fontWeight: 800, marginTop: 4 }}>{subtitulo}</div>}
          </div>
          <button onClick={onClose} style={{
            width: 32, height: 32, borderRadius: 999, flexShrink: 0,
            background: MACACO.cardElev, border: `1px solid ${MACACO.border}`,
            color: '#fff', fontSize: 18, cursor: 'pointer', fontFamily: 'inherit',
          }}>×</button>
        </div>
        {children}
      </div>
    </div>
  );
}

function NuevoPedidoSheet({ inicial, productos, proveedores, caja, onClose, onSave }) {
  const primero = productos.find(p => p.id === inicial.productoId) || productos[0];
  const [proveedor, setProveedor] = useState(inicial.proveedor || '');
  const [otro, setOtro]           = useState(false);
  const [lineas, setLineas]       = useState([
    { productoId: primero?.id || '', cantidad: inicial.cantidad || 0, costo: primero?.cost || 0 },
  ]);
  const [fechaPedido, setFechaPedido] = useState(hoyISO());
  const [fechaEst, setFechaEst]       = useState(null); // null = automática según demora promedio
  const [tracking, setTracking]       = useState('');
  const [descontar, setDescontar]     = useState(true);

  const prov = proveedores.find(g => g.proveedor.toLowerCase() === proveedor.trim().toLowerCase());
  const leadProm = prov?.promedio ?? null;
  const fechaAuto  = leadProm !== null && fechaPedido ? sumarDias(fechaPedido, Math.ceil(leadProm)) : '';
  const fechaFinal = fechaEst ?? fechaAuto;

  const setLinea = (i, cambios) => setLineas(ls => ls.map((l, j) => j === i ? { ...l, ...cambios } : l));
  const elegirProducto = (i, id) => setLinea(i, { productoId: id, costo: productos.find(p => p.id === id)?.cost || 0 });
  const agregarLinea = () => {
    // Sugiere un producto que aún no esté en el pedido
    const libre = productos.find(p => !lineas.some(l => l.productoId === p.id)) || productos[0];
    setLineas(ls => [...ls, { productoId: libre.id, cantidad: 0, costo: libre.cost || 0 }]);
  };

  const validas = lineas.filter(l => l.productoId && l.cantidad > 0);
  const total   = validas.reduce((n, l) => n + l.cantidad * l.costo, 0);
  const canSave = proveedor.trim() && validas.length > 0 && fechaPedido;
  const esBase  = proveedores.some(g => g.proveedor.toLowerCase() === proveedor.trim().toLowerCase());

  return (
    <Sheet titulo="Nuevo pedido" subtitulo={proveedor.trim() || 'Elige proveedor'} onClose={onClose}>
      <div style={{ marginBottom: 14 }}>
        <label style={labelStyle}>Proveedor</label>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {proveedores.map(g => {
            const activo = g.proveedor.toLowerCase() === proveedor.trim().toLowerCase();
            return (
              <button key={g.proveedor} onClick={() => { setProveedor(g.proveedor); setOtro(false); setFechaEst(null); }} style={{
                padding: '9px 14px', borderRadius: 999, cursor: 'pointer', fontFamily: 'inherit',
                fontSize: 13, fontWeight: 700,
                background: activo ? MACACO.primary : MACACO.cardElev,
                color: activo ? '#0A0A0F' : '#fff',
                border: `1px solid ${activo ? MACACO.primary : MACACO.border}`,
              }}>{g.proveedor}</button>
            );
          })}
          <button onClick={() => { setOtro(true); setProveedor(''); }} style={{
            padding: '9px 14px', borderRadius: 999, cursor: 'pointer', fontFamily: 'inherit',
            fontSize: 13, fontWeight: 600, background: 'transparent', color: MACACO.textDim,
            border: `1px dashed ${MACACO.border}`,
          }}>+ Otro</button>
        </div>
        {(otro || (proveedor.trim() && !esBase)) && (
          <input
            autoFocus value={proveedor} onChange={e => setProveedor(e.target.value)}
            placeholder="Nombre del proveedor" style={{ ...inputStyle, marginTop: 10 }}
          />
        )}
        {proveedor.trim() && (
          <div style={{ fontSize: 11, color: MACACO.textMuted, marginTop: 8 }}>
            {leadProm !== null
              ? <>Demora promedio de {prov.proveedor}: <b style={{ color: '#fff' }}>{leadProm} días</b> ({prov.recibidos} entrega{prov.recibidos !== 1 ? 's' : ''})</>
              : 'Aún sin entregas registradas con este proveedor.'}
          </div>
        )}
      </div>

      <label style={labelStyle}>Productos del pedido</label>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 10 }}>
        {lineas.map((l, i) => (
          <div key={i} style={{ background: MACACO.card, border: `1px solid ${MACACO.border}`, borderRadius: 12, padding: 12 }}>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <select value={l.productoId} onChange={e => elegirProducto(i, e.target.value)} style={{ ...inputStyle, padding: '10px 12px', fontSize: 14 }}>
                {productos.map(p => <option key={p.id} value={p.id}>{p.name} (stock {p.stock})</option>)}
              </select>
              {lineas.length > 1 && (
                <button onClick={() => setLineas(ls => ls.filter((_, j) => j !== i))} aria-label="Quitar" style={{
                  width: 34, height: 34, flexShrink: 0, borderRadius: 8, cursor: 'pointer', fontFamily: 'inherit',
                  background: 'transparent', border: `1px solid ${MACACO.border}`, color: MACACO.textMuted, fontSize: 16,
                }}>×</button>
              )}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.3fr', gap: 8, marginTop: 8 }}>
              <div>
                <div style={{ fontSize: 10, color: MACACO.textMuted, marginBottom: 4 }}>Cantidad</div>
                <input
                  type="text" inputMode="numeric" placeholder="0" style={{ ...inputStyle, padding: '10px 12px' }}
                  value={l.cantidad === 0 ? '' : String(l.cantidad)}
                  onChange={e => setLinea(i, { cantidad: parseInt(e.target.value.replace(/\D/g, ''), 10) || 0 })}
                />
              </div>
              <div>
                <div style={{ fontSize: 10, color: MACACO.textMuted, marginBottom: 4 }}>Costo unitario</div>
                <input
                  type="text" inputMode="numeric" placeholder="0" style={{ ...inputStyle, padding: '10px 12px' }}
                  value={l.costo === 0 ? '' : l.costo.toLocaleString('es-CL')}
                  onChange={e => setLinea(i, { costo: parseInt(e.target.value.replace(/\D/g, ''), 10) || 0 })}
                />
              </div>
            </div>
          </div>
        ))}
      </div>
      <button onClick={agregarLinea} style={{
        width: '100%', padding: '11px', marginBottom: 14, borderRadius: 12, cursor: 'pointer', fontFamily: 'inherit',
        background: 'rgba(245,197,24,0.08)', color: MACACO.primary, fontSize: 12.5, fontWeight: 700,
        border: '1px dashed rgba(245,197,24,0.4)',
      }}>+ AGREGAR OTRO PRODUCTO</button>

      {total > 0 && (
        <div style={{ fontSize: 12.5, color: MACACO.textDim, marginBottom: 14 }}>
          Inversión total: <b style={{ color: '#fff', fontSize: 15 }}>{clp(total)}</b> · {validas.length} producto{validas.length !== 1 ? 's' : ''}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 6 }}>
        <div>
          <label style={labelStyle}>Fecha pedido</label>
          <input type="date" value={fechaPedido} onChange={e => setFechaPedido(e.target.value)} style={inputStyle} />
        </div>
        <div>
          <label style={labelStyle}>Llega (estimado)</label>
          <input type="date" value={fechaFinal} onChange={e => setFechaEst(e.target.value)} style={inputStyle} />
        </div>
      </div>
      <div style={{ fontSize: 11, color: MACACO.textMuted, marginBottom: 14, lineHeight: 1.4 }}>
        {leadProm !== null
          ? 'Estimado con la demora promedio del proveedor; puedes cambiarlo.'
          : 'Sin historial: pon la fecha que te dijeron. Al recibirlo se guarda la demora real.'}
      </div>

      <div style={{ marginBottom: 18 }}>
        <label style={labelStyle}>Seguimiento (opcional)</label>
        <input value={tracking} onChange={e => setTracking(e.target.value)} placeholder="N° de seguimiento o nota" style={inputStyle} />
      </div>

      {total > 0 && (
        <div
          onClick={() => setDescontar(d => !d)}
          style={{
            display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', marginBottom: 14,
            borderRadius: 12, cursor: 'pointer',
            background: descontar ? 'rgba(245,197,24,0.07)' : MACACO.card,
            border: `1px solid ${descontar ? 'rgba(245,197,24,0.35)' : MACACO.border}`,
          }}
        >
          <div style={{
            width: 22, height: 22, borderRadius: 6, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: descontar ? MACACO.primary : 'transparent', border: `1px solid ${descontar ? MACACO.primary : MACACO.border}`,
            color: '#0A0A0F', fontSize: 14, fontWeight: 800,
          }}>{descontar ? '✓' : ''}</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 13, fontWeight: 700 }}>Descontar {clp(total)} de la caja</div>
            <div style={{ fontSize: 11, color: MACACO.textMuted, marginTop: 2, lineHeight: 1.4 }}>
              Queda en Finanzas como "Compra inventario". Caja actual {clp(caja)}.
            </div>
          </div>
        </div>
      )}
      {descontar && total > caja && (
        <div style={{
          marginBottom: 14, padding: '10px 14px', borderRadius: 10,
          background: 'rgba(255,77,77,0.08)', border: '1px solid rgba(255,77,77,0.3)',
          fontSize: 12, color: MACACO.danger, fontWeight: 600,
        }}>
          La caja no alcanza ({clp(caja)}): quedaría en {clp(caja - total)}. Revisa si la caja está al día.
        </div>
      )}

      <button
        disabled={!canSave}
        onClick={() => canSave && onSave({
          proveedor: proveedor.trim(),
          lineas: validas.map(l => ({ productoId: l.productoId, producto: productos.find(p => p.id === l.productoId)?.name || '', cantidad: l.cantidad, costo: l.costo })),
          fechaPedido, fechaEstimada: fechaFinal || null, tracking: tracking.trim() || null,
          descontarCaja: descontar,
        })}
        style={{
          width: '100%', padding: '15px', borderRadius: 12, border: 'none',
          background: canSave ? MACACO.primary : MACACO.cardElev,
          color: canSave ? '#0A0A0F' : MACACO.textMuted,
          fontSize: 13.5, fontWeight: 800, letterSpacing: '0.04em', fontFamily: 'inherit',
          cursor: canSave ? 'pointer' : 'not-allowed',
          boxShadow: canSave ? `0 0 20px ${MACACO.primary}44` : 'none',
        }}
      >
        {canSave ? 'GUARDAR PEDIDO' : !proveedor.trim() ? 'ELIGE UN PROVEEDOR' : 'AGREGA CANTIDADES'}
      </button>
    </Sheet>
  );
}

function RecibirSheet({ orden, onClose, onConfirm }) {
  const [fecha, setFecha] = useState(hoyISO());
  const dias = fecha ? diasEntre(orden.fechaPedido, fecha) : null;
  const valido = fecha && dias >= 0;

  return (
    <Sheet titulo="Recibir pedido" subtitulo={orden.proveedor} onClose={onClose}>
      <div style={{ fontSize: 12.5, color: MACACO.textDim, marginBottom: 12, lineHeight: 1.5 }}>
        Pedido el {fechaCorta(orden.fechaPedido)}. Al confirmar entran estas unidades al stock:
      </div>
      <div style={{ padding: '8px 12px', borderRadius: 10, background: 'rgba(255,255,255,0.03)', marginBottom: 16 }}>
        {orden.lineas.map(l => (
          <div key={l.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, padding: '3px 0' }}>
            <span>{l.producto}</span>
            <b style={{ color: MACACO.success }}>+{l.cantidad}</b>
          </div>
        ))}
      </div>
      <div style={{ marginBottom: 14 }}>
        <label style={labelStyle}>Fecha en que llegó</label>
        <input type="date" value={fecha} min={orden.fechaPedido} max={hoyISO()} onChange={e => setFecha(e.target.value)} style={inputStyle} />
      </div>
      {valido && (
        <div style={{
          padding: '12px 14px', borderRadius: 12, marginBottom: 18,
          background: 'rgba(255,255,255,0.03)', border: `1px solid ${MACACO.border}`,
          fontSize: 13, color: MACACO.textDim,
        }}>
          Demoró <b style={{ color: '#fff', fontSize: 16 }}>{dias} día{dias !== 1 ? 's' : ''}</b> en llegar
        </div>
      )}
      <button
        disabled={!valido}
        onClick={() => valido && onConfirm(fecha)}
        style={{
          width: '100%', padding: '15px', borderRadius: 12, border: 'none',
          background: valido ? MACACO.success : MACACO.cardElev,
          color: valido ? '#0A0A0F' : MACACO.textMuted,
          fontSize: 13.5, fontWeight: 800, letterSpacing: '0.04em', fontFamily: 'inherit',
          cursor: valido ? 'pointer' : 'not-allowed',
        }}
      >
        CONFIRMAR RECEPCIÓN
      </button>
    </Sheet>
  );
}
