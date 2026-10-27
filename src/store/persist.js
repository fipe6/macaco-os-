// Guardado confiable: copia local + bandeja de salida hacia Supabase.
//
// Cada cambio se escribe primero en el celular (localStorage) y su clave queda
// marcada como PENDIENTE. La bandeja envía todas las claves pendientes en UN
// solo upsert (una sola sentencia en Postgres: entra todo o nada) y solo las
// desmarca cuando Supabase confirma. Si falla — sin señal, Supabase caído, iOS
// cerró la pestaña — la marca sigue guardada en el celular y se reintenta sola:
// con espera creciente, al volver la conexión, al volver a la app y al abrirla.
//
// Dos celulares con la misma cuenta: antes de enviar se lee lo que hay en
// Supabase y se fusiona (ver fusion.js) contra la "base", que es lo último que
// este celular vio confirmado. Así nadie pisa lo que registró el otro.

import { fusionarValor } from './fusion.js';

const PENDIENTES = 'macaco:pendientes';
const BASE = 'macaco:base:';
const ESPERA_MIN = 2_000;
const ESPERA_MAX = 60_000;

const igual = (a, b) => JSON.stringify(a) === JSON.stringify(b);

const memoria = () => {
  const m = new Map();
  return { getItem: k => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)) };
};

export function crearPersistencia({
  storage = globalThis.localStorage || memoria(),
  upsert,                        // async (filas) => true | throw
  leerRemoto = null,             // async (claves) => { clave: valor } — para fusionar antes de enviar
  ahora = () => new Date().toISOString(),
  programar = (fn, ms) => setTimeout(fn, ms),
  cancelar = (t) => clearTimeout(t),
  alCambiar = () => {},          // ({ pendientes, enviando, error, ultimoOk }) => void
  alFusionar = () => {},         // ({ clave: valorFusionado }) => void — la app refleja lo del otro celular
} = {}) {
  const leer = (k, fb) => {
    try { const v = storage.getItem(k); return v !== null ? JSON.parse(v) : fb; } catch { return fb; }
  };
  const escribir = (k, v) => {
    try { storage.setItem(k, JSON.stringify(v)); return true; } catch { return false; }
  };

  // { clave: secuencia } — la secuencia sube con cada cambio de esa clave, así
  // un cambio hecho mientras viajaba el envío anterior no se desmarca por error.
  let pendientes = leer(PENDIENTES, {});
  // Copia en memoria: si localStorage falla (modo privado, sin espacio) el
  // envío igual sale con el valor correcto mientras la app siga abierta.
  const valores = {};
  const bases = {};
  let seq = Math.max(0, ...Object.values(pendientes));
  let enviando = null;
  let timer = null;
  let espera = ESPERA_MIN;
  let estado = { pendientes: Object.keys(pendientes).length, enviando: false, error: null, ultimoOk: null };

  const avisar = (cambios) => { estado = { ...estado, ...cambios, pendientes: Object.keys(pendientes).length }; alCambiar(estado); };

  const leerLocal = (clave, fb) => (clave in valores ? valores[clave] : leer(clave, fb));
  const escribirLocal = (clave, v) => { valores[clave] = v; escribir(clave, v); };
  const leerBase = (clave) => (clave in bases ? bases[clave] : leer(BASE + clave, undefined));
  const fijarBase = (clave, v) => { bases[clave] = v; escribir(BASE + clave, v); };

  function programarEnvio(ms) {
    if (timer) cancelar(timer);
    timer = programar(() => { timer = null; enviar(); }, ms);
  }

  // Guarda local y encola. Varias claves en el mismo tick viajan juntas.
  function guardar(cambios) {
    const claves = Object.keys(cambios);
    if (!claves.length) return;
    claves.forEach(k => { escribirLocal(k, cambios[k]); pendientes[k] = ++seq; });
    escribir(PENDIENTES, pendientes);
    avisar({});
    programarEnvio(0);
  }

  // Fusiona lo local pendiente con lo remoto. Tras fusionar, la base pasa a ser
  // el remoto (lo local ya lo incluye), para no contar dos veces la diferencia.
  function fusionarCon(remoto) {
    const fusionados = {};
    Object.keys(pendientes).forEach(k => {
      if (!(k in remoto) || remoto[k] === null || remoto[k] === undefined) return;
      const local = leerLocal(k, null);
      const base = leerBase(k);
      const r = fusionarValor(k, base, local, remoto[k]);
      fijarBase(k, remoto[k]);
      if (!igual(r, local)) { escribirLocal(k, r); fusionados[k] = r; }
    });
    if (Object.keys(fusionados).length) alFusionar(fusionados);
    return fusionados;
  }

  async function enviar() {
    if (enviando) return enviando;
    if (!Object.keys(pendientes).length) return true;
    avisar({ enviando: true });
    enviando = (async () => {
      try {
        if (leerRemoto) fusionarCon(await leerRemoto(Object.keys(pendientes)));
        const enviadas = { ...pendientes };
        const t = ahora();
        const filas = Object.keys(enviadas)
          .map(clave => ({ clave, valor: leerLocal(clave, null), actualizado_en: t }))
          .filter(f => f.valor !== null && f.valor !== undefined);
        await upsert(filas);
        filas.forEach(f => {
          if (pendientes[f.clave] !== enviadas[f.clave]) return; // cambió mientras viajaba: sigue pendiente
          delete pendientes[f.clave];
          fijarBase(f.clave, f.valor);
        });
        Object.keys(enviadas).forEach(k => { if (pendientes[k] === enviadas[k]) delete pendientes[k]; });
        escribir(PENDIENTES, pendientes);
        espera = ESPERA_MIN;
        avisar({ enviando: false, error: null, ultimoOk: t });
        if (Object.keys(pendientes).length) programarEnvio(0);
        return true;
      } catch (err) {
        avisar({ enviando: false, error: err?.message || String(err) });
        programarEnvio(espera);
        espera = Math.min(ESPERA_MAX, espera * 2);
        return false;
      } finally {
        enviando = null;
      }
    })();
    return enviando;
  }

  // Reintento inmediato (volvió la señal, volvió la app al frente, botón).
  function reintentar() {
    espera = ESPERA_MIN;
    if (timer) { cancelar(timer); timer = null; }
    return enviar();
  }

  // Un valor que llegó de Supabase (carga inicial o tiempo real). Si la clave
  // está pendiente se ignora: se fusiona al enviar. Devuelve true si se aplicó.
  function recibirRemoto(clave, valor) {
    if (clave in pendientes) return false;
    escribirLocal(clave, valor);
    fijarBase(clave, valor);
    return true;
  }

  const esPendiente = (clave) => clave in pendientes;

  return { guardar, enviar, reintentar, recibirRemoto, fusionarCon, esPendiente, leerLocal, estado: () => estado };
}

// Decide qué valor usar para cada clave al abrir la app y deja la base al día.
// - pendiente en el celular → se fusiona con lo de Supabase (no se pierde nada)
// - si no, lo de Supabase; si Supabase no la tiene, lo local o la semilla
export function resolverCarga(claves, remoto, persist, fallback = {}) {
  persist.fusionarCon(remoto);
  const out = {};
  claves.forEach(k => {
    const r = remoto[k];
    if (persist.esPendiente(k)) out[k] = persist.leerLocal(k, fallback[k]);
    else if (r !== undefined && r !== null) { persist.recibirRemoto(k, r); out[k] = r; }
    else out[k] = persist.leerLocal(k, fallback[k]);
  });
  return out;
}
