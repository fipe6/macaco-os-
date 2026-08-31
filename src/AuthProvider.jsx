import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase } from './services/supabaseAuth.js';

// Cuenta única compartida — el usuario solo ingresa la contraseña, sin ver el correo.
const ACCOUNT_EMAIL = 'makakosuplementos@gmail.com';

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

  const signIn = useCallback(async (password) => {
    setAuthError(null);
    const { error } = await supabase.auth.signInWithPassword({ email: ACCOUNT_EMAIL, password });
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
