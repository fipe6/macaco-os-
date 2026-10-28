// Consulta a un asesor (Claude) desde la app.
//
// - Solo responde a quien tiene la sesión de Macaco OS abierta (se valida el JWT
//   con Supabase): así nadie de afuera gasta la clave.
// - La clave vive en la variable ANTHROPIC_API_KEY de Vercel; nunca llega al celular.
// - El rol y los datos los arma la app (sin caja, deudas ni costos de compra);
//   acá solo se limita el tamaño y se reenvía.

const SUPA_URL = 'https://jmvbdjahitdhbvrfblnh.supabase.co';
const SUPA_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImptdmJkamFoaXRkaGJ2cmZibG5oIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODAxODU2ODksImV4cCI6MjA5NTc2MTY4OX0.6q_M4V6y53sUEr-20MzkSOTZTLL5nthwLLFLPhCsi8o';

const MODELO = process.env.ASESOR_MODEL || 'claude-sonnet-5-5';
const MAX_SISTEMA = 8000;
const MAX_MENSAJES = 12;
const MAX_TEXTO = 2000;

async function sesionValida(token) {
  if (!token) return false;
  try {
    const r = await fetch(`${SUPA_URL}/auth/v1/user`, { headers: { apikey: SUPA_KEY, Authorization: `Bearer ${token}` } });
    return r.ok;
  } catch { return false; }
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') return res.status(405).json({ ok: false, error: 'Method not allowed' });

  const clave = process.env.ANTHROPIC_API_KEY;
  if (!clave) return res.status(503).json({ ok: false, error: 'sin_clave' });

  const { token, system, mensajes } = req.body || {};
  if (!(await sesionValida(token))) return res.status(401).json({ ok: false, error: 'sin_sesion' });

  if (typeof system !== 'string' || !system || system.length > MAX_SISTEMA) return res.status(400).json({ ok: false, error: 'sistema_invalido' });
  if (!Array.isArray(mensajes) || !mensajes.length || mensajes.length > MAX_MENSAJES) return res.status(400).json({ ok: false, error: 'mensajes_invalidos' });
  const limpios = mensajes.map(m => ({ role: m?.role === 'assistant' ? 'assistant' : 'user', content: String(m?.content ?? '').slice(0, MAX_TEXTO) }));
  if (limpios[0].role !== 'user' || limpios[limpios.length - 1].role !== 'user' || limpios.some(m => !m.content.trim())) {
    return res.status(400).json({ ok: false, error: 'mensajes_invalidos' });
  }

  try {
    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'x-api-key': clave, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
      body: JSON.stringify({ model: MODELO, max_tokens: 700, system, messages: limpios }),
    });
    const data = await r.json().catch(() => null);
    if (!r.ok) return res.status(502).json({ ok: false, error: data?.error?.message || `HTTP ${r.status}` });
    const texto = (data?.content || []).filter(b => b.type === 'text').map(b => b.text).join('\n').trim();
    if (!texto) return res.status(502).json({ ok: false, error: 'respuesta_vacia' });
    return res.status(200).json({ ok: true, texto });
  } catch (err) {
    return res.status(502).json({ ok: false, error: String(err.message) });
  }
}
