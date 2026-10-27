// Macaco OS — reglas de dinero y stock como funciones PURAS.
//
// Cada función recibe el estado actual y devuelve un "parche" con SOLO las
// claves que cambiaron ({ ventas, productos, caja, movimientos, ... }).
// No toca React, ni localStorage, ni la red: el provider aplica el parche y lo
// guarda. Así cada regla de plata se puede probar sola y una acción compuesta
// (venta = ventas + stock + caja + movimientos) siempre cambia TODO junto.

export function calcStatus(stock, alerta = 3) {
  if (stock === 0) return 'out';
  if (stock <= alerta) return 'low';
  return 'ok';
}

export function nuevoId() {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 10);
}

const contexto = (ctx = {}) => ({
  ahora:  ctx.ahora  || new Date().toISOString(),
  genId:  ctx.genId  || nuevoId,
  alerta: ctx.alerta ?? 3,
});

const entero = (n) => Number.isFinite(n) && Math.round(n) === n;

function setStock(producto, stock, alerta) {
  return { ...producto, stock, status: calcStatus(stock, alerta) };
}

// ── Ventas ───────────────────────────────────────────────────────────────────
// `lineas` es una venta o un pack (varias líneas). Se guarda TODO o nada: si una
// línea es inválida lanza error antes de cambiar nada.
export function registrarVenta(estado, lineas, ctx) {
  const c = contexto(ctx);
  const lista = Array.isArray(lineas) ? lineas : [lineas];
  if (lista.length === 0) throw new Error('La venta no tiene líneas');
  lista.forEach((l, i) => {
    if (!l.productoId) throw new Error(`Línea ${i + 1}: falta el producto`);
    if (!entero(l.cantidad) || l.cantidad <= 0) throw new Error(`Línea ${i + 1}: cantidad inválida`);
    if (!Number.isFinite(l.total) || l.total < 0) throw new Error(`Línea ${i + 1}: total inválido`);
  });

  const nuevas = lista.map(l => ({ ...l, id: c.genId(), fecha: c.ahora }));

  let productos = estado.productos;
  const movimientos = [];
  nuevas.forEach(v => {
    const p = productos.find(x => x.id === v.productoId);
    if (!p) return; // producto borrado del catálogo: la venta se registra igual
    const despues = Math.max(0, p.stock - v.cantidad);
    productos = productos.map(x => x.id === p.id ? setStock(x, despues, c.alerta) : x);
    movimientos.push({
      id: c.genId(), fecha: c.ahora, tipo: 'venta',
      productoId: p.id, producto: p.name,
      delta: despues - p.stock, stockAntes: p.stock, stockDespues: despues,
      ventaId: v.id,
    });
  });

  return {
    // la lista guarda lo más nuevo primero
    ventas:      [...nuevas.slice().reverse(), ...estado.ventas],
    productos,
    caja:        estado.caja + nuevas.reduce((n, v) => n + v.total, 0),
    movimientos: [...movimientos.slice().reverse(), ...estado.movimientos],
    cambiaronProductos: [...new Set(nuevas.map(v => v.productoId))],
  };
}

// Anular una venta devuelve stock y caja. Un pack se anula completo.
// Deja un movimiento 'anulacion' para que el historial de stock cuadre.
export function cancelarVenta(estado, ventaId, ctx) {
  const c = contexto(ctx);
  const venta = estado.ventas.find(v => v.id === ventaId);
  if (!venta) return null;
  const anuladas = venta.packId ? estado.ventas.filter(v => v.packId === venta.packId) : [venta];

  let productos = estado.productos;
  const movimientos = [];
  anuladas.forEach(a => {
    const p = productos.find(x => x.id === a.productoId);
    if (!p) return;
    const despues = p.stock + a.cantidad;
    productos = productos.map(x => x.id === p.id ? setStock(x, despues, c.alerta) : x);
    movimientos.push({
      id: c.genId(), fecha: c.ahora, tipo: 'anulacion',
      productoId: p.id, producto: p.name,
      delta: a.cantidad, stockAntes: p.stock, stockDespues: despues,
      ventaId: a.id,
    });
  });

  return {
    ventas:      estado.ventas.filter(v => !anuladas.includes(v)),
    productos,
    caja:        estado.caja - anuladas.reduce((n, a) => n + a.total, 0),
    movimientos: [...movimientos.slice().reverse(), ...estado.movimientos],
    cambiaronProductos: [...new Set(anuladas.map(a => a.productoId))],
  };
}

// ── Stock ────────────────────────────────────────────────────────────────────
// Ajuste manual (compra, baja, auspicio, corrección). Siempre deja movimiento.
// `extra` agrega campos al movimiento (proveedor, pedidoId...).
export function ajustarStock(estado, productoId, delta, tipo, ctx, extra = {}) {
  const c = contexto(ctx);
  if (!entero(delta) || delta === 0) throw new Error('Ajuste de stock inválido');
  const p = estado.productos.find(x => x.id === productoId);
  if (!p) throw new Error('Producto no encontrado');
  const despues = Math.max(0, p.stock + delta);
  return {
    productos: estado.productos.map(x => x.id === p.id ? setStock(x, despues, c.alerta) : x),
    movimientos: [{
      id: c.genId(), fecha: c.ahora, tipo,
      productoId: p.id, producto: p.name,
      delta: despues - p.stock, stockAntes: p.stock, stockDespues: despues,
      ...extra,
    }, ...estado.movimientos],
    cambiaronProductos: [p.id],
  };
}

