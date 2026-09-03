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
  const [cargandoDB,  setCargandoDB]  = useState(true);
  const [errorDB,     setErrorDB]     = useState(null);

  // Refs para leer estado actual dentro de callbacks sin dependencias
  const refs = useRef({});
  refs.current = { productos, ventas, deudas, caja, config, movimientos, gastos };

  // ── Persistir a localStorage en cada cambio (backup rápido) ───────────────
  useEffect(() => { guardar(LS.productos,   productos);   }, [productos]);
  useEffect(() => { guardar(LS.ventas,      ventas);      }, [ventas]);
  useEffect(() => { guardar(LS.deudas,      deudas);      }, [deudas]);
  useEffect(() => { guardar(LS.caja,        caja);        }, [caja]);
  useEffect(() => { guardar(LS.config,      config);      }, [config]);
  useEffect(() => { guardar(LS.movimientos, movimientos); }, [movimientos]);
  useEffect(() => { guardar(LS.gastos,      gastos);      }, [gastos]);

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
          default: break;
        }
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [cargandoDB]);

  // ── Acciones — cada una persiste explícitamente a Supabase ────────────────

  const registrarVenta = useCallback((venta) => {
    const nueva = { ...venta, id: Date.now().toString(), fecha: new Date().toISOString() };

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
      const v = prev.filter(v => v.id !== ventaId);
      pushDB(LS.ventas, v);

      setProductos(ps => {
        const p = ps.map(p => {
          if (p.id !== venta.productoId) return p;
          const s = p.stock + venta.cantidad;
          return { ...p, stock: s, status: calcStatus(s, refs.current.config.alertaStockBajo) };
        });
        pushDB(LS.productos, p);
        pushInv(p.filter(prod => prod.id === venta.productoId));
        return p;
      });
      setCaja(c => {
        const nc = Math.max(0, c - venta.total);
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
      const m = [{ ...mov, id: Date.now().toString(), fecha: mov.fecha || new Date().toISOString() }, ...prev];
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

  return (
    <AppContext.Provider value={{
      productos, ventas, deudas, caja, config, movimientos, gastos,
      cargandoDB, errorDB,
      registrarVenta, cancelarVenta, agregarProducto, moverStock, editarProducto,
      registrarMovimiento, pagarDeuda, agregarDeuda, editarDeuda, eliminarDeuda,
      ajustarCaja, setConfig, registrarGasto,
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
