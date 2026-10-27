# Los 12 asesores de Makako

Roles de trabajo con personalidad visual (emoji + color + forma). Viven en
`src/asesores/asesores.js`; la ficha y el botón "Copiar mensaje" en
`src/components/Asesores.jsx`; la pantalla con todos en `src/screens/EquipoScreen.jsx`.

## De dónde salen
Basados en **agency-agents-zh** (MIT, © 2025 Michael Sitarzewski, © 2026 jnMetaCode):
https://github.com/jnMetaCode/agency-agents-zh — 328 perfiles en chino. Se
**tradujeron y adaptaron** los que calzan con el negocio; lo propio de China
(Alipay, Taobao, Código Civil chino, facturas Fapiao) se dejó fuera y se
reemplazó por lo chileno (IVA 19 %, SII, boleta/factura electrónica, Ley del
Consumidor, Mercado Libre, Meta Ads).

| Asesor | Área | Perfil original |
|---|---|---|
| 👔 Jefe de Gabinete | Gabinete | company/chief-of-staff |
| 📒 Contador | Finanzas | finance/finance-bookkeeper-controller |
| 📊 Analista Financiero | Finanzas | finance/finance-financial-analyst |
| 🔮 Proyección Financiera | Finanzas | finance/finance-financial-forecaster |
| 🧾 Tributario | Finanzas | finance/finance-tax-strategist |
| 🧮 Facturas | Finanzas | finance/finance-invoice-manager |
| 🕵️ Detector de Fraude | Finanzas | finance/finance-fraud-detector |
| 📈 Ventas | Finanzas | sales/sales-pipeline-analyst |
| 📑 Abogado | Legal | legal/legal-contract-reviewer |
| 🚀 Marketing | Marketing | marketing/marketing-growth-hacker |
| 🛒 Comercio Online | Catálogo | marketing/marketing-ecommerce-operator |
| 📦 Productos | Productos | supply-chain/supply-chain-inventory-forecaster |

Otros perfiles del repo que podrían servir después (no se integraron):
`marketing-instagram-curator`, `marketing-social-media-strategist`,
`paid-media-paid-social-strategist` (Meta Ads), `marketing-email-strategist`,
`support-legal-compliance-checker`, `product-sprint-prioritizer`, `finance-fpa-analyst`.

## Cómo se usan
Tocas un asesor → eliges una pregunta → **Copiar mensaje** → lo pegas en un chat
con Claude, que responde con ese rol. No hay IA dentro de la app (haría falta un
servicio con clave): así no se agregan dependencias.

## Privacidad (regla del negocio)
El mensaje **nunca** incluye caja, deudas, finanzas personales ni costos de
compra. Solo ventas, gastos del negocio, precios de venta, margen y stock.
`src/asesores/asesores.test.js` lo comprueba para los 12.

## Orientación, no asesoría
Tributario y Abogado dan orientación general. Las fechas, tasas y normas se
confirman con el contador, sii.cl, SERNAC o SEREMI antes de decidir.
