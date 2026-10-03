import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { selectAll, upsertRows, pushInventarioRows, testConnection } from './services/supabase.js';
import { supabase } from './services/supabaseAuth.js';

// ── Claves localStorage ───────────────────────────────────────────────────────
const LS = {
  productos:   'macaco:productos',
  ventas:      'macaco:ventas',
  deudas:      'macaco:deudas',
  caja:        'macaco:caja',
  config:      'macaco:config',
  movimientos: 'macaco:movimientos',
  gastos:      'macaco:gastos',
  pedidos:     'macaco:pedidos',
  // ── Finanzas personales ──
  activos:     'macaco:activos',
  porCobrar:   'macaco:porCobrar',
  pasivos:     'macaco:pasivos',
  metas:       'macaco:metas',
  planPersonal:'macaco:planPersonal',
  patrimonio:  'macaco:patrimonio',
  // ── Corteza prefrontal ──
  corteza:     'macaco:corteza',
};

function leer(key, fallback) {
  try {
    const v = localStorage.getItem(key);
    return v !== null ? JSON.parse(v) : fallback;
  } catch { return fallback; }
}
function guardar(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch {}
}

// ── Supabase: escribe UNA clave directamente ──────────────────────────────────
// Cada acción llama esto explícitamente — sin depender de useEffect ni timing.
function pushDB(clave, valor) {
  upsertRows('app_data', [{ clave, valor, actualizado_en: new Date().toISOString() }])
    .then(() => console.log('[db] ✅', clave))
    .catch(err => console.error('[db] ❌', clave, err.message));
}

// Sync por producto a la tabla `inventario` — fire-and-forget en cada cambio de stock/precio.
function pushInv(productos) {
  pushInventarioRows(productos)
    .then(() => console.log('[inv] ✅', productos.map(p => p.name).join(', ')))
    .catch(err => console.error('[inv] ❌', err.message));
}

// ── Estado inicial ────────────────────────────────────────────────────────────
export function calcStatus(stock, alerta = 3) {
  if (stock === 0) return 'out';
  if (stock <= alerta) return 'low';
  return 'ok';
}

const PRODUCTOS_INICIAL = [
  { id: 'pg',  name: 'Proteína Grizzly',          stock: 8,  cost: 20000, price: 36000 },
  { id: 'cdp', name: 'Creatina Dragón Pharma',    stock: 12, cost: 9000,  price: 17500 },
  { id: 'cia', name: 'Creatina Inner Armour',     stock: 6,  cost: 8000,  price: 15000 },
  { id: 'om3', name: 'Omega 3',                   stock: 5,  cost: 7000,  price: 13000 },
  { id: 'ash', name: 'Ashwaganda',                stock: 3,  cost: 8000,  price: 15000 },
  { id: 'mag', name: 'Glicinato de Magnesio',     stock: 7,  cost: 8000,  price: 15000 },
  { id: 'col', name: 'Colágeno 90 tabs',          stock: 4,  cost: 9500,  price: 18000 },
  { id: 'pre', name: 'Pre-entreno Edge Insanity', stock: 6,  cost: 14000, price: 28000 },
  { id: 'cgm', name: 'Creatina Gummy',            stock: 0,  cost: 9000,  price: 16000 },
  { id: 'cra', name: 'Crema de arroz',            stock: 5,  cost: 4000,  price: 8000  },
].map(p => ({ ...p, status: calcStatus(p.stock) }));

const DEUDAS_INICIAL = [
  { id: 'd1', who: 'Benjamín',  amt: 500_000,   rate: 10, level: 'urgent', order: 1, label: 'PAGAR PRIMERO' },
  { id: 'd2', who: 'Valcárce',  amt: 700_000,   rate: 10, level: 'urgent', order: 2, label: 'PAGAR SEGUNDO' },
  { id: 'd3', who: 'Alejandro', amt: 150_000,   rate: 0,  level: 'medium', label: 'Sin interés' },
  { id: 'd4', who: 'Roxana',    amt: 1_800_000, rate: 0,  level: 'low',    label: 'Sin interés · largo plazo' },
];

const CONFIG_INICIAL = {
  metaMensual: 10_000_000, metaDiaria: 700_000,
  colchonMinimo: 300_000,  alertaStockBajo: 3,
};


// ── Finanzas personales — semilla desde el Plan Financiero (sep 2026) ────────
// Activos líquidos. `reservado: true` = fondo intocable, no se mezcla con caja
// operativa del negocio ni se considera disponible para gastar.
const ACTIVOS_INICIAL = [
  { id: 'ac1', nombre: 'Banco',                       monto: 453_000,   reservado: false, nota: '' },
  { id: 'ac2', nombre: 'Reserva Valcarce',            monto: 1_000_000, reservado: true,  nota: 'No se toca ni se mezcla con caja operativa' },
  { id: 'ac3', nombre: 'Capital creatina',            monto: 500_000,   reservado: false, nota: 'Se reinvierte en tandas, no todo de una vez' },
];

// Cuentas por cobrar. El saldo se deriva: original − abonos.
const POR_COBRAR_INICIAL = [
  { id: 'pc1', persona: 'Sarek',    original: 300_000, abonos: [], nota: '' },
  { id: 'pc2', persona: 'Nass',     original: 111_000, abonos: [], nota: '' },
  { id: 'pc3', persona: 'Fabián',   original:  44_000, abonos: [], nota: '' },
  { id: 'pc4', persona: 'Mamá',     original:   8_000, abonos: [], nota: '' },
  { id: 'pc5', persona: 'Valcarce', original:  25_000, abonos: [], nota: '' },
];

// Pasivos personales. El saldo se deriva: capital + interés de tramos − pagos.
// `tramos` son tasas fijas por mes (no compuestas): se aplican sobre el capital.
// `aporteExterno` es la parte del abono mensual que NO sale del bolsillo propio
// (ej. beca del Estado) — baja el pasivo pero no cuenta como gasto personal.
const PASIVOS_INICIAL = [
  {
    id: 'pa1', acreedor: 'Valcarce', capital: 2_000_000,
    tramos: [
      { mes: '2026-10', tasa: 10 },
      { mes: '2026-11', tasa: 5 },
      { mes: '2026-12', tasa: 5 },
    ],
    vencimiento: '2027-01-31', abonoMensual: 0, aporteExterno: 0, pagos: [],
    nota: 'Interés fijo por tramo sobre el capital · vence enero',
  },
  {
    id: 'pa2', acreedor: 'Mamá', capital: 2_075_000, tramos: [],
    vencimiento: null, abonoMensual: 100_000, aporteExterno: 48_000, pagos: [],
    nota: '$48.000 beca del Estado + $52.000 aporte propio',
  },
];

