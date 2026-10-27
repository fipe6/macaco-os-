// Fotos de productos: se achican en el celular y se suben al bucket público
// `product-images` de Supabase; la URL queda en el producto y en `inventario`
// (columna imagen_url), que es lo que lee el catálogo web.
// En la demo la foto queda en el navegador (no toca Supabase).
import { supabase } from './supabaseAuth.js';
import { DEMO } from '../demo.js';

const BUCKET = 'product-images';

export const slug = (nombre) => nombre.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
  .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

// Achica la foto (lado mayor `max` px) y la deja en JPEG liviano.
export function prepararFoto(archivo, max = 1000, calidad = 0.82) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(archivo);
    const img = new Image();
    img.onload = () => {
      const k = Math.min(1, max / Math.max(img.width, img.height));
      const c = document.createElement('canvas');
      c.width = Math.round(img.width * k); c.height = Math.round(img.height * k);
      c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
      URL.revokeObjectURL(url);
      c.toBlob(b => (b ? resolve(b) : reject(new Error('No se pudo procesar la foto'))), 'image/jpeg', calidad);
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Ese archivo no es una imagen')); };
    img.src = url;
  });
}

const aDataUrl = (blob) => new Promise((resolve) => { const r = new FileReader(); r.onload = () => resolve(r.result); r.readAsDataURL(blob); });

// Sube la foto y devuelve su URL pública.
export async function subirFoto(producto, archivo) {
  if (DEMO) return aDataUrl(await prepararFoto(archivo, 600, 0.75));
  const blob = await prepararFoto(archivo);
  const ruta = `productos/${slug(producto.name) || producto.id}-${Date.now()}.jpg`;
  const { error } = await supabase.storage.from(BUCKET).upload(ruta, blob, { contentType: 'image/jpeg', upsert: true });
  if (error) throw new Error(error.message?.includes('row-level security')
    ? 'Falta activar la subida de fotos en Supabase (permiso del bucket).'
    : error.message);
  return supabase.storage.from(BUCKET).getPublicUrl(ruta).data.publicUrl;
}
