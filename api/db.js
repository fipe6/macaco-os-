// Proxy Vercel → Supabase (same-origin, sin restricciones iOS Safari)

const SUPA_URL = 'https://jmvbdjahitdhbvrfblnh.supabase.co';
const SUPA_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImptdmJkamFoaXRkaGJ2cmZibG5oIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODAxODU2ODksImV4cCI6MjA5NTc2MTY4OX0.6q_M4V6y53sUEr-20MzkSOTZTLL5nthwLLFLPhCsi8o';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { table = 'app_data', method = 'GET', body, query = '' } = req.body || {};

    const url = `${SUPA_URL}/rest/v1/${encodeURIComponent(table)}${query ? '?' + query : ''}`;

    const fetchOptions = {
      method,
      headers: {
        'apikey': String(SUPA_KEY),
        'Authorization': 'Bearer ' + String(SUPA_KEY),
        'Content-Type': 'application/json',
        ...(method !== 'GET' ? { 'Prefer': 'resolution=merge-duplicates,return=minimal' } : {}),
      },
    };

    if (method !== 'GET' && body !== undefined) {
      fetchOptions.body = JSON.stringify(body);
    }

    const response = await fetch(url, fetchOptions);
    const text = await response.text();

    let data = null;
    try { data = JSON.parse(text); } catch { data = text; }

    if (!response.ok) {
      const msg = (data && data.message) ? data.message : `HTTP ${response.status}`;
      return res.status(response.status).json({ ok: false, error: msg });
    }

    res.status(200).json({ ok: true, data: method === 'GET' ? data : null });
  } catch (err) {
    res.status(500).json({ ok: false, error: String(err.message) });
  }
}
