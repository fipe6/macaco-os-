import { createContext, useContext, useState, useEffect, useCallback } from 'react';

const LS = {
  productos:   'macaco:productos',
  ventas:      'macaco:ventas',
  deudas:      'macaco:deudas',
  caja:        'macaco:caja',
  config:      'macaco:config',
  movimientos: 'macaco:movimientos',
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
  metaMensual:     10_000_000,
  metaDiaria:      700_000,
  colchonMinimo:   300_000,
  alertaStockBajo: 3,
};

const AppContext = createContext(null);

export function AppProvider({ children }) {
  const [productos,   setProductos]   = useState(() => leer(LS.productos,   PRODUCTOS_INICIAL));
  const [ventas,      setVentas]      = useState(() => leer(LS.ventas,      []));
  const [deudas,      setDeudas]      = useState(() => leer(LS.deudas,      DEUDAS_INICIAL));
  const [caja,        setCaja]        = useState(() => leer(LS.caja,        503_000));
  const [config,      setConfigRaw]   = useState(() => leer(LS.config,      CONFIG_INICIAL));
  const [movimientos, setMovimientos] = useState(() => leer(LS.movimientos, []));

  useEffect(() => guardar(LS.productos,   productos),   [productos]);
  useEffect(() => guardar(LS.ventas,      ventas),      [ventas]);
  useEffect(() => guardar(LS.deudas,      deudas),      [deudas]);
  useEffect(() => guardar(LS.caja,        caja),        [caja]);
  useEffect(() => guardar(LS.config,      config),      [config]);
  useEffect(() => guardar(LS.movimientos, movimientos), [movimientos]);

  const registrarVenta = useCallback((venta) => {
    const nueva = { ...venta, id: Date.now().toString(), fecha: new Date().toISOString() };
    setVentas(prev => [nueva, ...prev]);
    setProductos(prev => prev.map(p => {
      if (p.id !== venta.productoId) return p;
      const nuevoStock = Math.max(0, p.stock - venta.cantidad);
      return { ...p, stock: nuevoStock, status: calcStatus(nuevoStock, config.alertaStockBajo) };
    }));
    setCaja(prev => prev + venta.total);
  }, [config.alertaStockBajo]);

  const agregarProducto = useCallback((p) => {
    setProductos(prev => [{
      ...p,
      id:     Date.now().toString(),
      status: calcStatus(p.stock, config.alertaStockBajo),
    }, ...prev]);
  }, [config.alertaStockBajo]);

  const moverStock = useCallback((id, delta) => {
    setProductos(prev => prev.map(p => {
      if (p.id !== id) return p;
      const nuevoStock = Math.max(0, p.stock + delta);
      return { ...p, stock: nuevoStock, status: calcStatus(nuevoStock, config.alertaStockBajo) };
    }));
  }, [config.alertaStockBajo]);

  const editarProducto = useCallback((id, cambios) => {
    setProductos(prev => prev.map(p => {
      if (p.id !== id) return p;
      const updated = { ...p, ...cambios };
      return { ...updated, status: calcStatus(updated.stock, config.alertaStockBajo) };
    }));
  }, [config.alertaStockBajo]);

  const pagarDeuda = useCallback((id, monto) => {
    setDeudas(prev =>
      prev.map(d => d.id !== id ? d : { ...d, amt: Math.max(0, d.amt - monto) })
          .filter(d => d.amt > 0)
    );
    setCaja(prev => Math.max(0, prev - monto));
  }, []);

  const registrarMovimiento = useCallback((mov) => {
    setMovimientos(prev => [{
      ...mov,
      id:    Date.now().toString(),
      fecha: mov.fecha || new Date().toISOString(),
    }, ...prev]);
  }, []);

  const ajustarCaja = useCallback((valor) => setCaja(valor), []);

  const setConfig = useCallback((cambios) => {
    setConfigRaw(prev => ({ ...prev, ...cambios }));
  }, []);

  return (
    <AppContext.Provider value={{
      productos, ventas, deudas, caja, config, movimientos,
      registrarVenta, agregarProducto, moverStock, editarProducto,
      registrarMovimiento, pagarDeuda, ajustarCaja, setConfig,
    }}>
      {children}
    </AppContext.Provider>
  );
}

export const useApp = () => useContext(AppContext);

// ── Helpers de KPI ────────────────────────────────────────────────────────────

export const MESES = [
  'Enero','Febrero','Marzo','Abril','Mayo','Junio',
  'Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre',
];

export function ventasDelDia(ventas, fecha = new Date()) {
  const ref = fecha.toDateString();
  return ventas.filter(v => new Date(v.fecha).toDateString() === ref);
}

export function ventasDelMes(ventas, fecha = new Date()) {
  const mes = fecha.getMonth();
  const año = fecha.getFullYear();
  return ventas.filter(v => {
    const d = new Date(v.fecha);
    return d.getMonth() === mes && d.getFullYear() === año;
  });
}

