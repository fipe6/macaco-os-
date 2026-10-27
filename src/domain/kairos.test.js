import test from 'node:test';
import assert from 'node:assert/strict';
import { timonel, vigias, saludNegocio, telemetria } from './kairos.js';

const DIA = 86_400_000;
const AHORA = new Date('2026-10-27T15:00:00').getTime();
const hace = (d) => new Date(AHORA - d * DIA).toISOString();

const PRODUCTOS = [
  { id: 'a', name: 'Creatina', stock: 6,  cost: 8000,  price: 17000 },  // ROI 112%
  { id: 'b', name: 'Proteína', stock: 4,  cost: 20000, price: 36000 },  // ROI 80%
  { id: 'c', name: 'Omega',    stock: 10, cost: 7000,  price: 8000 },   // ROI 14%
  { id: 'd', name: 'Gummy',    stock: 8,  cost: 9000,  price: 16000 },  // no se vende
];

const venta = (productoId, dias, total, cantidad = 1, margen = 0) =>
  ({ productoId, producto: PRODUCTOS.find(p => p.id === productoId)?.name, fecha: hace(dias), cantidad, total, margen,
     costoUnitario: PRODUCTOS.find(p => p.id === productoId)?.cost });

// 4 semanas de historial: creatina sube, proteína estable, omega baja.
function historial() {
  const v = [];
  for (let d = 27; d >= 0; d--) {
    if (d % 3 === 0 || d < 7) v.push(venta('a', d, 17000, 1, 9000));
    if (d % 4 === 0) v.push(venta('b', d, 36000, 1, 16000));
    if (d >= 7 && d % 2 === 0) v.push(venta('c', d, 8000, 1, 1000));
  }
  return v;
}

test('timonel: sin 14 días de historial no opina', () => {
  const r = timonel({ productos: PRODUCTOS, ventas: [venta('a', 3, 17000)], ahora: AHORA });
  assert.equal(r.listo, false);
  assert.equal(r.jugada, null);
});

test('timonel: escala lo que deja más y sube; recorta lo parado', () => {
  const r = timonel({ productos: PRODUCTOS, ventas: historial(), ahora: AHORA });
  assert.equal(r.listo, true);
  assert.equal(r.jugada.tipo, 'comprar');
  assert.equal(r.jugada.productoId, 'a');
  assert.match(r.jugada.titulo, /Creatina/);
  const clase = Object.fromEntries(r.ranking.map(x => [x.id, x.clase]));
  assert.equal(clase.a, 'escalar');
  assert.equal(clase.c, 'vigilar');   // ROI bajo y cayendo
  assert.equal(clase.d, 'recortar');  // stock parado, no se vende
  assert.equal(r.recortar.id, 'd');
  assert.ok(r.ranking.find(x => x.id === 'a').tendencia > 0);
});

test('timonel: si lo que más rinde ya tiene stock de sobra, la jugada es liberar lo parado', () => {
  const prods = PRODUCTOS.map(p => p.id === 'a' ? { ...p, stock: 200 } : p.id === 'b' ? { ...p, stock: 60 } : p);
  const r = timonel({ productos: prods, ventas: historial(), ahora: AHORA });
  assert.equal(r.jugada.tipo, 'liberar');
  assert.equal(r.jugada.productoId, 'a'); // el que más capital tiene parado
  assert.match(r.jugada.titulo, /No compres más Creatina/);
});

test('timonel: el ROI sale del precio real de venta, no del de lista', () => {
  const ventas = [];
  for (let d = 20; d >= 0; d -= 2) ventas.push({ ...venta('b', d, 26000, 1, 6000), costoUnitario: 20000 });
  const r = timonel({ productos: PRODUCTOS, ventas, ahora: AHORA });
  assert.equal(Math.round(r.ranking.find(x => x.id === 'b').roi * 100), 30); // 6.000 / 20.000, no 80%
});

test('vigías: sin 2 semanas de base no alarma', () => {
  assert.equal(vigias({ ventas: [venta('a', 10, 1000)], ahora: AHORA }), null);
});

test('vigías: detecta pico y nombra el producto que lo explica', () => {
  const v = [];
  for (let d = 27; d >= 7; d -= 2) v.push(venta('b', d, 36000));
  for (let d = 6; d >= 0; d--) v.push(venta('a', d, 17000), venta('a', d, 17000), venta('b', d, 36000));
  const r = vigias({ ventas: v, productos: PRODUCTOS, ahora: AHORA });
  assert.equal(r.tipo, 'pico');
  assert.match(r.evidencia[1], /Creatina/);
  assert.equal(r.acciones.length, 3);
  assert.match(r.acciones[0], /quedan 6 u/);
});

test('vigías: detecta caída y prioriza reponer si el producto está en cero', () => {
  const prods = PRODUCTOS.map(p => p.id === 'b' ? { ...p, stock: 0 } : p);
  const v = [];
  for (let d = 27; d >= 7; d--) v.push(venta('b', d, 36000));
  v.push(venta('a', 2, 17000));
  const r = vigias({ ventas: v, productos: prods, ahora: AHORA });
  assert.equal(r.tipo, 'caida');
  assert.match(r.acciones[0], /sin stock/);
});

test('vigías: ritmo normal no dispara acciones', () => {
  const v = [];
  for (let d = 27; d >= 0; d--) v.push(venta('a', d, 17000));
  const r = vigias({ ventas: v, productos: PRODUCTOS, ahora: AHORA });
  assert.equal(r.tipo, 'normal');
  assert.equal(r.acciones.length, 0);
});

test('salud: sin datos no hay puntaje', () => {
  assert.equal(saludNegocio({}).puntaje, null);
});

test('salud: se reparte entre los componentes con datos y nombra el peor', () => {
  const r = saludNegocio({
    productos: PRODUCTOS, ventas: historial(), caja: 150_000,
    deudas: [{ amt: 500_000, rate: 10 }],
    config: { metaMensual: 10_000_000, colchonMinimo: 300_000, alertaStockBajo: 3 },
    ahora: AHORA,
  });
  assert.ok(r.puntaje >= 0 && r.puntaje <= 100);
  assert.deepEqual(r.componentes.map(c => c.id), ['meta', 'caja', 'stock', 'margen', 'deuda']);
  assert.ok(r.peor);
});

test('salud: todo en orden da 100', () => {
  const ventas = [];
  for (let d = 26; d >= 0; d--) ventas.push(venta('a', d, 1_000_000, 1, 400_000));
  const r = saludNegocio({
    productos: PRODUCTOS, ventas, caja: 1_000_000, deudas: [],
    config: { metaMensual: 1_000_000, colchonMinimo: 300_000, alertaStockBajo: 3 }, ahora: AHORA,
  });
  assert.equal(r.puntaje, 100);
});

test('telemetría: un punto por día, el último es hoy', () => {
  const s = telemetria([venta('a', 0, 5000), venta('a', 0, 2000), venta('a', 3, 1000)], { dias: 7, ahora: AHORA });
  assert.equal(s.length, 7);
  assert.equal(s[6].total, 7000);
  assert.equal(s[3].total, 1000);
});
