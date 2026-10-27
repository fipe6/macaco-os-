import test from 'node:test';
import assert from 'node:assert/strict';
import { resultadoMes, historico, gastosPorCategoria, acumuladoMes, puntoEquilibrio, diasDeCaja, patrimonio } from './finanzas.js';

const OCT = new Date('2026-10-20T12:00:00');
const v = (dia, total, costo, cantidad = 1, extra = {}) => ({
  id: `${dia}-${total}`, fecha: new Date(2026, 9, dia, 12).toISOString(), total, costoUnitario: costo, cantidad, margen: total - costo * cantidad, productoId: 'a', ...extra,
});
const g = (dia, monto, categoria = 'Envíos', tipo = 'negocio', mes = 9) => ({ fecha: new Date(2026, mes, dia, 12).toISOString(), monto, categoria, tipo });

test('resultado del mes: ventas − costo − gastos = ganancia; compras de inventario no restan', () => {
  const r = resultadoMes([v(1, 30_000, 20_000), v(5, 20_000, 8_000)], [g(3, 5_000), g(4, 50_000, 'x', 'inventario')], OCT);
  assert.equal(r.ventas, 50_000);
  assert.equal(r.costo, 28_000);
  assert.equal(r.margenBruto, 22_000);
  assert.equal(r.gastos, 5_000);
  assert.equal(r.ganancia, 17_000);
  assert.equal(r.ticket, 25_000);
});

test('histórico: 6 meses del más viejo al actual', () => {
  const h = historico([v(1, 10_000, 5_000)], [], { fecha: OCT });
  assert.equal(h.length, 6);
  assert.deepEqual(h.map(x => x.label), ['May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct']);
  assert.equal(h[5].ventas, 10_000);
  assert.equal(h[5].ganancia, 5_000);
});

test('gastos por categoría: suma, ordena y agrupa las compras de inventario', () => {
  const c = gastosPorCategoria([g(1, 5_000), g(2, 7_000), g(3, 20_000, 'Meta'), g(4, 1_000, 'a', 'inventario'), g(5, 9_000, 'Envíos', 'negocio', 8)], OCT);
  assert.deepEqual(c.map(x => [x.categoria, x.monto]), [['Meta', 20_000], ['Envíos', 12_000], ['Compras de inventario', 1_000]]);
  assert.ok(Math.abs(c.reduce((n, x) => n + x.pct, 0) - 1) < 1e-9);
});

test('acumulado del mes: llega hasta hoy y acumula', () => {
  const a = acumuladoMes([v(2, 10_000, 1), v(2, 5_000, 1), v(10, 1_000, 1)], [g(3, 4_000)], OCT);
  assert.equal(a.length, 20);
  assert.deepEqual(a[1], { dia: 2, entra: 15_000, sale: 0 });
  assert.deepEqual(a[19], { dia: 20, entra: 16_000, sale: 4_000 });
});

test('punto de equilibrio: ventas necesarias para cubrir gastos con el margen actual', () => {
  const p = puntoEquilibrio({ ventas: 50_000, margenPct: 0.4, gastos: 40_000 });
  assert.equal(p.necesario, 100_000);
  assert.equal(p.cubierto, 0.5);
  assert.equal(p.falta, 50_000);
  assert.equal(puntoEquilibrio({ ventas: 0, margenPct: null, gastos: 1 }), null);
});

test('días de caja con el gasto promedio de 30 días', () => {
  const ahora = new Date('2026-10-20T12:00:00').getTime();
  assert.equal(diasDeCaja(300_000, [g(10, 30_000)], ahora), 300);
  assert.equal(diasDeCaja(300_000, [], ahora), null);
});

test('patrimonio: caja + en camino pagado + stock a costo; margen aparte; deuda', () => {
  const r = patrimonio({
    caja: 200_000,
    productos: [
      { id: 'a', name: 'A', stock: 10, cost: 9_000, price: 17_000 },
      { id: 'b', name: 'B', stock: 2, cost: 20_000, price: 36_000 },
      { id: 'c', name: 'C', stock: 0, cost: 5_000, price: 9_000 },
    ],
    pedidos: [
      { estado: 'pedido', pagado: 50_000 },
      { estado: 'pedido', pagado: 0 },
      { estado: 'recibido', pagado: 99_000 },
      { estado: 'cancelado', pagado: 99_000 },
    ],
    deudas: [{ amt: 500_000 }, { amt: 500_000 }],
  });
  assert.equal(r.disponible, 200_000);
  assert.equal(r.enCamino, 50_000);
  assert.equal(r.stockCosto, 130_000);
  assert.equal(r.stockVenta, 242_000);
  assert.equal(r.incierto, 112_000);
  assert.equal(r.seguro, 380_000);
  assert.equal(r.deuda, 1_000_000);
  assert.equal(r.neto, -620_000);
  assert.equal(r.netoSiVendes, -508_000);
  assert.equal(r.cubre.seguro, 0.38);
  assert.deepEqual(r.productos.map(p => p.id), ['a', 'b']);
  assert.deepEqual(r.productos[0], { id: 'a', nombre: 'A', costo: 90_000, venta: 170_000 });
});

test('patrimonio sin deuda no inventa porcentaje', () => {
  const r = patrimonio({ caja: 100, productos: [], pedidos: [], deudas: [] });
  assert.equal(r.cubre, null);
  assert.equal(r.neto, 100);
});
