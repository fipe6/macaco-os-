import test from 'node:test';
import assert from 'node:assert/strict';
import handler from '../../api/asesor.js';

const res = () => {
  const r = { headers: {}, setHeader(k, v) { r.headers[k] = v; }, status(c) { r.code = c; return r; }, json(b) { r.body = b; return r; } };
  return r;
};
const buenas = { token: 't', system: 'Eres un asesor', mensajes: [{ role: 'user', content: 'Hola' }] };

test('sin clave en el servidor avisa que falta activar (503)', async () => {
  delete process.env.ANTHROPIC_API_KEY;
  const r = res(); await handler({ method: 'POST', body: buenas }, r);
  assert.equal(r.code, 503); assert.equal(r.body.error, 'sin_clave');
});

test('solo POST', async () => {
  const r = res(); await handler({ method: 'GET' }, r);
  assert.equal(r.code, 405);
});

test('sin sesión válida no gasta la clave (401); con sesión, valida el formato y reenvía', async () => {
  process.env.ANTHROPIC_API_KEY = 'sk-test';
  const real = globalThis.fetch;
  const llamadas = [];
  globalThis.fetch = async (url, init) => {
    llamadas.push(String(url));
    if (String(url).includes('/auth/v1/user')) return { ok: init.headers.Authorization === 'Bearer buena' };
    return { ok: true, json: async () => ({ content: [{ type: 'text', text: 'Respuesta corta' }] }) };
  };
  try {
    let r = res(); await handler({ method: 'POST', body: { ...buenas, token: 'mala' } }, r);
    assert.equal(r.code, 401);
    assert.equal(llamadas.some(u => u.includes('anthropic')), false);

    r = res(); await handler({ method: 'POST', body: { ...buenas, token: 'buena', mensajes: [] } }, r);
    assert.equal(r.code, 400);
    r = res(); await handler({ method: 'POST', body: { ...buenas, token: 'buena', mensajes: [{ role: 'assistant', content: 'x' }] } }, r);
    assert.equal(r.code, 400);
    r = res(); await handler({ method: 'POST', body: { ...buenas, token: 'buena', system: 'x'.repeat(9000) } }, r);
    assert.equal(r.code, 400);

    r = res(); await handler({ method: 'POST', body: { ...buenas, token: 'buena' } }, r);
    assert.equal(r.code, 200); assert.equal(r.body.texto, 'Respuesta corta');
  } finally { globalThis.fetch = real; delete process.env.ANTHROPIC_API_KEY; }
});
