// Corteza Prefrontal — motor de decisiones de Macaco OS.
//
// Une tres funciones en una sola pasada sobre los datos reales de la app:
//   Radar       → detecta señales (stock, deudas, caja, ventas, clientes, gastos)
//   ROI         → estima impacto mensual, ahorro y retorno cuando hay datos
//   Skill Miner → propone la acción concreta y el artefacto que la volvería sistema
//
// Reglas: nunca inventa datos (sin historial → sin señal), no ejecuta nada y
// toda decisión requiere aprobación humana. Funciones puras, sin React, para
// poder testearlas con `node --test`.

const DIA = 86_400_000;
const VENTANA_DIAS = 30;          // historial máximo usado para velocidad de venta
const COBERTURA_MIN_DIAS = 7;     // bajo esto, el stock no alcanza a reponerse
const DIAS_REPOSICION = 21;       // cuánto stock sugerir al reponer (3 semanas)
const MARGEN_MIN_PCT = 25;        // margen bruto mínimo aceptable por producto
const MARGEN_OBJETIVO_PCT = 30;   // precio sugerido cuando el margen es bajo
const INMOVILIZADO_MIN = 30_000;  // capital parado que vale la pena mover

const clp = (n) => {
  const s = Math.round(Math.abs(n)).toString();
  const parts = [];
  for (let i = s.length; i > 0; i -= 3) parts.unshift(s.slice(Math.max(0, i - 3), i));
  return (n < 0 ? '-$' : '$') + parts.join('.');
};

const PRIORIDAD_RANGO = { alta: 0, media: 1, baja: 2 };

export function calcPrioridad(impactoMensual, riesgo) {
  if (riesgo === 'alto' || (impactoMensual || 0) >= 100_000) return 'alta';
  if ((impactoMensual || 0) >= 20_000) return 'media';
  return 'baja';
}

function decision(d) {
  return {
    impactoMensual: null, ahorroMensual: null, roi: null, riesgo: 'medio',
    evidencia: [], destino: null,
    ...d,
    prioridad: d.prioridad || calcPrioridad(d.impactoMensual, d.riesgo || 'medio'),
    aprobacion: 'Requiere tu aprobación — nada se ejecuta solo.',
  };
}

// Velocidad de venta por producto (unidades/día). La ventana es el historial
// real disponible, entre 7 y 30 días, para no inflar la velocidad al inicio.
function velocidades(ventas, ahora) {
  if (!ventas.length) return { porProducto: {}, diasVentana: 0, diasHistorial: 0 };
  const primera = Math.min(...ventas.map(v => new Date(v.fecha).getTime()));
  const diasHistorial = Math.max(0, (ahora - primera) / DIA);
  const diasVentana = Math.min(VENTANA_DIAS, Math.max(7, Math.ceil(diasHistorial)));
  const desde = ahora - diasVentana * DIA;
  const porProducto = {};
  ventas.forEach(v => {
    if (new Date(v.fecha).getTime() < desde) return;
    const id = v.productoId;
    if (!porProducto[id]) porProducto[id] = { unidades: 0, total: 0, margen: 0 };
    porProducto[id].unidades += v.cantidad || 0;
    porProducto[id].total    += v.total || 0;
    porProducto[id].margen   += v.margen || 0;
  });
  Object.values(porProducto).forEach(p => { p.porDia = p.unidades / diasVentana; });
  return { porProducto, diasVentana, diasHistorial };
}

// ── Señales ───────────────────────────────────────────────────────────────────

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

