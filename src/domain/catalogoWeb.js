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
  'omega-3': 'omega3',
  'proteina-mutant': 'mutant',
  'proteina-grizzly': 'grizzly-whey',
  'venom-inferno': 'venom',
  'preentreno-nitraflex': 'nitraflex',
  'pre-beast': 'beast',
};

// El id del catálogo para un producto: el que se le puso a mano, o el del enlace.
export const idCatalogo = (p) => p.catalogoId || ENLACES[slug(p.name || '')] || null;

// Lo que el catálogo necesita saber, por id del catálogo: agotado sí/no y la
// foto. Nada de costos ni de unidades. Se guarda en app_data `macaco:catalogo`.
export function catalogoPublico(productos) {
  const salida = {};
  (productos || []).forEach(p => {
    const id = idCatalogo(p);
    if (id) salida[id] = { agotado: (Number(p.stock) || 0) <= 0, imagen: fotoPublica(p.imagen) };
  });
  return salida;
}

// Solo URLs públicas: la foto en data: (demo) no sirve fuera del celular.
export const fotoPublica = (imagen) => (imagen && /^https:\/\//.test(imagen) ? imagen : null);
