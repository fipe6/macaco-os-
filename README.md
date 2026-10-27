# Macaco OS

App de gestión para **Macaco Suplementos**: ventas, inventario, pedidos a
proveedores, gastos, caja, deudas y reportes. PWA instalable en el celular.
Los datos viven en Supabase y se guardan primero en el celular, así que una
venta registrada sin señal no se pierde.

## Stack

- React 18 + Vite 5, sin librerías UI (inline styles con los tokens de `src/theme.js`)
- vite-plugin-pwa (manifest + service worker auto-destructivo para no servir código viejo)
- Supabase (`app_data`, key-value jsonb) vía el proxy serverless `api/db.js` de Vercel

## Arrancar

```bash
npm install
npm start      # http://localhost:3000 (y la IP local para probar desde el celular)
npm test       # reglas de plata, guardado, Corteza y Kairos
npm run build
```

No hace falta `.env`: las credenciales públicas de Supabase van en el código a
propósito (ver la nota en `src/services/supabaseAuth.js`).

## Cómo se guarda un cambio

1. La acción (venta, gasto, ajuste…) calcula el cambio con las reglas puras de
   `src/domain/ledger.js`: una venta o pack cambia ventas, stock, caja y
   movimientos juntos, o no cambia nada.
2. `pushDB()` lo escribe en el celular y lo marca pendiente.
3. La bandeja (`src/store/persist.js`) lo envía a Supabase en un solo upsert y
   lo desmarca cuando Supabase confirma. Si no hay señal, reintenta sola.
4. Si el otro celular cambió algo mientras tanto, se fusiona
   (`src/store/fusion.js`) en vez de pisarlo.

## Instalar como PWA en el celular

Abre https://macaco-os.vercel.app en Safari/Chrome → **Añadir a pantalla de inicio**.

Más contexto para desarrollar: ver `CLAUDE.md`.
