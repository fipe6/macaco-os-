// Área VENTAS — ritmo contra la meta, clientes que no recompran y vigías de pico/caída.
import { decision, clp, DIA, VENTANA_DIAS } from '../decision.js';
import { vigias } from '../../domain/kairos.js';

function senalMeta({ ventas, config }, { ahora }) {
  const hoy = new Date(ahora);
  const mes = hoy.getMonth(), año = hoy.getFullYear();
  const dia = hoy.getDate();
  const diasMes = new Date(año, mes + 1, 0).getDate();
  const vMes = ventas.filter(v => { const d = new Date(v.fecha); return d.getMonth() === mes && d.getFullYear() === año; });
  if (!vMes.length || dia < 5 || !config.metaMensual) return [];
  const total  = vMes.reduce((s, v) => s + (v.total || 0), 0);
  const margen = vMes.reduce((s, v) => s + (v.margen || 0), 0);
  const proyeccion = total / dia * diasMes;
  if (proyeccion >= config.metaMensual * 0.9) return [];
  const restantes = Math.max(1, diasMes - dia);
  const necesario = (config.metaMensual - total) / restantes;
  const margenPct = total > 0 ? margen / total : 0;
  return [decision({
    id: `ritmo-meta:${año}-${mes + 1}`,
    tipo: 'Ventas',
    senal: `Al ritmo actual cierras el mes en ${clp(proyeccion)}`,
    evidencia: [
      `Llevas ${clp(total)} en ${dia} días (${clp(total / dia)}/día)`,
      `Meta ${clp(config.metaMensual)} · proyección ${Math.round(proyeccion / config.metaMensual * 100)}%`,
      ...(margenPct > 0 ? [`Margen que queda en el camino: ${clp((config.metaMensual - proyeccion) * margenPct)}`] : []),
    ],
    // La brecha contra una meta aspiracional no es ROI recuperable: va como
    // evidencia y no infla el impacto total.
    riesgo: 'medio',
    prioridad: 'media',
    accion: `Necesitas ${clp(necesario)}/día los ${restantes} días que quedan`,
    artefacto: 'Campaña de ventas + meta diaria ajustada',
    destino: 'reportes',
  })];
}

function senalesClientes({ ventas }, { ahora }) {
  const out = [];
  const clientes = {};
  ventas.forEach(v => {
    const k = (v.cliente || '').trim();
    if (!k) return;
    const dia = new Date(v.fecha).toDateString();
    if (!clientes[k]) clientes[k] = { dias: new Set(), margen: 0, ultima: 0 };
    clientes[k].dias.add(dia);
    clientes[k].margen += v.margen || 0;
    clientes[k].ultima = Math.max(clientes[k].ultima, new Date(v.fecha).getTime());
  });

  // Recompra atrasada: clientes recurrentes que pasaron su ciclo habitual.
  const atrasados = Object.entries(clientes).map(([nombre, c]) => {
    const fechas = [...c.dias].map(d => new Date(d).getTime()).sort((a, b) => a - b);
    if (fechas.length < 2) return null;
    const ciclo = (fechas[fechas.length - 1] - fechas[0]) / DIA / (fechas.length - 1);
    const desde = (ahora - c.ultima) / DIA;
    if (ciclo < 3 || desde <= ciclo * 1.3 || desde > 120) return null;
    return { nombre, ciclo, desde, margenCompra: c.margen / fechas.length };
  }).filter(Boolean).sort((a, b) => b.margenCompra - a.margenCompra);

  if (atrasados.length) {
    const margen = atrasados.reduce((s, c) => s + c.margenCompra, 0);
    out.push(decision({
      id: 'recompra',
      tipo: 'Clientes',
      senal: `${atrasados.length} cliente${atrasados.length > 1 ? 's' : ''} atrasado${atrasados.length > 1 ? 's' : ''} en su recompra`,
      evidencia: atrasados.slice(0, 3).map(c =>
        `${c.nombre}: compra cada ~${Math.round(c.ciclo)} días, van ${Math.round(c.desde)}`),
      impactoMensual: Math.round(margen),
      riesgo: 'bajo',
      accion: `Escribirle hoy a ${atrasados[0].nombre}${atrasados.length > 1 ? ' y al resto de la lista' : ''}`,
      artefacto: 'Mensaje de recompra a cada cliente',
      destino: 'reportes',
    }));
  }

  // Calidad del dato: sin cliente registrado no hay recompra que detectar.
  const recientes = ventas.filter(v => ahora - new Date(v.fecha).getTime() <= VENTANA_DIAS * DIA);
  if (recientes.length >= 10) {
    const sin = recientes.filter(v => !(v.cliente || '').trim()).length;
    const pct = sin / recientes.length * 100;
    if (pct >= 50) {
      out.push(decision({
        id: 'registro-clientes',
        tipo: 'Sistema',
        senal: `${Math.round(pct)}% de las ventas no tiene cliente`,
        evidencia: [`${sin} de ${recientes.length} ventas de los últimos 30 días`],
        riesgo: 'bajo',
        prioridad: 'baja',
        accion: 'Anotar el nombre del cliente en cada venta para activar recompra y LTV',
        artefacto: 'Campo cliente sugerido en Registrar venta',
        destino: 'venta',
      }));
    }
  }
  return out;
}

// Vigías (Kairos): la semana contra el ritmo normal.
function senalVigia({ productos, ventas }, { ahora }) {
  const out = [];
  const v = vigias({ ventas, productos, ahora });
  if (v && v.tipo !== 'normal') {
    const semana = new Date(ahora - 3 * DIA).toISOString().slice(0, 10);
    out.push(decision({
      id: `vigia:${v.tipo}:${semana}`,
      tipo: v.tipo === 'pico' ? 'Pico ▲' : 'Caída ▼',
      senal: v.titulo,
      evidencia: v.evidencia,
      // Como la brecha contra la meta: venta que no entró no es ROI recuperable.
      riesgo: v.tipo === 'caida' ? 'alto' : 'medio',
      prioridad: v.tipo === 'caida' ? 'alta' : 'media',
      accion: v.acciones[0],
      acciones: v.acciones,
      artefacto: v.tipo === 'caida' ? 'Plan de 3 acciones contra la caída' : 'Plan de 3 acciones para potenciar el pico',
      destino: 'reportes',
    }));
  }
  return out;
}

export const area = {
  id: 'ventas',
  nombre: 'Ventas',
  detectar: (datos, ctx) => [...senalMeta(datos, ctx), ...senalesClientes(datos, ctx), ...senalVigia(datos, ctx)],
};
