import { MACACO, clp } from '../theme.js';
import { Progress, Icon } from './ui.jsx';

// Lo primero al abrir: caja, hoy contra ayer, cómo va el mes y lo que viene en camino.
export function ResumenInicio({ r, caja, colchon = 0, go, cerebro = true }) {
  const etiqueta = { fontSize: 10.5, color: MACACO.textDim, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase' };
  const cifra = (tam) => ({ fontSize: tam, fontWeight: 700, letterSpacing: '-0.02em', fontVariantNumeric: 'tabular-nums' });
  const cajaBaja = colchon > 0 && caja < colchon;
  const metaOk = r.pctMes != null && r.pctMes >= 100;
  return (
    <div style={{ marginBottom: 16 }}>
      {/* Caja: lo más importante */}
      <button onClick={() => go('finanzas')} style={{
        width: '100%', textAlign: 'left', cursor: 'pointer', fontFamily: 'inherit', color: MACACO.text,
        background: MACACO.card, border: `1px solid ${cajaBaja ? MACACO.danger : MACACO.border}`, borderRadius: 18, padding: '16px 18px',
      }}>
        <div style={etiqueta}>Caja</div>
        <div style={{ ...cifra(34), marginTop: 4, color: cajaBaja ? MACACO.danger : MACACO.text }}>{clp(caja)}</div>
        <div style={{ fontSize: 11.5, color: cajaBaja ? MACACO.danger : MACACO.textMuted, marginTop: 4 }}>
          {cajaBaja ? `Bajo el colchón de ${clp(colchon)}` : 'Disponible hoy'}
        </div>
      </button>

      {/* Hoy y ayer */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 10 }}>
        <div style={{ background: MACACO.card, border: `1px solid ${MACACO.border}`, borderRadius: 16, padding: 14 }}>
          <div style={etiqueta}>Hoy</div>
          <div style={{ ...cifra(22), marginTop: 4 }}>{clp(r.hoy)}</div>
          <div style={{ fontSize: 11, color: MACACO.textMuted, marginTop: 4 }}>
            {r.ventasHoy ? `${r.ventasHoy} venta${r.ventasHoy > 1 ? 's' : ''}` : 'Sin ventas aún'}
            {r.pctDia != null && <> · <span style={{ color: r.pctDia >= 100 ? MACACO.success : MACACO.textDim, fontWeight: 600 }}>{r.pctDia}% de la meta</span></>}
          </div>
        </div>
        <div style={{ background: MACACO.card, border: `1px solid ${MACACO.border}`, borderRadius: 16, padding: 14 }}>
          <div style={etiqueta}>Ayer</div>
          <div style={{ ...cifra(22), marginTop: 4, color: MACACO.textDim }}>{clp(r.ayer)}</div>
          <div style={{ fontSize: 11, marginTop: 4, fontWeight: 600, color: r.vsAyer == null || r.hoy === 0 ? MACACO.textMuted : r.vsAyer >= 0 ? MACACO.success : MACACO.danger }}>
            {r.vsAyer == null ? 'Sin ventas ayer' : r.hoy === 0 ? 'Hoy todavía no hay ventas' : `Hoy ${r.vsAyer >= 0 ? '+' : ''}${r.vsAyer}% vs ayer`}
          </div>
        </div>
      </div>

      {/* Meta del mes */}
      {r.pctMes != null && (
        <div style={{ background: MACACO.card, border: `1px solid ${MACACO.border}`, borderRadius: 16, padding: 14, marginTop: 10 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
            <div style={etiqueta}>Meta del mes</div>
            <div style={{ ...cifra(18), color: metaOk ? MACACO.success : MACACO.primary }}>{r.pctMes}%</div>
          </div>
          <div style={{ margin: '10px 0 8px' }}><Progress value={r.pctMes} color={metaOk ? MACACO.success : MACACO.primary} /></div>
          <div style={{ fontSize: 12, color: MACACO.textDim, lineHeight: 1.45 }}>
            {metaOk
              ? <>Meta cumplida: llevas <b style={{ color: MACACO.text }}>{clp(r.mes)}</b>.</>
              : <>Llevas <b style={{ color: MACACO.text }}>{clp(r.mes)}</b>. Faltan <b style={{ color: MACACO.text }}>{clp(r.faltaMes)}</b>: {clp(r.porDia)} por día en {r.diasQuedan} día{r.diasQuedan > 1 ? 's' : ''}.</>}
          </div>
        </div>
      )}

      {/* En camino + cerebro */}
      <div style={{ display: 'flex', gap: 10, marginTop: 10 }}>
        {r.pedidosEnCamino > 0 && (
          <button onClick={() => go('inventario')} style={{
            flex: 1, background: MACACO.card, border: `1px solid ${MACACO.border}`, borderRadius: 14, padding: '11px 12px',
            color: MACACO.text, fontFamily: 'inherit', fontSize: 12.5, fontWeight: 600, cursor: 'pointer', textAlign: 'left',
          }}>📦 {r.pedidosEnCamino} pedido{r.pedidosEnCamino > 1 ? 's' : ''} en camino</button>
        )}
        {cerebro && <button onClick={() => go('cerebro')} style={{
          flex: 1, background: 'transparent', border: `1px solid ${MACACO.lavanda}`, borderRadius: 14, padding: '11px 12px',
          color: MACACO.lavanda, fontFamily: 'inherit', fontSize: 12.5, fontWeight: 600, cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
        }}><Icon.brain size={16} /> Ver el cerebro</button>}
      </div>
    </div>
  );
}