const METAS_INICIAL = [
  {
    id: 'me1', nombre: 'Fondo Valcarce', objetivo: 2_400_000, acumulado: 1_000_000,
    fechaLimite: '2027-01-31', aportes: [],
    nota: 'Debe quedar líquido y bajo control directo — sin inversiones de terceros',
  },
];

// Plan mensual usado para proyectar el patrimonio a futuro.
const PLAN_INICIAL = {
  sueldoNegocio:    200_000,
  margenPertigas:   100_000,
  gananciaCreatina: 100_000,
  abonoPropio:       52_000,
  abonoExterno:      48_000,
  gastoPersonal:          0,
  desde:        '2026-10',
  meses:                  5,
};

// ── Context ───────────────────────────────────────────────────────────────────
const AppContext = createContext(null);

export function AppProvider({ children }) {
  const [productos,   setProductos]   = useState(() => leer(LS.productos,   PRODUCTOS_INICIAL));
  const [ventas,      setVentas]      = useState(() => leer(LS.ventas,      []));
  const [deudas,      setDeudas]      = useState(() => leer(LS.deudas,      DEUDAS_INICIAL));
  const [caja,        setCaja]        = useState(() => leer(LS.caja,        503_000));
  const [config,      setConfigRaw]   = useState(() => leer(LS.config,      CONFIG_INICIAL));
  const [movimientos, setMovimientos] = useState(() => leer(LS.movimientos, []));
  const [gastos,      setGastos]      = useState(() => leer(LS.gastos,      []));
  const [pedidos,     setPedidos]     = useState(() => leer(LS.pedidos,     []));
  const [activos,     setActivos]     = useState(() => leer(LS.activos,     ACTIVOS_INICIAL));
  const [porCobrar,   setPorCobrar]   = useState(() => leer(LS.porCobrar,   POR_COBRAR_INICIAL));
  const [pasivos,     setPasivos]     = useState(() => leer(LS.pasivos,     PASIVOS_INICIAL));
  const [metas,       setMetas]       = useState(() => leer(LS.metas,       METAS_INICIAL));
  const [planPersonal, setPlanRaw]    = useState(() => leer(LS.planPersonal, PLAN_INICIAL));
  const [patrimonio,  setPatrimonio]  = useState(() => leer(LS.patrimonio,  []));
  const [corteza,     setCorteza]     = useState(() => leer(LS.corteza,     {}));
  const [cargandoDB,  setCargandoDB]  = useState(true);
  const [errorDB,     setErrorDB]     = useState(null);

  // Refs para leer estado actual dentro de callbacks sin dependencias
  const refs = useRef({});
  refs.current = { productos, ventas, deudas, caja, config, movimientos, gastos, pedidos,
                   activos, porCobrar, pasivos, metas, planPersonal, patrimonio, corteza };

  // ── Persistir a localStorage en cada cambio (backup rápido) ───────────────
  useEffect(() => { guardar(LS.productos,   productos);   }, [productos]);
  useEffect(() => { guardar(LS.ventas,      ventas);      }, [ventas]);
  useEffect(() => { guardar(LS.deudas,      deudas);      }, [deudas]);
  useEffect(() => { guardar(LS.caja,        caja);        }, [caja]);
  useEffect(() => { guardar(LS.config,      config);      }, [config]);
  useEffect(() => { guardar(LS.movimientos, movimientos); }, [movimientos]);
  useEffect(() => { guardar(LS.gastos,      gastos);      }, [gastos]);
  useEffect(() => { guardar(LS.pedidos,     pedidos);     }, [pedidos]);
  useEffect(() => { guardar(LS.activos,     activos);     }, [activos]);
  useEffect(() => { guardar(LS.porCobrar,   porCobrar);   }, [porCobrar]);
  useEffect(() => { guardar(LS.pasivos,     pasivos);     }, [pasivos]);
  useEffect(() => { guardar(LS.metas,       metas);       }, [metas]);
  useEffect(() => { guardar(LS.planPersonal, planPersonal); }, [planPersonal]);
  useEffect(() => { guardar(LS.patrimonio,  patrimonio);  }, [patrimonio]);
  useEffect(() => { guardar(LS.corteza,     corteza);     }, [corteza]);

  // ── Cargar desde Supabase al iniciar ──────────────────────────────────────
  useEffect(() => {
    // Intenta conectar hasta 3 veces antes de rendirse
    const intentarCargar = async (intentos = 3) => {
      for (let i = 1; i <= intentos; i++) {
        try {
          return await selectAll('app_data');
        } catch (err) {
          console.warn(`[db] intento ${i}/${intentos} falló:`, err.message);
          if (i < intentos) await new Promise(r => setTimeout(r, 2000));
          else throw err;
        }
      }
    };

    intentarCargar().then(async (data) => {
      const m = data ? Object.fromEntries(data.map(r => [r.clave, r.valor])) : {};

      // Solo usamos Supabase si tiene productos reales (array con al menos 1 item)
      // Evita cargar filas de prueba o datos parciales como fuente de verdad
      const tieneRealData = Array.isArray(m[LS.productos]) && m[LS.productos].length > 0;

      if (tieneRealData) {
        // Supabase tiene datos reales → cargar en estado (fuente de verdad)
        const alerta = m[LS.config]?.alertaStockBajo ?? 3;

        setProductos(m[LS.productos].map(p => ({ ...p, status: calcStatus(p.stock, alerta) })));
        if (Array.isArray(m[LS.ventas]))      setVentas(m[LS.ventas]);
        if (Array.isArray(m[LS.deudas]))      setDeudas(m[LS.deudas]);
        if (m[LS.caja] != null)               setCaja(m[LS.caja]);
        if (m[LS.config])                     setConfigRaw(m[LS.config]);
        if (Array.isArray(m[LS.movimientos])) setMovimientos(m[LS.movimientos]);
        if (Array.isArray(m[LS.gastos]))      setGastos(m[LS.gastos]);
        if (Array.isArray(m[LS.pedidos]))     setPedidos(m[LS.pedidos]);
        if (Array.isArray(m[LS.activos]))     setActivos(m[LS.activos]);
        if (Array.isArray(m[LS.porCobrar]))   setPorCobrar(m[LS.porCobrar]);
        if (Array.isArray(m[LS.pasivos]))     setPasivos(m[LS.pasivos]);
        if (Array.isArray(m[LS.metas]))       setMetas(m[LS.metas]);
        if (m[LS.planPersonal])               setPlanRaw(m[LS.planPersonal]);
        if (Array.isArray(m[LS.patrimonio]))  setPatrimonio(m[LS.patrimonio]);
        if (m[LS.corteza] && typeof m[LS.corteza] === 'object') setCorteza(m[LS.corteza]);
        console.log('[db] ✅ datos restaurados desde Supabase');
      } else {
        // Primera vez: subir el estado actual a Supabase
        const estado = refs.current;
        const filas = [
          { clave: LS.ventas,      valor: estado.ventas },
          { clave: LS.productos,   valor: estado.productos },
          { clave: LS.deudas,      valor: estado.deudas },
          { clave: LS.caja,        valor: estado.caja },
          { clave: LS.config,      valor: estado.config },
          { clave: LS.movimientos, valor: estado.movimientos },
          { clave: LS.gastos,      valor: estado.gastos },
          { clave: LS.pedidos,     valor: estado.pedidos },
          { clave: LS.activos,     valor: estado.activos },
          { clave: LS.porCobrar,   valor: estado.porCobrar },
          { clave: LS.pasivos,     valor: estado.pasivos },
          { clave: LS.metas,       valor: estado.metas },
          { clave: LS.planPersonal, valor: estado.planPersonal },
          { clave: LS.patrimonio,  valor: estado.patrimonio },
          { clave: LS.corteza,     valor: estado.corteza },
        ].map(f => ({ ...f, actualizado_en: new Date().toISOString() }));

        await upsertRows('app_data', filas);
        console.log('[db] ✅ push inicial completado');
      }
      setCargandoDB(false);
    }).catch(err => {
      const msg = err?.message || String(err);
      console.error('[db] error:', msg);
      setErrorDB(msg);
      setCargandoDB(false);
    });
  }, []); // eslint-disable-line

  // ── Realtime: refleja en vivo lo que registre el otro dispositivo ─────────
  useEffect(() => {
    if (cargandoDB) return;

    const channel = supabase
      .channel('app_data-sync')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'app_data' }, (payload) => {
        const row = payload.new;
        if (!row || row.valor === undefined) return;
        const alerta = refs.current.config?.alertaStockBajo ?? 3;
        switch (row.clave) {
          case LS.productos:   setProductos(row.valor.map(p => ({ ...p, status: calcStatus(p.stock, alerta) }))); break;
          case LS.ventas:      setVentas(row.valor);      break;
          case LS.deudas:      setDeudas(row.valor);      break;
          case LS.caja:        setCaja(row.valor);        break;
          case LS.config:      setConfigRaw(row.valor);   break;
          case LS.movimientos: setMovimientos(row.valor); break;
          case LS.gastos:      setGastos(row.valor);      break;
          case LS.pedidos:     setPedidos(row.valor);     break;
          case LS.activos:     setActivos(row.valor);     break;
          case LS.porCobrar:   setPorCobrar(row.valor);   break;
          case LS.pasivos:     setPasivos(row.valor);     break;
          case LS.metas:       setMetas(row.valor);       break;
          case LS.planPersonal: setPlanRaw(row.valor);    break;
          case LS.patrimonio:  setPatrimonio(row.valor);  break;
          case LS.corteza:     setCorteza(row.valor);     break;
          default: break;
        }
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [cargandoDB]);

  // ── Acciones — cada una persiste explícitamente a Supabase ────────────────

  const registrarVenta = useCallback((venta) => {
    const nueva = { ...venta, id: Date.now().toString() + Math.random().toString(36).slice(2, 6), fecha: new Date().toISOString() };

    setVentas(prev => {
      const v = [nueva, ...prev];
      pushDB(LS.ventas, v);
      return v;
    });
    setProductos(prev => {
      const p = prev.map(p => {
        if (p.id !== venta.productoId) return p;
        const s = Math.max(0, p.stock - venta.cantidad);
        return { ...p, stock: s, status: calcStatus(s, refs.current.config.alertaStockBajo) };
      });
      pushDB(LS.productos, p);
      pushInv(p.filter(prod => prod.id === venta.productoId));
      return p;
    });
    setCaja(prev => {
      const c = prev + venta.total;
      pushDB(LS.caja, c);
      return c;
    });
  }, []);

  const cancelarVenta = useCallback((ventaId) => {
    setVentas(prev => {
      const venta = prev.find(v => v.id === ventaId);
      if (!venta) return prev;
      // Un pack se anula completo: todas sus líneas comparten packId.
      const anuladas = venta.packId ? prev.filter(v => v.packId === venta.packId) : [venta];
      const v = prev.filter(x => !anuladas.includes(x));
      pushDB(LS.ventas, v);

      setProductos(ps => {
        const p = ps.map(prod => {
          const devuelto = anuladas.filter(a => a.productoId === prod.id).reduce((n, a) => n + a.cantidad, 0);
          if (!devuelto) return prod;
          const st = prod.stock + devuelto;
          return { ...prod, stock: st, status: calcStatus(st, refs.current.config.alertaStockBajo) };
        });
        pushDB(LS.productos, p);
        pushInv(p.filter(prod => anuladas.some(a => a.productoId === prod.id)));
        return p;
      });
      setCaja(c => {
        const nc = Math.max(0, c - anuladas.reduce((n, a) => n + a.total, 0));
        pushDB(LS.caja, nc);
        return nc;
      });
      return v;
    });
  }, []);

  const agregarProducto = useCallback((p) => {
    setProductos(prev => {
      const nuevo = { ...p, id: Date.now().toString(), status: calcStatus(p.stock, refs.current.config.alertaStockBajo) };
      const prod = [nuevo, ...prev];
      pushDB(LS.productos, prod);
      pushInv([nuevo]);
      return prod;
    });
  }, []);

  const moverStock = useCallback((id, delta) => {
    setProductos(prev => {
      const p = prev.map(p => {
        if (p.id !== id) return p;
        const s = Math.max(0, p.stock + delta);
        return { ...p, stock: s, status: calcStatus(s, refs.current.config.alertaStockBajo) };
      });
      pushDB(LS.productos, p);
      pushInv(p.filter(prod => prod.id === id));
      return p;
    });
  }, []);

  const editarProducto = useCallback((id, cambios) => {
    setProductos(prev => {
      const p = prev.map(p => {
        if (p.id !== id) return p;
        const u = { ...p, ...cambios };
        return { ...u, status: calcStatus(u.stock, refs.current.config.alertaStockBajo) };
      });
      pushDB(LS.productos, p);
      pushInv(p.filter(prod => prod.id === id));
      return p;
    });
  }, []);

  const agregarDeuda = useCallback((deuda) => {
    setDeudas(prev => {
      const nueva = {
        id: Date.now().toString(),
        who: deuda.who, amt: deuda.amt, rate: deuda.rate || 0,
        level: deuda.level || 'low', label: deuda.label || '',
      };
      const d = [...prev, nueva];
      pushDB(LS.deudas, d);
      return d;
    });
  }, []);

  const editarDeuda = useCallback((id, cambios) => {
    setDeudas(prev => {
      const d = prev.map(x => x.id !== id ? x : { ...x, ...cambios });
      pushDB(LS.deudas, d);
      return d;
    });
  }, []);

  const eliminarDeuda = useCallback((id) => {
    setDeudas(prev => {
      const d = prev.filter(x => x.id !== id);
      pushDB(LS.deudas, d);
      return d;
    });
  }, []);

  const pagarDeuda = useCallback((id, monto) => {
    setDeudas(prev => {
      const d = prev.map(d => d.id !== id ? d : { ...d, amt: Math.max(0, d.amt - monto) }).filter(d => d.amt > 0);
      pushDB(LS.deudas, d);
      return d;
    });
    setCaja(prev => {
      const c = Math.max(0, prev - monto);
      pushDB(LS.caja, c);
      return c;
    });
  }, []);

  const registrarMovimiento = useCallback((mov) => {
    setMovimientos(prev => {
      const m = [{ ...mov, id: Date.now().toString() + Math.random().toString(36).slice(2, 6), fecha: mov.fecha || new Date().toISOString() }, ...prev];
      pushDB(LS.movimientos, m);
      return m;
    });
  }, []);

  const registrarGasto = useCallback((gasto) => {
    const nuevo = { ...gasto, id: Date.now().toString(), fecha: new Date().toISOString() };
    setGastos(prev => {
      const g = [nuevo, ...prev];
      pushDB(LS.gastos, g);
      return g;
    });
    if (gasto.tipo === 'negocio') {
      setCaja(prev => {
        const c = Math.max(0, prev - gasto.monto);
        pushDB(LS.caja, c);
        return c;
      });
    }
  }, []);

  const ajustarCaja = useCallback((valor) => {
    setCaja(valor);
    pushDB(LS.caja, valor);
  }, []);

  const setConfig = useCallback((cambios) => {
    setConfigRaw(prev => {
      const c = { ...prev, ...cambios };
      pushDB(LS.config, c);
      return c;
    });
  }, []);

  // ── Finanzas personales ──────────────────────────────────────────────────

  const agregarActivo = useCallback((a) => {
    setActivos(prev => {
      const v = [...prev, {
        id: Date.now().toString(), nombre: a.nombre, monto: a.monto || 0,
        reservado: !!a.reservado, nota: a.nota || '',
      }];
      pushDB(LS.activos, v);
      return v;
    });
  }, []);

  const editarActivo = useCallback((id, cambios) => {
    setActivos(prev => {
      const v = prev.map(a => a.id !== id ? a : { ...a, ...cambios });
      pushDB(LS.activos, v);
      return v;
    });
  }, []);

  const eliminarActivo = useCallback((id) => {
    setActivos(prev => {
      const v = prev.filter(a => a.id !== id);
      pushDB(LS.activos, v);
      return v;
    });
  }, []);

  const agregarPorCobrar = useCallback((c) => {
    setPorCobrar(prev => {
      const v = [...prev, {
        id: Date.now().toString(), persona: c.persona,
        original: c.original || 0, abonos: [], nota: c.nota || '',
      }];
      pushDB(LS.porCobrar, v);
      return v;
    });
  }, []);

  // Registra un abono recibido. Suma a caja solo si el dinero entró al negocio.
  const abonarPorCobrar = useCallback((id, monto, aCaja = false) => {
    setPorCobrar(prev => {
      const v = prev.map(c => c.id !== id ? c : {
        ...c,
        abonos: [...(c.abonos || []), { id: Date.now().toString(), fecha: new Date().toISOString(), monto }],
      });
      pushDB(LS.porCobrar, v);
      return v;
    });
    if (aCaja) {
      setCaja(prev => {
        const c = prev + monto;
        pushDB(LS.caja, c);
        return c;
      });
    }
  }, []);

  const eliminarPorCobrar = useCallback((id) => {
    setPorCobrar(prev => {
      const v = prev.filter(c => c.id !== id);
      pushDB(LS.porCobrar, v);
      return v;
    });
  }, []);

  const agregarPasivo = useCallback((d) => {
    setPasivos(prev => {
      const v = [...prev, {
        id: Date.now().toString(), acreedor: d.acreedor, capital: d.capital || 0,
        tramos: d.tramos || [], vencimiento: d.vencimiento || null,
        abonoMensual: d.abonoMensual || 0, aporteExterno: d.aporteExterno || 0,
        pagos: [], nota: d.nota || '',
      }];
      pushDB(LS.pasivos, v);
      return v;
    });
  }, []);

  const editarPasivo = useCallback((id, cambios) => {
    setPasivos(prev => {
      const v = prev.map(d => d.id !== id ? d : { ...d, ...cambios });
      pushDB(LS.pasivos, v);
      return v;
    });
  }, []);

  const eliminarPasivo = useCallback((id) => {
    setPasivos(prev => {
      const v = prev.filter(d => d.id !== id);
      pushDB(LS.pasivos, v);
      return v;
    });
  }, []);

  // `externo` = la parte del pago que no salió del bolsillo propio (ej. beca).
  const pagarPasivo = useCallback((id, monto, externo = 0) => {
    setPasivos(prev => {
      const v = prev.map(d => d.id !== id ? d : {
        ...d,
        pagos: [...(d.pagos || []), {
          id: Date.now().toString(), fecha: new Date().toISOString(),
          monto, externo: Math.min(externo, monto),
        }],
      });
      pushDB(LS.pasivos, v);
      return v;
    });
  }, []);

  const agregarMeta = useCallback((m) => {
    setMetas(prev => {
      const v = [...prev, {
        id: Date.now().toString(), nombre: m.nombre, objetivo: m.objetivo || 0,
        acumulado: m.acumulado || 0, fechaLimite: m.fechaLimite || null,
        aportes: [], nota: m.nota || '',
      }];
      pushDB(LS.metas, v);
      return v;
    });
  }, []);

  const aportarMeta = useCallback((id, monto) => {
    setMetas(prev => {
      const v = prev.map(m => m.id !== id ? m : {
        ...m,
        acumulado: Math.max(0, m.acumulado + monto),
        aportes: [...(m.aportes || []), { id: Date.now().toString(), fecha: new Date().toISOString(), monto }],
      });
      pushDB(LS.metas, v);
      return v;
    });
  }, []);

  const eliminarMeta = useCallback((id) => {
    setMetas(prev => {
      const v = prev.filter(m => m.id !== id);
      pushDB(LS.metas, v);
      return v;
    });
  }, []);

  const setPlanPersonal = useCallback((cambios) => {
    setPlanRaw(prev => {
      const v = { ...prev, ...cambios };
      pushDB(LS.planPersonal, v);
      return v;
    });
  }, []);

  // Guarda un punto de la evolución del patrimonio — uno por día, el último manda.
  const snapshotPatrimonio = useCallback((punto) => {
    setPatrimonio(prev => {
      const dia = (punto.fecha || new Date().toISOString()).slice(0, 10);
      const sinHoy = prev.filter(x => x.fecha.slice(0, 10) !== dia);
      const v = [...sinHoy, { ...punto, fecha: dia }]
        .sort((a, b) => a.fecha.localeCompare(b.fecha))
        .slice(-180);
      pushDB(LS.patrimonio, v);
      return v;
    });
  }, []);

  // ── Corteza prefrontal ───────────────────────────────────────────────────
  // Solo registra la decisión humana sobre una señal (aprobada / descartada).
  // No ejecuta nada: la acción la hace Felipe desde la pantalla que corresponda.
  // `estado: null` devuelve la señal a pendientes.
  const decidirCorteza = useCallback((id, estado, resumen = {}) => {
    setCorteza(prev => {
      const v = { ...prev };
      if (estado) v[id] = { estado, fecha: new Date().toISOString(), senal: resumen.senal || '', accion: resumen.accion || '' };
      else delete v[id];
      pushDB(LS.corteza, v);
      return v;
    });
  }, []);

  // ── Pedidos a proveedores ─────────────────────────────────────────────────
  const registrarPedido = useCallback((ped) => {
    const nuevo = {
      estado: 'pedido', ...ped,
      id: Date.now().toString() + Math.random().toString(36).slice(2, 6),
      creadoEn: new Date().toISOString(),
    };
    setPedidos(prev => {
      const n = [nuevo, ...prev];
      pushDB(LS.pedidos, n);
      return n;
    });
  }, []);

  const actualizarPedido = useCallback((id, cambios) => {
    setPedidos(prev => {
      const n = prev.map(p => p.id !== id ? p : { ...p, ...cambios });
      pushDB(LS.pedidos, n);
      return n;
    });
  }, []);

  const eliminarPedido = useCallback((id) => {
    setPedidos(prev => {
      const n = prev.filter(p => p.id !== id);
      pushDB(LS.pedidos, n);
      return n;
    });
  }, []);

  // Al recibir un pedido: queda registrada la demora real y entra el stock.
  const recibirPedido = useCallback((id, fechaLlegada) => {
    const ped = refs.current.pedidos.find(p => p.id === id);
    if (!ped || ped.estado === 'recibido') return;
    actualizarPedido(id, { estado: 'recibido', fechaLlegada });
    const prod = refs.current.productos.find(p => p.id === ped.productoId);
    if (!prod) return;
    const antes = prod.stock;
    moverStock(prod.id, ped.cantidad);
    registrarMovimiento({
      productoId: prod.id, producto: prod.name, tipo: 'compra',
      delta: ped.cantidad, stockAntes: antes, stockDespues: antes + ped.cantidad,
      proveedor: ped.proveedor, pedidoId: ped.id,
    });
  }, [actualizarPedido, moverStock, registrarMovimiento]);

  return (
    <AppContext.Provider value={{
      productos, ventas, deudas, caja, config, movimientos, gastos, pedidos,
      registrarPedido, actualizarPedido, eliminarPedido, recibirPedido,
      activos, porCobrar, pasivos, metas, planPersonal, patrimonio, corteza,
      cargandoDB, errorDB,
      registrarVenta, cancelarVenta, agregarProducto, moverStock, editarProducto,
      registrarMovimiento, pagarDeuda, agregarDeuda, editarDeuda, eliminarDeuda,
      ajustarCaja, setConfig, registrarGasto,
      agregarActivo, editarActivo, eliminarActivo,
      agregarPorCobrar, abonarPorCobrar, eliminarPorCobrar,
      agregarPasivo, editarPasivo, eliminarPasivo, pagarPasivo,
      agregarMeta, aportarMeta, eliminarMeta,
      setPlanPersonal, snapshotPatrimonio, decidirCorteza,
    }}>
      {children}
    </AppContext.Provider>
  );
}

export const useApp = () => useContext(AppContext);

// ── Helpers de KPI ────────────────────────────────────────────────────────────
export const MESES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];

