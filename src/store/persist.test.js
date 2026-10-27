import test from 'node:test';
import assert from 'node:assert/strict';
import { crearPersistencia, resolverCarga } from './persist.js';

const memoria = () => {
  const m = new Map();
  return { m, getItem: k => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)) };
};

// Reloj manual: los envíos programados se corren a mano con `correr()`.
function reloj() {
  let cola = [];
  return {
    programar: (fn, ms) => { const t = { fn, ms }; cola.push(t); return t; },
    cancelar: (t) => { cola = cola.filter(x => x !== t); },
    async correr() { const c = cola; cola = []; for (const t of c) await t.fn(); await new Promise(r => setImmediate(r)); },
    get esperas() { return cola.map(t => t.ms); },
  };
}

test('un cambio de varias claves viaja en UN solo envío', async () => {
  const envios = [];
  const r = reloj();
  const p = crearPersistencia({ storage: memoria(), upsert: async f => { envios.push(f); }, ...r });
  p.guardar({ 'macaco:ventas': [{ id: 1 }], 'macaco:caja': 5, 'macaco:productos': [] });
  await r.correr();
  assert.equal(envios.length, 1);
  assert.deepEqual(envios[0].map(f => f.clave).sort(), ['macaco:caja', 'macaco:productos', 'macaco:ventas']);
  assert.equal(p.estado().pendientes, 0);
});

test('si Supabase falla, el cambio queda pendiente y se reintenta con espera creciente', async () => {
  let caido = true;
  const envios = [];
  const r = reloj();
  const p = crearPersistencia({ storage: memoria(), upsert: async f => { if (caido) throw new Error('sin señal'); envios.push(f); }, ...r });
  p.guardar({ 'macaco:caja': 10 });
  await r.correr();
  assert.equal(p.estado().pendientes, 1);
  assert.equal(p.estado().error, 'sin señal');
  assert.deepEqual(r.esperas, [2000]);
  await r.correr();
  assert.deepEqual(r.esperas, [4000]);
  caido = false;
  await r.correr();
  assert.equal(p.estado().pendientes, 0);
  assert.equal(envios[0][0].valor, 10);
});

test('lo pendiente sobrevive a cerrar la app y sale al abrirla de nuevo', async () => {
  const storage = memoria();
  const r1 = reloj();
  const p1 = crearPersistencia({ storage, upsert: async () => { throw new Error('offline'); }, ...r1 });
  p1.guardar({ 'macaco:ventas': [{ id: 'v1' }] });
  await r1.correr();
  // "se cierra la app": nueva instancia sobre el mismo localStorage
  const envios = [];
  const r2 = reloj();
  const p2 = crearPersistencia({ storage, upsert: async f => { envios.push(f); }, ...r2 });
  assert.equal(p2.estado().pendientes, 1);
  assert.ok(p2.esPendiente('macaco:ventas'));
  await p2.enviar();
  assert.deepEqual(envios[0][0].valor, [{ id: 'v1' }]);
  assert.equal(p2.esPendiente('macaco:ventas'), false);
});

test('un cambio hecho mientras viaja el envío anterior no se pierde', async () => {
  const envios = [];
  let soltar;
  const r = reloj();
  const p = crearPersistencia({ storage: memoria(), ...r,
    upsert: (f) => { envios.push(f); return envios.length === 1 ? new Promise(res => { soltar = res; }) : Promise.resolve(); } });
  p.guardar({ 'macaco:caja': 1 });
  const primero = p.enviar();
  p.guardar({ 'macaco:caja': 2 });   // llega mientras el primero está en vuelo
  soltar();
  await primero;
  assert.ok(p.esPendiente('macaco:caja'), 'el 2 todavía no se confirmó');
  await r.correr();
  assert.equal(envios.at(-1)[0].valor, 2);
  assert.equal(p.estado().pendientes, 0);
});

test('si localStorage falla, igual envía el valor correcto', async () => {
  const roto = { getItem: () => null, setItem: () => { throw new Error('QuotaExceeded'); } };
  const envios = [];
  const p = crearPersistencia({ storage: roto, upsert: async f => { envios.push(f); }, ...reloj() });
  p.guardar({ 'macaco:caja': 99 });
  await p.enviar();
  assert.equal(envios[0][0].valor, 99);
});

test('resolverCarga: lo pendiente en el celular le gana a Supabase', () => {
  const storage = memoria();
  const p = crearPersistencia({ storage, upsert: async () => { throw new Error('x'); }, ...reloj() });
  p.guardar({ 'macaco:ventas': ['local-sin-enviar'] });
  p.recibirRemoto('macaco:caja', 1);
  const r = resolverCarga(
    ['macaco:ventas', 'macaco:caja', 'macaco:gastos', 'macaco:pedidos'],
    { 'macaco:ventas': ['remoto-viejo'], 'macaco:caja': 500 },
    p,
    { 'macaco:pedidos': [] },
  );
  assert.deepEqual(r['macaco:ventas'], ['local-sin-enviar']);
  assert.equal(r['macaco:caja'], 500);          // no pendiente → manda Supabase
  assert.equal(r['macaco:gastos'], undefined);  // nadie la tiene
  assert.deepEqual(r['macaco:pedidos'], []);    // semilla
});

