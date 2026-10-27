// Pantalla simple de un área que todavía no tiene módulo propio (Marketing,
// Catálogo, Legal, En obra): UN dato grande, sus asesores y lo que el cerebro
// tenga para ella. El detalle se va sumando área por área.
import { useMemo } from 'react';
import { MACACO } from '../theme.js';
import { Icon } from '../components/ui.jsx';
import { useApp } from '../store.jsx';
import { areasPortada } from '../domain/portada.js';
import { Asesores } from '../components/Asesores.jsx';
import { CerebroArea } from '../components/CerebroArea.jsx';

const AREAS = {
  marketing: { titulo: 'Marketing', que: 'Anuncios en Meta, contenido y ofertas.', asesores: ['marketing'], cerebro: [] },
  catalogo:  { titulo: 'Catálogo',  que: 'Catálogo web, fotos y Mercado Libre.',   asesores: ['comercio-online'], cerebro: ['catalogo'] },
  legal:     { titulo: 'Legal',     que: 'Contratos con proveedores y términos de la tienda.', asesores: ['abogado'], cerebro: [] },
  obra:      { titulo: 'En obra',   que: 'Lo que estamos armando ahora: la versión 2.0.',      asesores: ['jefe-gabinete'], cerebro: [] },
};

export default function AreaScreen({ go, areaId }) {
  const { productos, ventas, gastos, deudas, caja, config } = useApp();
  const cfg = AREAS[areaId] || AREAS.obra;
  const nodo = useMemo(() => areasPortada({ productos, ventas, gastos, deudas, caja, config }).find(a => a.id === areaId), [productos, ventas, gastos, deudas, caja, config, areaId]);

  return (
    <div style={{ minHeight: '100%', background: '#000', color: MACACO.text, padding: '10px 20px 120px', boxSizing: 'border-box' }}>
      <button onClick={() => go('cerebro')} style={{
        background: 'transparent', border: 'none', color: MACACO.lavanda, padding: '4px 0 18px', cursor: 'pointer', fontFamily: 'inherit',
        fontSize: 12.5, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', display: 'inline-flex', alignItems: 'center', gap: 6,
      }}>
        <span style={{ display: 'inline-block', transform: 'rotate(180deg)', lineHeight: 0 }}><Icon.arrowRight size={12} /></span>
        Volver al cerebro
      </button>

      <div style={{ fontSize: 40, fontWeight: 400, letterSpacing: '-0.04em', lineHeight: 1.05 }}>{cfg.titulo}</div>
      <div style={{ fontSize: 22, fontWeight: 300, color: MACACO.lavanda, marginTop: 14 }}>{nodo?.dato}</div>
      <div style={{ fontSize: 14.5, fontWeight: 300, color: '#bdbdbd', lineHeight: 1.5, marginTop: 10, marginBottom: 30, maxWidth: 420 }}>
        {cfg.que} {nodo && !nodo.medido && 'Todavía no hay datos para medirla: se enciende cuando los haya.'}
      </div>

      {cfg.cerebro.length > 0 && <CerebroArea areas={cfg.cerebro} go={go} />}
      <Asesores ids={cfg.asesores} titulo="Quién te ayuda aquí" />
    </div>
  );
}