export function ventasDelDia(ventas, fecha = new Date()) {
  const ref = fecha.toDateString();
  return ventas.filter(v => new Date(v.fecha).toDateString() === ref);
}
export function ventasDelMes(ventas, fecha = new Date()) {
  const mes = fecha.getMonth(), año = fecha.getFullYear();
  return ventas.filter(v => { const d = new Date(v.fecha); return d.getMonth() === mes && d.getFullYear() === año; });
}
export function ventasUltimos7Dias(ventas) {
  const desde = new Date(); desde.setDate(desde.getDate() - 6); desde.setHours(0,0,0,0);
  return ventas.filter(v => new Date(v.fecha) >= desde);
}
export function sumarTotal(lista)  { return lista.reduce((s, v) => s + v.total,  0); }
export function sumarMargen(lista) { return lista.reduce((s, v) => s + v.margen, 0); }
// Un pack son varias líneas con el mismo packId: cuenta como una sola transacción.
export function contarTransacciones(lista) { return new Set(lista.map(v => v.packId || v.id)).size; }

// Meses ('YYYY-MM') con ventas o gastos, del más reciente al más antiguo. Siempre incluye el actual.
export function mesesConDatos(ventas, gastos = []) {
  const keys = new Set([mesKey(new Date())]);
  ventas.forEach(v => keys.add(mesKey(new Date(v.fecha))));
  gastos.forEach(g => keys.add(mesKey(new Date(g.fecha))));
  return [...keys].sort().reverse();
}

