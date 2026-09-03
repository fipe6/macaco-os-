import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase } from './services/supabaseAuth.js';

// Dos cuentas conocidas (Felipe y su papá) — el usuario elige quién es y
// solo ingresa su contraseña, sin ver ni escribir el correo.
export const CUENTAS = {
  felipe: { label: 'Felipe', email: 'makakosuplementos@gmail.com' },
  papa:   { label: 'Papá',   email: 'alraymundo@hotmail.com' },
};

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [session, setSession]     = useState(undefined); // undefined = aún no se sabe
  const [authError, setAuthError] = useState(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => setSession(session));

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => sub.subscription.unsubscribe();
  }, []);

  const signIn = useCallback(async (quien, password) => {
    setAuthError(null);
    const cuenta = CUENTAS[quien];
    if (!cuenta) { setAuthError('Cuenta inválida'); return false; }
    const { error } = await supabase.auth.signInWithPassword({ email: cuenta.email, password });
    if (error) setAuthError(error.message);
    return !error;
  }, []);

  const signOut = useCallback(() => supabase.auth.signOut(), []);

  return (
    <AuthContext.Provider value={{ session, authError, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
