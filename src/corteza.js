// Corteza Prefrontal — entrada única al cerebro de Macaco OS.
//
// El cerebro (src/cerebro/) une Radar (detecta señales), ROI (estima impacto)
// y Skill Miner (propone el artefacto que vuelve la acción un sistema). Cada
// área (finanzas, stock, catálogo, ventas) aporta sus detectores y el cerebro
// los ordena en una sola cola. Nunca inventa datos ni ejecuta nada.
import { AREAS, escanear } from './cerebro/index.js';

export { calcPrioridad, AREAS, deArea } from './cerebro/index.js';

export const escanearCorteza = (datos = {}) => escanear(AREAS, datos);
