// Área CATÁLOGO — precios y márgenes de lo que se vende.
import { decision, clp } from '../decision.js';

const MARGEN_MIN_PCT = 25;        // margen bruto mínimo aceptable por producto
const MARGEN_OBJETIVO_PCT = 30;   // precio sugerido cuando el margen es bajo

function senalesMargen({ productos }, { vel }) {
  const out = [];
  productos.forEach(p => {
    const v = vel.porProducto[p.id];
    const margenUnit = (p.price || 0) - (p.cost || 0);
    const porDia = v?.porDia || 0;

    // Margen bajo en un producto que sí rota.
    if (porDia > 0 && p.price > 0) {
      const margenPct = margenUnit / p.price * 100;
      if (margenPct < MARGEN_MIN_PCT) {
        const nuevo = Math.ceil(p.cost / (1 - MARGEN_OBJETIVO_PCT / 100) / 500) * 500;
        const extra = porDia * 30 * (nuevo - p.price);
        out.push(decision({
          id: `margen-bajo:${p.id}`,
          tipo: 'Margen',
          senal: `${p.name} deja solo ${margenPct.toFixed(0)}% de margen`,
          evidencia: [`Costo ${clp(p.cost)} · precio ${clp(p.price)}`, `${v.unidades} u vendidas en ${vel.diasVentana} días`],
          impactoMensual: Math.round(extra),
          roi: `+${clp(nuevo - p.price)} por unidad`,
          riesgo: 'medio',
          accion: `Subir precio a ${clp(nuevo)} (${MARGEN_OBJETIVO_PCT}% de margen) y medir si cae la venta`,
          artefacto: 'Ajuste de precio en Inventario',
          destino: 'inventario',
        }));
      }
    }
  });
  return out;
}

export const area = {
  id: 'catalogo',
  nombre: 'Catálogo',
  detectar: (datos, ctx) => senalesMargen(datos, ctx),
};
