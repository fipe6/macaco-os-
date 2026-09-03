import { useState } from 'react';
import { MACACO } from '../theme.js';
import { useAuth, CUENTAS } from '../AuthProvider.jsx';

export default function LoginScreen() {
  const { signIn, authError } = useAuth();
  const [quien, setQuien]     = useState(null); // 'felipe' | 'papa' | null
  const [password, setPassword] = useState('');
  const [loading, setLoading]   = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    await signIn(quien, password);
    setLoading(false);
  };

  const volver = () => { setQuien(null); setPassword(''); };

  return (
    <div style={{
      position: 'absolute', inset: 0, background: MACACO.bg,
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      padding: '0 28px', gap: 22,
    }}>
      <div style={{ fontSize: 44 }}>🦁</div>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 22, fontWeight: 800, color: '#fff' }}>Macaco OS</div>
        <div style={{ fontSize: 12.5, color: MACACO.textMuted, marginTop: 4 }}>
          {quien ? 'Ingresa tu contraseña' : '¿Quién eres?'}
        </div>
      </div>

      {!quien ? (
        <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 12 }}>
          {Object.entries(CUENTAS).map(([key, cuenta]) => (
            <button
              key={key}
              onClick={() => setQuien(key)}
              style={{
                width: '100%', padding: '16px', boxSizing: 'border-box',
                background: MACACO.cardElev, border: `1px solid ${MACACO.border}`,
                borderRadius: 12, color: '#fff', fontSize: 15, fontWeight: 700,
                cursor: 'pointer', fontFamily: 'inherit',
              }}
            >
              {cuenta.label}
            </button>
          ))}
        </div>
      ) : (
        <form onSubmit={handleSubmit} style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 12 }}>
          <input
            type="password" placeholder="Contraseña" value={password} autoFocus
            onChange={e => setPassword(e.target.value)} style={{
              width: '100%', boxSizing: 'border-box',
              background: MACACO.cardElev, border: `1px solid ${MACACO.border}`,
              borderRadius: 10, padding: '13px 14px', color: '#fff',
              fontSize: 15, outline: 'none', fontFamily: 'inherit',
            }} required
          />

          {authError && (
            <div style={{ fontSize: 12, color: MACACO.danger, textAlign: 'center' }}>
              {authError === 'Invalid login credentials' ? 'Contraseña incorrecta.' : authError}
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
            {loading ? 'ENTRANDO...' : `ENTRAR COMO ${CUENTAS[quien].label.toUpperCase()}`}
          </button>

          <button type="button" onClick={volver} style={{
            background: 'none', border: 'none', color: MACACO.textMuted,
            fontSize: 12, cursor: 'pointer', fontFamily: 'inherit', padding: 4,
          }}>
            ‹ Volver
          </button>
        </form>
      )}
    </div>
  );
}
