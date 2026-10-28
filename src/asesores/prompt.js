// Arma el mensaje para pedirle ayuda a un asesor en cualquier chat de Claude.
//
// PRIVACIDAD (regla del negocio): lo que sale de la app nunca incluye la caja,
// las deudas, finanzas personales ni costos de compra. Solo ventas, gastos del
// negocio, precios de venta, margen y stock. Los datos se arman acá, a partir
// de listas, y el test comprueba que esos campos no se cuelen.
import { resultadoMes } from '../domain/finanzas.js';
import { MESES, ventasPorProducto, ventasDelMes } from '../store/selectors.js';

const clp = (n) => '$' + Math.round(n).toLocaleString('es-CL');

// Datos de apoyo: solo lo que el asesor pidió (`datos`) y solo lo permitido.
export function datosDeApoyo({ ventas = [], gastos = [], productos = [], hoy = new Date() }, pedidos = []) {
  const out = [];
  const r = resultadoMes(ventas, gastos, hoy);
  if (pedidos.includes('resumen')) {
    out.push(`Mes: ${MESES[hoy.getMonth()]} ${hoy.getFullYear()}`);
    out.push(`Ventas del mes: ${clp(r.ventas)} (${r.transacciones} ventas, ticket promedio ${r.ticket != null ? clp(r.ticket) : '—'})`);
    if (r.margenPct != null) out.push(`Margen bruto: ${Math.round(r.margenPct * 100)} %`);
  }
  if (pedidos.includes('gastos')) {
    out.push(`Gastos del negocio del mes: ${clp(r.gastos)}`);
    const porCat = {};
    gastos.filter(g => g.tipo === 'negocio' && new Date(g.fecha).getMonth() === hoy.getMonth() && new Date(g.fecha).getFullYear() === hoy.getFullYear())
      .forEach(g => { porCat[g.categoria || 'Otros'] = (porCat[g.categoria || 'Otros'] || 0) + g.monto; });
    Object.entries(porCat).sort((a, b) => b[1] - a[1]).slice(0, 6).forEach(([k, v]) => out.push(`  · ${k}: ${clp(v)}`));
  }
  if (pedidos.includes('productos')) {
    const vend = Object.fromEntries(ventasPorProducto(ventasDelMes(ventas, hoy)).map(f => [f.id || f.nombre, f]));
    out.push('Productos (precio de venta · stock · unidades vendidas este mes):');
    productos.slice(0, 40).forEach(p => out.push(`  · ${p.name}: ${clp(p.price)} · ${p.stock} u · ${vend[p.id]?.unidades || 0} vendidas`));
  }
  return out;
}

// Rol, reglas y datos permitidos: lo que se le da al asesor ANTES de preguntarle.
// Es el mismo texto para copiar al chat y para consultarlo dentro de la app.
export function armarSistema(asesor, datosApp) {
  const apoyo = datosDeApoyo(datosApp, asesor.datos);
  return [
    `Actúa como "${asesor.nombre}" ${asesor.emoji}, asesor de Makako (tienda de suplementos deportivos en Arica, Chile).`,
    `Tu trabajo: ${asesor.mision}`,
    '',
    'Reglas que sigues:',
    ...asesor.reglas.map(r => `- ${r}`),
    '',
    'Cómo respondes: español chileno simple, trato "tú", muy corto (máximo 8 líneas), con UN solo siguiente paso al final. Si no tienes un dato, dilo: no lo inventes.',
    ...(apoyo.length ? ['', 'Datos de apoyo (sin caja, deudas ni costos de compra):', ...apoyo] : []),
  ].join('\n');
}

// Mensaje completo para pegar en cualquier chat de Claude.
export function armarPrompt(asesor, pregunta, datosApp) {
  return [armarSistema(asesor, datosApp), '', `Pregunta: ${pregunta}`].join('\n');
}
