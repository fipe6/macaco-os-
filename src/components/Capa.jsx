// Las hojas (fichas, formularios) se dibujan sobre la pantalla visible y no
// dentro de la lista que se desplaza: si no, al tocar algo abajo en la lista
// la hoja se abría arriba, fuera de la vista.
import { createPortal } from 'react-dom';

export const CAPA_ID = 'capa-hojas';

export function Capa({ children }) {
  const destino = typeof document !== 'undefined' && document.getElementById(CAPA_ID);
  return destino ? createPortal(children, destino) : children;
}
