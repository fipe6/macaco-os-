import { test } from 'node:test';
import assert from 'node:assert/strict';
import { resumenInicio } from './inicio.js';

const hoy = new Date(2026, 9, 28, 15, 0);
const v = (dia, total) => ({ fecha: new Date(2026, 9, dia, 12).toISOString(), total });
const config = { metaMensual: 2100000, metaDiaria: 70000 };

test('hoy contra ayer y avance del mes', () => {
  const r = resumenInicio({ ventas: [v(28, 50000), v(28, 20000), v(27, 35000), v(3, 500000), v(1, 1)], config }, hoy);
  assert.equal(r.hoy, 70000);
  assert.equal(r.ventasHoy, 2);
  assert.equal(r.ayer, 35000);
  assert.equal(r.vsAyer, 100);
  assert.equal(r.pctDia, 100);
  assert.equal(r.mes, 605001);
  assert.equal(r.pctMes, 29);
  assert.equal(r.faltaMes, 2100000 - 605001);
  assert.equal(r.diasQuedan, 4);              // 28, 29, 30, 31
  assert.equal(r.porDia, Math.ceil((2100000 - 605001) / 4));
});

test('sin ventas ayer no inventa porcentaje; meta cumplida no pide más', () => {
  const r = resumenInicio({ ventas: [v(28, 3000000)], config }, hoy);
  assert.equal(r.vsAyer, null);
  assert.equal(r.faltaMes, 0);
  assert.equal(r.porDia, 0);
});

test('pedidos en camino', () => {
  const r = resumenInicio({ ventas: [], config, pedidos: [{ estado: 'pedido' }, { estado: 'en_camino' }, { estado: 'recibido' }] }, hoy);
  assert.equal(r.pedidosEnCamino, 2);
});
