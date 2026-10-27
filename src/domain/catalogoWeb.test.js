import { test } from 'node:test';
import assert from 'node:assert/strict';
import { idCatalogo, catalogoPublico } from './catalogoWeb.js';

test('enlaza por nombre aunque tenga tildes y mayúsculas', () => {
  assert.equal(idCatalogo({ name: 'Cafeína ostrovit' }), 'cafeina');
  assert.equal(idCatalogo({ name: 'Proteína grizzly' }), 'grizzly-whey');
  assert.equal(idCatalogo({ name: 'Glutamina' }), null);
  assert.equal(idCatalogo({ name: 'Omega 3 grizzly bear' }), 'omega3');
  assert.equal(idCatalogo({ name: 'Omega 3' }), null);
});

test('el enlace puesto a mano gana', () => {
  assert.equal(idCatalogo({ name: 'Omega 3', catalogoId: 'omega3' }), 'omega3');
});

test('agotado con stock 0 o menos; foto solo si es pública; sin costos', () => {
  const pub = catalogoPublico([
    { name: 'Glicinato de Magnesio', stock: 0, cost: 7500, imagen: 'data:image/jpeg;base64,xx' },
    { name: 'Creatina inner', stock: 36, cost: 8990, imagen: 'https://x.supabase.co/storage/v1/object/public/product-images/a.jpg' },
    { name: 'Glutamina', stock: 0 },
  ]);
  assert.deepEqual(pub, {
    magnesio: { agotado: true, imagen: null },
    'creatina-inner': { agotado: false, imagen: 'https://x.supabase.co/storage/v1/object/public/product-images/a.jpg' },
  });
  assert.ok(!/cost|36/.test(JSON.stringify(pub)));
});