// ── Caja, gastos y compras ───────────────────────────────────────────────────
export function registrarGasto(estado, gasto, ctx) {
  const c = contexto(ctx);
  if (!Number.isFinite(gasto.monto) || gasto.monto <= 0) throw new Error('Monto de gasto inválido');
  const nuevo = { ...gasto, id: c.genId(), fecha: c.ahora };
  return {
    gastos: [nuevo, ...estado.gastos],
    // solo el gasto de negocio sale de la caja del negocio
    ...(gasto.tipo === 'negocio' ? { caja: estado.caja - gasto.monto } : {}),
    gastoId: nuevo.id,
  };
}

// Compra de inventario: sale de la caja y queda como gasto tipo 'inventario'
// (no cuenta como gasto de negocio: su costo entra como COGS al vender).
export function registrarCompra(estado, { monto, descripcion, proveedor, ordenId }, ctx) {
  const c = contexto(ctx);
  if (!Number.isFinite(monto) || monto <= 0) throw new Error('Monto de compra inválido');
  const nuevo = {
    id: c.genId(), categoria: 'Compra inventario', categoriaId: 'compra-inventario', tipo: 'inventario',
    monto, descripcion: descripcion || null, proveedor: proveedor || null, ordenId: ordenId || null,
    fecha: c.ahora,
  };
  return { gastos: [nuevo, ...estado.gastos], caja: estado.caja - monto, gastoId: nuevo.id };
}

export function anularCompra(estado, gastoId) {
  const g = estado.gastos.find(x => x.id === gastoId);
  if (!g) return null;
  return { gastos: estado.gastos.filter(x => x.id !== gastoId), caja: estado.caja + g.monto };
}

export function ajustarCaja(estado, valor) {
  if (!Number.isFinite(valor)) throw new Error('Caja inválida');
  return { caja: valor };
}

export function pagarDeuda(estado, id, monto) {
  if (!Number.isFinite(monto) || monto <= 0) throw new Error('Monto de pago inválido');
  return {
    deudas: estado.deudas
      .map(d => d.id !== id ? d : { ...d, amt: Math.max(0, d.amt - monto) })
      .filter(d => d.amt > 0),
    caja: Math.max(0, estado.caja - monto),
  };
}

// ── Pedidos a proveedores ────────────────────────────────────────────────────
// Un pedido con varios productos = una sola salida de caja por el total.
export function registrarOrden(estado, { proveedor, lineas, fechaPedido, fechaEstimada, tracking, descontarCaja }, ctx) {
  const c = contexto(ctx);
  if (!lineas?.length) throw new Error('El pedido no tiene líneas');
  const ordenId = 'ord-' + c.genId();
  const total = lineas.reduce((n, l) => n + l.cantidad * l.costo, 0);

  let parche = {};
  let gastoId = null;
  if (descontarCaja && total > 0) {
    parche = registrarCompra(estado, {
      monto: total, proveedor, ordenId,
      descripcion: `${proveedor} · ${lineas.map(l => `${l.producto} ×${l.cantidad}`).join(', ')}`,
    }, c);
    gastoId = parche.gastoId;
  }
  const nuevos = lineas.map(l => ({
    id: c.genId(), creadoEn: c.ahora, estado: 'pedido',
    ordenId, proveedor, productoId: l.productoId, producto: l.producto,
    cantidad: l.cantidad, costoUnitario: l.costo, fechaPedido, fechaEstimada, tracking,
    gastoId, pagado: gastoId ? l.cantidad * l.costo : 0,
  }));
  return { ...parche, pedidos: [...nuevos.slice().reverse(), ...estado.pedidos], ordenId };
}

// Cancelar una orden devuelve a la caja lo que se había pagado.
export function cancelarOrden(estado, ordenId) {
  const lineas = estado.pedidos.filter(p => p.ordenId === ordenId);
  if (!lineas.length) return null;
  let parche = { pedidos: estado.pedidos.map(p => p.ordenId === ordenId ? { ...p, estado: 'cancelado' } : p) };
  const gastoId = lineas.find(l => l.gastoId)?.gastoId;
  if (gastoId) {
    const anulada = anularCompra(estado, gastoId);
    if (anulada) parche = { ...parche, ...anulada };
  }
  return parche;
}

// Al recibir una línea de pedido entra el stock y queda la demora real.
export function recibirPedido(estado, pedidoId, fechaLlegada, ctx) {
  const ped = estado.pedidos.find(p => p.id === pedidoId);
  if (!ped || ped.estado === 'recibido') return null;
  const pedidos = estado.pedidos.map(p => p.id === pedidoId ? { ...p, estado: 'recibido', fechaLlegada } : p);
  if (!estado.productos.some(p => p.id === ped.productoId)) return { pedidos };
  const ajuste = ajustarStock(estado, ped.productoId, ped.cantidad, 'compra', ctx,
    { proveedor: ped.proveedor, pedidoId: ped.id });
  return { ...ajuste, pedidos };
}
