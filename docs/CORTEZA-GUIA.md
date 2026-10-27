# Corteza Prefrontal — guía para llevarla a otra app

Esta guía explica cómo funciona el "cerebro" de Macaco OS y cómo montarlo en otra
aplicación (por ejemplo, una app de finanzas) con la forma **cerebro central + áreas**.

Archivos de origen en este repo:

| Archivo | Qué es |
|---|---|
| `src/corteza.js` | El motor. Funciones puras, sin React. **Esto es lo que se copia.** |
| `src/corteza.test.js` | Tests del motor (`npm test`). |
| `src/screens/CortezaScreen.jsx` | La interfaz (cola de decisiones). |
| `src/store.jsx` → `decidirCorteza` | Guarda aprobar / descartar. |
| `src/screens/HomeScreen.jsx` | Tarjeta resumen en el Home (cuántas decisiones pendientes). |

---

## 1. Qué hace, en una frase

Lee los datos reales de la app, detecta **señales** (algo que merece atención), le pone
**número** (impacto, ahorro, ROI), propone **una acción concreta** y la deja en una
**cola priorizada**. Tú apruebas o descartas. **Nunca ejecuta nada solo.**

Reglas que no se rompen:
1. Sin datos no hay señal. No inventa ni muestra ejemplos.
2. No mueve plata ni stock. Solo recomienda.
3. Toda decisión requiere aprobación humana.
4. El motor son funciones puras: mismos datos → mismo resultado, y se testea con `node --test`.

Se compone de tres piezas en una sola pasada:

- **Radar**: detecta señales (stock, deudas, caja, ventas, clientes, gastos).
- **ROI**: estima impacto mensual, ahorro y retorno cuando hay datos suficientes.
- **Skill Miner**: dice qué *artefacto* convertiría la acción en un sistema (una orden de compra, un recordatorio, una regla de caja…).

---

## 2. Cómo funciona por dentro

### Entrada y salida

```js
const resultado = escanearCorteza({
  productos, ventas, gastos, deudas, caja, config,
  porCobrar,     // cada item con `saldo` ya calculado
  vencimientos,  // salida de alertasVencimiento() del store
  ahora,         // opcional, para tests
});

// resultado = {
//   fecha: ISO,
//   fuentes: { ventas, productos, gastos, deudas, porCobrar, vencimientos, diasHistorial },
//   decisiones: [ ...ordenadas por prioridad e impacto ]
// }
```

### Forma de una decisión (el contrato central)

Todo detector devuelve objetos con esta forma (los crea la función `decision()`):

```js
{
  id: 'quiebre:42',          // ESTABLE: se usa para recordar aprobar/descartar
  tipo: 'Stock',             // Deuda | Stock | Margen | Caja | Ventas | Clientes | Gastos | Cobranza | Pasivo | Sistema
  senal: 'Creatina: sin stock y se estaba vendiendo',
  evidencia: ['12 u vendidas en 30 días (0.40 u/día)', 'Margen unitario $8.000'],
  impactoMensual: 96000,     // CLP/mes o null
  ahorroMensual: null,       // CLP/mes o null
  roi: '45% sobre la reposición',  // texto o null
  riesgo: 'alto' | 'medio' | 'bajo',
  prioridad: 'alta' | 'media' | 'baja',
  accion: 'Reponer 9 u ($180.000) — cubre 21 días de venta',
  artefacto: 'Orden de compra al proveedor',
  destino: 'inventario',     // a qué pantalla/área lleva el botón "Ir a…"
  aprobacion: 'Requiere tu aprobación — nada se ejecuta solo.',
}
```

**Regla de oro:** el `id` debe ser estable entre escaneos (por ejemplo `tipo:idDelObjeto`).
Así, si ya descartaste algo, no vuelve a aparecer cada vez que escaneas.

### Prioridad

```
alta  → riesgo 'alto'  O  impacto ≥ $100.000/mes
media → impacto ≥ $20.000/mes
baja  → el resto
```

Orden final: prioridad → impacto → orden de aparición. Las **deudas** se mantienen
juntas y en su orden de pago (el abono va a la deuda de mayor tasa primero).

