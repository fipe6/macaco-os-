// Lee una sola vez /catalogo/catalogo.json (el catálogo web vive en esta misma
// app) para mostrar sus fotos y datos en Stock. Si falla, todo sigue igual.
import { useEffect, useState } from 'react';
import { fichasCatalogo } from '../domain/catalogoWeb.js';

let pedido = null;
const cargar = () => (pedido ||= fetch('/catalogo/catalogo.json')
  .then(r => (r.ok ? r.json() : null))
  .then(fichasCatalogo)
  .catch(() => { pedido = null; return {}; }));

export function useFichasCatalogo() {
  const [fichas, setFichas] = useState({});
  useEffect(() => {
    let vivo = true;
    cargar().then(f => { if (vivo) setFichas(f || {}); });
    return () => { vivo = false; };
  }, []);
  return fichas;
}
