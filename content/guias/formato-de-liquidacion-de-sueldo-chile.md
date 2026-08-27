---
title: "Formato de liquidación de sueldo en Chile — campos y PDF"
description: "Lista de campos de una liquidación chilena: empleador, trabajador, haberes, descuentos legales y líquido. Emita el PDF con membrete desde la cuenta de empresa."
h1: "Formato de liquidación de sueldo en Chile"
calc: "sueldo"
faq:
  - {"q":"¿Existe un formulario único de liquidación?","a":"No hay un único formulario obligatorio idéntico para todas las empresas. El artículo 54 exige un comprobante con el monto pagado, cómo se determinó y las deducciones. El PDF con membrete es el documento que se entrega."}
  - {"q":"¿Dónde emito el PDF en Haberes?","a":"En la cuenta de empresa: cargue la nómina, revise el cálculo y descargue o envíe el PDF con logo y firma. No hay una plantilla Excel de liquidación en /ejemplos."}
---

# Formato de liquidación de sueldo en Chile

No existe un único formulario oficial idéntico para todas las pymes. El [artículo 54 del Código del Trabajo](https://www.bcn.cl/leychile/navegar?idNorma=207436) exige pagar la remuneración en moneda de curso legal y **otorgar al trabajador un comprobante** con el monto pagado, la forma en que se determinó y las deducciones. Esa es la liquidación.

Una planilla interna sirve de borrador. El documento que se entrega y se archiva es el **PDF** con identificación del empleador. En Haberes se emite desde la [cuenta de empresa](/empresa), no como descarga Excel: en `/ejemplos` solo hay CSV de nómina y novedades, no una plantilla de liquidación.

## Lista de campos (checklist)

Use esta lista al armar o revisar el documento. No sustituye el criterio de su contador ni la declaración en [Previred](https://www.previred.com/).

### Identificación del empleador

- Razón social y RUT
- Giro y dirección (útiles en el membrete)
- Periodo de la liquidación (mes y año)
- Fecha de pago, si la informan

### Identificación del trabajador

- Nombre completo y RUT
- Cargo
- Tipo de contrato (indefinido, plazo fijo u otro)
- AFP y salud (Fonasa o Isapre)
- Días del periodo (trabajados, licencia, feriado) cuando el mes no es completo

### Haberes (con nombre, no solo un total)

- Sueldo base
- Gratificación legal art. 50, si corresponde
- Horas extras
- Bonos imponibles (cada uno con su nombre)
- Colación y movilización (art. 41), si se pagan: no imponibles
- [Asignación familiar](/asignacion-familiar) legal, si hay cargas acreditadas: no es remuneración
- Otros no imponibles, si existen
- Total haberes

### Descuentos legales (desglosados)

- AFP: 10 % obligatorio más comisión de la administradora ([Superintendencia de Pensiones](https://www.spensiones.cl/))
- Salud: 7 % Fonasa o plan Isapre
- Seguro de cesantía del trabajador, según contrato
- Impuesto único de segunda categoría ([tabla SII](https://www.sii.cl/valores_y_fechas/impuesto_2da_categoria/impuesto2026.htm))
- Otros descuentos pactados o legales (anticipo, crédito) con nombre
- Total descuentos

### Cierre

- Líquido a pago
- Base imponible y base tributable (para cuadrar con cotizaciones e IUSC)
- Espacio de firma o constancia de recepción, según la práctica de la empresa

## Cómo emitir el PDF en Haberes

1. Abra la [cuenta de empresa](/empresa).
2. Cargue o edite los trabajadores del mes (puede partir de `ejemplos/trabajadores.csv`).
3. Revise haberes, descuentos y el líquido.
4. Descargue el PDF con logo y firma, o envíelo al correo del trabajador.

Para un caso suelto, estime primero en la [calculadora de sueldo líquido](/sueldo). Para entender cada línea, lea [cómo leer una liquidación](/guias/como-leer-una-liquidacion-de-sueldo). Las cotizaciones se declaran en Previred; Haberes no las declara.

{{calc}}

{{cta}}
