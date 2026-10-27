import test from 'node:test';
import assert from 'node:assert/strict';
import { ASESORES, AREAS_ASESORES, deArea, porId } from './asesores.js';
import { armarPrompt, datosDeApoyo } from './prompt.js';

const hoy = new Date('2026-10-20T12:00:00');
const datos = {
  hoy,
  ventas: [{ id: 'v1', fecha: new Date(2026, 9, 3, 12).toISOString(), productoId: 'a', producto: 'Creatina', cantidad: 2, total: 34_000, margen: 15_000, costoUnitario: 9_999 }],
  gastos: [{ fecha: new Date(2026, 9, 5, 12).toISOString(), tipo: 'negocio', monto: 12_345, categoria: 'Envíos' }],
  productos: [{ id: 'a', name: 'Creatina', price: 17_000, cost: 8_888, stock: 10 }],
  caja: 777_777, deudas: [{ amt: 1_234_567 }],
};

test('hay 12 asesores, cada uno con emoji, color, forma y nombre únicos', () => {
  assert.equal(ASESORES.length, 12);
  for (const campo of ['id', 'nombre', 'emoji', 'forma']) {
    assert.equal(new Set(ASESORES.map(a => a[campo])).size, 12, `${campo} repetido`);
  }
  assert.equal(new Set(ASESORES.map(a => a.color)).size, 12);
});

test('cada asesor tiene todo lo necesario y cae en un área conocida', () => {
  const areas = AREAS_ASESORES.map(a => a.id);
  ASESORES.forEach(a => {
    assert.ok(areas.includes(a.area), `${a.id}: área desconocida`);
    assert.ok(a.funcion && a.mision, `${a.id}: falta texto`);
    assert.ok(a.reglas.length >= 4 && a.preguntas.length === 3 && a.entrega.length === 3, `${a.id}: incompleto`);
    assert.ok(a.origen.endsWith('.md'));
  });
  assert.equal(deArea('legal')[0].id, 'abogado');
  assert.equal(porId('contador').emoji, '📒');
});

test('los textos están en español: nada de caracteres chinos', () => {
  const todo = JSON.stringify(ASESORES);
  assert.equal(/[一-鿿]/.test(todo), false);
});

test('PRIVACIDAD: el prompt nunca incluye caja, deudas ni costos de compra', () => {
  ASESORES.forEach(a => {
    const p = armarPrompt(a, '¿Cómo voy?', datos);
    for (const secreto of ['777.777', '777777', '1.234.567', '1234567', '8.888', '8888', '9.999', '9999']) {
      assert.equal(p.includes(secreto), false, `${a.id} filtró ${secreto}`);
    }
  });
});

test('el prompt trae el rol, las reglas, los datos permitidos y la pregunta', () => {
  const p = armarPrompt(porId('analista-financiero'), '¿Qué margen tengo?', datos);
  assert.match(p, /Analista Financiero/);
  assert.match(p, /Primero los supuestos/);
  assert.match(p, /Ventas del mes: \$34\.000/);
  assert.match(p, /Creatina: \$17\.000 · 10 u · 2 vendidas/);
  assert.match(p, /Pregunta: ¿Qué margen tengo\?/);
});

test('el abogado no recibe datos del negocio', () => {
  assert.deepEqual(datosDeApoyo(datos, porId('abogado').datos), []);
});