### Detectores actuales (`corteza.js`)

| Detector | Dispara cuando | Propone |
|---|---|---|
| `senalesDeuda` | Deuda con interés y saldo > 0 | Abonar con la caja que sobra del colchón, de mayor a menor tasa |
| `senalCaja` | Caja < colchón mínimo | Congelar compras no urgentes y cobrar al mayor deudor |
| `senalesStock` · quiebre | Stock 0 y se vendía | Reponer unidades para 21 días |
| `senalesStock` · cobertura | Stock alcanza < 7 días | Pedir antes del quiebre |
| `senalesStock` · margen bajo | Margen < 25% en producto que rota | Subir precio a 30% de margen |
| `senalesStock` · inmovilizado | ≥ 30 días sin venta y ≥ $30.000 parados | Promo o bundle |
| `senalMeta` | Proyección del mes < 90% de la meta (desde el día 5) | Ventas diarias necesarias |
| `senalCobranza` | Hay saldos por cobrar | Cobrar primero al mayor |
| `senalesVencimiento` | Pasivo vence en ≤ 60 días | Separar el monto en un fondo reservado |
| `senalesClientes` | Cliente pasó 1,3× su ciclo de recompra | Escribirle hoy |
| `senalGastos` | Gastos del negocio > margen de 30 días | Revisar la categoría más grande |

Constantes en la cabecera del archivo (`COBERTURA_MIN_DIAS`, `MARGEN_MIN_PCT`, etc.):
ahí se ajusta el criterio sin tocar la lógica.

---

## 3. La interfaz (`CortezaScreen.jsx`)

De arriba hacia abajo:

1. **Cabecera**: "Motor agéntico · Corteza prefrontal" + botón Home.
2. **Barra de escaneo**: hora del último escaneo, cuántos datos leyó y botón **Re-escanear**.
3. **Tres pilares**: Radar (nº de señales) · ROI (impacto total/mes y ahorro) · Skill Miner (nº de artefactos distintos).
4. **Pestañas**: Pendientes · Aprobadas · Descartadas (con contador).
5. **Cola de evolución**: una tarjeta por decisión, con prioridad, tipo, señal, evidencia, métricas (impacto, ahorro, ROI, riesgo), acción sugerida, artefacto y botones **Aprobar / Descartar / Ir a [área]**.
6. **Estado vacío**: "Sin señales reales todavía" (no inventa nada).
7. **Pie**: recordatorio de que no ejecuta acciones.

Detalles útiles:
- El escaneo corre al abrir la pantalla y otra vez al apretar Re-escanear (hay un `setTimeout` de 450 ms solo para que se vea la animación).
- Si una decisión ya tomada deja de aparecer en el escaneo, se muestra como **"Señal ya no aparece"** con opción de quitarla de la lista.
- En el Home, una tarjeta cuenta las pendientes (las que no están en `corteza`) y marca cuántas son de prioridad alta.

### Persistencia de las decisiones

Se guarda un objeto `{ [id]: { estado, fecha, senal, accion } }` bajo la clave
`macaco:corteza` (localStorage + Supabase vía `pushDB`).
`decidirCorteza(id, 'aprobada' | 'descartada')` guarda; `decidirCorteza(id, null)` la devuelve a pendientes.

---

## 4. Arquitectura "cerebro + áreas" (lo que quieres para la app de finanzas)

Hoy `corteza.js` es un solo archivo con todos los detectores adentro. Para que cada
área "apriete" al cerebro, el cambio es pequeño: **cada área exporta su propio detector
y el cerebro solo los junta y ordena.**

```
        ┌────────────── CEREBRO (brain/) ──────────────┐
        │  contrato de decisión · prioridad · orden    │
        │  escanear(areas, datos) → cola priorizada    │
        └───────▲───────────▲───────────▲──────────────┘
                │           │           │
         areas/finanzas  areas/stock  areas/catalogo   ← cada una exporta detectar(datos)
```

### Contrato de un área

```js
// areas/finanzas.js
export const area = {
  id: 'finanzas',
  detectar(datos, ctx) {
    // devuelve un arreglo de decisiones (misma forma de la sección 2)
    return [ ...senalesDeuda(datos), ...senalCaja(datos), ...senalGastos(datos) ];
  },
};
```

