# Plan: el catálogo vive dentro de Macaco OS

Pedido de Felipe (27-10-2026): dejar de depender de ChatGPT/Sites y alojar el catálogo
público desde acá, conectado directo a Macaco OS. Macaco OS manda; el catálogo muestra.

## Lo que ya existe
- Supabase `jmvbdjahitdhbvrfblnh` (el de Macaco OS). Migración aplicada el 27-10:
  vista pública `catalogo_publico` (solo la clave `macaco:catalogo` de app_data),
  `inventario.imagen_url`, permisos de subida al bucket `product-images`.
  Probado: con la anon key se lee la vista y `app_data` queda bloqueada.
- Macaco OS v2 escribe `macaco:catalogo` = `{ <id catálogo>: { agotado, imagen } }` en cada
  cambio de productos (`src/domain/catalogoWeb.js`, enlaces nombre → id en `ENLACES`).
- Rama `claude/catalogo-desde-macaco-os` en `makakosuplementos-ship-it/makako-control`:
  el `app.js` del catálogo lee esa vista (probado en navegador).
- Código del catálogo: `makako-control/apps/control-web` (copia Vercel, con `assets/`),
  `apps/backend-sites` (Sites). El publicado (makako-fit-catalogo.vercel.app, equipo
  Vercel `makakoteam`) es más nuevo que GitHub: tomar `app.js`, `catalogo.json`,
  `packs.json`, `index.html` y CSS desde el sitio publicado.

## OJO: hay otro "MAKAKO OS"
ChatGPT armó otro panel llamado MAKAKO OS en Sites (`…chatgpt.site/os/`) con OTRO Supabase
(`axzwxcykfozsscudpfyh`) y datos viejos en D1. No es esta app ni esta base. No mezclar
stock ni ventas de ahí sin que Felipe lo confirme.

## Pasos (sesión nueva con `makakosuplementos-ship-it/macaco-os-` y `makako-control`)
1. Copiar el catálogo estático a `public/catalogo/` de Macaco OS (html, css, js, assets,
   catalogo.json, packs.json) → queda en `macaco-os.vercel.app/catalogo/`.
   Revisar que `vercel.json`/SPA no reescriba `/catalogo/*` hacia la app.
2. Sacar dependencias de Sites: `/api/prices` y fotos que apuntan a `chatgpt.site`.
   Precio y agotado salen de `macaco:catalogo` (agregar `precio` al resumen público;
   precio de venta no es dato privado). Si la vista falla → lo de `catalogo.json`.
3. En Productos (Macaco OS): elegir a qué ficha del catálogo corresponde cada producto
   (`catalogoId`), y mostrar "Se ve en el catálogo: Disponible / Agotado".
4. Packs y ofertas del día: mantener `packs.json` por ahora; después moverlos a Macaco OS.
5. Probar: agotado, foto nueva, precio, carrito y pedido por WhatsApp, y que sin login
   no se vea nada privado. Recién ahí cambiar enlaces (Instagram, bio) al nuevo catálogo.
6. No apagar makako-fit-catalogo.vercel.app hasta que Felipe confirme el nuevo.

## Falta de Felipe
- ¿Dirección final? `macaco-os.vercel.app/catalogo` o un proyecto Vercel aparte.
- Subir el zip completo (`Makako-catalogo-codigo-y-guia.zip`) si se quiere la fuente de
  Sites v38; para el catálogo estático basta el sitio publicado + makako-control.