function senalesStock({ productos, vel, config, tasaMax }) {
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

function senalCaja({ caja, config, porCobrar }) {
  const colchon = config.colchonMinimo || 0;
  if (!colchon || caja >= colchon) return [];
  const top = porCobrar.filter(c => c.saldo > 0).sort((a, b) => b.saldo - a.saldo)[0];
  return [decision({
    id: 'caja-colchon',
    tipo: 'Caja',
    senal: `Caja bajo el colchón mínimo`,
    evidencia: [`Caja ${clp(caja)} · colchón ${clp(colchon)} · faltan ${clp(colchon - caja)}`],
    riesgo: 'alto',
    accion: top
      ? `Congelar compras no urgentes y cobrar a ${top.persona} (${clp(top.saldo)})`
      : 'Congelar compras no urgentes hasta recuperar el colchón',
    artefacto: 'Regla de caja: nada sale bajo el colchón',
    destino: 'finanzas',
  })];
}

function senalMeta({ ventas, config, ahora }) {
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

function senalCobranza({ porCobrar, tasaMax }) {
  const pendientes = porCobrar.filter(c => c.saldo > 0).sort((a, b) => b.saldo - a.saldo);
  if (!pendientes.length) return [];
  const total = pendientes.reduce((s, c) => s + c.saldo, 0);
  const ahorro = tasaMax > 0 ? total * tasaMax / 100 : null;
  return [decision({
    id: 'cobranza',
    tipo: 'Cobranza',
    senal: `${clp(total)} por cobrar en ${pendientes.length} persona${pendientes.length > 1 ? 's' : ''}`,
    evidencia: pendientes.slice(0, 3).map(c => `${c.persona}: ${clp(c.saldo)}`),
    impactoMensual: ahorro ? Math.round(ahorro) : null,
    ahorroMensual: ahorro ? Math.round(ahorro) : null,
    roi: tasaMax > 0 ? `Cobrado y abonado a deuda rinde ${tasaMax}% mensual` : null,
    riesgo: total >= 100_000 ? 'medio' : 'bajo',
    prioridad: calcPrioridad(Math.max(ahorro || 0, total >= 200_000 ? 20_000 : 0), 'medio'),
    accion: `Cobrar primero a ${pendientes[0].persona} (${clp(pendientes[0].saldo)})`,
    artefacto: 'Recordatorio de cobro por WhatsApp (n8n)',
    destino: 'personal',
  })];
}

function senalesVencimiento({ vencimientos }) {
  return vencimientos.map(p => decision({
    id: `vencimiento:${p.id}`,
    tipo: 'Pasivo',
    senal: `${p.acreedor} vence en ${p.diasRestantes} días`,
    evidencia: [`Saldo al vencimiento ${clp(p.saldo)}`, `Fecha ${p.vencimiento}`],
    riesgo: p.diasRestantes <= 30 ? 'alto' : 'medio',
    prioridad: p.diasRestantes <= 30 ? 'alta' : 'media',
    accion: `Separar ${clp(p.saldo)} en un fondo reservado antes del ${p.vencimiento}`,
    artefacto: 'Meta de ahorro en Finanzas personales',
    destino: 'personal',
  }));
}

function senalesClientes({ ventas, ahora }) {
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
      artefacto: 'Automatización n8n: aviso de recompra por WhatsApp',
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

function senalGastos({ gastos, ventas, ahora }) {
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

// ── Escaneo completo ─────────────────────────────────────────────────────────
// `porCobrar` viene con `saldo` ya calculado y `vencimientos` es la salida de
// alertasVencimiento() del store, para no duplicar reglas de cálculo.
export function escanearCorteza({
  productos = [], ventas = [], gastos = [], deudas = [], caja = 0,
  config = {}, porCobrar = [], vencimientos = [], ahora = Date.now(),
} = {}) {
  const t = typeof ahora === 'number' ? ahora : new Date(ahora).getTime();
  const vel = velocidades(ventas, t);
  const tasaMax = Math.max(0, ...deudas.filter(d => d.amt > 0).map(d => d.rate || 0));

  const brutas = [
    ...senalesDeuda({ deudas, caja, config }),
    ...senalCaja({ caja, config, porCobrar }),
    ...senalesStock({ productos, vel, config, tasaMax }),
    ...senalMeta({ ventas, config, ahora: t }),
    ...senalesClientes({ ventas, ahora: t }),
    ...senalGastos({ gastos, ventas, ahora: t }),
  ];

  // Las deudas se mantienen juntas y en su orden de pago (el abono va a la
  // primera): el grupo se ordena por su mayor impacto.
  const impactoDeudas = Math.max(0, ...brutas.filter(d => d.tipo === 'Deuda').map(d => d.impactoMensual || 0));
  const clave = (d) => d.tipo === 'Deuda' ? impactoDeudas : (d.impactoMensual || 0);
  const decisiones = brutas
    .map((d, i) => ({ d, i }))
    .sort((a, b) =>
      (PRIORIDAD_RANGO[a.d.prioridad] - PRIORIDAD_RANGO[b.d.prioridad]) ||
      (clave(b.d) - clave(a.d)) || (a.i - b.i))
    .map(x => x.d);

  return {
    fecha: new Date(t).toISOString(),
    fuentes: {
      ventas: ventas.length, productos: productos.length, gastos: gastos.length,
      deudas: deudas.length, porCobrar: porCobrar.length, vencimientos: vencimientos.length,
      diasHistorial: Math.floor(vel.diasHistorial),
    },
    decisiones,
  };
}
