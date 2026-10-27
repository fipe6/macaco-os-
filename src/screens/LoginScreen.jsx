import { useState } from 'react';
import { MACACO } from '../theme.js';
import { Icon } from '../components/ui.jsx';
import { useAuth } from '../AuthProvider.jsx';
import { DEMO } from '../demo.js';

export default function LoginScreen() {
  const { signIn, authError } = useAuth();
  const [usuario, setUsuario]   = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading]   = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    await signIn(usuario, password);
    setLoading(false);
  };

  return (
    <div style={{
      position: 'absolute', inset: 0, background: MACACO.bg,
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      padding: '0 28px', gap: 22,
    }}>
      <Icon.monkey size={64} />
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 22, fontWeight: 800, color: '#fff' }}>Macaco OS</div>
        <div style={{ fontSize: 12.5, color: MACACO.textMuted, marginTop: 4 }}>
          Gestión Macaco Suplementos
        </div>
        {DEMO && (
          <div style={{ fontSize: 11.5, color: MACACO.primary, marginTop: 10, lineHeight: 1.45 }}>
            Demo de revisión: usuario <b>macaco</b> y cualquier contraseña.<br />No toca los datos reales.
          </div>
        )}
      </div>

      <form onSubmit={handleSubmit} style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 12 }}>
        <input
          type="text" placeholder="Usuario" value={usuario} autoFocus
          autoCapitalize="none" autoCorrect="off" autoComplete="username"
          onChange={e => setUsuario(e.target.value)} style={{
            width: '100%', boxSizing: 'border-box',
            background: MACACO.cardElev, border: `1px solid ${MACACO.border}`,
            borderRadius: 10, padding: '13px 14px', color: '#fff',
            fontSize: 15, outline: 'none', fontFamily: 'inherit',
          }} required
        />
        <input
          type="password" placeholder="Contraseña" value={password} autoComplete="current-password"
          onChange={e => setPassword(e.target.value)} style={{
            width: '100%', boxSizing: 'border-box',
            background: MACACO.cardElev, border: `1px solid ${MACACO.border}`,
            borderRadius: 10, padding: '13px 14px', color: '#fff',
            fontSize: 15, outline: 'none', fontFamily: 'inherit',
          }} required
        />

        {authError && (
          <div style={{ fontSize: 12, color: MACACO.danger, textAlign: 'center' }}>
            {authError === 'Invalid login credentials' ? 'Usuario o contraseña incorrectos.' : authError}
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
