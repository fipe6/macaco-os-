# Macaco OS — Contexto para Claude Code

## Qué es esto
App de gestión interna para Macaco Suplementos (tienda de suplementos deportivos, Chile).
Dueño: Felipe. Stack: React 18 + Vite (sin librerías UI externas).
Deploy: https://macaco-os.vercel.app | Repo: https://github.com/fipe6/macaco-os-

## Backend y persistencia
- **Supabase** (fuente de verdad): Project `jmvbdjahitdhbvrfblnh`, tabla `app_data` (key-value jsonb, RLS OFF)
- **Proxy Vercel**: `POST /api/db` → reenvía requests a Supabase server-side (evita restricciones iOS Safari)
- **localStorage**: cache rápido local, backup si Supabase falla
- **Flujo write**: acción usuario → setState → pushDB() → proxy /api/db → Supabase
- **Flujo read**: app abre → cargando spinner → proxy /api/db → si tiene productos reales carga de Supabase, si no sube localStorage a Supabase

## Estructura del proyecto
```
src/
  screens/         — HomeScreen, VentaScreen, GastoScreen, FinanzasScreen,
                     PersonalScreen, InventarioScreen, ReportesScreen, ConfigScreen
  components/      — BottomNav, IOSDevice, Screen, ui (Card, Icon, etc.)
  services/        — webhook.js (n8n, fire-and-forget)
                     supabase.js (proxy + fetch directo como fallback)
  corteza.js       — motor de la Corteza Prefrontal (funciones puras, tests con `npm test`)
  theme.js         — design tokens MACACO.* + clp() + clpCompact()
  App.jsx          — router + LoadingDB spinner + DBStatusBadge + version check
  store.jsx        — estado global, pushDB() en cada acción, selectAll/upsertRows
api/
  db.js            — proxy Vercel serverless → Supabase (sin CORS issues en iOS)
public/
  version.json     — {"v":"1780517844"} — fuerza recarga si versión no coincide
```

## Estado actual (2026-09-22)
- Fases 1 y 2 completas: KPIs reales, métricas avanzadas, módulo clientes
- **Módulo Gastos completo**: GastoScreen, sección en Finanzas, ganancia neta en Reportes
- **Módulo Finanzas Personales completo** (`PersonalScreen`, se entra desde Finanzas):
  balance general con patrimonio neto, cuentas por cobrar, pasivos con tramos de
  interés, metas de ahorro y proyección mes a mes
- **Corteza Prefrontal** (`CortezaScreen`, se entra desde Home): Radar + ROI + Skill Miner
  sobre datos reales (deudas, stock, caja, meta, cobros, clientes, gastos). Cola de
  decisiones priorizada; aprobar/descartar se guarda en `macaco:corteza` vía pushDB.
  No ejecuta acciones ni muestra datos de ejemplo — sin historial no hay señal.
- **Persistencia Supabase vía proxy** implementada y verificada
- selfDestroying SW activo: mata cache viejo en celular al actualizar
- Version check: /version.json detecta actualizaciones aunque SW esté cacheado

## Finanzas personales (plan sep 2026)
- Activos: Banco $453.000 · Reserva Valcarce $1.000.000 (intocable) · Capital creatina $500.000
- Por cobrar: Sarek $300k, Nass $111k, Fabián $44k, Mamá $8k, Valcarce $25k
- Pasivo Valcarce: capital $2.000.000 + tramos oct 10% / nov 5% / dic 5% = $2.400.000, vence 31-01-2027
- Pasivo Mamá: $2.075.000, abono $100.000/mes ($48.000 beca del Estado + $52.000 propio)

### Reglas de cálculo (no cambiar sin recalcular)
- **Tramos de interés**: tasa fija por mes sobre el CAPITAL, no compuesta.
  `saldoPasivo` = capital + interés de todos los tramos − pagos (compromiso a vencimiento).
  `saldoPasivoHoy` = capital + solo el interés ya corrido − pagos.
- **Aporte externo** (beca): baja el pasivo pero NO cuenta como gasto personal propio.
- **Fondos reservados** (`reservado: true`): no se mezclan con caja operativa.
- **Proyección**: parte de `netoHoy`/`pasivosHoy` y devenga el interés mes a mes —
  partir del compromiso total lo contaría dos veces. Pagar deuda con plata propia es
  neutro al patrimonio; lo mueven el flujo del mes, el aporte externo y el interés.
- El inventario del balance se calcula en vivo desde `productos` (stock × costo).

## Datos reales del negocio
- Deudas con interés: Benjamín $500k + Valcárce $700k (10%/mes c/u)
- Meta mensual: $10.000.000 | Meta diaria: $700.000
- Stock mínimo alerta: 3 unidades | Colchón mínimo caja: $300.000
- Gastos negocio fijos: ~$273.000/mes (Internet WOM, Meta, ChatGPT, Claude, Spotify, etc.)

## Reglas de desarrollo (NO ignorar)

1. **No introducir dependencias nuevas** sin preguntarle a Felipe.
2. **No romper diseño visual** — inline styles con tokens de `theme.js`.
3. **Credenciales Supabase hardcodeadas** en `supabase.js` y `api/db.js` como fallback (anon key es pública por diseño).
4. **Toda escritura de datos pasa por pushDB()** que llama upsertRows() → proxy → Supabase.
5. **Los webhooks a n8n son fire-and-forget** — la queue offline existe en `webhook.js`.
6. **Publicar Catálogo** escribe a tabla `inventario` en Supabase via proxy (no pasa por n8n).
7. **Al cambiar version.json, actualizar también APP_VERSION** en `App.jsx` con el mismo valor.