// Resumen de un mes: ventas, COGS, gastos de negocio y resultado neto.
export function resumenMes(ventas, gastos, fecha) {
  const vMes   = ventasDelMes(ventas, fecha);
  const total  = sumarTotal(vMes);
  const cogs   = vMes.reduce((n, v) => n + v.costoUnitario * v.cantidad, 0);
  const gNeg   = gastosDelMes(gastos, fecha).filter(g => g.tipo === 'negocio').reduce((n, g) => n + g.monto, 0);
  const top = ventasPorProducto(vMes).sort((a, b) => b.unidades - a.unidades)[0] || null;
  return { total, margen: sumarMargen(vMes), cogs, gastos: gNeg, neto: total - cogs - gNeg, transacciones: contarTransacciones(vMes), top };
}

// Ventas por producto en una lista de ventas, con unidades, total y margen.
export function ventasPorProducto(lista) {
  const m = {};
  lista.forEach(v => {
    const k = v.productoId || v.producto;
    if (!m[k]) m[k] = { id: v.productoId, nombre: v.producto, unidades: 0, total: 0, margen: 0 };
    m[k].unidades += v.cantidad; m[k].total += v.total; m[k].margen += v.margen;
  });
  return Object.values(m).sort((a, b) => b.total - a.total);
}

