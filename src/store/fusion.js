// Fusión de tres vías para cuando dos celulares cambian lo mismo.
//
//   base   = lo último que este celular sabe que estaba en Supabase
//   local  = lo que este celular tiene ahora (con cambios sin enviar)
//   remoto = lo que hay en Supabase ahora (puede traer cambios del otro celular)
//
// Resultado = remoto + lo que cambió este celular desde la base. Así una venta
// hecha sin señal no borra la venta que el otro celular registró mientras tanto.
// Números (caja) y stock se fusionan por DIFERENCIA: si uno sumó 15.000 y el
// otro 20.000, la caja sube 35.000.

const igual = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const idDe = (x) => (x && x.id != null ? String(x.id) : null);
const fechaDe = (x) => x?.fecha || x?.creadoEn || null;

function porId(lista) {
  const m = new Map();
  (lista || []).forEach(x => { const k = idDe(x); if (k) m.set(k, x); });
  return m;
}

function fusionarObjeto(base, local, remoto, numericos = []) {
  const out = { ...remoto };
  Object.keys(local).forEach(k => {
    if (numericos.includes(k) && typeof local[k] === 'number' && typeof base[k] === 'number' && typeof remoto[k] === 'number') {
      out[k] = Math.max(0, remoto[k] + (local[k] - base[k]));
    } else if (!igual(local[k], base[k])) {
      out[k] = local[k];
    }
  });
  Object.keys(base).forEach(k => { if (!(k in local)) delete out[k]; });
  return out;
}

// Listas de registros con `id` (ventas, movimientos, gastos, pedidos, deudas, productos).
export function fusionarLista(base = [], local = [], remoto = [], { numericos = [] } = {}) {
  const B = porId(base), L = porId(local), R = porId(remoto);
  const nuevosLocal = local.filter(x => { const k = idDe(x); return k && !B.has(k) && !R.has(k); });
  const out = [...nuevosLocal];
  remoto.forEach(r => {
    const k = idDe(r);
    if (!k) { out.push(r); return; }
    const b = B.get(k), l = L.get(k);
    if (b && !l) return;                         // este celular lo borró
    if (b && l && !igual(l, b)) out.push(fusionarObjeto(b, l, r, numericos)); // este celular lo editó
    else out.push(r);
  });
  // Lo más nuevo primero, si los registros tienen fecha (orden estable).
  if (out.length && out.every(fechaDe)) {
    return out.map((x, i) => [x, i])
      .sort((a, b) => (fechaDe(b[0]) > fechaDe(a[0]) ? 1 : fechaDe(b[0]) < fechaDe(a[0]) ? -1 : a[1] - b[1]))
      .map(([x]) => x);
  }
  return out;
}

export function fusionarValor(clave, base, local, remoto) {
  if (base === undefined || base === null) return local;   // sin base no hay cómo fusionar: gana lo local
  if (remoto === undefined || remoto === null) return local;
  if (igual(remoto, base)) return local;                    // nadie más cambió nada
  if (igual(local, base)) return remoto;                    // solo cambió el otro
  if (typeof local === 'number' && typeof base === 'number' && typeof remoto === 'number') {
    return remoto + (local - base);
  }
  if (Array.isArray(local) && Array.isArray(base) && Array.isArray(remoto)) {
    return fusionarLista(base, local, remoto, { numericos: clave.endsWith(':productos') ? ['stock'] : [] });
  }
  if (local && base && remoto && typeof local === 'object' && typeof base === 'object' && typeof remoto === 'object') {
    return fusionarObjeto(base, local, remoto);
  }
  return local;
}
