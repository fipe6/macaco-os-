// n8n webhook client — Macaco OS
//
// Configuración:
// 1. Copia .env.example a .env.local
// 2. Pon VITE_N8N_BASE_URL=https://tu-n8n.tu-dominio.com
// 3. En n8n: crea workflows con nodos "Webhook" y pon el path que usas abajo
//    (ej. /webhook/macaco/venta). Activa el workflow.
//
// Si no hay URL configurada, envia a una cola local (localStorage) y log a consola.

const BASE = import.meta.env.VITE_N8N_BASE_URL || '';
const TOKEN = import.meta.env.VITE_N8N_TOKEN || '';

const QUEUE_KEY = 'macaco:webhook-queue';

function readQueue() {
  try { return JSON.parse(localStorage.getItem(QUEUE_KEY) || '[]'); } catch { return []; }
}
function writeQueue(q) {
  localStorage.setItem(QUEUE_KEY, JSON.stringify(q));
}

async function post(path, payload) {
  const body = {
    ...payload,
    _meta: {
      app: 'macaco-os',
      version: '1.0.0',
      sentAt: new Date().toISOString(),
    },
  };

  if (!BASE) {
    // sin n8n configurado todavia — encolar localmente
    const q = readQueue();
    q.push({ path, body, queuedAt: Date.now() });
    writeQueue(q);
    console.warn('[webhook] VITE_N8N_BASE_URL no configurada. Evento encolado localmente:', path, body);
    return { queued: true, ok: false };
  }

  const url = `${BASE.replace(/\/$/, '')}${path}`;
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(TOKEN ? { 'Authorization': `Bearer ${TOKEN}` } : {}),
      },
      body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error(`n8n ${res.status}`);
    return { ok: true, data: await res.json().catch(() => ({})) };
  } catch (err) {
    console.error('[webhook] error enviando, encolando:', err);
    const q = readQueue();
    q.push({ path, body, queuedAt: Date.now(), error: String(err) });
    writeQueue(q);
    return { ok: false, queued: true, error: String(err) };
  }
}

export async function flushQueue() {
  if (!BASE) return { sent: 0, remaining: readQueue().length };
  const q = readQueue();
  const remaining = [];
  let sent = 0;
  for (const item of q) {
    const res = await post(item.path, item.body);
    if (res.ok) sent++; else remaining.push(item);
  }
  writeQueue(remaining);
  return { sent, remaining: remaining.length };
}

// === Eventos de dominio ===

export const sendVenta = (venta) =>
  post('/webhook/macaco/venta', { event: 'venta.creada', venta });

export const sendProducto = (producto) =>
  post('/webhook/macaco/inventario', { event: 'producto.creado', producto });

export const sendStockUpdate = (producto) =>
  post('/webhook/macaco/inventario', { event: 'stock.actualizado', producto });

export const sendReporteWhatsApp = (tipo, datos) =>
  post('/webhook/macaco/reporte-wsp', { event: 'reporte.solicitado', tipo, datos });

export const sendDeudaUpdate = (deuda) =>
  post('/webhook/macaco/finanzas', { event: 'deuda.actualizada', deuda });

// Sync manual del catálogo público → n8n → Supabase
// No usa la queue offline — respuesta inmediata para confirmar al usuario
export async function sincronizarCatalogo(productos) {
  if (!BASE) throw new Error('VITE_N8N_BASE_URL no configurada');
  const url = `${BASE.replace(/\/$/, '')}/webhook/macaco/catalogo-sync`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(TOKEN ? { Authorization: `Bearer ${TOKEN}` } : {}),
    },
    body: JSON.stringify({ productos }),
  });
  if (!res.ok) throw new Error(`n8n ${res.status}`);
  return res.json().catch(() => ({}));
}
