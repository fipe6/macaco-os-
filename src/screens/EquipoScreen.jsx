import { MACACO } from '../theme.js';
import { Screen } from '../components/Screen.jsx';
import { Icon } from '../components/ui.jsx';
import { Asesores, AREAS_ASESORES } from '../components/Asesores.jsx';
import { deArea } from '../asesores/asesores.js';

export default function EquipoScreen({ go }) {
  return (
    <Screen>
      <div style={{ padding: '6px 0 14px' }}>
        <button onClick={() => go('home')} style={{
          background: 'transparent', border: 'none', color: MACACO.textMuted, padding: 0, cursor: 'pointer', fontFamily: 'inherit',
          fontSize: 11, fontWeight: 700, letterSpacing: '0.16em', textTransform: 'uppercase', display: 'inline-flex', alignItems: 'center', gap: 5,
        }}>
          <span style={{ display: 'inline-block', transform: 'rotate(180deg)', lineHeight: 0 }}><Icon.arrowRight size={11} /></span>
          Volver
        </button>
        <div style={{ fontSize: 11, color: '#9984D8', fontWeight: 700, letterSpacing: '0.16em', textTransform: 'uppercase', marginTop: 10 }}>12 asesores</div>
        <div style={{ fontSize: 26, fontWeight: 800, letterSpacing: '-0.02em', marginTop: 4 }}>Tu equipo</div>
        <div style={{ fontSize: 12.5, color: MACACO.textDim, marginTop: 6, lineHeight: 1.45 }}>
          Cada uno tiene su emoji, color y forma. Toca uno y copia el mensaje para pedirle ayuda.
        </div>
      </div>

      {AREAS_ASESORES.filter(a => deArea(a.id).length).map(a => (
        <Asesores key={a.id} area={a.id} envolver titulo={`${a.nombre} · ${a.detalle}`} />
      ))}
    </Screen>
  );
}
