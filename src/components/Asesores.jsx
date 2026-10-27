// Asesores: personajes con emoji, color y una forma propia, para reconocerlos
// de un vistazo. Tocar uno abre su ficha y la ayuda lista para pedir.
import { useState } from 'react';
import { MACACO } from '../theme.js';
import { useApp } from '../store.jsx';
import { ASESORES, AREAS_ASESORES, deArea } from '../asesores/asesores.js';
import { armarPrompt } from '../asesores/prompt.js';
import { Capa } from './Capa.jsx';

const FORMAS = {
  triangulo: { clipPath: 'polygon(50% 4%, 97% 94%, 3% 94%)' },
  circulo:   { borderRadius: '50%' },
  cuadrado:  { borderRadius: 12 },
  rombo:     { clipPath: 'polygon(50% 0, 100% 50%, 50% 100%, 0 50%)' },
  hexagono:  { clipPath: 'polygon(25% 4%, 75% 4%, 100% 50%, 75% 96%, 25% 96%, 0 50%)' },
  pentagono: { clipPath: 'polygon(50% 0, 100% 38%, 82% 100%, 18% 100%, 0 38%)' },
  estrella:  { clipPath: 'polygon(50% 0, 61% 35%, 98% 35%, 68% 57%, 79% 92%, 50% 70%, 21% 92%, 32% 57%, 2% 35%, 39% 35%)' },
  cruz:      { clipPath: 'polygon(33% 0, 67% 0, 67% 33%, 100% 33%, 100% 67%, 67% 67%, 67% 100%, 33% 100%, 33% 67%, 0 67%, 0 33%, 33% 33%)' },
  octagono:  { clipPath: 'polygon(30% 0, 70% 0, 100% 30%, 100% 70%, 70% 100%, 30% 100%, 0 70%, 0 30%)' },
  escudo:    { clipPath: 'polygon(0 0, 100% 0, 100% 58%, 50% 100%, 0 58%)' },
  gota:      { borderRadius: '50% 50% 50% 50% / 62% 62% 38% 38%' },
  luna:      { borderRadius: '62% 38% 62% 38%' },
};

export function AsesorAvatar({ asesor, size = 56, activo = false }) {
  const forma = FORMAS[asesor.forma] || FORMAS.circulo;
  return (
    <div aria-hidden="true" style={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
      <div style={{ position: 'absolute', inset: 0, background: asesor.color, opacity: activo ? 1 : 0.85, ...forma }} />
      <div style={{ position: 'absolute', inset: 2.5, background: '#14141c', ...forma }} />
      <div style={{ position: 'absolute', inset: 2.5, background: asesor.color + '26', ...forma }} />
      <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: size * 0.46 }}>
        {asesor.emoji}
      </div>
    </div>
  );
}

// Fila de asesores de un área. `area` = id de AREAS_ASESORES, o `ids` para elegir.
export function Asesores({ area, ids, titulo = 'Tu equipo', envolver = false }) {
  const [abierto, setAbierto] = useState(null);
  const lista = ids ? ASESORES.filter(a => ids.includes(a.id)) : deArea(area);
  if (!lista.length) return null;
  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', padding: '0 4px', marginBottom: 10 }}>
        <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: MACACO.textDim }}>{titulo}</div>
        {!envolver && <div style={{ fontSize: 11, color: MACACO.textMuted }}>toca uno para pedirle ayuda</div>}
      </div>
      <div style={envolver
        ? { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '14px 6px', margin: '0 0 22px' }
        : { display: 'flex', gap: 10, overflowX: 'auto', margin: '0 -16px 18px', padding: '2px 16px 6px', scrollbarWidth: 'none' }}>
        {lista.map(a => (
          <button key={a.id} onClick={() => setAbierto(a)} aria-label={`${a.nombre}: ${a.funcion}`} style={{
            flex: '0 0 auto', width: envolver ? 'auto' : 84, background: 'transparent', border: 'none', cursor: 'pointer',
            fontFamily: 'inherit', color: MACACO.text, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 7, padding: 0,
          }}>
            <AsesorAvatar asesor={a} size={58} />
            <span style={{ fontSize: 10.5, fontWeight: 700, lineHeight: 1.25, textAlign: 'center' }}>{a.nombre}</span>
          </button>
        ))}
      </div>
      {abierto && <AsesorSheet asesor={abierto} onClose={() => setAbierto(null)} />}
    </>
  );
}