export function getDiasDelMes(ventas, fecha = new Date()) {
  const año = fecha.getFullYear(), mes = fecha.getMonth();
  const hoyStr = fecha.toDateString();
  const diasEnMes = new Date(año, mes + 1, 0).getDate();
  const DIAS = ['Dom','Lun','Mar','Mié','Jue','Vie','Sáb'];
  return Array.from({ length: diasEnMes }, (_, i) => {
    const d = new Date(año, mes, i + 1);
    const s = ventas.filter(v => { const vd = new Date(v.fecha); return vd.getFullYear()===año && vd.getMonth()===mes && vd.getDate()===i+1; }).reduce((a,v)=>a+v.total,0);
    return { d: i+1, dow: DIAS[d.getDay()], s, today: d.toDateString()===hoyStr, isFuture: d > fecha };
  });
}
export function getDiasGraficoSemanal(ventas) {
  const DIAS = ['Dom','Lun','Mar','Mié','Jue','Vie','Sáb'];
  return Array.from({ length: 7 }, (_, i) => {
    const desde = new Date(); desde.setDate(desde.getDate()-(6-i)); desde.setHours(0,0,0,0);
    const hasta = new Date(desde); hasta.setDate(hasta.getDate()+1);
    return { d: DIAS[desde.getDay()], v: ventas.filter(v=>{const d=new Date(v.fecha);return d>=desde&&d<hasta;}).reduce((a,v)=>a+v.total,0), isToday: i===6 };
  });
}
export function getTopProductos(ventas, n = 3) {
  const m = {};
  ventas.forEach(v => { if (!m[v.producto]) m[v.producto]={n:v.producto,q:0,v:0}; m[v.producto].q+=v.cantidad; m[v.producto].v+=v.total; });
  return Object.values(m).sort((a,b)=>b.v-a.v).slice(0,n);
}

