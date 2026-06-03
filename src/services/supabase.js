import { createClient } from '@supabase/supabase-js';

// La anon key es una clave PÚBLICA por diseño de Supabase —
// nunca da acceso de administrador y es seguro incluirla en el bundle.
// Usamos env vars si existen (para flexibilidad), con fallback hardcodeado
// para garantizar que el cliente siempre se inicialice en todos los entornos.
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL
  || 'https://jmvbdjahitdhbvrfblnh.supabase.co';

const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY
  || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImptdmJkamFoaXRkaGJ2cmZibG5oIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODAxODU2ODksImV4cCI6MjA5NTc2MTY4OX0.6q_M4V6y53sUEr-20MzkSOTZTLL5nthwLLFLPhCsi8o';

export const db = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
export const DB_HABILITADO = true;

console.log('[supabase] cliente inicializado →', SUPABASE_URL);
