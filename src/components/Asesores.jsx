// Asesores: personajes con emoji, color y una forma propia, para reconocerlos
// de un vistazo. Tocar uno abre su ficha y la ayuda lista para pedir.
import { useState, useRef, useEffect } from 'react';
import { MACACO } from '../theme.js';
import { useApp } from '../store.jsx';
import { ASESORES, AREAS_ASESORES, deArea } from '../asesores/asesores.js';
import { armarPrompt, armarSistema } from '../asesores/prompt.js';
import { preguntarAsesor } from '../services/asesorChat.js';
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

// Ficha del asesor: se le consulta aquí mismo (responde Claude con tus ventas,
// gastos y productos; nunca caja, deudas ni costos). Copiar el mensaje queda
// como respaldo para usarlo en otro chat.
export function AsesorSheet({ asesor, onClose }) {
  const { ventas, gastos, productos } = useApp();
  const datos = { ventas, gastos, productos };
  const [chat, setChat] = useState([]);          // [{ role, content, error? }]
  const [texto, setTexto] = useState('');
  const [pensando, setPensando] = useState(false);
  const [copiado, setCopiado] = useState(false);
  const [verReglas, setVerReglas] = useState(false);
  const [aMano, setAMano] = useState(false);
  const fin = useRef(null);
  useEffect(() => { fin.current?.scrollIntoView?.({ behavior: 'smooth', block: 'end' }); }, [chat, pensando]);

  const enviar = async (pregunta) => {
    const q = pregunta.trim();
    if (!q || pensando) return;
    const mensajes = [...chat.filter(m => !m.error), { role: 'user', content: q }];
    setChat([...chat, { role: 'user', content: q }]);
    setTexto('');
    setPensando(true);
    const r = await preguntarAsesor({ system: armarSistema(asesor, datos), mensajes });
    setChat(c => [...c, r.ok ? { role: 'assistant', content: r.texto } : { role: 'assistant', content: r.error, error: true }]);
    setPensando(false);
  };

  const mensaje = armarPrompt(asesor, chat.find(m => m.role === 'user')?.content || asesor.preguntas[0], datos);
  const copiar = async () => {
    try {
      await navigator.clipboard.writeText(mensaje);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2200);
    } catch {
      setAMano(true);   // sin permiso para copiar: se muestra el texto para copiarlo a mano
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
          <AsesorAvatar asesor={asesor} size={64} activo />
          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{ fontSize: 20, fontWeight: 800, letterSpacing: '-0.02em' }}>{asesor.nombre}</div>
            <div style={{ fontSize: 13, color: MACACO.textDim, marginTop: 3, lineHeight: 1.4 }}>{asesor.funcion}</div>
          </div>
          <button onClick={onClose} aria-label="Cerrar" style={{
            width: 32, height: 32, borderRadius: 999, flexShrink: 0, background: MACACO.cardElev, border: `1px solid ${MACACO.border}`,
            color: '#fff', fontSize: 18, cursor: 'pointer', fontFamily: 'inherit',
          }}>×</button>
        </div>

        {/* Conversación */}
        {chat.length > 0 && (
          <div aria-live="polite" style={{ display: 'flex', flexDirection: 'column', gap: 10, margin: '18px 0 4px' }}>
            {chat.map((m, i) => (
              <div key={i} style={{
                alignSelf: m.role === 'user' ? 'flex-end' : 'flex-start', maxWidth: '88%', whiteSpace: 'pre-wrap',
                padding: '10px 13px', borderRadius: 14, fontSize: 13.5, lineHeight: 1.5,
                background: m.role === 'user' ? asesor.color + '30' : m.error ? 'rgba(255,77,77,0.12)' : MACACO.card,
                border: `1px solid ${m.role === 'user' ? asesor.color : m.error ? 'rgba(255,77,77,0.4)' : MACACO.border}`,
                color: m.error ? MACACO.danger : MACACO.text,
              }}>{m.content}</div>
            ))}
            {pensando && <div style={{ alignSelf: 'flex-start', fontSize: 12.5, color: MACACO.textMuted, padding: '4px 2px' }}>{asesor.nombre} está pensando…</div>}
            <div ref={fin} />
          </div>
        )}

        {/* Preguntas listas: tocar una la envía */}
        <div style={{ fontSize: 10.5, fontWeight: 800, letterSpacing: '0.14em', color: asesor.color, margin: '18px 0 8px' }}>
          {chat.length ? 'OTRA PREGUNTA' : '¿QUÉ LE PREGUNTO?'}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {asesor.preguntas.map(p => (
            <button key={p} disabled={pensando} onClick={() => enviar(p)} style={{
              textAlign: 'left', padding: '11px 13px', borderRadius: 12, cursor: pensando ? 'default' : 'pointer', fontFamily: 'inherit',
              fontSize: 13, fontWeight: 500, lineHeight: 1.35, color: MACACO.text, opacity: pensando ? 0.5 : 1,
              background: MACACO.card, border: `1px solid ${MACACO.border}`,
            }}>{p}</button>
          ))}
        </div>

        {/* Pregunta propia */}
        <form onSubmit={(e) => { e.preventDefault(); enviar(texto); }} style={{ display: 'flex', gap: 8, marginTop: 12 }}>
          <input value={texto} onChange={e => setTexto(e.target.value)} maxLength={500} placeholder={`Escíbele a ${asesor.nombre}…`}
            aria-label={`Pregunta para ${asesor.nombre}`} style={{
              flex: 1, minWidth: 0, boxSizing: 'border-box', background: MACACO.cardElev, border: `1px solid ${MACACO.border}`,
              borderRadius: 12, padding: '12px 14px', color: '#fff', fontSize: 14, outline: 'none', fontFamily: 'inherit',
            }} />
          <button type="submit" disabled={pensando || !texto.trim()} style={{
            padding: '0 18px', borderRadius: 12, border: 'none', fontFamily: 'inherit', fontSize: 13, fontWeight: 800,
            color: '#0A0A0F', background: asesor.color, cursor: pensando || !texto.trim() ? 'default' : 'pointer', opacity: pensando || !texto.trim() ? 0.45 : 1,
          }}>Enviar</button>
        </form>
        <div style={{ fontSize: 11, color: MACACO.textMuted, marginTop: 8, lineHeight: 1.45 }}>
          Responde con tus ventas, gastos y productos. <b style={{ color: MACACO.textDim }}>No ve caja, deudas ni costos de compra.</b>
        </div>

        <div style={{ display: 'flex', gap: 16, marginTop: 16, flexWrap: 'wrap' }}>
          <button onClick={() => setVerReglas(v => !v)} style={{
            background: 'transparent', border: 'none', color: MACACO.textDim, cursor: 'pointer', fontFamily: 'inherit', fontSize: 12, fontWeight: 700, padding: 0,
          }}>{verReglas ? '▾ Ocultar cómo trabaja' : '▸ Cómo trabaja'}</button>
          <button onClick={copiar} style={{
            background: 'transparent', border: 'none', color: copiado ? '#3FCB7F' : MACACO.textDim, cursor: 'pointer', fontFamily: 'inherit', fontSize: 12, fontWeight: 700, padding: 0,
          }}>{copiado ? '✓ Copiado' : 'Copiar mensaje para otro chat'}</button>
        </div>
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
        {aMano && (
          <textarea readOnly autoFocus value={mensaje} rows={6} onFocus={e => e.target.select()} aria-label="Mensaje para copiar" style={{
            width: '100%', boxSizing: 'border-box', marginTop: 12, background: MACACO.card, color: MACACO.textDim, border: `1px solid ${MACACO.border}`,
            borderRadius: 10, padding: 10, fontSize: 11, fontFamily: 'JetBrains Mono, ui-monospace, monospace', resize: 'vertical',
          }} />
        )}
      </div>
    </div></Capa>
  );
}

export { AREAS_ASESORES };
