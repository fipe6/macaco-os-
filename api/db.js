// Proxy servidor → Supabase
// Rutas las requests desde macaco-os.vercel.app hacia Supabase en el servidor.
// Elimina cualquier restricción CORS o ITP de iOS Safari.

const SUPA_URL = process.env.VITE_SUPABASE_URL
  || 'https://jmvbdjahitdhbvrfblnh.supabase.co';

const SUPA_KEY = process.env.VITE_SUPABASE_ANON_KEY
  || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImptdmJkamFoaXRkaGJ2cmZibG5oIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODAxODU2ODksImV4cCI6MjA5NTc2MTY4OX0.6q_M4V6y53sUEr-20MzkSOTZTLL5nthwLLFLPhCsi8o';

export default async function handler(req, res) {
  // Permitir CORS para desarrollo local
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    const { table, method = 'GET', body, query = '' } = req.body || {};
    const tableName = table || 'app_data';
    const url = `${SUPA_URL}/rest/v1/${tableName}${query ? '?' + query : ''}`;

    const headers = {
      'apikey':        SUPA_KEY,
      'Authorization': `Bearer ${SUPA_KEY}`,
      'Content-Type':  'application/json',
    };

    if (method === 'POST') {
      headers['Prefer'] = 'resolution=merge-duplicates,return=minimal';
    }

    const response = await fetch(url, {
      method,
      headers,
      body: method !== 'GET' ? JSON.stringify(body) : undefined,
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      return res.status(response.status).json({ error: err.message || `HTTP ${response.status}` });
    }

    const data = method === 'GET'
      ? await response.json()
      : null;

    res.status(200).json({ ok: true, data });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
