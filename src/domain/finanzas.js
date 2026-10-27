// Finanzas del negocio — cálculos para la pantalla Finanzas (funciones puras).
//
// Todo sale de ventas y gastos reales. Las compras de inventario son salida de
// caja pero NO gasto del resultado: su costo entra como costo de lo vendido.
import { resumenMes, gastosDelMes, mesKey, MESES } from '../store/selectors.js';

const DIA = 86_400_000;

// Estado de resultados del mes, en el orden de la cascada:
// ventas − costo de lo vendido = margen bruto − gastos del negocio = ganancia.
export function resultadoMes(ventas, gastos, fecha = new Date()) {
  const r = resumenMes(ventas, gastos, fecha);
  const margenBruto = r.total - r.cogs;
  return {
    ventas: r.total,
    costo: r.cogs,
    margenBruto,
    gastos: r.gastos,
    ganancia: margenBruto - r.gastos,
    margenPct: r.total > 0 ? margenBruto / r.total : null,
    transacciones: r.transacciones,
    ticket: r.transacciones > 0 ? r.total / r.transacciones : null,
  };
}

// Los últimos N meses (el más viejo primero), para el gráfico de barras.
export function historico(ventas, gastos, { meses = 6, fecha = new Date() } = {}) {
  return Array.from({ length: meses }, (_, i) => {
    const f = new Date(fecha.getFullYear(), fecha.getMonth() - (meses - 1 - i), 15);
    const r = resultadoMes(ventas, gastos, f);
    return { key: mesKey(f), label: MESES[f.getMonth()].slice(0, 3), ventas: r.ventas, ganancia: r.ganancia };
  });
}

// En qué se fue la plata del mes, de mayor a menor.
export function gastosPorCategoria(gastos, fecha = new Date()) {
  const m = {};
  gastosDelMes(gastos, fecha).forEach(g => {
    const k = g.tipo === 'inventario' ? 'Compras de inventario' : (g.categoria || 'Otros');
    m[k] = (m[k] || 0) + (g.monto || 0);
  });
  const total = Object.values(m).reduce((n, v) => n + v, 0);
  return Object.entries(m)
    .map(([categoria, monto]) => ({ categoria, monto, pct: total > 0 ? monto / total : 0 }))
    .sort((a, b) => b.monto - a.monto);
}

// Entradas y salidas de caja acumuladas día a día en el mes (hasta hoy).
export function acumuladoMes(ventas, gastos, fecha = new Date()) {
  const año = fecha.getFullYear(), mes = fecha.getMonth();
  const dias = fecha.getDate();
  const entra = Array(dias).fill(0), sale = Array(dias).fill(0);
  const dia = (iso) => { const d = new Date(iso); return d.getFullYear() === año && d.getMonth() === mes ? d.getDate() - 1 : -1; };
  ventas.forEach(v => { const i = dia(v.fecha); if (i >= 0 && i < dias) entra[i] += v.total || 0; });
  gastos.forEach(g => { const i = dia(g.fecha); if (i >= 0 && i < dias) sale[i] += g.monto || 0; });
  let e = 0, s = 0;
  return entra.map((_, i) => ({ dia: i + 1, entra: (e += entra[i]), sale: (s += sale[i]) }));
}

// Cuánto hay que vender en el mes para cubrir los gastos del negocio con el
// margen actual (punto de equilibrio). Sin margen o sin gastos: null.
export function puntoEquilibrio(resultado) {
  if (!resultado.margenPct || resultado.margenPct <= 0 || !resultado.gastos) return null;
  const necesario = resultado.gastos / resultado.margenPct;
  return { necesario, cubierto: Math.min(1, resultado.ventas / necesario), falta: Math.max(0, necesario - resultado.ventas) };
}

// Ritmo de gasto: cuántos días aguanta la caja con el gasto promedio diario de
// los últimos 30 días (sin contar compras de inventario). Sin gastos: null.
export function diasDeCaja(caja, gastos, ahora = Date.now()) {
  const desde = ahora - 30 * DIA;
  const g = gastos.filter(x => x.tipo === 'negocio' && new Date(x.fecha).getTime() >= desde)
    .reduce((n, x) => n + (x.monto || 0), 0);
  if (g <= 0) return null;
  return Math.floor(Math.max(0, caja) / (g / 30));
}

// De qué está hecho el patrimonio del negocio, a hoy.
// Seguro = plata y mercadería que ya es nuestra: caja + pedidos ya pagados que
// vienen en camino + stock a costo. Incierto = lo que se ganaría si se vende
// todo el stock a precio de venta (solo es real cuando se vende).
export function patrimonio({ caja = 0, productos = [], pedidos = [], deudas = [] }) {
  const stock = productos.filter(p => (Number(p.stock) || 0) > 0);
  const stockCosto = stock.reduce((s, p) => s + p.stock * (Number(p.cost) || 0), 0);
  const stockVenta = stock.reduce((s, p) => s + p.stock * (Number(p.price) || 0), 0);
  const enCamino = pedidos
    .filter(p => p.estado === 'pedido' || p.estado === 'en_camino')
    .reduce((s, p) => s + (Number(p.pagado) || 0), 0);
  const deuda = deudas.reduce((s, d) => s + (Number(d.amt) || 0), 0);
  const disponible = Math.max(0, Number(caja) || 0);
  const seguro = disponible + enCamino + stockCosto;
  const incierto = Math.max(0, stockVenta - stockCosto);
  const productosDetalle = stock
    .map(p => ({ id: p.id, nombre: p.name, costo: p.stock * (Number(p.cost) || 0), venta: p.stock * (Number(p.price) || 0) }))
    .sort((a, b) => b.costo - a.costo);
  return {
    disponible, enCamino, stockCosto, stockVenta, incierto, deuda, seguro,
    neto: seguro - deuda,
    netoSiVendes: seguro + incierto - deuda,
    // Parte de la deuda que se cubre (null si no hay deuda).
    cubre: deuda > 0 ? {
      disponible: disponible / deuda,
      conCamino: (disponible + enCamino) / deuda,
      seguro: seguro / deuda,
      siVendes: (seguro + incierto) / deuda,
    } : null,
    productos: productosDetalle,
  };
}
