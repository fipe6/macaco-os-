# Macaco OS — Contexto para Claude Code

## Qué es esto
App de gestión interna para Macaco Suplementos (tienda de suplementos deportivos, Chile).
Dueño: Felipe (la usa junto a su papá con UNA sola cuenta compartida).
Stack: React 18 + Vite (sin librerías UI externas).
Deploy: https://macaco-os.vercel.app | Repo: https://github.com/fipe6/macaco-os-
Rama `v2` = versión 2.0 en preparación (preview en Vercel); `main` = producción.

## Backend y persistencia
- **Supabase** (fuente de verdad): project `jmvbdjahitdhbvrfblnh`, tabla `app_data`
  (key-value jsonb, RLS activo: las requests llevan el JWT de la sesión).
- **Proxy Vercel**: `POST /api/db` → reenvía a Supabase server-side (evita restricciones de iOS Safari).
- **Guardado confiable** (`src/store/persist.js`): cada cambio se escribe primero en el
  celular (localStorage) y su clave queda PENDIENTE (`macaco:pendientes`). La bandeja envía
  todas las claves pendientes en UN upsert y solo las desmarca cuando Supabase confirma.
  Reintenta con espera creciente, al volver la señal, al volver a la app y al abrirla.
- **Dos celulares** (`src/store/fusion.js`): antes de enviar se lee Supabase y se fusiona en
  tres vías contra `macaco:base:<clave>` (lo último confirmado). Listas por `id`; caja y
  stock por diferencia. Así una venta hecha sin señal no pisa la del otro celular.
- **Flujo write**: acción → `ledger` calcula el parche → `commit()` → setState + `pushDB()`
  → bandeja → proxy → Supabase. **Flujo read**: al abrir, lo pendiente local se fusiona con
  Supabase; lo no pendiente se toma de Supabase (si no hay productos en Supabase, se sube lo local).
- Realtime de Supabase refleja lo que registra el otro celular.

## Estructura del proyecto
```
src/
  domain/
    ledger.js      — reglas de plata y stock PURAS: venta/pack, cancelar, ajuste de
                     stock, gastos, compras, deudas, pedidos (todo o nada, con tests)
    kairos.js      — Timonel (jugada maestra), vigías de pico/caída, salud 0–100
  store/
    persist.js     — bandeja de salida + carga  ·  fusion.js — fusión de tres vías
    selectors.js   — cálculos de lectura (KPIs, reportes, reposición, meses)
    semillas.js    — CLAVES de app_data y datos iniciales
  store.jsx        — provider: junta ledger + persist; exporta useApp() y los selectores
  corteza.js       — motor de la Corteza Prefrontal (incluye señales de Kairos)
  screens/         — Home, Venta, Gasto, Finanzas, Inventario (+PedidosTab),
                     Reportes, Corteza, Config, Login
  components/      — BottomNav, IOSDevice, Screen, Cabina, ui (Card, Icon, …)
  services/        — supabase.js (proxy + fetch directo de respaldo),
                     supabaseAuth.js (Auth + Realtime)
  theme.js         — design tokens MACACO.* + clp() + clpCompact()
  App.jsx          — router + LoadingDB + DBStatusBadge + version check
api/db.js          — proxy Vercel serverless → Supabase
public/version.json — fuerza recarga si la versión no coincide con APP_VERSION
```
Tests: `npm test` (node --test, todos los `src/**/*.test.js`).

## Estado actual (v2, 2026-10-27)
- **Guardado confiable**: venta o pack = ventas + stock + caja + movimientos en un envío.
  Cancelar venta deja movimiento `anulacion`. Indicador "Guardado / N por enviar".
- **n8n eliminado**: no recibía nada útil. El reporte de WhatsApp se arma en la app (wa.me).
- **Finanzas personales eliminadas** (Felipe las maneja aparte). No reintroducir.
- **Login de una entrada**: solo contraseña de la cuenta del negocio.
- **Corteza Prefrontal** (se entra desde Home): Radar + ROI + Skill Miner sobre datos reales.
  Cola priorizada; aprobar/descartar se guarda en `macaco:corteza`. No ejecuta nada.
- **Kairos** (ideas de la suite Kairos llevadas a la tienda): panel Cabina en Home (salud
  /100, telemetría 30 días, vigía, jugada maestra) y Timonel en Corteza. Regla: FUENTE O
  SILENCIO — sin historial suficiente no hay cifra.
- selfDestroying SW activo; version check con /version.json.

## Datos del negocio (viven en `macaco:config`, se editan en Sistema)
- Meta mensual $2.100.000 · meta diaria $70.000 · colchón de caja $200.000 · alerta de stock 3 u
- Deudas: una deuda inicial sin interés (~$1,9M)
- Gastos fijos del negocio: Internet WOM, Meta Verified, ChatGPT, Claude, Spotify, auspicios, sueldo

## Reglas de desarrollo (NO ignorar)
1. **No introducir dependencias nuevas** sin preguntarle a Felipe.
2. **No romper diseño visual** — inline styles con tokens de `theme.js`.
3. **Credenciales Supabase hardcodeadas** en `supabase.js`, `supabaseAuth.js` y `api/db.js`
   (anon key es pública por diseño; ver nota del BOM en `supabaseAuth.js`).
4. **Toda escritura de datos pasa por `pushDB()`** (vía `commit()` en `store.jsx`).
   Reglas de plata nuevas van en `domain/ledger.js` con su test.
5. **Publicar Catálogo** escribe a la tabla `inventario` (`publicarCatalogo` en `supabase.js`).
6. **Al cambiar version.json, actualizar también APP_VERSION** en `App.jsx` con el mismo valor.
7. **Nunca borrar ni sobrescribir datos en Supabase** sin mostrarle antes a Felipe qué se toca.
