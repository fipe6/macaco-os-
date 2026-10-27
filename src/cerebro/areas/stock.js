// Área STOCK — quiebres, cobertura corta, capital inmovilizado y la jugada del Timonel.
import { decision, clp, VENTANA_DIAS } from '../decision.js';
import { timonel } from '../../domain/kairos.js';

const COBERTURA_MIN_DIAS = 7;     // bajo esto, el stock no alcanza a reponerse
const DIAS_REPOSICION = 21;       // cuánto stock sugerir al reponer (3 semanas)
const INMOVILIZADO_MIN = 30_000;  // capital parado que vale la pena mover

function senalesStock(datos, { vel, tasaMax }) {
  const { productos, config } = datos;
  const out = [];
  productos.forEach(p => {
    const v = vel.porProducto[p.id];
    const margenUnit = (p.price || 0) - (p.cost || 0);
    const porDia = v?.porDia || 0;

    // Quiebre: producto que se vende y está en cero.
    if (p.stock === 0 && porDia > 0) {
      const unidades = Math.max(1, Math.ceil(porDia * DIAS_REPOSICION));
      const costo = unidades * p.cost;
      const perdida = porDia * 30 * margenUnit;
      out.push(decision({
        id: `quiebre:${p.id}`,
        tipo: 'Stock',
        senal: `${p.name}: sin stock y se estaba vendiendo`,
        evidencia: [
          `${v.unidades} u vendidas en ${vel.diasVentana} días (${porDia.toFixed(2)} u/día)`,
          `Margen unitario ${clp(margenUnit)}`,
        ],
        impactoMensual: Math.round(perdida),
        roi: costo > 0 ? `${Math.round(margenUnit * unidades / costo * 100)}% sobre la reposición` : null,
        riesgo: 'medio',
        accion: `Reponer ${unidades} u (${clp(costo)}) — cubre ${DIAS_REPOSICION} días de venta`,
        artefacto: 'Orden de compra al proveedor',
        destino: 'inventario',
      }));
      return;
    }

    // Cobertura corta: el stock se acaba antes de poder reponer.
    if (p.stock > 0 && porDia > 0) {
      const cobertura = p.stock / porDia;
      if (cobertura < COBERTURA_MIN_DIAS) {
        const unidades = Math.max(1, Math.ceil(porDia * DIAS_REPOSICION - p.stock));
        const enRiesgo = (COBERTURA_MIN_DIAS - cobertura) * porDia * margenUnit;
        out.push(decision({
          id: `cobertura:${p.id}`,
          tipo: 'Stock',
          senal: `${p.name} alcanza para ${Math.max(0, Math.floor(cobertura))} días`,
          evidencia: [
            `Stock ${p.stock} u · vendes ${porDia.toFixed(2)} u/día`,
            `Alerta de stock configurada en ${config.alertaStockBajo ?? 3} u`,
          ],
          impactoMensual: Math.round(enRiesgo),
          riesgo: 'medio',
          accion: `Pedir ${unidades} u (${clp(unidades * p.cost)}) antes del quiebre`,
          artefacto: 'Orden de compra al proveedor',
          destino: 'inventario',
        }));
      }
    }

    // Capital inmovilizado: solo con al menos 30 días de historial real.
    if (vel.diasHistorial >= VENTANA_DIAS && p.stock > 0 && !v) {
      const capital = p.stock * p.cost;
      if (capital >= INMOVILIZADO_MIN) {
        const costoOp = tasaMax > 0 ? capital * tasaMax / 100 : 0;
        out.push(decision({
          id: `inmovilizado:${p.id}`,
          tipo: 'Stock',
          senal: `${p.name} lleva 30 días sin venderse`,
          evidencia: [
            `${p.stock} u paradas = ${clp(capital)} a costo`,
            ...(tasaMax > 0 ? [`Esa plata bajando deuda al ${tasaMax}% ahorraría ${clp(costoOp)}/mes`] : []),
          ],
          impactoMensual: costoOp ? Math.round(costoOp) : null,
          ahorroMensual: costoOp ? Math.round(costoOp) : null,
          riesgo: 'bajo',
          accion: `Liquidar con promo o bundle junto a un producto que rote`,
          artefacto: 'Promo / bundle en redes',
          destino: 'inventario',
        }));
      }
    }
  });
  return out;
}

// Timonel (Kairos): una jugada maestra sobre dónde poner el próximo peso.
function senalTimonel({ productos, ventas, deudas }, { ahora }) {
  const out = [];
  const t = timonel({ productos, ventas, ahora });
  const tasaMax = Math.max(0, ...deudas.filter(d => d.amt > 0).map(d => d.rate || 0));
  if (t.jugada) {
    const j = t.jugada;
    const fila = t.ranking.find(r => r.id === j.productoId);
    const costoOp = j.tipo === 'liberar' && tasaMax > 0 ? Math.round(fila.capital * tasaMax / 100) : null;
    out.push(decision({
      id: `timonel:${j.tipo}:${j.productoId}`,
      tipo: 'Timonel',
      senal: j.titulo,
      evidencia: j.porque,
      impactoMensual: costoOp,
      ahorroMensual: costoOp,
      roi: fila?.roi != null ? `${Math.round(fila.roi * 100)}% sobre costo en ventas reales` : null,
      riesgo: j.tipo === 'liberar' ? 'medio' : 'bajo',
      prioridad: j.tipo === 'liberar' && fila.capital >= 300_000 ? 'alta' : 'media',
      accion: j.tipo === 'comprar' ? `Armar el próximo pedido empezando por ${fila.nombre}`
        : j.tipo === 'liberar' ? `Pack o promo con ${fila.nombre} y pausar su recompra`
        : `Destacar ${fila.nombre} en redes y en cada venta esta semana`,
      artefacto: j.tipo === 'comprar' ? 'Pedido a proveedor en Stock' : 'Promo / pack en redes',
      destino: 'inventario',
    }));
  }
  return out;
}

export const area = {
  id: 'stock',
  nombre: 'Stock',
  detectar: (datos, ctx) => [...senalesStock(datos, ctx), ...senalTimonel(datos, ctx)],
};
