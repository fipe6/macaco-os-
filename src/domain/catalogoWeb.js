// Enlace con el catálogo web (makako-fit-catalogo.vercel.app).
// El catálogo tiene sus propios ids (catalogo.json); acá se dice qué producto
// de Macaco OS es cuál. Un producto sin enlace no cambia nada en el catálogo
// (fuente o silencio): el catálogo sigue mostrando lo que ya tenía.
import { slug } from './texto.js';

// nombre en Macaco OS (como slug) → id en catalogo.json
export const ENLACES = {
  'muscle-whey-isolate': 'musclewhey',
  'creatina-gumyy': 'gummy',
  'pshichotic-red': 'psychotic',
  'creatina-inner': 'creatina-inner',
  'glicinato-de-magnesio': 'magnesio',
  'arginina': 'arginina',
  'cafeina-ostrovit': 'cafeina',
  'omega-3-grizzly-bear': 'omega3',   // el del catálogo es Grizzly Bear; el otro Omega 3 no está en el catálogo
  'proteina-mutant': 'mutant',
  'proteina-grizzly': 'grizzly-whey',
  'venom-inferno': 'venom',
  'preentreno-nitraflex': 'nitraflex',
  'pre-beast': 'beast',
};

// El id del catálogo para un producto: el que se le puso a mano, o el del enlace.
export const idCatalogo = (p) => p.catalogoId || ENLACES[slug(p.name || '')] || null;

// Lo que el catálogo necesita saber, por id del catálogo: agotado sí/no, la
// foto y el precio de venta (es público). Nada de costos ni de unidades.
// Se guarda en app_data `macaco:catalogo`.
export function catalogoPublico(productos) {
  const salida = {};
  (productos || []).forEach(p => {
    const id = idCatalogo(p);
    if (id) salida[id] = { agotado: (Number(p.stock) || 0) <= 0, imagen: fotoPublica(p.imagen), precio: precioPublico(p.price) };
  });
  return salida;
}

// Solo URLs públicas: la foto en data: (demo) no sirve fuera del celular.
export const fotoPublica = (imagen) => (imagen && /^https:\/\//.test(imagen) ? imagen : null);

// Precio en pesos enteros y mayor a cero; si no, el catálogo deja el suyo.
export const precioPublico = (precio) => {
  const n = Number(precio);
  return Number.isInteger(n) && n > 0 ? n : null;
};
