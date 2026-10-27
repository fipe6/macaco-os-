// Kairos para Macaco — tres ideas de la suite Kairos llevadas a la tienda:
//
//   Timonel   → "¿en qué producto pongo el próximo peso de compra?"
//               ranking ROI × rotación × tendencia + una JUGADA MAESTRA
//   Vigías    → pico (las ventas se disparan) y caída (se desploman) contra el
//               ritmo normal, con 3 acciones concretas cada uno
//   Salud     → puntaje 0–100 del negocio, desglosado por componente
//
// Regla de Kairos: FUENTE O SILENCIO. Sin historial suficiente no hay cifra:
// se devuelve null o se omite el componente, nunca un número inventado.
// Funciones puras (sin React, sin red) para poder testearlas.

const DIA = 86_400_000;

const clp = (n) => {
  const s = Math.round(Math.abs(n)).toString();
  const parts = [];
  for (let i = s.length; i > 0; i -= 3) parts.unshift(s.slice(Math.max(0, i - 3), i));
  return (n < 0 ? '-$' : '$') + parts.join('.');
};

const ms = (fecha) => new Date(fecha).getTime();
const enRango = (v, desde, hasta) => { const t = ms(v.fecha); return t >= desde && t < hasta; };
const pct = (n) => `${n > 0 ? '+' : ''}${Math.round(n)}%`;

function primeraVenta(ventas) {
  return ventas.length ? Math.min(...ventas.map(v => ms(v.fecha))) : null;
}

// ── Telemetría: ventas por día de los últimos N días (para el gráfico) ───────
export function telemetria(ventas, { dias = 30, ahora = Date.now() } = {}) {
  const fin = new Date(ahora); fin.setHours(0, 0, 0, 0);
  const inicio = fin.getTime() - (dias - 1) * DIA;
  const serie = Array.from({ length: dias }, (_, i) => ({ fecha: new Date(inicio + i * DIA), total: 0, margen: 0 }));
  ventas.forEach(v => {
    const d = new Date(v.fecha); d.setHours(0, 0, 0, 0);
    const i = Math.round((d.getTime() - inicio) / DIA);
    if (i >= 0 && i < dias) { serie[i].total += v.total || 0; serie[i].margen += v.margen || 0; }
  });
  return serie;
}

// ── Timonel ──────────────────────────────────────────────────────────────────
// Por producto, en los últimos 28 días:
//   roi       = margen real / costo real de lo vendido (cuánto deja cada $1
//               invertido; si no hubo ventas, el del precio de lista)
//   rotacion  = unidades por día
//   tendencia = ritmo de los últimos 7 días vs el de los 21 anteriores
// score = roi × rotación × (1 + tendencia acotada). Se rankea solo lo que tiene
// datos; sin 14 días de historial el Timonel no opina.
export const HISTORIAL_MIN_DIAS = 14;

