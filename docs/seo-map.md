# Mapa SEO Haberes — keyword → URL

Fuente de volúmenes: Semrush base `cl` (Chile), agosto 2026.
Regla: **una página fuerte por intención**, no una por keyword.
Actualizar este archivo antes de crear URLs nuevas para evitar canibalización.

## Páginas de dinero (calculadoras existentes)

| Intención | Keywords (vol / KD) | URL canónica | Notas |
|---|---|---|---|
| Producto pymes | liquidaciones / finiquitos pymes | `/` | Title de producto, no segunda calculadora |
| Calcular finiquito | calcular finiquito (18.100/28), calculadora finiquito (1.900/23), como calcular finiquito (4.400/23) | `/finiquito` | Reforzar title/H1/FAQ; no crear `/calculadora-finiquito` |
| Calcular sueldo líquido | calcular sueldo líquido / liquido (5.400/38), sueldo líquido (4.400/35), calculadora de sueldo liquido (1.300/32) | `/sueldo` | H1 calculadora Chile 2026; no crear `/calculadora-sueldo` |
| Calcular horas extras | calcular horas extras / cálculo horas extras (8.100/17) | `/horas-extras` | Title/H1 «calcular horas extras»; no canibalizar `/sueldo` ni `/guias/horas-extras` |
| Calcular vacaciones proporcionales | vacaciones proporcionales (1.300/16), feriado proporcional (590/13), calcular feriado proporcional (320/14) | `/vacaciones-proporcionales` | Title/H1 «calcular vacaciones proporcionales»; no canibalizar `/finiquito` ni `/guias/vacaciones-proporcionales` |
| Calcular gratificación | gratificación legal (4.400/17) — intención calcular | `/gratificacion` | Title/H1 «calcular gratificación»; no canibalizar `/sueldo` ni `/guias/gratificacion-legal` |
| Calcular impuesto único | calcular impuesto unico (480/mes), tabla impuesto unico (2.900/mes) | `/impuesto-unico` | Title/H1 «calcular impuesto único»; no canibalizar `/sueldo` ni `/guias/impuesto-unico` |
| Calcular cotizaciones previsionales | cotizaciones previsionales / tope imponible AFP / comisión AFP | `/cotizaciones-previsionales` | Title/H1 «calcular cotizaciones previsionales»; no canibalizar `/sueldo` ni `/guias/liquidacion-de-sueldo-y-previred`. No crear `/tope-imponible`, `/cotizacion-afp`, `/descuentos-legales` ni `/calculadora-sueldo` |
| Índice de guías | — | `/guias` | Hub: 17 guías, grupo liquidación vs finiquito |

## Guías pilar (contenido + calculadora embebida)

| Intención | Keywords (vol / KD) | URL canónica | Calculadora |
|---|---|---|---|
| Finiquito (editorial) | finiquito (18.100/50), finiquito chile (480/39) | `/guias/finiquito` | embed → `/finiquito` |
| Liquidación de sueldo | liquidacion de sueldo (12.100/29) | `/guias/liquidacion-de-sueldo` | embed → `/sueldo` |
| Impuesto único | impuesto único (5.400/28), tabla impuesto único (2.900/22) | `/guias/impuesto-unico` | enlace a `/impuesto-unico`; tabla IUSC desde `js/constants.js`; no reescribir en esta tanda |
| Gratificación legal | gratificación legal (4.400/17), gratificacion legal chile (1.900/16) | `/guias/gratificacion-legal` | enlace a `/gratificacion`; no reescribir en esta tanda |
| Indemnización años de servicio | indemnizacion por años de servicio (2.400/24) | `/guias/indemnizacion-por-anos-de-servicio` | embed → `/finiquito` |
| Horas extras (guía) | cálculo horas extras — explainer | `/guias/horas-extras` | enlace a `/horas-extras`; no reescribir en esta tanda |
| Vacaciones / feriado proporcional (guía) | vacaciones proporcionales — explainer | `/guias/vacaciones-proporcionales` | enlace a `/vacaciones-proporcionales`; no reescribir en esta tanda |
| Semana corrida | semana corrida (1.300/21) | `/guias/semana-corrida` | guía espesa + embed `/sueldo` |
| Aguinaldo Fiestas Patrias | aguinaldo fiestas patrias (5.400/23), es obligatorio el aguinaldo (480/15), bono fiestas patrias (170) | `/guias/aguinaldo-fiestas-patrias` | guía espesa + embed `/sueldo`; no es obligación general del Código; no canibalizar `/gratificacion` ni `/guias/gratificacion-legal` |
| Carta de aviso | carta de aviso de término de contrato (10–480) | `/guias/carta-aviso-termino-contrato` | plantilla descargable |
| Casa particular | finiquito asesora del hogar (140/15) | `/guias/finiquito-trabajadora-de-casa-particular` | ya existe; reforzar régimen AFC 4,11 % |

