import { createClient } from '@supabase/supabase-js';

const URL = import.meta.env.VITE_SUPABASE_URL  || '';
const KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

// null cuando no hay credenciales — el store degrada a localStorage solo
export const db = (URL && KEY) ? createClient(URL, KEY) : null;

export const DB_HABILITADO = Boolean(URL && KEY);
