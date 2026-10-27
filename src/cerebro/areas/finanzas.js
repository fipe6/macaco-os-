// Área FINANZAS — deudas con interés, caja bajo el colchón, gastos sobre el margen.
import { decision, clp, DIA, VENTANA_DIAS } from '../decision.js';

function senalesDeuda({ deudas, caja, config }) {
  const libre = Math.max(0, caja - (config.colchonMinimo || 0));
  let restante = libre;
  let anterior = null;
  return deudas
    .filter(d => d.rate > 0 && d.amt > 0)
    .sort((a, b) => (b.rate - a.rate) || ((a.order ?? 99) - (b.order ?? 99)))
    .map(d => {
      const interes = d.amt * d.rate / 100;
      const abono = Math.min(d.amt, restante);
      restante -= abono;
      const previa = anterior;
      anterior = d.who;
      return decision({
        id: `deuda-interes:${d.id}`,
        tipo: 'Deuda',
        senal: `${d.who} te cobra ${d.rate}% mensual`,
        evidencia: [
          `Saldo ${clp(d.amt)} → ${clp(interes)} de interés cada mes`,
          `Caja ${clp(caja)} · colchón mínimo ${clp(config.colchonMinimo || 0)}`,
        ],
        impactoMensual: Math.round(interes),
        ahorroMensual: Math.round(abono * d.rate / 100),
        roi: `${d.rate}% mensual garantizado (${d.rate * 12}% anual)`,
        riesgo: 'alto',
        accion: abono > 0
          ? `Abonar ${clp(abono)} a ${d.who} con la caja que sobra del colchón`
          : previa && libre > 0
            ? `Sigue después de ${previa}: destinar a ${d.who} el margen de las próximas ventas`
            : `Destinar el margen de las próximas ventas a ${d.who}: hoy la caja no supera el colchón`,
        artefacto: 'Pago en Finanzas → Deudas',
        destino: 'finanzas',
      });
    });
}

function senalCaja({ caja, config }) {
  const colchon = config.colchonMinimo || 0;
  if (!colchon || caja >= colchon) return [];
  return [decision({
    id: 'caja-colchon',
    tipo: 'Caja',
    senal: `Caja bajo el colchón mínimo`,
    evidencia: [`Caja ${clp(caja)} · colchón ${clp(colchon)} · faltan ${clp(colchon - caja)}`],
    riesgo: 'alto',
    accion: 'Congelar compras no urgentes hasta recuperar el colchón',
    artefacto: 'Regla de caja: nada sale bajo el colchón',
    destino: 'finanzas',
  })];
}

function senalGastos({ gastos, ventas }, { ahora }) {
  const desde = ahora - VENTANA_DIAS * DIA;
  const gNeg = gastos.filter(g => g.tipo === 'negocio' && new Date(g.fecha).getTime() >= desde);
  const vRec = ventas.filter(v => new Date(v.fecha).getTime() >= desde);
  if (!gNeg.length || !vRec.length) return [];
  const totalGastos = gNeg.reduce((s, g) => s + (g.monto || 0), 0);
  const margen = vRec.reduce((s, v) => s + (v.margen || 0), 0);
  if (totalGastos <= margen) return [];
  const porCat = {};
  gNeg.forEach(g => { const k = g.categoria || 'Otros'; porCat[k] = (porCat[k] || 0) + g.monto; });
  const top = Object.entries(porCat).sort((a, b) => b[1] - a[1]);
  return [decision({
    id: 'gastos-sobre-margen',
    tipo: 'Gastos',
    senal: 'Los gastos del negocio superan el margen de ventas',
    evidencia: [
      `Últimos 30 días: gastos ${clp(totalGastos)} vs margen ${clp(margen)}`,
      ...top.slice(0, 2).map(([k, m]) => `${k}: ${clp(m)}`),
    ],
    impactoMensual: Math.round(totalGastos - margen),
    riesgo: 'alto',
    accion: `Revisar ${top[0][0]} primero: es el gasto más grande del mes`,
    artefacto: 'Revisión de gastos fijos',
    destino: 'finanzas',
  })];
}

export const area = {
  id: 'finanzas',
  nombre: 'Finanzas',
  detectar: (datos, ctx) => [...senalesDeuda(datos), ...senalCaja(datos), ...senalGastos(datos, ctx)],
};