## Guías de apoyo (ya publicadas — no canibalizar)

| URL | Rol |
|---|---|
| `/guias/plazo-de-pago-del-finiquito` | Soporte a intención finiquito |
| `/guias/con-que-sueldo-se-calcula-el-finiquito` | Base de cálculo |
| `/guias/me-reservo-el-derecho-en-el-finiquito` | Firma / reserva |
| `/guias/como-leer-una-liquidacion-de-sueldo` | Soporte liquidación |
| `/guias/formato-de-liquidacion-de-sueldo-chile` | Formato PDF |
| `/guias/liquidacion-de-sueldo-y-previred` | Previred vs liquidación; enlace a `/cotizaciones-previsionales` (cálculo, no declaración) |

## 21 causales de finiquito (`/finiquito/{slug}`)

Texto legal y flags `aplicaIas` / `aplicaAviso` viven en `js/causales.js`.
Prosa editorial editable en `content/causales/{slug}.md`.

| Causal id | Slug URL |
|---|---|
| 159-a | `/finiquito/art-159-mutuo-acuerdo` |
| 159-b | `/finiquito/art-159-renuncia-voluntaria` |
| 159-c | `/finiquito/art-159-muerte-del-trabajador` |
| 159-d | `/finiquito/art-159-vencimiento-del-plazo` |
| 159-e | `/finiquito/art-159-conclusion-del-trabajo` |
| 159-f | `/finiquito/art-159-caso-fortuito` |
| 160-1-a | `/finiquito/art-160-falta-de-probidad` |
| 160-1-b | `/finiquito/art-160-acoso-sexual` |
| 160-1-c | `/finiquito/art-160-vias-de-hecho` |
| 160-1-d | `/finiquito/art-160-injurias` |
| 160-1-e | `/finiquito/art-160-conducta-inmoral` |
| 160-1-f | `/finiquito/art-160-acoso-laboral` |
| 160-2 | `/finiquito/art-160-negociaciones-prohibidas` |
| 160-3 | `/finiquito/art-160-no-concurrencia` |
| 160-4-a | `/finiquito/art-160-abandono-salida-intempestiva` |
| 160-4-b | `/finiquito/art-160-abandono-negativa` |
| 160-5 | `/finiquito/art-160-imprudencia-temeraria` |
| 160-6 | `/finiquito/art-160-perjuicio-material` |
| 160-7 | `/finiquito/art-160-incumplimiento-grave` |
| 161-necesidades | `/finiquito/art-161-necesidades-de-la-empresa` |
| 161-desahucio | `/finiquito/art-161-desahucio` |

## Interlinking obligatorio

- Toda guía y causal enlaza a `/finiquito` y/o `/sueldo` según intención.
- Toda página SEO incluye CTA a `/empresa` (cuenta de empresa).
- Disclaimer legal (`DISCLAIMER` / `DISCLAIMER_FINIQUITO`) en todo output.

## URLs que no se crean

No publicar `/ia`, `/etica`, `/gobernanza` ni páginas de «exactitud» o sesgo.
Haberes no se presenta como IA en el sitio. El memo de operación está en
`docs/INTERNO-USO-DE-IA.md` (fuera del deploy).

No publicar hermanas de cotizaciones: `/tope-imponible`, `/cotizacion-afp`,
`/descuentos-legales`, `/calculadora-sueldo`. La intención «calcular sueldo líquido»
sigue en `/sueldo`.

## Cómo regenerar

```
node scripts/gen-content-seo.mjs
npm run sitemap
npm run verify
```

Contenido fuente: `content/guias/*.md` y `content/causales/*.md`.
Lista canónica de URLs: `api/_sitemap.js` (también la sirve `/api/sitemap`).
