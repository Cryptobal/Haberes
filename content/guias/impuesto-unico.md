---
title: "Impuesto único de segunda categoría (tabla vigente) — Haberes"
description: "Tabla del impuesto único (IUSC) vigente en Haberes, cómo se calcula sobre la base tributable y enlace a la calculadora de sueldo líquido."
h1: "Impuesto único de segunda categoría"
calc: "iusc"
faq:
  - {"q":"¿Qué es el impuesto único?","a":"Es el impuesto de segunda categoría que se retiene mensualmente sobre las rentas del trabajo dependiente, según tramos de tasa y rebaja."}
  - {"q":"¿De dónde salen los tramos de Haberes?","a":"De la configuración legal versionada en js/constants.js (IUSC_TRAMOS). Se actualizan cuando cambian los valores oficiales del mes."}
---

# Impuesto único de segunda categoría

El IUSC se aplica sobre la base tributable del mes (imponible menos cotizaciones de AFP, salud y cesantía del trabajador, según el flujo de Haberes). Cada tramo tiene tasa y rebaja.

## Tabla del mes (configuración Haberes)

La tabla siguiente se genera desde la misma fuente que usa la calculadora. No se hardcodea en esta página.

{{calc}}

## Cómo estimarlo

Calcule el líquido completo en [sueldo líquido](/sueldo): el desglose muestra el impuesto único del mes.

{{cta}}
