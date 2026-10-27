import test from 'node:test';
import assert from 'node:assert/strict';
import { areasPortada, ahoraPaso, saludProductos, NODOS } from './portada.js';

const AHORA = new Date('2026-10-27T15:00:00').getTime();
const hace = (d) => new Date(AHORA - d * 86_400_000).toISOString();
const productos = [
  { id: 'a', name: 'A', stock: 10, price: 15000 },
  { id: 'b', name: 'B', stock: 1,  price: 20000 },
  { id: 'c', name: 'C', stock: 0,  price: 0 },
];

test('seis puntos con id único y posición dentro del cerebro', () => {
  assert.equal(NODOS.length, 6);
  assert.equal(new Set(NODOS.map(n => n.id)).size, 6);
  NODOS.forEach(n => assert.ok(Math.abs(n.x) <= 0.7 && Math.abs(n.y) <= 0.7));
});

test('salud de productos: de lo que se vende, cuánto tiene stock sobre la alerta', () => {
  const ventas = [{ productoId: 'a', fecha: hace(2) }, { productoId: 'b', fecha: hace(3) }];
  assert.equal(saludProductos(productos, ventas, { alertaStockBajo: 3 }, AHORA), 0.5);
  assert.equal(saludProductos([], ventas, {}, AHORA), null);
  // sin ventas recientes mira todo el catálogo
  assert.ok(Math.abs(saludProductos(productos, [], { alertaStockBajo: 3 }, AHORA) - 1 / 3) < 1e-9);
});

test('fuente o silencio: las áreas sin datos salen "sin medir", no con un puntaje inventado', () => {
  const a = areasPortada({ productos, ventas: [], caja: 500_000, config: { colchonMinimo: 200_000, metaMensual: 1_000_000 }, ahora: AHORA });
  const por = Object.fromEntries(a.map(x => [x.id, x]));
  assert.equal(por.marketing.medido, false);
  assert.equal(por.legal.medido, false);
  assert.equal(por.catalogo.dato, '2 en catálogo');
  assert.equal(por.productos.dato, '3 productos');
  assert.equal(por.productos.medido, true);
  assert.match(por.finanzas.dato, /^Caja \$500k$/);
});

test('"Ahora": la primera decisión pendiente; si todo está decidido, sin urgencias y sin culpa', () => {
  const decs = [
    { id: 'x', accion: 'Reponer 5 u', senal: 'Sin stock', evidencia: ['Se vendía 0,4 u/día'], destino: 'inventario', area: 'stock' },
    { id: 'y', accion: 'Otra', senal: 'Otra señal', evidencia: [] },
  ];
  assert.equal(ahoraPaso(decs).titulo, 'Reponer 5 u');
  assert.equal(ahoraPaso(decs).porque, 'Se vendía 0,4 u/día');
  assert.equal(ahoraPaso(decs, { x: { estado: 'aprobada' } }).titulo, 'Otra');
  const vacio = ahoraPaso(decs, { x: {}, y: {} });
  assert.match(vacio.titulo, /Todo en orden/);
  assert.equal(vacio.destino, null);
});
