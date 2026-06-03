// Cliente Supabase usando fetch directo — más compatible con iOS Safari
// que el SDK oficial, que tiene problemas de inicialización en algunos browsers.

const URL  = import.meta.env.VITE_SUPABASE_URL  || 'https://jmvbdjahitdhbvrfblnh.supabase.co';
const KEY  = import.meta.env.VITE_SUPABASE_ANON_KEY
  || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImptdmJkamFoaXRkaGJ2cmZibG5oIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODAxODU2ODksImV4cCI6MjA5NTc2MTY4OX0.6q_M4V6y53sUEr-20MzkSOTZTLL5nthwLLFLPhCsi8o';

const BASE_HEADERS = {
  'apikey':        KEY,
  'Authorization': `Bearer ${KEY}`,
  'Content-Type':  'application/json',
};

export const DB_HABILITADO = true;

// Lee todas las filas de una tabla
async function select(table, query = '') {
  const res = await fetch(`${URL}/rest/v1/${table}${query ? '?' + query : ''}`, {
    headers: BASE_HEADERS,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || `HTTP ${res.status}`);
  }
  return res.json();
}

// Inserta o actualiza filas — onConflict indica la columna para resolver conflictos
async function upsert(table, rows, onConflict = 'clave') {
  const body = Array.isArray(rows) ? rows : [rows];
  const url  = `${URL}/rest/v1/${table}?on_conflict=${onConflict}`;
  const res  = await fetch(url, {
    method: 'POST',
    headers: {
      ...BASE_HEADERS,
      'Prefer': 'resolution=merge-duplicates,return=minimal',
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || `HTTP ${res.status}`);
  }
  return true;
}

// Interfaz pública que imita la API de Supabase JS
export const db = {
  from: (table) => ({
    select: (cols = '*') => ({
      then: (fn) => select(table, cols !== '*' ? `select=${cols}` : '').then(data => fn({ data, error: null })).catch(err => fn({ data: null, error: { message: err.message } })),
    }),
    upsert: (rows, opts) => {
      const conf = opts?.onConflict || 'clave';
      return {
        then: (fn) => upsert(table, rows, conf).then(() => fn({ error: null })).catch(err => fn({ error: { message: err.message } })),
      };
    },
  }),
  // selectAll: helper directo para el init del store
  selectAll: (table) => select(table),
  upsertRows: (table, rows) => upsert(table, rows),
};

console.log('[supabase] cliente fetch directo →', URL);
