# Corteza Prefrontal — el cerebro de Macaco OS

Diseño: **un cerebro central + áreas**. Cada área detecta lo suyo y el cerebro
arma una sola cola de decisiones priorizada. Tú apruebas o descartas; nada se
ejecuta solo.

```
        ┌────────────── CEREBRO (src/cerebro/index.js) ─────────────┐
        │  contrato de decisión · prioridad · orden · cola única     │
        │  escanear(AREAS, datos) → { fecha, fuentes, decisiones }   │
        └────▲───────────────▲───────────────▲──────────────▲───────┘
             │               │               │              │
       areas/finanzas   areas/stock    areas/catalogo   areas/ventas
```

## Reglas que no se rompen
1. **Fuente o silencio**: sin datos no hay señal. No inventa ni muestra ejemplos.
2. No mueve plata ni stock. Solo recomienda.
3. Toda decisión requiere aprobación humana (`decidirCorteza`).
4. Funciones puras: mismos datos → mismo resultado. Tests con `npm test`.

## Archivos

| Archivo | Qué es |
|---|---|
| `src/cerebro/decision.js` | Contrato de decisión, `calcPrioridad`, `velocidades`, `clp` |
| `src/cerebro/index.js` | El cerebro: `escanear(areas, datos)`, `AREAS`, `deArea()` |
| `src/cerebro/areas/*.js` | Un archivo por área; cada uno exporta `area = { id, nombre, detectar(datos, ctx) }` |
| `src/corteza.js` | Entrada única: `escanearCorteza(datos)` = `escanear(AREAS, datos)` |
| `src/domain/kairos.js` | Timonel y vigías (los usan stock y ventas) |
| `src/screens/CortezaScreen.jsx` | La cola: filtros por área, pendientes / aprobadas / descartadas, Timonel |
| `src/components/CerebroArea.jsx` | Aviso del cerebro arriba de Finanzas, Stock y Reportes |
| `src/components/Cabina.jsx` | Panel del Home (salud, telemetría, vigía, jugada, acceso a la Corteza) |

## Las áreas y sus detectores

| Área | Detector | Dispara cuando | Propone |
|---|---|---|---|
| **finanzas** | deuda con interés | saldo > 0 y tasa > 0 | Abonar con lo que sobra del colchón, de mayor a menor tasa |
| | caja bajo colchón | caja < colchón mínimo | Congelar compras no urgentes |
| | gastos sobre margen | gastos del negocio 30 d > margen 30 d | Revisar la categoría más grande |
| **stock** | quiebre | stock 0 y se vendía | Reponer para 21 días |
| | cobertura corta | stock alcanza < 7 días | Pedir antes del quiebre |
| | inmovilizado | ≥ 30 días sin venta y ≥ $30.000 parados | Promo o pack |
| | Timonel (Kairos) | 14+ días de historial | Jugada maestra: comprar / liberar stock parado / empujar |
| **catálogo** | margen bajo | margen < 25 % en algo que rota | Subir precio a 30 % de margen |
| **ventas** | ritmo vs meta | proyección < 90 % de la meta (desde el día 5) | Venta diaria necesaria |
| | recompra | cliente pasó 1,3× su ciclo | Escribirle hoy |
| | registro de clientes | ≥ 50 % de ventas sin cliente | Anotar el cliente en cada venta |
| | Vigía (Kairos) | semana ≥ +40 % (pico) o ≤ −30 % (caída) | 3 acciones concretas |

Los umbrales están como constantes al inicio de cada archivo de área.

## Contrato de una decisión

```js
{
  id: 'quiebre:creatina-inner',   // ESTABLE entre escaneos: así se recuerda aprobar/descartar
  area: 'stock',                  // lo pone el cerebro
  tipo: 'Stock', senal: '…', evidencia: ['…'],
  impactoMensual: 96000, ahorroMensual: null, roi: '…' | null,
  riesgo: 'alto' | 'medio' | 'bajo', prioridad: 'alta' | 'media' | 'baja',
  accion: '…', acciones: ['…'] /* opcional, lista numerada */,
  artefacto: 'Orden de compra al proveedor', destino: 'inventario',
  aprobacion: 'Requiere tu aprobación — nada se ejecuta solo.',
}
```

Prioridad: `alta` si riesgo alto o impacto ≥ $100.000/mes; `media` si impacto ≥ $20.000/mes;
si no, `baja`. Orden: prioridad → impacto → orden de aparición. Las deudas van juntas
y en su orden de pago. Las brechas contra la meta y las caídas no suman como ROI
(venta que no entró no es plata recuperable).

## Agregar un área

```js
// src/cerebro/areas/redes.js
import { decision } from '../decision.js';
export const area = {
  id: 'redes', nombre: 'Redes',
  detectar(datos, { ahora, vel, tasaMax }) { return [/* decision({...}) */]; },
};
```

Sumarla a `AREAS` en `src/cerebro/index.js`. El cerebro, la Corteza y sus filtros
no cambian. Si el área tiene pantalla propia, poner `<CerebroArea areas={['redes']} go={go} />`.

## Persistencia
`macaco:corteza` = `{ [id]: { estado, fecha, senal, accion } }`, guardado con `pushDB`.
`decidirCorteza(id, 'aprobada' | 'descartada')`; con `null` vuelve a pendientes.
