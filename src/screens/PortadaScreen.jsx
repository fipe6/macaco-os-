// Portada: el cerebro. Un mapa de puntos de luz, un punto por área; abajo los
// mismos accesos en lista (para el celular). Arriba, UN solo paso para hoy.
import { useMemo } from 'react';
import { MACACO } from '../theme.js';
import { useApp } from '../store.jsx';
import { escanearCorteza } from '../corteza.js';
import { areasPortada, ahoraPaso } from '../domain/portada.js';
import { CerebroMapa } from '../components/CerebroMapa.jsx';
import { Icon } from '../components/ui.jsx';

const fino = { fontWeight: 300 };
const etiqueta = { fontSize: 11, fontWeight: 600, letterSpacing: '0.14em', textTransform: 'uppercase' };

export default function PortadaScreen({ go }) {
  const { productos, ventas, gastos, deudas, caja, config, corteza, sync } = useApp();

  const areas = useMemo(() => areasPortada({ productos, ventas, gastos, deudas, caja, config }),
    [productos, ventas, gastos, deudas, caja, config]);
  const ahora = useMemo(() => ahoraPaso(
    escanearCorteza({ productos, ventas, gastos, deudas, caja, config }).decisiones, corteza),
  [productos, ventas, gastos, deudas, caja, config, corteza]);

  const abrir = (n) => go(n.destino, n.id);
  const fecha = new Date().toLocaleDateString('es-CL', { weekday: 'long', day: 'numeric', month: 'long' });

  return (
    <div style={{ minHeight: '100%', background: '#000', color: MACACO.text, padding: '10px 20px 220px', boxSizing: 'border-box' }}>
      {/* Barra superior: sin bordes, sobre el negro */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '4px 0 22px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Icon.monkey size={22} />
          <span style={{ ...etiqueta, letterSpacing: '0.2em', fontSize: 12.5 }}>Makako</span>
        </div>
        <span style={{ fontSize: 12, ...fino, color: MACACO.textDim, textAlign: 'right' }}>
          <span style={{ textTransform: 'capitalize', display: 'block' }}>{fecha}</span>
          {sync.pendientes > 0 && <span style={{ color: MACACO.ambar, fontWeight: 400 }}>{sync.pendientes} por enviar</span>}
        </span>
      </div>

      {/* Ahora */}
      <div style={{ marginBottom: 6 }}>
        <div style={{ ...etiqueta, color: MACACO.ambar }}>Ahora</div>
        <div style={{ fontSize: 27, fontWeight: 400, letterSpacing: '-0.04em', lineHeight: 1.1, marginTop: 10, textWrap: 'balance' }}>{ahora.titulo}</div>
        <div style={{ fontSize: 14.5, ...fino, color: '#bdbdbd', lineHeight: 1.5, marginTop: 10, maxWidth: 420 }}>{ahora.porque}</div>
        {ahora.destino && (
          <button onClick={() => go(ahora.destino, ahora.area)} style={{
            marginTop: 16, background: MACACO.lavanda, color: '#0A0A0F', border: 'none', borderRadius: 24, cursor: 'pointer',
            padding: '13px 22px', fontFamily: 'inherit', fontSize: 13, fontWeight: 600, letterSpacing: '0.025em', textTransform: 'uppercase',
          }}>Hacerlo</button>
        )}
      </div>

      {/* Mapa */}
      <div style={{ margin: '14px -20px 0' }}>
        <CerebroMapa nodos={areas} onElegir={abrir} alto={410} />
      </div>
      <div style={{ fontSize: 11, ...fino, color: MACACO.textMuted, textAlign: 'center', marginTop: 2 }}>
        Más brillo = mejor va esa área · punto tenue = aún sin medir
      </div>

      {/* Lista: lo mismo, pensado para el pulgar */}
      <div style={{ marginTop: 34 }}>
        {areas.map(a => (
          <button key={a.id} onClick={() => abrir(a)} style={{
            width: '100%', textAlign: 'left', background: 'transparent', border: 'none', cursor: 'pointer', color: MACACO.text,
            fontFamily: 'inherit', padding: '15px 0', display: 'flex', alignItems: 'center', gap: 14,
          }}>
            <span aria-hidden="true" style={{
              width: 10, height: 10, borderRadius: 999, flexShrink: 0,
              background: a.medido ? (a.salud >= 0.66 ? MACACO.verde : MACACO.lavanda) : 'transparent',
              border: a.medido ? 'none' : `1.5px dashed ${MACACO.lavanda}`,
              opacity: a.medido ? 0.35 + 0.65 * a.salud : 0.6,
              boxShadow: a.medido ? `0 0 ${4 + 10 * a.salud}px ${a.salud >= 0.66 ? MACACO.verde : MACACO.lavanda}` : 'none',
            }} />
            <span style={{ flex: 1, minWidth: 0 }}>
              <span style={{ display: 'block', fontSize: 22, fontWeight: 400, letterSpacing: '-0.03em' }}>{a.nombre}</span>
              <span style={{ display: 'block', fontSize: 13, ...fino, color: a.medido ? '#bdbdbd' : MACACO.textMuted, marginTop: 2 }}>{a.dato}</span>
            </span>
            <span style={{ color: MACACO.textMuted }}><Icon.arrowRight size={16} /></span>
          </button>
        ))}
      </div>

      {/* Enlaces discretos */}
      <div style={{ display: 'flex', gap: 22, marginTop: 22, flexWrap: 'wrap' }}>
        {[['Tu equipo · 12 asesores', 'equipo'], ['Resumen del día', 'home'], ['Decisiones del cerebro', 'corteza']].map(([t, d]) => (
          <button key={d} onClick={() => go(d)} style={{
            background: 'transparent', border: 'none', cursor: 'pointer', fontFamily: 'inherit', padding: 0,
            fontSize: 13, fontWeight: 400, color: MACACO.textDim, textDecoration: 'underline', textUnderlineOffset: 4,
          }}>{t}</button>
        ))}
      </div>
    </div>
  );
}
