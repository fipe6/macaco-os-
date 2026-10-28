// Consultar a un asesor desde la app. La respuesta la da /api/asesor (Claude),
// con la clave guardada en Vercel. En la demo no hay servidor: responde un aviso.
import { getAccessToken } from './supabaseAuth.js';
import { DEMO } from '../demo.js';

export const AVISOS = {
  sin_clave: 'Falta activar las consultas: hay que poner la clave ANTHROPIC_API_KEY en Vercel. Mientras tanto puedes copiar el mensaje y pegarlo en tu chat con Claude.',
  sin_sesion: 'Tu sesión venció. Sal y vuelve a entrar.',
};

export async function preguntarAsesor({ system, mensajes }) {
  if (DEMO) {
    return { ok: true, texto: 'Esto es la demo: aquí no hay conexión con Claude. En la app real, el asesor responde con tus datos de ventas, gastos y productos.' };
  }
  try {
    const token = await getAccessToken();
    const res = await fetch('/api/asesor', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, system, mensajes }),
    });
    const data = await res.json().catch(() => null);
    if (data?.ok) return { ok: true, texto: data.texto };
    return { ok: false, error: AVISOS[data?.error] || 'No pude consultar ahora. Intenta de nuevo en un momento.' };
  } catch {
    return { ok: false, error: 'Sin conexión. Intenta de nuevo cuando vuelva la señal.' };
  }
}