// ── Dos celulares, misma cuenta ──────────────────────────────────────────────
function servidor(inicial) {
  const db = { ...inicial };
  return {
    db,
    leerRemoto: async (claves) => Object.fromEntries(claves.filter(k => k in db).map(k => [k, JSON.parse(JSON.stringify(db[k]))])),
    upsert: async (filas) => { filas.forEach(f => { db[f.clave] = JSON.parse(JSON.stringify(f.valor)); }); },
  };
}

function celular(srv, caido = () => false) {
  const r = reloj();
  const fusiones = [];
  const p = crearPersistencia({
    storage: memoria(), ...r,
    leerRemoto: async (c) => { if (caido()) throw new Error('sin señal'); return srv.leerRemoto(c); },
    upsert: async (f) => { if (caido()) throw new Error('sin señal'); return srv.upsert(f); },
    alFusionar: (v) => fusiones.push(v),
  });
  // abre la app: carga lo de Supabase
  Object.entries(srv.db).forEach(([k, v]) => p.recibirRemoto(k, JSON.parse(JSON.stringify(v))));
  return { p, r, fusiones };
}

test('venta sin señal en un celular no borra la venta del otro', async () => {
  const srv = servidor({ 'macaco:ventas': [], 'macaco:caja': 100_000 });
  let sinSenal = true;
  const papa = celular(srv, () => sinSenal);
  const felipe = celular(srv);

  // papá vende sin señal
  papa.p.guardar({ 'macaco:ventas': [{ id: 'p1', fecha: '2026-10-27T10:00:00Z' }], 'macaco:caja': 115_000 });
  await papa.r.correr();
  assert.equal(papa.p.estado().pendientes, 2);

  // felipe vende con señal
  felipe.p.guardar({ 'macaco:ventas': [{ id: 'f1', fecha: '2026-10-27T11:00:00Z' }], 'macaco:caja': 120_000 });
  await felipe.r.correr();
  assert.equal(srv.db['macaco:caja'], 120_000);

  // vuelve la señal de papá
  sinSenal = false;
  await papa.p.reintentar();
  assert.deepEqual(srv.db['macaco:ventas'].map(v => v.id), ['f1', 'p1']);
  assert.equal(srv.db['macaco:caja'], 135_000);       // 100k + 15k + 20k
  assert.equal(papa.p.estado().pendientes, 0);
  assert.deepEqual(papa.fusiones.at(-1)['macaco:caja'], 135_000); // la app de papá se entera
});

test('stock: dos celulares vendiendo el mismo producto descuentan los dos', async () => {
  const prods = [{ id: 'a', name: 'Creatina', stock: 10 }];
  const srv = servidor({ 'macaco:productos': prods });
  let sinSenal = true;
  const uno = celular(srv, () => sinSenal);
  const dos = celular(srv);
  uno.p.guardar({ 'macaco:productos': [{ id: 'a', name: 'Creatina', stock: 8 }] });
  dos.p.guardar({ 'macaco:productos': [{ id: 'a', name: 'Creatina', stock: 9 }] });
  await dos.r.correr();
  sinSenal = false;
  await uno.p.reintentar();
  assert.equal(srv.db['macaco:productos'][0].stock, 7);
});

test('anular en un celular y vender en el otro: queda la venta nueva y la anulada se va', async () => {
  const srv = servidor({ 'macaco:ventas': [{ id: 'v0', fecha: '2026-10-26T10:00:00Z' }] });
  let sinSenal = true;
  const uno = celular(srv, () => sinSenal);
  const dos = celular(srv);
  uno.p.guardar({ 'macaco:ventas': [] });                                         // anula v0
  dos.p.guardar({ 'macaco:ventas': [{ id: 'v1', fecha: '2026-10-27T10:00:00Z' }, { id: 'v0', fecha: '2026-10-26T10:00:00Z' }] });
  await dos.r.correr();
  sinSenal = false;
  await uno.p.reintentar();
  assert.deepEqual(srv.db['macaco:ventas'].map(v => v.id), ['v1']);
});

test('fusionar dos veces no cuenta dos veces la diferencia de caja', async () => {
  const srv = servidor({ 'macaco:caja': 100 });
  let fallaUpsert = true;
  const r = reloj();
  const p = crearPersistencia({ storage: memoria(), ...r,
    leerRemoto: srv.leerRemoto,
    upsert: async (f) => { if (fallaUpsert) throw new Error('timeout'); return srv.upsert(f); } });
  p.recibirRemoto('macaco:caja', 100);
  p.guardar({ 'macaco:caja': 110 });          // +10 local
  srv.db['macaco:caja'] = 150;                // +50 del otro celular
  await r.correr();                           // fusiona (160) pero el upsert falla
  srv.db['macaco:caja'] = 170;                // otro +20
  fallaUpsert = false;
  await r.correr();
  assert.equal(srv.db['macaco:caja'], 180);   // 100 + 10 + 50 + 20
});
