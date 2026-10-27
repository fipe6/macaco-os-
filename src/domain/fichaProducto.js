// Ficha de un producto: todo lo que se sabe de él a partir de los datos reales
// (ventas, movimientos de stock y pedidos). Funciones puras.
const DIA = 86_400_000;

export function fichaProducto(p, { ventas = [], movimientos = [], pedidos = [] } = {}, ahora = Date.now()) {
  const cost = Number(p.cost) || 0;
  const price = Number(p.price) || 0;
  const stock = Number(p.stock) || 0;
  const suyas = ventas.filter(v => v.productoId === p.id);
  const unidades = suyas.reduce((s, v) => s + (Number(v.cantidad) || 0), 0);
  const ingresos = suyas.reduce((s, v) => s + (Number(v.total) || 0), 0);
  const hace30 = ahora - 30 * DIA;
  const ultimos30 = suyas.filter(v => new Date(v.fecha).getTime() >= hace30);
  const fechas = suyas.map(v => new Date(v.fecha).getTime()).filter(Number.isFinite);
  const enCamino = pedidos.filter(x => x.productoId === p.id && (x.estado === 'pedido' || x.estado === 'en_camino'));
  return {
    gananciaUnidad: price - cost,
    margen: price > 0 && cost > 0 ? Math.round((price - cost) / price * 100) : null,
    valorCosto: stock * cost,
    valorVenta: stock * price,
    vendidas: unidades,
    ingresos,
    // Ganancia aproximada: lo cobrado menos el costo actual de lo vendido.
    gananciaVendida: unidades ? ingresos - unidades * cost : null,
    vendidas30: ultimos30.reduce((s, v) => s + (Number(v.cantidad) || 0), 0),
    ultimaVenta: fechas.length ? new Date(Math.max(...fechas)) : null,
    enCamino: enCamino.reduce((s, x) => s + (Number(x.cantidad) || 0), 0),
    llegaEl: enCamino.map(x => x.fechaEstimada).filter(Boolean).sort()[0] || null,
    movimientos: movimientos.filter(m => m.productoId === p.id).slice(0, 6),
  };
}