export function timonel({ productos = [], ventas = [], ahora = Date.now() } = {}) {
  const primera = primeraVenta(ventas);
  const historial = primera ? (ahora - primera) / DIA : 0;
  if (historial < HISTORIAL_MIN_DIAS) return { listo: false, historialDias: Math.floor(historial), ranking: [], jugada: null };

  const ventana = Math.min(28, Math.floor(historial));
  const desde = ahora - ventana * DIA;
  const corte = ahora - 7 * DIA;
  const diasPrevios = ventana - 7;

  const ranking = productos.map(p => {
    const vs = ventas.filter(v => v.productoId === p.id && enRango(v, desde, ahora + 1));
    const unidades = vs.reduce((n, v) => n + (v.cantidad || 0), 0);
    const recientes = vs.filter(v => ms(v.fecha) >= corte).reduce((n, v) => n + (v.cantidad || 0), 0);
    const previas = unidades - recientes;
    const margen = vs.reduce((n, v) => n + (v.margen || 0), 0);
    const costoVendido = vs.reduce((n, v) => n + (v.costoUnitario ?? p.cost) * (v.cantidad || 0), 0);
    const roi = costoVendido > 0 ? margen / costoVendido : (p.cost > 0 ? (p.price - p.cost) / p.cost : null);
    const rotacion = unidades / ventana;
    const ritmoReciente = recientes / 7;
    const ritmoPrevio = diasPrevios > 0 ? previas / diasPrevios : 0;
    const tendencia = ritmoPrevio > 0 ? (ritmoReciente - ritmoPrevio) / ritmoPrevio : (ritmoReciente > 0 ? 1 : 0);
    const score = roi !== null ? roi * rotacion * (1 + Math.max(-0.8, Math.min(1, tendencia))) : 0;
    const capital = p.stock * p.cost;
    const cobertura = rotacion > 0 ? p.stock / rotacion : null;

    let clase;
    if (unidades === 0) clase = p.stock > 0 ? 'recortar' : 'sin-datos';
    else if (roi !== null && roi < 0.2) clase = 'vigilar';
    else if (tendencia <= -0.4 && unidades >= 3) clase = 'vigilar'; // con 1–2 ventas no hay tendencia que leer
    else clase = 'mantener';

    return {
      id: p.id, nombre: p.name, unidades, margen, roi, rotacion, tendencia, score,
      stock: p.stock, capital, cobertura, clase,
    };
  });

  // Los mejores scores con venta real se escalan (máx. 3, y solo si superan la mediana).
  const conVenta = ranking.filter(r => r.unidades > 0).sort((a, b) => b.score - a.score);
  const mediana = conVenta.length ? conVenta[Math.floor(conVenta.length / 2)].score : 0;
  conVenta.slice(0, 3).forEach(r => { if (r.clase === 'mantener' && r.score >= mediana) r.clase = 'escalar'; });

  const orden = { escalar: 0, mantener: 1, vigilar: 2, recortar: 3, 'sin-datos': 4 };
  ranking.sort((a, b) => (orden[a.clase] - orden[b.clase]) || (b.score - a.score));

  const escalar = ranking.find(r => r.clase === 'escalar');
  const recortar = ranking.filter(r => r.clase === 'recortar').sort((a, b) => b.capital - a.capital)[0]
    || ranking.filter(r => r.clase === 'vigilar').sort((a, b) => a.score - b.score)[0];

  // Jugada maestra — una sola acción, en este orden:
  //   1. comprar: lo que más rinde y se va a quedar corto (< 30 días de stock)
  //   2. liberar: no comprar más de lo que tiene > 60 días de stock parado
  //   3. empujar: lo que más rinde, si ya tiene stock de sobra
  const comprar = ranking.find(r => r.clase === 'escalar' && (r.cobertura === null || r.cobertura < 30));
  const sobrestock = ranking
    .filter(r => r.stock > 0 && r.capital > 0 && (r.cobertura === null || r.cobertura > 60))
    .sort((a, b) => b.capital - a.capital)[0];
  const motivo = (r) => [
    `Deja ${Math.round(r.roi * 100)}% sobre su costo: $10.000 en stock vuelven como ${clp(10_000 * (1 + r.roi))}`,
    `Vende ${r.rotacion.toFixed(2)} u/día · tendencia ${pct(r.tendencia * 100)} esta semana`,
  ];
  let jugada = null;
  if (comprar) {
    jugada = {
      tipo: 'comprar', productoId: comprar.id,
      titulo: `Pon el próximo peso de compra en ${comprar.nombre}`,
      porque: [...motivo(comprar),
        comprar.cobertura !== null ? `El stock alcanza para ${Math.floor(comprar.cobertura)} días` : 'Hoy no tiene stock'],
    };
  } else if (sobrestock) {
    jugada = {
      tipo: 'liberar', productoId: sobrestock.id,
      titulo: `No compres más ${sobrestock.nombre}: libera ${clp(sobrestock.capital)} parados`,
      porque: [
        `${sobrestock.stock} u en bodega`,
        sobrestock.cobertura !== null
          ? `Al ritmo actual (${sobrestock.rotacion.toFixed(2)} u/día) es stock para ${Math.floor(sobrestock.cobertura)} días`
          : `No se vendió en ${ventana} días`,
        'Muévelo con pack o promo antes de comprar otra cosa',
      ],
    };
  } else if (escalar) {
    jugada = {
      tipo: 'empujar', productoId: escalar.id,
      titulo: `Empuja ${escalar.nombre}: es lo que más rinde`,
      porque: [...motivo(escalar), `Stock para ${Math.floor(escalar.cobertura)} días: no hace falta comprar`],
    };
  }
  return { listo: true, historialDias: Math.floor(historial), ventanaDias: ventana, ranking, jugada, recortar: recortar || null };
}

