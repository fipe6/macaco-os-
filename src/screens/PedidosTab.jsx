import { useState } from 'react';
import { MACACO, clp, clpCompact } from '../theme.js';
import { Card, SectionTitle, Dot, Icon } from '../components/ui.jsx';
import {
  useApp, hoyISO, diasEntre, sumarDias, resumenProveedores, sugerenciasReposicion,
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

export default function PedidosTab() {
  const { productos, ventas, pedidos, registrarPedido, actualizarPedido, eliminarPedido, recibirPedido } = useApp();
  const [nuevo, setNuevo]     = useState(null);   // null | objeto con datos precargados
  const [recibir, setRecibir] = useState(null);
  const hoy = hoyISO();

  const proveedores = resumenProveedores(pedidos);
  const sugerencias = sugerenciasReposicion({ productos, ventas, pedidos }).slice(0, 6);
  const activos = pedidos
    .filter(p => p.estado === 'pedido' || p.estado === 'en_camino')
    .sort((a, b) => (a.fechaEstimada || '9999').localeCompare(b.fechaEstimada || '9999'));
  const historial = pedidos.filter(p => p.estado === 'recibido' || p.estado === 'cancelado').slice(0, 15);
  const invertidoTotal = proveedores.reduce((n, g) => n + g.invertido, 0);

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
        <Icon.plus size={15} /> REGISTRAR PEDIDO A PROVEEDOR
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

      {/* En curso */}
      <SectionTitle right={activos.length ? `${activos.length} activo${activos.length > 1 ? 's' : ''}` : undefined}>En camino</SectionTitle>
      {activos.length === 0 ? (
        <Card style={{ marginBottom: 16 }}>
          <div style={{ textAlign: 'center', padding: '6px 0', color: MACACO.textMuted, fontSize: 12.5 }}>Sin pedidos pendientes</div>
        </Card>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 16 }}>
          {activos.map(p => {
            const est   = ESTADO[p.estado];
            const lleva = diasEntre(p.fechaPedido, hoy);
            const resta = p.fechaEstimada ? diasEntre(hoy, p.fechaEstimada) : null;
            const atrasado = resta !== null && resta < 0;
            return (
              <Card key={p.id} padding={14} accent={atrasado ? 'rgba(255,77,77,0.35)' : undefined}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 }}>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: 700 }}>{p.producto} <span style={{ color: MACACO.textMuted, fontWeight: 500 }}>×{p.cantidad}</span></div>
                    <div style={{ fontSize: 11.5, color: MACACO.textMuted, marginTop: 3 }}>
                      {p.proveedor} · pedido {fechaCorta(p.fechaPedido)}{p.costoUnitario ? ` · ${clp(p.costoUnitario * p.cantidad)}` : ''}
                    </div>
                  </div>
                  <span style={{
                    fontSize: 10, fontWeight: 700, padding: '3px 8px', borderRadius: 999, flexShrink: 0,
                    background: est.color + '1F', color: est.color, textTransform: 'uppercase', letterSpacing: '0.06em',
                  }}>{est.label}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 10, fontSize: 12 }}>
                  <span style={{ color: MACACO.textDim }}>Lleva {lleva} día{lleva !== 1 ? 's' : ''}</span>
                  <span style={{ fontWeight: 700, color: atrasado ? MACACO.danger : MACACO.textDim }}>
                    {resta === null ? 'sin fecha estimada'
                      : atrasado ? `atrasado ${-resta} día${-resta !== 1 ? 's' : ''}`
                      : resta === 0 ? 'llega hoy' : `llega en ${resta} día${resta !== 1 ? 's' : ''}`}
                  </span>
                </div>
                {p.tracking && <div style={{ fontSize: 11, color: MACACO.textMuted, marginTop: 6 }}>Seguimiento: {p.tracking}</div>}
                <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                  {p.estado === 'pedido' && (
                    <button onClick={() => actualizarPedido(p.id, { estado: 'en_camino', fechaEnvio: hoy })} style={btn(MACACO.cyan)}>
                      MARCAR EN CAMINO
                    </button>
                  )}
                  <button onClick={() => setRecibir(p)} style={btn(MACACO.success, true)}>RECIBIDO</button>
                  <button
                    onClick={() => { if (window.confirm('¿Cancelar este pedido?')) actualizarPedido(p.id, { estado: 'cancelado' }); }}
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
      {proveedores.length === 0 ? (
        <Card style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 12, color: MACACO.textMuted, lineHeight: 1.5, textAlign: 'center', padding: '6px 0' }}>
            Registra tus pedidos y marca cuándo llegan: así se calcula cuánto demora cada proveedor y cuánto has invertido con cada uno.
          </div>
        </Card>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 16 }}>
          {proveedores.map(g => (
            <div key={g.proveedor} style={{ background: MACACO.card, border: `1px solid ${MACACO.border}`, borderRadius: 14, padding: 14 }}>
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
      )}

      {/* Historial */}
      {historial.length > 0 && (
        <>
          <SectionTitle>Historial</SectionTitle>
          <Card padding={0} style={{ marginBottom: 16 }}>
            {historial.map((p, i) => {
              const est  = ESTADO[p.estado];
              const dias = p.estado === 'recibido' && p.fechaLlegada ? diasEntre(p.fechaPedido, p.fechaLlegada) : null;
              return (
                <div key={p.id} style={{
                  display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px',
                  borderBottom: i === historial.length - 1 ? 'none' : `1px solid ${MACACO.borderSoft}`,
                }}>
                  <Dot color={est.color} size={7} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {p.producto} ×{p.cantidad}
                    </div>
                    <div style={{ fontSize: 11, color: MACACO.textMuted, marginTop: 1 }}>
                      {p.proveedor} · {fechaCorta(p.fechaPedido)}{p.fechaLlegada ? ` → ${fechaCorta(p.fechaLlegada)}` : ''}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: est.color }}>{dias !== null ? `${dias} d` : est.label}</div>
                    {p.costoUnitario > 0 && <div style={{ fontSize: 10.5, color: MACACO.textMuted, marginTop: 1 }}>{clpCompact(p.costoUnitario * p.cantidad)}</div>}
                  </div>
                  <button
                    onClick={() => { if (window.confirm('¿Borrar este pedido del historial? Si ya entró stock, no se descuenta.')) eliminarPedido(p.id); }}
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
          onClose={() => setNuevo(null)}
          onSave={(p) => { registrarPedido(p); setNuevo(null); }}
        />
      )}
      {recibir && (
        <RecibirSheet
          pedido={recibir}
          onClose={() => setRecibir(null)}
          onConfirm={(fecha) => { recibirPedido(recibir.id, fecha); setRecibir(null); }}
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
        position: 'absolute', left: 0, right: 0, bottom: 0, maxHeight: '90%', overflowY: 'auto',
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

function NuevoPedidoSheet({ inicial, productos, proveedores, onClose, onSave }) {
  const prodInicial = productos.find(p => p.id === inicial.productoId) || productos[0];
  const [proveedor, setProveedor]   = useState(inicial.proveedor || '');
  const [productoId, setProductoId] = useState(prodInicial?.id || '');
  const [cantidad, setCantidad]     = useState(inicial.cantidad || 0);
  const [costo, setCosto]           = useState(prodInicial?.cost || 0);
  const [fechaPedido, setFechaPedido] = useState(hoyISO());
  const [fechaEst, setFechaEst]     = useState(null); // null = automática según demora promedio
  const [tracking, setTracking]     = useState('');

  const prod = productos.find(p => p.id === productoId);
  const prov = proveedores.find(g => g.proveedor.toLowerCase() === proveedor.trim().toLowerCase());
  const leadProm = prov?.promedio ?? null;
  const fechaAuto = leadProm !== null && fechaPedido ? sumarDias(fechaPedido, Math.ceil(leadProm)) : '';
  const fechaFinal = fechaEst ?? fechaAuto;
  const canSave = proveedor.trim() && prod && cantidad > 0 && fechaPedido;

  return (
    <Sheet titulo="Nuevo pedido" subtitulo="Compra a proveedor" onClose={onClose}>
      <div style={{ marginBottom: 14 }}>
        <label style={labelStyle}>Proveedor</label>
        <input
          list="lista-proveedores" value={proveedor} onChange={e => setProveedor(e.target.value)}
          placeholder="Ej. Suplementos Chile" style={inputStyle}
        />
        <datalist id="lista-proveedores">
          {proveedores.map(g => <option key={g.proveedor} value={g.proveedor} />)}
        </datalist>
      </div>

      <div style={{ marginBottom: 14 }}>
        <label style={labelStyle}>Producto</label>
        <select
          value={productoId}
          onChange={e => { setProductoId(e.target.value); setCosto(productos.find(p => p.id === e.target.value)?.cost || 0); }}
          style={inputStyle}
        >
          {productos.map(p => <option key={p.id} value={p.id}>{p.name} (stock {p.stock})</option>)}
        </select>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 14 }}>
        <div>
          <label style={labelStyle}>Cantidad</label>
          <input
            type="text" inputMode="numeric" placeholder="0" style={inputStyle}
            value={cantidad === 0 ? '' : String(cantidad)}
            onChange={e => setCantidad(parseInt(e.target.value.replace(/\D/g, ''), 10) || 0)}
          />
        </div>
        <div>
          <label style={labelStyle}>Costo unitario</label>
          <input
            type="text" inputMode="numeric" placeholder="0" style={inputStyle}
            value={costo === 0 ? '' : costo.toLocaleString('es-CL')}
            onChange={e => setCosto(parseInt(e.target.value.replace(/\D/g, ''), 10) || 0)}
          />
        </div>
      </div>

      {cantidad > 0 && costo > 0 && (
        <div style={{ fontSize: 12, color: MACACO.textDim, marginBottom: 14 }}>
          Inversión: <b style={{ color: '#fff' }}>{clp(cantidad * costo)}</b>
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
          ? `Estimado según la demora promedio de ${prov.proveedor}: ${leadProm} días.`
          : 'Sin historial con este proveedor: pon la fecha que te dijeron. Al recibirlo se guarda la demora real.'}
      </div>

      <div style={{ marginBottom: 18 }}>
        <label style={labelStyle}>Seguimiento (opcional)</label>
        <input value={tracking} onChange={e => setTracking(e.target.value)} placeholder="N° de seguimiento o nota" style={inputStyle} />
      </div>

      <button
        disabled={!canSave}
        onClick={() => canSave && onSave({
          proveedor: proveedor.trim(), productoId, producto: prod.name,
          cantidad, costoUnitario: costo, fechaPedido,
          fechaEstimada: fechaFinal || null, tracking: tracking.trim() || null,
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
        {canSave ? 'GUARDAR PEDIDO' : 'COMPLETA LOS CAMPOS'}
      </button>
    </Sheet>
  );
}

function RecibirSheet({ pedido, onClose, onConfirm }) {
  const [fecha, setFecha] = useState(hoyISO());
  const dias = fecha ? diasEntre(pedido.fechaPedido, fecha) : null;
  const valido = fecha && dias >= 0;

  return (
    <Sheet titulo="Recibir pedido" subtitulo={pedido.producto} onClose={onClose}>
      <div style={{ fontSize: 12.5, color: MACACO.textDim, marginBottom: 16, lineHeight: 1.5 }}>
        {pedido.proveedor} · pedido el {fechaCorta(pedido.fechaPedido)}. Al confirmar entran <b style={{ color: '#fff' }}>+{pedido.cantidad} unidades</b> al stock.
      </div>
      <div style={{ marginBottom: 14 }}>
        <label style={labelStyle}>Fecha en que llegó</label>
        <input type="date" value={fecha} min={pedido.fechaPedido} max={hoyISO()} onChange={e => setFecha(e.target.value)} style={inputStyle} />
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
