// Tests del motor de la Corteza Prefrontal — correr con `npm test` (node --test).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { escanearCorteza, calcPrioridad } from './corteza.js';

const AHORA = new Date('2026-09-25T15:00:00').getTime();
const haceDias = (n) => new Date(AHORA - n * 86_400_000).toISOString();
const CONFIG = { metaMensual: 10_000_000, metaDiaria: 700_000, colchonMinimo: 300_000, alertaStockBajo: 3 };
const ids = (r) => r.decisiones.map(d => d.id);

const venta = (dias, extra = {}) => ({
  productoId: 'pg', producto: 'Proteína', cantidad: 1,
  total: 36_000, margen: 16_000, costoUnitario: 20_000, fecha: haceDias(dias), ...extra,
});

test('sin datos no inventa recomendaciones', () => {
  const r = escanearCorteza({ config: CONFIG, caja: 500_000, ahora: AHORA });
  assert.equal(r.decisiones.length, 0);
});

test('productos con stock pero sin historial de ventas no generan señales de stock', () => {
  const productos = [{ id: 'pg', name: 'Proteína', stock: 0, cost: 20_000, price: 36_000 }];
  const r = escanearCorteza({ productos, config: CONFIG, caja: 500_000, ahora: AHORA });
  assert.equal(r.decisiones.length, 0);
});

test('deuda con interés: abona solo lo que sobra sobre el colchón', () => {
  const deudas = [
    { id: 'd1', who: 'Benjamín', amt: 500_000, rate: 10, order: 1 },
    { id: 'd3', who: 'Alejandro', amt: 150_000, rate: 0 },
  ];
  const r = escanearCorteza({ deudas, caja: 503_000, config: CONFIG, ahora: AHORA });
  assert.deepEqual(ids(r), ['deuda-interes:d1']);
  const d = r.decisiones[0];
  assert.equal(d.impactoMensual, 50_000);
  assert.equal(d.ahorroMensual, 20_300);  // abono de $203.000 al 10%
  assert.equal(d.prioridad, 'alta');
  assert.match(d.accion, /\$203\.000/);
  assert.match(d.aprobacion, /aprobación/);
});

test('quiebre de stock en producto que se vende', () => {
  const productos = [{ id: 'pg', name: 'Proteína', stock: 0, cost: 20_000, price: 36_000 }];
  const ventas = Array.from({ length: 10 }, (_, i) => venta(i * 3 + 3));  // días 3..30
  const r = escanearCorteza({ productos, ventas, config: CONFIG, caja: 500_000, ahora: AHORA });
  const q = r.decisiones.find(d => d.id === 'quiebre:pg');
  assert.ok(q);
  // 10 u en 30 días → 1/3 u/día × 30 × $16.000 de margen
  assert.equal(q.impactoMensual, 160_000);
  assert.equal(q.prioridad, 'alta');
  assert.match(q.accion, /Reponer 7 u/);
});

test('cobertura corta avisa antes del quiebre', () => {
  const productos = [{ id: 'pg', name: 'Proteína', stock: 2, cost: 20_000, price: 36_000 }];
  const ventas = Array.from({ length: 15 }, (_, i) => venta(i * 2 + 1));
  const r = escanearCorteza({ productos, ventas, config: CONFIG, caja: 500_000, ahora: AHORA });
  assert.ok(ids(r).includes('cobertura:pg'));
});

test('capital inmovilizado solo con 30+ días de historial', () => {
  const productos = [
    { id: 'pg', name: 'Proteína', stock: 20, cost: 20_000, price: 36_000 },
    { id: 'om3', name: 'Omega 3', stock: 5, cost: 7_000, price: 13_000 },
  ];
  const deudas = [{ id: 'd1', who: 'Benjamín', amt: 500_000, rate: 10 }];
  const corto = escanearCorteza({ productos, deudas, ventas: [venta(5)], config: CONFIG, caja: 0, ahora: AHORA });
  assert.ok(!ids(corto).some(id => id.startsWith('inmovilizado')));

  const largo = escanearCorteza({ productos, deudas, ventas: [venta(5), venta(40)], config: CONFIG, caja: 0, ahora: AHORA });
  const inm = largo.decisiones.find(d => d.id === 'inmovilizado:om3');
  assert.ok(inm);
  assert.equal(inm.ahorroMensual, 3_500);   // $35.000 parados × 10%
});

