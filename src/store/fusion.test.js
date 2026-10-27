import test from 'node:test';
import assert from 'node:assert/strict';
import { fusionarValor, fusionarLista } from './fusion.js';

test('números: suma las dos diferencias', () => {
  assert.equal(fusionarValor('macaco:caja', 100, 115, 120), 135);
  assert.equal(fusionarValor('macaco:caja', 100, 100, 120), 120);
  assert.equal(fusionarValor('macaco:caja', 100, 90, 100), 90);
});

test('sin base gana lo local', () => {
  assert.deepEqual(fusionarValor('macaco:ventas', undefined, [1], [2]), [1]);
});

test('listas: agrega lo nuevo de ambos, respeta borrados y ediciones', () => {
  const base   = [{ id: 1, n: 'a' }, { id: 2, n: 'b' }, { id: 3, n: 'c' }];
  const local  = [{ id: 4, n: 'nuevo-local' }, { id: 1, n: 'a-editado' }, { id: 3, n: 'c' }]; // borró 2
  const remoto = [{ id: 5, n: 'nuevo-remoto' }, { id: 1, n: 'a' }, { id: 2, n: 'b' }];        // borró 3
  const r = fusionarLista(base, local, remoto);
  assert.deepEqual(r.map(x => x.id).sort(), [1, 4, 5]);
  assert.equal(r.find(x => x.id === 1).n, 'a-editado');
});

test('listas con fecha quedan de la más nueva a la más vieja', () => {
  const r = fusionarLista([], [{ id: 'l', fecha: '2026-10-27T09:00' }], [{ id: 'r', fecha: '2026-10-27T10:00' }]);
  assert.deepEqual(r.map(x => x.id), ['r', 'l']);
});

test('productos: el stock se fusiona por diferencia, el resto por campo', () => {
  const base   = [{ id: 'a', stock: 10, price: 15000 }];
  const local  = [{ id: 'a', stock: 8,  price: 15000 }];
  const remoto = [{ id: 'a', stock: 9,  price: 16000 }];
  const [p] = fusionarValor('macaco:productos', base, local, remoto);
  assert.equal(p.stock, 7);
  assert.equal(p.price, 16000);
});

test('objetos (config, corteza): cada campo cambiado gana', () => {
  const r = fusionarValor('macaco:corteza', { a: 1 }, { a: 1, b: 2 }, { a: 1, c: 3 });
  assert.deepEqual(r, { a: 1, b: 2, c: 3 });
  const borrado = fusionarValor('macaco:corteza', { a: 1, b: 2 }, { a: 1 }, { a: 1, b: 2, c: 3 });
  assert.deepEqual(borrado, { a: 1, c: 3 });
});