// Ficha del asesor + el mensaje listo para pegar en un chat con Claude.
export function AsesorSheet({ asesor, onClose }) {
  const { ventas, gastos, productos } = useApp();
  const [pregunta, setPregunta] = useState(asesor.preguntas[0]);
  const [copiado, setCopiado] = useState(false);
  const [verReglas, setVerReglas] = useState(false);
  const mensaje = armarPrompt(asesor, pregunta, { ventas, gastos, productos });

  const copiar = async () => {
    try {
      await navigator.clipboard.writeText(mensaje);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2200);
    } catch {
      // Sin permiso para copiar: se selecciona el texto para copiarlo a mano.
      document.getElementById('asesor-mensaje')?.select();
    }
  };

  return (<Capa>
    <div style={{ position: 'absolute', inset: 0, zIndex: 100, animation: 'fadeUp 220ms' }}>
      <div onClick={onClose} style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(4px)' }} />
      <div role="dialog" aria-label={asesor.nombre} style={{
        position: 'absolute', left: 0, right: 0, bottom: 0, maxHeight: '92%', overflowY: 'auto',
        background: MACACO.bg, borderTopLeftRadius: 24, borderTopRightRadius: 24,
        border: `1px solid ${MACACO.border}`, borderBottom: 'none', padding: '14px 18px 30px',
        boxShadow: '0 -20px 50px rgba(0,0,0,0.6)', animation: 'sheetUp 320ms cubic-bezier(.2,.7,.2,1)',
      }}>
        <div style={{ width: 36, height: 4, borderRadius: 999, background: 'rgba(255,255,255,0.18)', margin: '0 auto 16px' }} />

        <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
          <AsesorAvatar asesor={asesor} size={72} activo />
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 20, fontWeight: 800, letterSpacing: '-0.02em' }}>{asesor.nombre}</div>
            <div style={{ fontSize: 13, color: MACACO.textDim, marginTop: 3, lineHeight: 1.4 }}>{asesor.funcion}</div>
          </div>
        </div>

        <div style={{ fontSize: 10.5, fontWeight: 800, letterSpacing: '0.14em', color: asesor.color, margin: '20px 0 8px' }}>¿QUÉ LE PREGUNTO?</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {asesor.preguntas.map(p => {
            const on = p === pregunta;
            return (
              <button key={p} onClick={() => setPregunta(p)} style={{
                textAlign: 'left', padding: '11px 13px', borderRadius: 12, cursor: 'pointer', fontFamily: 'inherit',
                fontSize: 13, fontWeight: on ? 700 : 500, lineHeight: 1.35, color: MACACO.text,
                background: on ? asesor.color + '22' : MACACO.card, border: `1px solid ${on ? asesor.color : MACACO.border}`,
              }}>{p}</button>
            );
          })}
        </div>

        <button onClick={copiar} style={{
          width: '100%', marginTop: 14, padding: 14, borderRadius: 12, border: 'none', cursor: 'pointer', fontFamily: 'inherit',
          fontSize: 13.5, fontWeight: 800, color: '#0A0A0F', background: copiado ? '#3FCB7F' : '#9984D8', transition: 'background 200ms',
        }}>{copiado ? '✓ Copiado: pégalo en tu chat con Claude' : `Copiar mensaje para ${asesor.nombre}`}</button>
        <div style={{ fontSize: 11, color: MACACO.textMuted, marginTop: 8, lineHeight: 1.45 }}>
          Incluye el rol y datos de ventas, gastos y productos. <b style={{ color: MACACO.textDim }}>No lleva caja, deudas ni costos de compra.</b>
        </div>

        <button onClick={() => setVerReglas(v => !v)} style={{
          marginTop: 16, background: 'transparent', border: 'none', color: MACACO.textDim, cursor: 'pointer',
          fontFamily: 'inherit', fontSize: 12, fontWeight: 700, padding: 0,
        }}>{verReglas ? '▾ Ocultar cómo trabaja' : '▸ Cómo trabaja'}</button>
        {verReglas && (
          <div style={{ marginTop: 10 }}>
            <div style={{ fontSize: 12.5, color: MACACO.textDim, lineHeight: 1.5, marginBottom: 8 }}>{asesor.mision}</div>
            {asesor.reglas.map(r => (
              <div key={r} style={{ fontSize: 12, color: MACACO.textDim, lineHeight: 1.45, display: 'flex', gap: 7, marginBottom: 4 }}>
                <span style={{ color: asesor.color }}>·</span><span>{r}</span>
              </div>
            ))}
            <div style={{ fontSize: 10.5, color: MACACO.textMuted, marginTop: 10 }}>
              Entrega: {asesor.entrega.join(' · ')}
            </div>
          </div>
        )}

        <label htmlFor="asesor-mensaje" style={{ display: 'block', fontSize: 10.5, color: MACACO.textMuted, margin: '16px 0 6px' }}>
          Así se ve el mensaje (por si no se copia solo):
        </label>
        <textarea id="asesor-mensaje" readOnly value={mensaje} rows={5} style={{
          width: '100%', boxSizing: 'border-box', background: MACACO.card, color: MACACO.textDim, border: `1px solid ${MACACO.border}`,
          borderRadius: 10, padding: 10, fontSize: 11, fontFamily: 'JetBrains Mono, ui-monospace, monospace', resize: 'vertical',
        }} />
      </div>
    </div></Capa>
  );
}

export { AREAS_ASESORES };
