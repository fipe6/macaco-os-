// Cliente Supabase para Auth + Realtime (sesión persistida en localStorage).
//
// OJO: las credenciales van hardcodeadas a propósito, NO leídas de
// import.meta.env — Vercel ya metió un BOM invisible en esas env vars una vez
// (ver commit "Fix proxy: hardcodear credenciales para evitar BOM en env
// vars"), y un `import.meta.env.X || fallback` no protege contra eso: si la
// env var existe pero viene corrupta, sigue siendo "truthy" y el fallback
// nunca se usa. Ese caracter invisible rompe cualquier header armado en el
// navegador con un "String contains non ISO-8859-1 code point".
import { createClient } from '@supabase/supabase-js';

const SUPA_URL = 'https://jmvbdjahitdhbvrfblnh.supabase.co';

const SUPA_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImptdmJkamFoaXRkaGJ2cmZibG5oIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODAxODU2ODksImV4cCI6MjA5NTc2MTY4OX0.6q_M4V6y53sUEr-20MzkSOTZTLL5nthwLLFLPhCsi8o';

export const supabase = createClient(SUPA_URL, SUPA_KEY, {
  auth: { persistSession: true, autoRefreshToken: true },
});

// Devuelve el access_token de la sesión activa, o null si no hay sesión.
export async function getAccessToken() {
  const { data: { session } } = await supabase.auth.getSession();
  return session?.access_token || null;
}