test('margen bajo propone precio con 30% de margen', () => {
  const productos = [{ id: 'x', name: 'Barra', stock: 30, cost: 9_000, price: 10_000 }];
  const ventas = Array.from({ length: 6 }, (_, i) => venta(i + 1, { productoId: 'x', total: 10_000, margen: 1_000 }));
  const r = escanearCorteza({ productos, ventas, config: CONFIG, caja: 500_000, ahora: AHORA });
  const m = r.decisiones.find(d => d.id === 'margen-bajo:x');
  assert.ok(m);
  assert.match(m.accion, /\$13\.000/);
});

test('caja bajo colchón es prioridad alta', () => {
  const r = escanearCorteza({ caja: 100_000, config: CONFIG, ahora: AHORA,
    porCobrar: [{ persona: 'Sarek', saldo: 300_000 }] });
  const c = r.decisiones.find(d => d.id === 'caja-colchon');
  assert.equal(c.prioridad, 'alta');
  assert.match(c.accion, /Sarek/);
});

test('cobranza con deuda cara calcula el ahorro de cobrar y abonar', () => {
  const r = escanearCorteza({
    caja: 500_000, config: CONFIG, ahora: AHORA,
    deudas: [{ id: 'd1', who: 'B', amt: 500_000, rate: 10 }],
    porCobrar: [{ persona: 'Sarek', saldo: 300_000 }, { persona: 'Nass', saldo: 111_000 }, { persona: 'X', saldo: 0 }],
  });
  const c = r.decisiones.find(d => d.id === 'cobranza');
  assert.equal(c.ahorroMensual, 41_100);
  assert.equal(c.evidencia.length, 2);
});

test('recompra atrasada detecta clientes fuera de su ciclo', () => {
  const ventas = [venta(40, { cliente: 'Juan' }), venta(30, { cliente: 'Juan' }), venta(20, { cliente: 'Juan' })];
  const r = escanearCorteza({ ventas, config: CONFIG, caja: 500_000, ahora: AHORA });
  const rc = r.decisiones.find(d => d.id === 'recompra');
  assert.ok(rc);
  assert.match(rc.evidencia[0], /Juan/);
});

test('ordena por prioridad y luego por impacto', () => {
  assert.equal(calcPrioridad(150_000, 'bajo'), 'alta');
  assert.equal(calcPrioridad(30_000, 'medio'), 'media');
  assert.equal(calcPrioridad(null, 'bajo'), 'baja');
  const r = escanearCorteza({
    caja: 100_000, config: CONFIG, ahora: AHORA,
    deudas: [{ id: 'd1', who: 'B', amt: 500_000, rate: 10 }],
    porCobrar: [{ persona: 'Mamá', saldo: 8_000 }],
  });
  const orden = r.decisiones.map(d => d.prioridad);
  assert.deepEqual(orden, [...orden].sort((a, b) => ['alta', 'media', 'baja'].indexOf(a) - ['alta', 'media', 'baja'].indexOf(b)));
});

test('la brecha contra la meta no infla el impacto', () => {
  const ventas = [venta(1), venta(2)];
  const r = escanearCorteza({ ventas, config: CONFIG, caja: 500_000, ahora: AHORA });
  const m = r.decisiones.find(d => d.id.startsWith('ritmo-meta'));
  assert.ok(m);
  assert.equal(m.impactoMensual, null);
  assert.equal(m.prioridad, 'media');
});

test('la segunda deuda no contradice el abono de la primera', () => {
  const deudas = [
    { id: 'd1', who: 'Benjamín', amt: 500_000, rate: 10, order: 1 },
    { id: 'd2', who: 'Valcárce', amt: 700_000, rate: 10, order: 2 },
  ];
  const r = escanearCorteza({ deudas, caja: 503_000, config: CONFIG, ahora: AHORA });
  const v = r.decisiones.find(d => d.id === 'deuda-interes:d2');
  assert.match(v.accion, /después de Benjamín/);
});

test('las deudas quedan en orden de pago aunque la segunda cobre más interés', () => {
  const deudas = [
    { id: 'd1', who: 'Benjamín', amt: 500_000, rate: 10, order: 1 },
    { id: 'd2', who: 'Valcárce', amt: 700_000, rate: 10, order: 2 },
  ];
  const r = escanearCorteza({ deudas, caja: 503_000, config: CONFIG, ahora: AHORA });
  assert.deepEqual(ids(r), ['deuda-interes:d1', 'deuda-interes:d2']);
});
