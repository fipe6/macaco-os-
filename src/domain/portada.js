// Portada "cerebro": qué le muestra cada punto del mapa y cuánto brilla.
//
// Fuente o silencio: un área que todavía no tiene datos en la app NO inventa un
// puntaje; sale tenue ("sin medir") hasta que haya algo real que medir.
import { saludNegocio } from './kairos.js';
import { clpCompact } from '../theme.js';

// Posición de cada punto dentro del cerebro (x, y en -1..1, sobre el óvalo).
export const NODOS = [
  { id: 'legal',     nombre: 'Legal',     x: 0,     y: -0.64, destino: 'area' },
  { id: 'finanzas',  nombre: 'Finanzas',  x: -0.52, y: -0.22, destino: 'finanzas' },
  { id: 'marketing', nombre: 'Marketing', x: 0.52,  y: -0.22, destino: 'area' },
  { id: 'productos', nombre: 'Productos', x: -0.56, y: 0.3,   destino: 'inventario' },
  { id: 'catalogo',  nombre: 'Catálogo',  x: 0.56,  y: 0.3,   destino: 'area' },
  { id: 'obra',      nombre: 'En obra',   x: 0,     y: 0.58,  destino: 'area' },
];

// 0..1: de los productos que se venden (30 días), cuántos tienen stock sobre la
// alerta. Si nada se vendió, mira todo el catálogo.
export function saludProductos(productos, ventas, config = {}, ahora = Date.now()) {
  if (!productos.length) return null;
  const alerta = config.alertaStockBajo ?? 3;
  const desde = ahora - 30 * 86_400_000;
  const vendidos = new Set(ventas.filter(v => new Date(v.fecha).getTime() >= desde).map(v => v.productoId));
  const base = productos.filter(p => vendidos.has(p.id));
  const lista = base.length ? base : productos;
  return lista.filter(p => p.stock > alerta).length / lista.length;
}

export function areasPortada({ productos = [], ventas = [], gastos = [], deudas = [], caja = 0, config = {}, ahora = Date.now() } = {}) {
  const salud = saludNegocio({ productos, ventas, deudas, caja, config, ahora });
  const datos = {
    finanzas:  { dato: `Caja ${clpCompact(caja)}`, salud: salud.puntaje == null ? null : salud.puntaje / 100 },
    marketing: { dato: 'Sin anuncios cargados', salud: null },
    productos: { dato: `${productos.length} producto${productos.length === 1 ? '' : 's'}`, salud: saludProductos(productos, ventas, config, ahora) },
    catalogo:  { dato: `${productos.filter(p => p.price > 0).length} en catálogo`, salud: null },
    legal:     { dato: 'Sin pendientes cargados', salud: null },
    obra:      { dato: 'Versión 2.0', salud: null },
  };
  return NODOS.map(n => ({ ...n, ...datos[n.id], medido: datos[n.id].salud != null }));
}

// La tarjeta "Ahora": un solo paso, sin culpa. Sale de la primera decisión
// pendiente del cerebro; si no hay, dice que no hay urgencias.
export function ahoraPaso(decisiones = [], decididas = {}) {
  const d = decisiones.find(x => !decididas[x.id]);
  if (!d) return { titulo: 'Todo en orden por ahora.', porque: 'No hay nada urgente. Registra la venta del día cuando ocurra.', destino: null, area: null };
  return { titulo: d.accion || d.senal, porque: d.evidencia?.[0] || d.senal, destino: d.destino, area: d.area, id: d.id };
}