export function ventasUltimos7Dias(ventas) {
  const desde = new Date();
  desde.setDate(desde.getDate() - 6);
  desde.setHours(0, 0, 0, 0);
  return ventas.filter(v => new Date(v.fecha) >= desde);
}

export function sumarTotal(lista) {
  return lista.reduce((s, v) => s + v.total, 0);
}

export function sumarMargen(lista) {
  return lista.reduce((s, v) => s + v.margen, 0);
}

export function getDiasDelMes(ventas, fecha = new Date()) {
  const año = fecha.getFullYear();
  const mes = fecha.getMonth();
  const hoyStr = fecha.toDateString();
  const diasEnMes = new Date(año, mes + 1, 0).getDate();
  const DIAS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

  return Array.from({ length: diasEnMes }, (_, i) => {
    const d = new Date(año, mes, i + 1);
    const ventasDia = ventas.filter(v => {
      const vd = new Date(v.fecha);
      return vd.getFullYear() === año && vd.getMonth() === mes && vd.getDate() === i + 1;
    });
    return {
      d: i + 1,
      dow: DIAS[d.getDay()],
      s: ventasDia.reduce((acc, v) => acc + v.total, 0),
      today: d.toDateString() === hoyStr,
      isFuture: d > fecha,
    };
  });
}

export function getDiasGraficoSemanal(ventas) {
  const DIAS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
  return Array.from({ length: 7 }, (_, i) => {
    const desde = new Date();
    desde.setDate(desde.getDate() - (6 - i));
    desde.setHours(0, 0, 0, 0);
    const hasta = new Date(desde);
    hasta.setDate(hasta.getDate() + 1);
    const ventasDia = ventas.filter(v => {
      const d = new Date(v.fecha);
      return d >= desde && d < hasta;
    });
    return {
      d: DIAS[desde.getDay()],
      v: ventasDia.reduce((acc, v) => acc + v.total, 0),
      isToday: i === 6,
    };
  });
}

export function getTopProductos(ventas, n = 3) {
  const mapa = {};
  ventas.forEach(v => {
    if (!mapa[v.producto]) mapa[v.producto] = { n: v.producto, q: 0, v: 0 };
    mapa[v.producto].q += v.cantidad;
    mapa[v.producto].v += v.total;
  });
  return Object.values(mapa).sort((a, b) => b.v - a.v).slice(0, n);
}

// ── Métricas Fase 2 ───────────────────────────────────────────────────────────

export function calcMetricasInventario(ventas, movimientos, productos, fecha = new Date()) {
  const mes = fecha.getMonth();
  const año = fecha.getFullYear();

  const vMes = ventas.filter(v => {
    const d = new Date(v.fecha);
    return d.getMonth() === mes && d.getFullYear() === año;
  });

  const cogsMes = vMes.reduce((s, v) => s + v.costoUnitario * v.cantidad, 0);
  const unidadesVendidas = vMes.reduce((s, v) => s + v.cantidad, 0);

  const comprasMes = movimientos.filter(m => {
    const d = new Date(m.fecha);
    return m.tipo === 'compra' && d.getMonth() === mes && d.getFullYear() === año;
  });
  const unidadesRecibidas = comprasMes.reduce((s, m) => s + Math.abs(m.delta), 0);

  const inventarioActual = productos.reduce((s, p) => s + p.stock * p.cost, 0);

  const str      = unidadesRecibidas > 0 ? (unidadesVendidas / unidadesRecibidas) * 100 : null;
  const rotacion = inventarioActual > 0   ? cogsMes / inventarioActual                   : null;
  const dsi      = rotacion > 0           ? Math.round(30 / rotacion)                    : null;

  return { cogsMes, unidadesVendidas, unidadesRecibidas, inventarioActual, str, rotacion, dsi };
}

// ── Módulo de Clientes ────────────────────────────────────────────────────────

export function getResumenClientes(ventas) {
  const mapa = {};
  ventas.forEach(v => {
    const key = (v.cliente || '').trim();
    if (!key) return;
    if (!mapa[key]) mapa[key] = { nombre: key, ltv: 0, compras: 0, margen: 0, ultima: v.fecha, productos: {} };
    mapa[key].ltv    += v.total;
    mapa[key].margen += v.margen;
    mapa[key].compras++;
    if (v.fecha > mapa[key].ultima) mapa[key].ultima = v.fecha;
    if (!mapa[key].productos[v.producto]) mapa[key].productos[v.producto] = 0;
    mapa[key].productos[v.producto] += v.cantidad;
  });

  return Object.values(mapa)
    .map(c => ({
      ...c,
      ticketPromedio: c.ltv / c.compras,
      margenPct:      c.ltv > 0 ? (c.margen / c.ltv) * 100 : 0,
      topProducto:    Object.entries(c.productos).sort((a, b) => b[1] - a[1])[0]?.[0] || '—',
    }))
    .sort((a, b) => b.ltv - a.ltv);
}
