import test from 'node:test';
import assert from 'node:assert/strict';
import { fichaProducto } from './fichaProducto.js';

const AHORA = new Date('2026-10-27T12:00:00').getTime();
const p = { id: 'a', name: 'Creatina', stock: 4, cost: 9_000, price: 17_000 };

test('ficha: ganancia, valor del stock, ventas y pedidos del producto', () => {
  const f = fichaProducto(p, {
    ventas: [
      { productoId: 'a', cantidad: 2, total: 34_000, fecha: '2026-10-20T10:00:00' },
      { productoId: 'a', cantidad: 1, total: 15_000, fecha: '2026-08-01T10:00:00' },
      { productoId: 'b', cantidad: 9, total: 99_000, fecha: '2026-10-21T10:00:00' },
    ],
    movimientos: [{ productoId: 'a', tipo: 'venta', delta: -2 }, { productoId: 'b', tipo: 'venta', delta: -9 }],
    pedidos: [
      { productoId: 'a', estado: 'pedido', cantidad: 6, fechaEstimada: '2026-11-05' },
      { productoId: 'a', estado: 'recibido', cantidad: 10 },
    ],
  }, AHORA);
  assert.equal(f.gananciaUnidad, 8_000);
  assert.equal(f.margen, 47);
  assert.equal(f.valorCosto, 36_000);
  assert.equal(f.valorVenta, 68_000);
  assert.equal(f.vendidas, 3);
  assert.equal(f.ingresos, 49_000);
  assert.equal(f.gananciaVendida, 22_000);
  assert.equal(f.vendidas30, 2);
  assert.equal(f.ultimaVenta.toISOString(), new Date('2026-10-20T10:00:00').toISOString());
  assert.equal(f.enCamino, 6);
  assert.equal(f.llegaEl, '2026-11-05');
  assert.equal(f.movimientos.length, 1);
});

test('ficha sin ventas no inventa cifras', () => {
  const f = fichaProducto(p, {}, AHORA);
  assert.equal(f.vendidas, 0);
  assert.equal(f.gananciaVendida, null);
  assert.equal(f.ultimaVenta, null);
});
