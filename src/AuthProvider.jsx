import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase } from './services/supabaseAuth.js';

// Un solo login para el negocio: usuario "macaco" + la contraseña de siempre.
// Felipe y su papá entran igual y ven la misma información. Por dentro es la
// cuenta de Supabase del negocio (el correo nunca se escribe ni se muestra).
const USUARIO = 'macaco';
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

  const signIn = useCallback(async (usuario, password) => {
    setAuthError(null);
    if (usuario.trim().toLowerCase() !== USUARIO) { setAuthError('Usuario o contraseña incorrectos.'); return false; }
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
