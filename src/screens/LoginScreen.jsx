import { useState } from 'react';
import { MACACO } from '../theme.js';
import { useAuth } from '../AuthProvider.jsx';

export default function LoginScreen() {
  const { sendMagicLink, authError } = useAuth();
  const [email, setEmail]     = useState('');
  const [loading, setLoading] = useState(false);
  const [enviado, setEnviado] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    const ok = await sendMagicLink(email.trim());
    setLoading(false);
    if (ok) setEnviado(true);
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
        <div style={{ fontSize: 12.5, color: MACACO.textMuted, marginTop: 4 }}>
          {enviado ? 'Revisa tu correo' : 'Ingresa tu correo para recibir el link de acceso'}
        </div>
      </div>

      {enviado ? (
        <div style={{ textAlign: 'center', fontSize: 13, color: MACACO.textDim, lineHeight: 1.5 }}>
          Te enviamos un link a<br /><strong style={{ color: '#fff' }}>{email}</strong><br />
          Ábrelo desde este mismo dispositivo para entrar.
          <div style={{ marginTop: 16 }}>
            <button onClick={() => setEnviado(false)} style={{
              background: 'transparent', border: 'none', color: MACACO.primary,
              fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
            }}>Usar otro correo</button>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 12 }}>
          <input
            type="email" placeholder="Correo" value={email} autoCapitalize="none"
            onChange={e => setEmail(e.target.value)} style={inputStyle} required
          />

          {authError && (
            <div style={{ fontSize: 12, color: MACACO.danger, textAlign: 'center' }}>{authError}</div>
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
            {loading ? 'ENVIANDO...' : 'ENVIAR LINK'}
          </button>
        </form>
      )}
    </div>
  );
}