// ── Módulo de Gastos ──────────────────────────────────────────────────────────
export function gastosDelMes(gastos, fecha = new Date()) {
  const mes = fecha.getMonth(), año = fecha.getFullYear();
  return gastos.filter(g => { const d = new Date(g.fecha); return d.getMonth()===mes && d.getFullYear()===año; });
}
export function sumarGastos(lista) { return lista.reduce((s, g) => s + g.monto, 0); }

// ── Métricas Fase 2 ───────────────────────────────────────────────────────────
export function calcMetricasInventario(ventas, movimientos, productos, fecha = new Date()) {
  const mes = fecha.getMonth(), año = fecha.getFullYear();
  const vMes = ventas.filter(v=>{const d=new Date(v.fecha);return d.getMonth()===mes&&d.getFullYear()===año;});
  const cogsMes = vMes.reduce((s,v)=>s+v.costoUnitario*v.cantidad,0);
  const unidadesVendidas = vMes.reduce((s,v)=>s+v.cantidad,0);
  const comprasMes = movimientos.filter(m=>{const d=new Date(m.fecha);return m.tipo==='compra'&&d.getMonth()===mes&&d.getFullYear()===año;});
  const unidadesRecibidas = comprasMes.reduce((s,m)=>s+Math.abs(m.delta),0);
  const inventarioActual = productos.reduce((s,p)=>s+p.stock*p.cost,0);
  const str = unidadesRecibidas>0?(unidadesVendidas/unidadesRecibidas)*100:null;
  const rotacion = inventarioActual>0?cogsMes/inventarioActual:null;
  const dsi = rotacion>0?Math.round(30/rotacion):null;
  return { cogsMes, unidadesVendidas, unidadesRecibidas, inventarioActual, str, rotacion, dsi };
}

// ── Módulo de Clientes ────────────────────────────────────────────────────────
export function getResumenClientes(ventas) {
  const m = {};
  ventas.forEach(v => {
    const key = (v.cliente||'').trim(); if (!key) return;
    if (!m[key]) m[key]={nombre:key,ltv:0,compras:0,margen:0,ultima:v.fecha,productos:{}};
    m[key].ltv+=v.total; m[key].margen+=v.margen; m[key].compras++;
    if(v.fecha>m[key].ultima) m[key].ultima=v.fecha;
    if(!m[key].productos[v.producto]) m[key].productos[v.producto]=0;
    m[key].productos[v.producto]+=v.cantidad;
  });
  return Object.values(m).map(c=>({...c, ticketPromedio:c.ltv/c.compras, margenPct:c.ltv>0?(c.margen/c.ltv)*100:0, topProducto:Object.entries(c.productos).sort((a,b)=>b[1]-a[1])[0]?.[0]||'—'})).sort((a,b)=>b.ltv-a.ltv);
}

// Rotación por producto en un mes. El stock al inicio/fin se reconstruye restando al
// stock actual los movimientos posteriores. Rotación = unidades vendidas / stock promedio
// (promedio entre inicio, disponible tras compras y fin de mes);
// días = cada cuánto se renueva ese stock al ritmo del mes.
export function rotacionProductosMes(ventas, movimientos, productos, fecha, diasTranscurridos) {
  const ini = new Date(fecha.getFullYear(), fecha.getMonth(), 1);
  const fin = new Date(fecha.getFullYear(), fecha.getMonth() + 1, 1);
  const diasMes = diasTranscurridos || new Date(fecha.getFullYear(), fecha.getMonth() + 1, 0).getDate();
  const vMes = ventasDelMes(ventas, fecha);
  const porProd = {};
  ventasPorProducto(vMes).forEach(f => { porProd[f.id || f.nombre] = f; });

  const filas = productos.map(p => {
    const v = porProd[p.id] || { unidades: 0, total: 0, margen: 0 };
    let despuesFin = 0, desdeIni = 0, compras = 0;
    movimientos.forEach(m => {
      if (m.productoId !== p.id) return;
      const t = new Date(m.fecha);
      if (t >= fin) despuesFin += m.delta;
      if (t >= ini) desdeIni += m.delta;
      if (t >= ini && t < fin && m.tipo === 'compra') compras += m.delta;
    });
    const stockFin = Math.max(0, p.stock - despuesFin);
    const stockIni = Math.max(0, p.stock - desdeIni);
    const disponible = stockIni + compras;
    const promedio = (stockIni + disponible + stockFin) / 3;
    const rotacion = promedio > 0 && v.unidades > 0 ? v.unidades / promedio : null;
    return {
      id: p.id, nombre: p.name, unidades: v.unidades, total: v.total, margen: v.margen,
      stockIni, stockFin, compras, promedio, rotacion,
      diasRotacion: rotacion ? Math.round(diasMes / rotacion) : null,
      vendidoPct: disponible > 0 ? Math.min(100, (v.unidades / disponible) * 100) : null,
    };
  });
  // Productos que ya no están en el catálogo pero se vendieron ese mes
  Object.values(porProd).forEach(f => {
    if (!productos.some(p => p.id === f.id)) {
      filas.push({ id: f.id, nombre: f.nombre, unidades: f.unidades, total: f.total, margen: f.margen,
        stockIni: 0, stockFin: 0, compras: 0, promedio: 0, rotacion: null, diasRotacion: null, vendidoPct: null });
    }
  });
  return filas
    .filter(f => f.unidades > 0 || f.stockIni > 0 || f.stockFin > 0)
    .sort((a, b) => b.total - a.total || b.stockFin - a.stockFin);
}

