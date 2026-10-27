// Modo demo (`npm run build:demo`): la app completa sin tocar Supabase.
//
// Sirve para revisar la app entera antes de desplegar: la "base de datos" es
// un objeto en el navegador (guardado en localStorage), sembrado con la copia
// que el empaquetador inyecta en `window.__MACACO_DEMO__` (o las semillas si no
// hay copia). El login acepta el usuario `macaco` con cualquier contraseña.
// Si el navegador está sin conexión (modo avión), la base demo "falla" igual
// que Supabase, para poder probar la bandeja de salida.
export const DEMO = import.meta.env.MODE === 'demo';

const CLAVE_DB = 'macaco-demo:db';
const CLAVE_SESION = 'macaco-demo:sesion';

const leer = (k, fb) => { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : fb; } catch { return fb; } };
const escribir = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* sin almacenamiento */ } };
const espera = (ms) => new Promise(r => setTimeout(r, ms));

let db = null;
function base() {
  if (!db) db = leer(CLAVE_DB, null) || { ...(globalThis.__MACACO_DEMO__ || {}) };
  return db;
}

async function red() {
  await espera(250);
  if (typeof navigator !== 'undefined' && navigator.onLine === false) throw new Error('Sin conexión (demo)');
}

export const demoDB = {
  async selectAll() {
    await red();
    return Object.entries(base()).map(([clave, valor]) => ({ clave, valor }));
  },
  async selectClaves(claves) {
    await red();
    const d = base();
    return Object.fromEntries(claves.filter(c => c in d).map(c => [c, d[c]]));
  },
  async upsertRows(filas) {
    await red();
    const d = base();
    filas.forEach(f => { d[f.clave] = f.valor; });
    escribir(CLAVE_DB, d);
    return true;
  },
};

// Borra todo lo hecho en la demo y vuelve a la copia original.
export function reiniciarDemo() {
  try {
    Object.keys(localStorage).filter(k => k.startsWith('macaco')).forEach(k => localStorage.removeItem(k));
  } catch { /* nada */ }
  location.reload();
}

// Cliente con la misma forma que el de Supabase para Auth y Realtime.
export function clienteDemo() {
  let oyentes = [];
  const emitir = (s) => oyentes.forEach(fn => fn(s ? 'SIGNED_IN' : 'SIGNED_OUT', s));
  const canal = { on: () => canal, subscribe: () => canal };
  return {
    auth: {
      getSession: async () => ({ data: { session: leer(CLAVE_SESION, null) } }),
      onAuthStateChange: (fn) => {
        oyentes.push(fn);
        return { data: { subscription: { unsubscribe: () => { oyentes = oyentes.filter(f => f !== fn); } } } };
      },
      signInWithPassword: async ({ password }) => {
        if (!password) return { error: { message: 'Escribe la contraseña.' } };
        const s = { access_token: 'demo', user: { id: 'demo' } };
        escribir(CLAVE_SESION, s);
        emitir(s);
        return { error: null };
      },
      signOut: async () => { try { localStorage.removeItem(CLAVE_SESION); } catch { /* nada */ } emitir(null); },
    },
    channel: () => canal,
    removeChannel: () => {},
  };
}