### El cerebro (reemplaza el cuerpo de `escanearCorteza`)

```js
// brain/index.js
import { decision, calcPrioridad } from './decision.js';

export function escanear(areas, datos, ahora = Date.now()) {
  const ctx = { ahora, tasaMax: Math.max(0, ...(datos.deudas || []).map(d => d.rate || 0)) };
  const brutas = areas.flatMap(a =>
    a.detectar(datos, ctx).map(d => ({ ...d, area: a.id }))
  );
  const decisiones = brutas
    .map((d, i) => ({ d, i }))
    .sort((a, b) =>
      (RANGO[a.d.prioridad] - RANGO[b.d.prioridad]) ||
      ((b.d.impactoMensual || 0) - (a.d.impactoMensual || 0)) || (a.i - b.i))
    .map(x => x.d);
  return { fecha: new Date(ahora).toISOString(), decisiones };
}
```

Agregar un área nueva = escribir un `detectar()` y sumarlo a la lista. El cerebro y la
pantalla no cambian. Cada área también puede tener sus tests aparte.

### Mapa sugerido de áreas

| Área | Qué aporta al cerebro | Detectores que ya existen y se mueven ahí |
|---|---|---|
| **finanzas** | caja, deudas, cobros, pasivos, gastos | `senalesDeuda`, `senalCaja`, `senalCobranza`, `senalesVencimiento`, `senalGastos` |
| **stock** | quiebres, cobertura, inmovilizado | `senalesStock` (quiebre, cobertura, inmovilizado) |
| **catálogo** | precios y márgenes | `senalesStock` · margen bajo (se separa) |
| **ventas** | meta, ritmo, clientes | `senalMeta`, `senalesClientes` |

El campo `destino` de cada decisión apunta a la pantalla del área, y es lo que hace
que "cada parte del cerebro vaya" al área de finanzas, stock o catálogo.

---

## 5. Pasos para llevarlo a tu app de finanzas

1. Copia `src/corteza.js` (y `src/corteza.test.js`) a la otra app. No tiene dependencias.
2. Revisa los nombres de campos que lee (sección 6) y ajústalos a los de tu app, o escribe un pequeño adaptador que los renombre.
3. Copia `CortezaScreen.jsx` y adapta los imports (`MACACO`, `Card`, `Screen`, `useApp`) a tu diseño. El contenido de las tarjetas no depende de nada de Macaco.
4. Agrega a tu estado global: un objeto `corteza` y la acción `decidirCorteza`, persistidos como lo haces con el resto de datos.
5. Lleva al Home la tarjeta de pendientes (opcional).
6. Si quieres el modelo por áreas, parte `corteza.js` según la tabla de la sección 4.

## 6. Datos que el motor espera

| Dato | Campos que usa |
|---|---|
| `productos` | `id`, `name`, `stock`, `cost`, `price` |
| `ventas` | `fecha`, `productoId`, `cantidad`, `total`, `margen`, `cliente` |
| `gastos` | `fecha`, `tipo` (`'negocio'`), `monto`, `categoria` |
| `deudas` | `id`, `who`, `amt`, `rate` (% mensual), `order` |
| `caja` | número (CLP) |
| `config` | `colchonMinimo`, `metaMensual`, `alertaStockBajo` |
| `porCobrar` | `persona`, `saldo` |
| `vencimientos` | `id`, `acreedor`, `diasRestantes`, `saldo`, `vencimiento` |

Si tu app de finanzas no tiene stock ni ventas, simplemente no pasas esos arreglos
(el valor por defecto es `[]`) y esos detectores no disparan nada.

## 7. Cosas a tener en cuenta

- Los montos están pensados para pesos chilenos (CLP). La función `clp()` interna formatea con puntos.
- Las reglas de finanzas personales (tramos de interés, aporte externo, fondos reservados) viven en `store.jsx`, no en `corteza.js`. El motor recibe los números ya calculados (`saldo`, `vencimientos`) para no duplicar reglas.
- Tests: `npm test` corre `node --test src/corteza.test.js`.