// ── Vigías de pico y caída ───────────────────────────────────────────────────
// Compara los últimos 7 días con el promedio semanal de hasta 3 semanas
// anteriores. Pico: ≥ +40 %. Caída: ≤ −30 %. Necesita al menos 2 semanas de
// base y 5 ventas en ella para no alarmar por ruido.
export const UMBRAL_PICO = 0.4;
export const UMBRAL_CAIDA = -0.3;

export function vigias({ ventas = [], productos = [], ahora = Date.now() } = {}) {
  const primera = primeraVenta(ventas);
  const corte = ahora - 7 * DIA;
  if (!primera) return null;
  const diasBase = Math.min(21, (corte - primera) / DIA + 1);
  if (diasBase < 14) return null;
  const semanasBase = diasBase / 7;

  const desde = corte - 21 * DIA;
  const semana = ventas.filter(v => enRango(v, corte, ahora + 1));
  const previas = ventas.filter(v => enRango(v, desde, corte));
  if (previas.length < 5) return null;

  const total = (l) => l.reduce((n, v) => n + (v.total || 0), 0);
  const actual = total(semana);
  const base = total(previas) / semanasBase;
  if (base <= 0) return null;
  const cambio = (actual - base) / base;

  // Qué producto explica el cambio.
  const porProd = {};
  semana.forEach(v => { porProd[v.productoId] ??= { nombre: v.producto, ahora: 0, antes: 0 }; porProd[v.productoId].ahora += v.total || 0; });
  previas.forEach(v => { porProd[v.productoId] ??= { nombre: v.producto, ahora: 0, antes: 0 }; porProd[v.productoId].antes += (v.total || 0) / semanasBase; });
  const deltas = Object.entries(porProd).map(([id, p]) => ({ id, ...p, delta: p.ahora - p.antes }));
  const stockDe = (id) => productos.find(p => p.id === id)?.stock;

  const comun = { semana: actual, base, cambio };

  if (cambio >= UMBRAL_PICO) {
    const motor = deltas.sort((a, b) => b.delta - a.delta)[0];
    const st = stockDe(motor.id);
    return {
      ...comun, tipo: 'pico',
      titulo: `Pico: la semana va ${pct(cambio * 100)} sobre lo normal`,
      evidencia: [`Últimos 7 días ${clp(actual)} vs ${clp(base)} por semana antes`, `${motor.nombre} explica ${clp(motor.delta)} del alza`],
      acciones: [
        st !== undefined ? `Asegurar stock de ${motor.nombre} (quedan ${st} u) antes de que el pico lo agote` : `Asegurar stock de ${motor.nombre}`,
        'Repetir esta semana lo que generó el alza (publicación, canal o cliente) y anotarlo',
        'Ofrecer a quienes compraron esta semana un segundo producto que combine (pack)',
      ],
    };
  }
  if (cambio <= UMBRAL_CAIDA) {
    const motor = deltas.sort((a, b) => a.delta - b.delta)[0];
    const st = stockDe(motor.id);
    return {
      ...comun, tipo: 'caida',
      titulo: `Caída: la semana va ${pct(cambio * 100)} bajo lo normal`,
      evidencia: [`Últimos 7 días ${clp(actual)} vs ${clp(base)} por semana antes`, `${motor.nombre} explica ${clp(-motor.delta)} de la baja`],
      acciones: [
        st === 0 ? `${motor.nombre} está sin stock: reponerlo es lo primero` : `Revisar precio y publicación de ${motor.nombre}`,
        'Escribir a los clientes que compraron hace 3–5 semanas (recompra)',
        'Promo corta de 48 h en el producto con más stock parado',
      ],
    };
  }
  return { ...comun, tipo: 'normal', titulo: `Ritmo normal (${pct(cambio * 100)} vs semanas anteriores)`, evidencia: [], acciones: [] };
}