// ── Pedidos a proveedores ─────────────────────────────────────────────────────
// Fechas como 'YYYY-MM-DD' (hora local) para que los días de demora sean exactos.
export const hoyISO = (d = new Date()) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

export function diasEntre(a, b) {
  const [ya, ma, da] = a.split('-').map(Number);
  const [yb, mb, db] = b.split('-').map(Number);
  return Math.round((Date.UTC(yb, mb - 1, db) - Date.UTC(ya, ma - 1, da)) / 86400000);
}

export function sumarDias(iso, n) {
  const [y, m, d] = iso.split('-').map(Number);
  return hoyISO(new Date(y, m - 1, d + n));
}

// Por proveedor: demora promedio real (pedido → llegada), cuánto se ha invertido y qué está en camino.
export function resumenProveedores(pedidos) {
  const m = {};
  pedidos.filter(p => p.estado !== 'cancelado' && (p.proveedor || '').trim()).forEach(p => {
    const k = p.proveedor.trim();
    if (!m[k]) m[k] = { proveedor: k, tiempos: [], pedidos: 0, invertido: 0, enCamino: 0, ultimo: null };
    const g = m[k];
    g.pedidos++;
    g.invertido += (p.costoUnitario || 0) * p.cantidad;
    if (p.estado === 'recibido' && p.fechaLlegada) g.tiempos.push(diasEntre(p.fechaPedido, p.fechaLlegada));
    else g.enCamino++;
    if (!g.ultimo || p.fechaPedido > g.ultimo) g.ultimo = p.fechaPedido;
  });
  return Object.values(m).map(g => ({
    ...g,
    recibidos: g.tiempos.length,
    promedio:  g.tiempos.length ? Math.round(g.tiempos.reduce((a, b) => a + b, 0) / g.tiempos.length * 10) / 10 : null,
    min:       g.tiempos.length ? Math.min(...g.tiempos) : null,
    max:       g.tiempos.length ? Math.max(...g.tiempos) : null,
  })).sort((a, b) => b.invertido - a.invertido);
}

// Cuándo y cuánto pedir de cada producto, según su ritmo de venta y la demora
// promedio del proveedor con el que se compró por última vez.
export function sugerenciasReposicion({ productos, ventas, pedidos, hoy = new Date(), colchon = 5, cobertura = 30, leadDefecto = 7 }) {
  if (ventas.length === 0) return [];
  const hoyStr  = hoyISO(hoy);
  const primera = ventas.reduce((min, v) => { const d = hoyISO(new Date(v.fecha)); return d < min ? d : min; }, hoyStr);
  const ventana = Math.min(30, Math.max(7, diasEntre(primera, hoyStr) + 1));
  const desde   = sumarDias(hoyStr, -(ventana - 1));
  const unidades = {};
  ventas.forEach(v => {
    if (hoyISO(new Date(v.fecha)) >= desde) unidades[v.productoId] = (unidades[v.productoId] || 0) + v.cantidad;
  });
  const provs = resumenProveedores(pedidos);

  return productos.map(p => {
    const ritmo = (unidades[p.id] || 0) / ventana;
    if (ritmo <= 0) return null;
    const delProd  = pedidos.filter(x => x.productoId === p.id && x.estado !== 'cancelado')
                            .sort((a, b) => b.fechaPedido.localeCompare(a.fechaPedido));
    const proveedor = delProd[0]?.proveedor || null;
    const leadReal  = provs.find(g => g.proveedor === proveedor)?.promedio ?? null;
    const lead      = Math.ceil(leadReal ?? leadDefecto);
    const enCamino  = delProd.filter(x => x.estado === 'pedido' || x.estado === 'en_camino').reduce((n, x) => n + x.cantidad, 0);
    const diasStock = p.stock / ritmo;
    const cantidad  = Math.max(0, Math.ceil(ritmo * (lead + colchon + cobertura) - p.stock - enCamino));
    if (cantidad === 0) return null;
    // Lo que ya viene en camino cuenta como cobertura: evita pedir de nuevo lo que ya se pidió.
    const diasParaPedir = Math.floor((p.stock + enCamino) / ritmo - (lead + colchon));
    return {
      id: p.id, nombre: p.name, stock: p.stock, costo: p.cost, ritmo, diasStock: Math.floor(diasStock),
      proveedor, lead, leadEstimado: leadReal === null, enCamino,
      diasParaPedir, fechaPedir: sumarDias(hoyStr, Math.max(0, diasParaPedir)),
      cantidad, inversion: cantidad * p.cost,
    };
  }).filter(Boolean).sort((a, b) => a.diasParaPedir - b.diasParaPedir);
}

// ── Finanzas personales — cálculos ────────────────────────────────────────────
// Clave de mes 'YYYY-MM' — se comparan como strings, sin líos de zona horaria.
export const mesKey = (fecha = new Date()) =>
  `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, '0')}`;

export function mesLabel(key) {
  const [a, m] = (key || '').split('-');
  const i = parseInt(m, 10) - 1;
  return MESES[i] ? `${MESES[i]} ${a}` : key;
}

export function mesSiguiente(key) {
  const [a, m] = key.split('-').map(Number);
  return m === 12 ? `${a + 1}-01` : `${a}-${String(m + 1).padStart(2, '0')}`;
}

// Interés de los tramos ya cumplidos a la fecha. Tasa fija sobre el capital
// (no compuesta): oct 10% + nov 5% + dic 5% sobre $2.000.000 = $400.000.
export function interesDevengado(pasivo, hasta = new Date()) {
  const tope = mesKey(hasta);
  return (pasivo.tramos || [])
    .filter(t => t.mes <= tope)
    .reduce((s, t) => s + pasivo.capital * t.tasa / 100, 0);
}

