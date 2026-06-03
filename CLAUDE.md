# Macaco OS — Contexto para Claude Code

## Qué es esto
App de gestión interna para Macaco Suplementos (tienda de suplementos deportivos, Chile).
Dueño: Felipe. Stack: React 18 + Vite + vite-plugin-pwa (PWA instalable en celular).
Deploy: https://macaco-os.vercel.app | Repo: https://github.com/fipe6/macaco-os-

## Backend
- n8n en https://n8n.makakosuplementos.com
- Webhooks activos: /webhook/macaco/venta | /webhook/macaco/inventario | /webhook/macaco/finanzas | /webhook/macaco/reporte-wsp | /webhook/macaco/catalogo-sync
- **Persistencia:** localStorage (cache rápido) + Supabase (fuente de verdad durable)
- Supabase Project: jmvbdjahitdhbvrfblnh | tabla: `app_data` (key-value jsonb)
- Al iniciar: carga desde Supabase → sobreescribe localStorage. En cada write: actualiza ambos.

## Estructura del proyecto
```
src/
  screens/         — una pantalla por módulo (incluye GastoScreen)
  components/      — BottomNav, IOSDevice, Screen, ui (Card, Icon, etc.)
  services/        — webhook.js (n8n), supabase.js (cliente singleton)
  theme.js         — design tokens MACACO.* + clp() + clpCompact()
  App.jsx          — router + loading screen Supabase + badge DB SYNC
  store.jsx        — estado global, sync localStorage+Supabase, helpers KPI
```

## Estado actual del código
- Fases 1 y 2 completas — localStorage es fuente de verdad, KPIs reales, métricas avanzadas, módulo clientes.
- En curso: Fase 3 (integración storefront Next.js via Supabase).

## Datos reales del negocio
- Deudas con interés: Benjamín $500k + Valcárce $700k (10%/mes c/u)
- Meta mensual: $10.000.000
- Stock mínimo de alerta: 3 unidades
- Colchón mínimo caja: $300.000

---

## PLAN DE DESARROLLO — OBJETIVO COMPLETO

### FASE 1 — Base funcional ✅ COMPLETA
- [x] Persistencia en localStorage para inventario, ventas, deudas, config/metas
- [x] Historial de ventas real
- [x] Home y Reportes con KPIs reales
- [x] Inventario con edición de stock real

### FASE 2 — Métricas avanzadas ✅ COMPLETA
- [x] **AOV** — calculado desde ventas reales en Diario/Semanal/Mensual
- [x] **Sell-Through Rate** — unidades vendidas / unidades recibidas (requiere registrar compras)
- [x] **Rotación de inventario** — COGS del mes / valor inventario actual
- [x] **DSI** — 30 / rotación (días para agotar stock al ritmo actual)
- [x] **Módulo de Clientes** — tab "Clientes" en Reportes, LTV, ticket prom., top producto, margen
- [x] **Historial de movimientos de stock** — cada compra/baja/auspicio/venta queda en `macaco:movimientos`
- [x] **Margen de contribución** — COGS calculado desde ventas en Mensual

### FASE 3 — Integración con sitio web público (EN CURSO)
> Storefront en Next.js lee catálogo desde **Supabase**. Macaco OS publica manualmente.

- [ ] **Publicar catálogo** — botón en Macaco OS que empuja inventario localStorage → Supabase (tabla `productos`)
- [ ] **Webhook de pedidos entrantes** — /webhook/macaco/pedido-web (n8n) registra pedidos y descuenta stock en localStorage
- [ ] **Descuento de stock automático** al llegar un pedido del sitio
- [ ] **Trigger stock crítico** — al publicar, marcar producto como `visible: false` en Supabase si stock < umbral

**Arquitectura Supabase:**
- Catálogo vive en Supabase (tabla `productos`)
- Macaco OS escribe a Supabase (sync manual con botón "Publicar")
- Next.js storefront lee directo de Supabase con anon key
- Pedidos del storefront van vía webhook a n8n → n8n actualiza stock en Macaco OS

---

## Reglas de desarrollo (NO ignorar)

1. **No introducir dependencias nuevas** sin preguntarle a Felipe — el stack es React + Vite puro, sin librerías de UI externas.
2. **No romper el diseño visual** — todo usa inline styles con tokens de `theme.js`. No agregar CSS modules ni Tailwind.
3. **Secretos siempre en variables de entorno** — nunca hardcodear URLs o tokens en el código.
4. **localStorage como fuente de verdad** para datos operacionales. Supabase es el espejo público del catálogo.
5. **Los webhooks a n8n son fire-and-forget** — la queue offline ya existe en `webhook.js`, usarla.
6. **Supabase solo para el catálogo público** — no migrar toda la app a Supabase.
