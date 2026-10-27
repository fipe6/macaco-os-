import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase } from './services/supabaseAuth.js';

// Una sola cuenta para el negocio: Felipe y su papá entran con la misma
// contraseña y ven la misma información. Solo se escribe la contraseña.
const EMAIL = 'makakosuplementos@gmail.com';

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
    const { error } = await supabase.auth.signInWithPassword({ email: EMAIL, password });
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
