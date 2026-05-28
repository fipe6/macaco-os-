# Macaco OS

App de gestión para **Macaco Suplementos** — ventas, inventario, finanzas, deudas.
PWA instalable en celular, conectada a **n8n** (en tu VPS Hostinger) para automatizar
flujos hacia Google Sheets, Claude, WhatsApp, etc.

## Stack

- React 18 + Vite 5
- vite-plugin-pwa (service worker, manifest, instalable en móvil)
- Sin backend propio — los eventos se publican vía webhook a n8n

## Arrancar

```bash
npm install
npm start
```

Abre http://localhost:3000. En modo `vite --host` también queda disponible en la
IP local de tu red, así puedes abrirlo desde el celular para probar la PWA.

## Conectar con n8n

1. Copia `.env.example` a `.env.local`:
   ```bash
   cp .env.example .env.local
   ```
2. Pon tu URL base de n8n y, opcionalmente, un token:
   ```
   VITE_N8N_BASE_URL=https://n8n.tu-dominio.com
   VITE_N8N_TOKEN=mi-token-secreto
   ```
3. En n8n crea workflows con nodo **Webhook** (método POST) en estos paths:
   - `/webhook/macaco/venta` → guarda ventas en Sheets
   - `/webhook/macaco/inventario` → maneja productos y stock
   - `/webhook/macaco/finanzas` → updates de deudas
   - `/webhook/macaco/reporte-wsp` → envía reporte a WhatsApp
4. Activa los workflows.
5. Reinicia `npm start` para que Vite cargue las nuevas env vars.

Si la app no puede llegar a n8n (sin internet, URL no configurada, etc.), los
eventos quedan en una cola en `localStorage` y se reintentan automáticamente al
volver online o desde **Configuración → Reintentar cola de eventos**.

### Payload de ejemplo (venta)

```json
{
  "event": "venta.creada",
  "venta": {
    "productoId": "pg",
    "producto": "Proteína Grizzly",
    "cantidad": 2,
    "precioUnitario": 36000,
    "costoUnitario": 20000,
    "total": 72000,
    "margen": 32000,
    "cliente": null,
    "metodoPago": "Transferencia",
    "fecha": "2026-05-25T18:30:00.000Z"
  },
  "_meta": { "app": "macaco-os", "version": "1.0.0", "sentAt": "..." }
}
```

## Instalar como PWA en el celular

1. `npm run build && npm run preview` (o despliega `dist/` en tu hosting).
2. En el celular abre la URL en Chrome/Safari.
3. Menú → **Añadir a pantalla de inicio**.
4. Ya queda como app independiente con su icono.

Para desarrollo desde el celular, usa `npm start` en el PC y abre
`http://IP-LOCAL:3000` desde el navegador del celular (mismo Wi-Fi).

## Estructura

```
src/
  main.jsx              Bootstrap React
  App.jsx               Router + bottom nav + FAB
  theme.js              Colores y formatters (CLP)
  components/
    ui.jsx              Card, Progress, Trend, Dot, Icon
    Screen.jsx          Wrapper de pantalla + header
    BottomNav.jsx       Navegación inferior
    IOSDevice.jsx       Frame iOS (en mobile se expande a viewport)
  screens/
    HomeScreen.jsx      Dashboard + día a día
    VentaScreen.jsx     Registrar venta → n8n
    FinanzasScreen.jsx  Caja, deudas, cuentas por cobrar
    InventarioScreen.jsx Stock + agregar producto → n8n
    ReportesScreen.jsx  Diario / Semanal / Mensual → WhatsApp
    ConfigScreen.jsx    Estado de conexiones, reintento de cola
  services/
    webhook.js          Cliente n8n con cola offline
public/
  favicon.svg
  icon-192.png / icon-512.png   Iconos PWA
```

## Próximos pasos sugeridos

- Reemplazar los datos mock (`OCT_PAST`, `INVENTORY`, `debts`) por reads vía n8n.
- Añadir login si la app va a estar en un dominio público.
- Conectar el botón "Cuentas por cobrar" con un workflow real.