export function interesTotal(pasivo) {
  return (pasivo.tramos || []).reduce((s, t) => s + pasivo.capital * t.tasa / 100, 0);
}

export function pagadoPasivo(pasivo)  { return (pasivo.pagos || []).reduce((s, p) => s + p.monto, 0); }
export function pagadoExterno(pasivo) { return (pasivo.pagos || []).reduce((s, p) => s + (p.externo || 0), 0); }
export function pagadoPropio(pasivo)  { return pagadoPasivo(pasivo) - pagadoExterno(pasivo); }

// Compromiso total: lo que hay que pagar al vencimiento, con todo el interés.
export function saldoPasivo(pasivo) {
  return Math.max(0, pasivo.capital + interesTotal(pasivo) - pagadoPasivo(pasivo));
}
// Lo exigible hoy: capital + solo el interés ya corrido.
export function saldoPasivoHoy(pasivo, hasta = new Date()) {
  return Math.max(0, pasivo.capital + interesDevengado(pasivo, hasta) - pagadoPasivo(pasivo));
}

export function saldoPorCobrar(cuenta) {
  const abonado = (cuenta.abonos || []).reduce((s, a) => s + a.monto, 0);
  return Math.max(0, cuenta.original - abonado);
}

export function inventarioACosto(productos) {
  return productos.reduce((s, p) => s + p.stock * p.cost, 0);
}

// Balance general: activos (líquido + por cobrar + inventario) vs pasivos.
export function calcBalancePersonal({ activos = [], porCobrar = [], pasivos = [], productos = [] }) {
  const reservado    = activos.filter(a => a.reservado).reduce((s, a) => s + a.monto, 0);
  const liquido      = activos.reduce((s, a) => s + a.monto, 0);
  const disponible   = liquido - reservado;
  const totalCobrar  = porCobrar.reduce((s, c) => s + saldoPorCobrar(c), 0);
  const inventario   = inventarioACosto(productos);
  const totalActivos = liquido + totalCobrar + inventario;
  const totalPasivos = pasivos.reduce((s, p) => s + saldoPasivo(p), 0);
  const pasivosHoy   = pasivos.reduce((s, p) => s + saldoPasivoHoy(p), 0);
  return {
    liquido, reservado, disponible, totalCobrar, inventario,
    totalActivos, totalPasivos, pasivosHoy,
    neto: totalActivos - totalPasivos,
    netoHoy: totalActivos - pasivosHoy,
  };
}

// Gasto personal real: los aportes externos (beca) bajan el pasivo pero no
// salen del bolsillo, así que no cuentan como gasto propio.
export function calcGastoPersonalReal(gastos, pasivos, fecha = new Date()) {
  const mes = fecha.getMonth(), año = fecha.getFullYear();
  const enMes = (f) => { const d = new Date(f); return d.getMonth() === mes && d.getFullYear() === año; };

  const gastosPropios = gastos.filter(g => g.tipo === 'personal' && enMes(g.fecha))
    .reduce((s, g) => s + g.monto, 0);

  let deudaPropia = 0, deudaExterna = 0;
  pasivos.forEach(p => (p.pagos || []).filter(x => enMes(x.fecha)).forEach(x => {
    deudaExterna += x.externo || 0;
    deudaPropia  += x.monto - (x.externo || 0);
  }));

  return {
    gastosPropios, deudaPropia, deudaExterna,
    real: gastosPropios + deudaPropia,          // lo que de verdad salió del bolsillo
    totalPasivoPagado: deudaPropia + deudaExterna,
  };
}

// Proyección mes a mes del patrimonio neto dado un plan de ingresos/egresos.
// Arranca del saldo EXIGIBLE hoy (capital + interés ya corrido) y va devengando
// el interés mes a mes: partir del compromiso total lo contaría dos veces.
// Pagar deuda con plata propia es neutro al patrimonio (baja activo y pasivo por
// igual); lo que mueve la aguja es el flujo del mes, el aporte externo (beca) y
// el interés que se devenga.
export function proyectarPatrimonio({ balance, plan, pasivos = [] }) {
  const meses = Math.max(1, plan.meses || 5);
  let neto   = balance.netoHoy;
  let pasivo = balance.pasivosHoy;
  let mes    = plan.desde || mesKey();

  return Array.from({ length: meses }, () => {
    const ingresos = (plan.sueldoNegocio || 0) + (plan.margenPertigas || 0) + (plan.gananciaCreatina || 0);
    const interes  = pasivos.reduce((s, p) => {
      const t = (p.tramos || []).find(t => t.mes === mes);
      return s + (t ? p.capital * t.tasa / 100 : 0);
    }, 0);
    const abonoPropio  = plan.abonoPropio  || 0;
    const abonoExterno = plan.abonoExterno || 0;

    // Deuda que vence este mes: se salda por lo devengado hasta acá.
    const vence = pasivos.filter(p => p.vencimiento && p.vencimiento.slice(0, 7) === mes);
    const saldado = vence.reduce((s, p) => {
      const acumulado = (p.tramos || [])
        .filter(t => t.mes <= mes)
        .reduce((a, t) => a + p.capital * t.tasa / 100, 0);
      return s + Math.max(0, p.capital + acumulado - pagadoPasivo(p));
    }, 0);

    neto   = neto + (ingresos - (plan.gastoPersonal || 0)) + abonoExterno - interes;
    pasivo = Math.max(0, pasivo + interes - abonoPropio - abonoExterno - saldado);

    const fila = {
      mes, label: mesLabel(mes), ingresos, interes, abonoPropio, abonoExterno, pasivo,
      neto, saldado,
      hito: vence.length ? `Se paga ${vence.map(p => p.acreedor).join(' y ')} completo` : null,
    };
    mes = mesSiguiente(mes);
    return fila;
  });
}

// Deudas que vencen dentro de los próximos `dias` días.
export function alertasVencimiento(pasivos, dias = 60, hoy = new Date()) {
  const limite = new Date(hoy); limite.setDate(limite.getDate() + dias);
  return pasivos
    .filter(p => p.vencimiento && saldoPasivo(p) > 0)
    .map(p => {
      const v = new Date(p.vencimiento + 'T12:00:00');
      return { ...p, fechaVenc: v, diasRestantes: Math.ceil((v - hoy) / 86_400_000), saldo: saldoPasivo(p) };
    })
    .filter(p => p.fechaVenc <= limite)
    .sort((a, b) => a.diasRestantes - b.diasRestantes);
}
