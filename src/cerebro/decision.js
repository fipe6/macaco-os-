// Cerebro — el contrato de una decisión, su prioridad y utilidades comunes.
// Toda área devuelve decisiones con esta forma (ver docs/CORTEZA-GUIA.md).

export const DIA = 86_400_000;
export const VENTANA_DIAS = 30;          // historial máximo usado para velocidad de venta

export const clp = (n) => {
  const s = Math.round(Math.abs(n)).toString();
  const parts = [];
  for (let i = s.length; i > 0; i -= 3) parts.unshift(s.slice(Math.max(0, i - 3), i));
  return (n < 0 ? '-$' : '$') + parts.join('.');
};

export const PRIORIDAD_RANGO = { alta: 0, media: 1, baja: 2 };

export function calcPrioridad(impactoMensual, riesgo) {
  if (riesgo === 'alto' || (impactoMensual || 0) >= 100_000) return 'alta';
  if ((impactoMensual || 0) >= 20_000) return 'media';
  return 'baja';
}

export function decision(d) {
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

// Velocidad de venta por producto (unidades/día). La ventana es el historial
// real disponible, entre 7 y 30 días, para no inflar la velocidad al inicio.
export function velocidades(ventas, ahora) {
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

