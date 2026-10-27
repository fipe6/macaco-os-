// "Glicinato de Magnésio" → "glicinato-de-magnesio"
export const slug = (nombre) => nombre.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
  .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
