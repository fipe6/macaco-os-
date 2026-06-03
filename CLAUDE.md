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
                     InventarioScreen, ReportesScreen, ConfigScreen
  components/      — BottomNav, IOSDevice, Screen, ui (Card, Icon, etc.)
  services/        — webhook.js (n8n, fire-and-forget)
                     supabase.js (proxy + fetch directo como fallback)
  theme.js         — design tokens MACACO.* + clp() + clpCompact()
  App.jsx          — router + LoadingDB spinner + DBStatusBadge + version check
  store.jsx        — estado global, pushDB() en cada acción, selectAll/upsertRows
api/
  db.js            — proxy Vercel serverless → Supabase (sin CORS issues en iOS)
public/
  version.json     — {"v":"1780517844"} — fuerza recarga si versión no coincide
```

## Estado actual (2026-06-03)
- Fases 1 y 2 completas: KPIs reales, métricas avanzadas, módulo clientes
- **Módulo Gastos completo**: GastoScreen, sección en Finanzas, ganancia neta en Reportes
- **Persistencia Supabase vía proxy** implementada y verificada
- selfDestroying SW activo: mata cache viejo en celular al actualizar
- Version check: /version.json detecta actualizaciones aunque SW esté cacheado

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
