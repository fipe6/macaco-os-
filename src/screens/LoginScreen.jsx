import { useState } from 'react';
import { MACACO } from '../theme.js';
import { useAuth } from '../AuthProvider.jsx';

export default function LoginScreen() {
  const { signIn, authError } = useAuth();
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading]   = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    await signIn(email.trim(), password);
    setLoading(false);
  };

  const inputStyle = {
    width: '100%', boxSizing: 'border-box',
    background: MACACO.cardElev, border: `1px solid ${MACACO.border}`,
    borderRadius: 10, padding: '13px 14px', color: '#fff',
    fontSize: 15, outline: 'none', fontFamily: 'inherit',
  };

  return (
    <div style={{
      position: 'absolute', inset: 0, background: MACACO.bg,
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      padding: '0 28px', gap: 22,
    }}>
      <div style={{ fontSize: 44 }}>🦁</div>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 22, fontWeight: 800, color: '#fff' }}>Macaco OS</div>
        <div style={{ fontSize: 12.5, color: MACACO.textMuted, marginTop: 4 }}>Inicia sesión para continuar</div>
      </div>

      <form onSubmit={handleSubmit} style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 12 }}>
        <input
          type="email" placeholder="Correo" value={email} autoCapitalize="none"
          onChange={e => setEmail(e.target.value)} style={inputStyle} required
        />
        <input
          type="password" placeholder="Contraseña" value={password}
          onChange={e => setPassword(e.target.value)} style={inputStyle} required
        />

        {authError && (
          <div style={{ fontSize: 12, color: MACACO.danger, textAlign: 'center' }}>
            {authError === 'Invalid login credentials' ? 'Correo o contraseña incorrectos.' : authError}
          </div>
        )}

        <button type="submit" disabled={loading} style={{
          width: '100%', padding: '14px', marginTop: 6,
          background: MACACO.primary, color: '#0A0A0F',
          border: 'none', borderRadius: 12,
          fontSize: 13.5, fontWeight: 800, letterSpacing: '0.04em',
          cursor: 'pointer', fontFamily: 'inherit',
          boxShadow: `0 0 20px ${MACACO.primary}44`,
          opacity: loading ? 0.7 : 1,
        }}>
          {loading ? 'ENTRANDO...' : 'ENTRAR'}
        </button>
      </form>
    </div>
  );
}