// ── Salud del negocio (0–100) ────────────────────────────────────────────────
// Cada componente da 0..1 y tiene un peso. Si un componente no tiene datos se
// omite y el puntaje se reparte entre los que sí tienen (fuente o silencio).
export function saludNegocio({ productos = [], ventas = [], deudas = [], caja = 0, config = {}, ahora = Date.now() } = {}) {
  const hoy = new Date(ahora);
  const comps = [];

  // Meta del mes vs días transcurridos
  if (config.metaMensual > 0) {
    const mes = hoy.getMonth(), año = hoy.getFullYear();
    const diasMes = new Date(año, mes + 1, 0).getDate();
    const avanceTiempo = hoy.getDate() / diasMes;
    const vendido = ventas.filter(v => { const d = new Date(v.fecha); return d.getMonth() === mes && d.getFullYear() === año; })
      .reduce((n, v) => n + (v.total || 0), 0);
    const avanceMeta = vendido / config.metaMensual;
    comps.push({ id: 'meta', nombre: 'Ritmo vs meta', peso: 30, valor: Math.min(1, avanceTiempo > 0 ? avanceMeta / avanceTiempo : 0),
      detalle: `${Math.round(avanceMeta * 100)}% de la meta con ${Math.round(avanceTiempo * 100)}% del mes` });
  }

  // Caja vs colchón
  if (config.colchonMinimo > 0) {
    comps.push({ id: 'caja', nombre: 'Caja vs colchón', peso: 20, valor: Math.max(0, Math.min(1, caja / (config.colchonMinimo * 2))),
      detalle: `${clp(caja)} · colchón ${clp(config.colchonMinimo)}` });
  }

  // Stock: de lo que se vende, cuánto tiene stock
  const desde = ahora - 30 * DIA;
  const vendidos = new Set(ventas.filter(v => ms(v.fecha) >= desde).map(v => v.productoId));
  const activos = productos.filter(p => vendidos.has(p.id));
  if (activos.length) {
    const conStock = activos.filter(p => p.stock > (config.alertaStockBajo ?? 3)).length;
    comps.push({ id: 'stock', nombre: 'Stock de lo que se vende', peso: 20, valor: conStock / activos.length,
      detalle: `${conStock} de ${activos.length} productos que rotan sobre la alerta` });
  }

  // Margen de los últimos 30 días (35 % o más = pleno)
  const recientes = ventas.filter(v => ms(v.fecha) >= desde);
  const totalRec = recientes.reduce((n, v) => n + (v.total || 0), 0);
  if (totalRec > 0) {
    const m = recientes.reduce((n, v) => n + (v.margen || 0), 0) / totalRec;
    comps.push({ id: 'margen', nombre: 'Margen 30 días', peso: 15, valor: Math.max(0, Math.min(1, m / 0.35)),
      detalle: `${Math.round(m * 100)}% de margen bruto` });
  }

  // Deudas con interés: pesan contra el puntaje
  const conInteres = deudas.filter(d => d.rate > 0 && d.amt > 0);
  const interes = conInteres.reduce((n, d) => n + d.amt * d.rate / 100, 0);
  const margenMes = recientes.reduce((n, v) => n + (v.margen || 0), 0);
  if (conInteres.length === 0) {
    if (totalRec > 0) comps.push({ id: 'deuda', nombre: 'Deuda con interés', peso: 15, valor: 1, detalle: 'Sin deudas con interés' });
  } else if (margenMes > 0) {
    comps.push({ id: 'deuda', nombre: 'Deuda con interés', peso: 15, valor: Math.max(0, 1 - interes / margenMes),
      detalle: `${clp(interes)}/mes de interés vs ${clp(margenMes)} de margen` });
  }

  const pesoTotal = comps.reduce((n, c) => n + c.peso, 0);
  if (!pesoTotal) return { puntaje: null, componentes: [] };
  const puntaje = Math.round(comps.reduce((n, c) => n + c.valor * c.peso, 0) / pesoTotal * 100);
  const peor = [...comps].sort((a, b) => a.valor - b.valor)[0];
  return { puntaje, componentes: comps, peor };
}
