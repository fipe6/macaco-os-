// Cliente de base de datos con doble estrategia:
// 1. Primero intenta el PROXY en /api/db (mismo dominio, sin restricciones iOS)
// 2. Si el proxy no está disponible, hace fetch directo a Supabase
//
// Las tablas de negocio tienen RLS restringido a usuarios autenticados, así que
// cada request (proxy o directo) viaja con el JWT de la sesión activa, no solo
// la anon key — sin sesión, Supabase rechaza la lectura/escritura.

import { getAccessToken } from './supabaseAuth.js';

const SUPA_URL = import.meta.env.VITE_SUPABASE_URL
  || 'https://jmvbdjahitdhbvrfblnh.supabase.co';

const SUPA_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY
  || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImptdmJkamFoaXRkaGJ2cmZibG5oIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODAxODU2ODksImV4cCI6MjA5NTc2MTY4OX0.6q_M4V6y53sUEr-20MzkSOTZTLL5nthwLLFLPhCsi8o';

export const DB_HABILITADO = true;

// ── Proxy (same-origin, sin CORS) ────────────────────────────────────────────
async function proxySelect(table) {
  const token = await getAccessToken();
  const res = await fetch('/api/db', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ table, method: 'GET', token }),
  });
  if (!res.ok) throw new Error(`proxy HTTP ${res.status}`);
  const { data, error } = await res.json();
  if (error) throw new Error(error);
  return data || [];
}

async function proxyUpsert(table, rows, onConflict = 'clave') {
  const token = await getAccessToken();
  const body = Array.isArray(rows) ? rows : [rows];
  const res = await fetch('/api/db', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      table,
      method: 'POST',
      body,
      query: `on_conflict=${onConflict}`,
      token,
    }),
  });
  if (!res.ok) throw new Error(`proxy HTTP ${res.status}`);
  const { error } = await res.json();
  if (error) throw new Error(error);
  return true;
}

// ── Fetch directo (fallback) ─────────────────────────────────────────────────
async function authHeaders(extra = {}) {
  const token = await getAccessToken();
  return {
    'apikey':        SUPA_KEY,
    'Authorization': `Bearer ${token || SUPA_KEY}`,
    'Content-Type':  'application/json',
    ...extra,
  };
}

async function directFetch(url, options = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 10000);
  try {
    const res = await fetch(url, {
      ...options,
      mode: 'cors',
      signal: controller.signal,
      headers: { ...(await authHeaders()), ...(options.headers || {}) },
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

async function directSelect(table) {
  const res = await directFetch(`${SUPA_URL}/rest/v1/${table}`);
  return res.json();
}

async function directUpsert(table, rows, onConflict = 'clave') {
  const body = Array.isArray(rows) ? rows : [rows];
  await directFetch(`${SUPA_URL}/rest/v1/${table}?on_conflict=${onConflict}`, {
    method: 'POST',
    headers: { 'Prefer': 'resolution=merge-duplicates,return=minimal' },
    body: JSON.stringify(body),
  });
  return true;
}

// ── API pública: proxy primero, fallback directo ──────────────────────────────
export async function selectAll(table) {
  try {
    return await proxySelect(table);
  } catch (proxyErr) {
    console.warn('[db] proxy falló, usando directo:', proxyErr.message);
    return directSelect(table);
  }
}

export async function upsertRows(table, rows, onConflict = 'clave') {
  try {
    return await proxyUpsert(table, rows, onConflict);
  } catch (proxyErr) {
    console.warn('[db] proxy falló, usando directo:', proxyErr.message);
    return directUpsert(table, rows, onConflict);
  }
}

export async function testConnection() {
  return selectAll('app_data').then(() => true);
}

// Sync por producto a la tabla `inventario` (onConflict por nombre).
// La usa store.jsx en cada acción que muta stock o precios — corre en background.
export async function pushInventarioRows(productos) {
  if (!productos || productos.length === 0) return true;
  const filas = productos.map(p => ({
    producto:     p.name,
    stock_actual: p.stock,
    stock_minimo: 3,
    precio_costo: p.cost,
    precio_venta: p.price,
    activo:       true,
    updated_at:   new Date().toISOString(),
  }));
  return upsertRows('inventario', filas, 'producto');
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

console.log('[db] iniciado — proxy + fetch directo');
