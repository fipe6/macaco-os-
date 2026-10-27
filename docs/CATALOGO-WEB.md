# Catálogo web ↔ Macaco OS

Catálogo: https://makako-fit-catalogo.vercel.app (sitio estático: `catalogo.json`,
`packs.json`, `app.js`, `/api/prices`, `control.html`). Ya sabe mostrar AGOTADO cuando un
producto trae `stock: 0`, pero hoy ese dato está escrito a mano en `catalogo.json`.

## Cómo queda conectado
1. Cada cambio de productos en Macaco OS (venta, ajuste, foto) escribe además
   `app_data` → `macaco:catalogo` (vía `commit()` → `pushDB()`), con
   `{ "<id del catálogo>": { "agotado": true|false, "imagen": "https://…"|null } }`.
   Sin costos ni unidades. Lógica en `src/domain/catalogoWeb.js` (con test).
2. La vista pública `catalogo_publico` deja leer **solo esa clave** sin login
   (`supabase/migraciones/2026-10-27-fotos-y-catalogo.sql`, falta aplicarla).
3. El catálogo lee la vista al cargar y encima de `catalogo.json` pone
   agotado + foto. Si la vista falla, el catálogo sigue igual que hoy.

## Enlaces (nombre en Macaco OS → id del catálogo)
Están en `ENLACES` de `src/domain/catalogoWeb.js`. Sin enlace, el catálogo no cambia.

| Macaco OS | Catálogo |
|---|---|
| Muscle Whey Isolate | musclewhey |
| Creatina gumyy | gummy |
| Pshichotic red | psychotic |
| Creatina inner | creatina-inner |
| Glicinato de Magnesio | magnesio |
| Arginina | arginina |
| Cafeína ostrovit | cafeina |
| Omega 3 grizzly bear | omega3 (el del catálogo es Grizzly Bear) |
| Proteína Mutant | mutant |
| Proteína grizzly | grizzly-whey |
| Venom inferno | venom |
| Preentreno nitraflex | nitraflex |
| Pre beast | beast |

Sin pareja (quedan como están): en el catálogo `pump`, `thavage`, `essential`,
`creatina-ultimate`, `lipo6-intense`, `lipo6-black`; en Macaco OS Creatina RAW 500gr,
Crema de arroz, Dragón pharma, Glutamina, Omega 3 (la otra marca), Pre CBUM, Pre Hyde.

## Cambio en `app.js` del catálogo
Justo después de `config = data;products = data.products;` (dentro del `Promise.all`):

```js
  // Macaco OS: agotado y fotos en vivo. Si falla, queda lo de catalogo.json.
  try {
    const r = await fetch('https://jmvbdjahitdhbvrfblnh.supabase.co/rest/v1/catalogo_publico?select=productos',
      {headers:{apikey:SUPA_ANON,authorization:'Bearer '+SUPA_ANON},cache:'no-store'});
    const [fila] = r.ok ? await r.json() : [];
    const vivo = fila?.productos || {};
    products.forEach(product => {
      const v = vivo[product.id];
      if (!v) return;
      product.stock = v.agotado ? 0 : null;
      (product.variants || []).forEach(variant => { if (v.agotado) variant.stock = 0; else delete variant.stock; });
      if (v.imagen) product.image = v.imagen;
    });
  } catch {}
```

y el callback del `.then(` pasa a ser `async ([data,packData]) =>` (ya lo es).
`SUPA_ANON` = la misma anon key pública de `src/services/supabase.js`.
