// Cliente Supabase usando fetch directo — compatible con iOS Safari.
// El SDK oficial (@supabase/supabase-js) da "type:error" en algunos browsers de iOS.

const SUPA_URL = import.meta.env.VITE_SUPABASE_URL
  || 'https://jmvbdjahitdhbvrfblnh.supabase.co';

const SUPA_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY
  || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImptdmJkamFoaXRkaGJ2cmZibG5oIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODAxODU2ODksImV4cCI6MjA5NTc2MTY4OX0.6q_M4V6y53sUEr-20MzkSOTZTLL5nthwLLFLPhCsi8o';

const HEADERS = {
  'apikey':        SUPA_KEY,
  'Authorization': `Bearer ${SUPA_KEY}`,
  'Content-Type':  'application/json',
};

export const DB_HABILITADO = true;

// Fetch con timeout y modo cors explícito — necesario para iOS Safari
async function dbFetch(url, options = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 10000); // 10s timeout
  try {
    const res = await fetch(url, {
      ...options,
      mode: 'cors',
      signal: controller.signal,
      headers: { ...HEADERS, ...(options.headers || {}) },
    });
    clearTimeout(timer);
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || `HTTP ${res.status}`);
    }
    return res;
  } catch (err) {
    clearTimeout(timer);
    if (err.name === 'AbortError') throw new Error('Timeout — sin respuesta de Supabase');
    throw err;
  }
}

// Lee todas las filas de una tabla
export async function selectAll(table) {
  const res = await dbFetch(`${SUPA_URL}/rest/v1/${table}`);
  return res.json();
}

// Upsert de filas — onConflict es la columna PK o unique key
export async function upsertRows(table, rows, onConflict = 'clave') {
  const body = Array.isArray(rows) ? rows : [rows];
  await dbFetch(`${SUPA_URL}/rest/v1/${table}?on_conflict=${onConflict}`, {
    method: 'POST',
    headers: { 'Prefer': 'resolution=merge-duplicates,return=minimal' },
    body: JSON.stringify(body),
  });
  return true;
}

// Test de conexión — confirma que Supabase responde
export async function testConnection() {
  const res = await dbFetch(`${SUPA_URL}/rest/v1/app_data?limit=1`);
  await res.json();
  return true;
}

// Interfaz db.from() para compatibilidad con webhook.js
export const db = {
  selectAll,
  upsertRows,
  from: (table) => ({
    upsert: (rows, opts) => {
      const conf = opts?.onConflict || 'clave';
      return {
        then: (fn) => upsertRows(table, rows, conf)
          .then(() => fn({ error: null }))
          .catch(err => fn({ error: { message: err.message } })),
      };
    },
  }),
};

console.log('[db] fetch directo →', SUPA_URL);
