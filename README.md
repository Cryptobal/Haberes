# Haberes

Sitio estático para estimar **sueldo líquido**, **finiquito** y **liquidaciones** de pymes en Chile.

Documento generado por Haberes. **No** es un cálculo de la Dirección del Trabajo ni de Previred. **No** constituye asesoría legal.

## Uso local

```
npm ci
npm start                 # http://127.0.0.1:8080 (cleanUrls, como Vercel)
```

También puede abrir `index.html` o desplegar en Vercel (`vercel.json` con `cleanUrls`).

```
node scripts/verify.mjs   # cálculo, contenido y contratos de API
node scripts/gen-ejemplos.mjs  # regenera ejemplos/ desde js/csv.js
python3 scripts/smoke.py  # interfaz en navegador real: 360 px y 1280 px
```

`scripts/smoke.py` levanta su propio servidor estático y usa Playwright. Comprueba lo que
solo se ve en un navegador: desborde horizontal, áreas táctiles bajo 44 px, errores de
consola, orden de capas (cabecera, hoja del selector, cajón, avisos, diálogo) y el flujo
de alta, edición y borrado de un trabajador. Deja capturas en `/tmp/shots`.

UF y UTM se leen de [mindicador.cl](https://mindicador.cl/api) con caché de 12 horas. Si la UF sale del rango 20.000–80.000 se usa el valor de respaldo.

## Interfaz

Sistema de diseño en `css/app.css`: tokens de color, espaciado base 4, tipografía fluida,
elevación y movimiento, con tema día/noche. Mobile first; el escritorio es la mejora.

No se usan `alert`, `confirm`, `prompt`, `window.open` ni `<dialog>` nativo. Los diálogos,
los avisos flotantes y el bloqueo de scroll viven en `js/overlay.js`; el selector de opciones
en `js/picker.js` (hoja inferior con velo en móvil, panel anclado en escritorio).

## Páginas

- `/` inicio
- `/sueldo` calculadora simple y completa
- `/finiquito` arts. 159 / 160 / 161
- `/finiquito/{slug}` páginas por causal prioritaria (necesidades de la empresa, renuncia, vencimiento del plazo, incumplimiento grave, desahucio)
- `/guias/{slug}` guías laborales (plazo de pago, base de cálculo, casa particular, reserva de derechos, leer liquidación, formato, Previred)
- `/empresa` cuenta de empresa (RUT + correo + clave), perfil, logo, firma, CSV, liquidación, carta de finiquito, envío por correo al trabajador, nómina bancaria por perfiles y Libro de Remuneraciones Electrónico (LRE)
- `/como` cómo funciona
- `/precios` registro gratis; Gratis 5 movimientos/mes; Pro $14.990 + IVA / mes, cobro con Mercado Pago o Flow
- `/admin` operadores (no está en el sitemap; exige `ADMIN_EMAILS` + `ADMIN_PASSWORD_HASH`)
- `/reset` cambio de clave con token de un solo uso (no está en el sitemap)

`/sitemap.xml` lo sirve `api/sitemap.js` (rewrite en `vercel.json`) para que curl y Googlebot no reciban el 500 del XML estático de Vercel. La lista de URLs está en `api/_sitemap.js` y `npm run sitemap` regenera el archivo de verificación. No se edita a mano. Sin `/admin` ni `/reset`.

La tipografía IBM Plex Sans está autoalojada en `fonts/` (subconjunto latino, `woff2`, licencia en `fonts/LICENSE`). No se cargan fuentes desde Google Fonts.

Los trabajadores de la liquidación viven en `localStorage` de este navegador. La **ficha**
guarda lo permanente del contrato; las **novedades del período** (ausencias, licencia, feriado,
horas extras, bonos y descuentos con nombre) se cargan por mes, a mano o con
`ejemplos/novedades.csv`, para que no se repitan solas al mes siguiente.

## Libro de Remuneraciones Electrónico (LRE)

`js/lre.js` genera el CSV de 147 columnas del formato oficial de la Dirección del Trabajo
(manual v8.0, marzo 2023, Anexos N°1 y N°2): separador `;`, codificación ANSI, fechas
`dd/mm/aaaa`, RUT sin puntos con guion, opcionales vacíos y archivo `rutempleador_aaaamm.csv`.
Los montos salen del mismo `calcularSueldo` de la liquidación, así que cuadran al peso.
Es un borrador para revisar antes de subir a Mi DT: los aportes del empleador (mutual, SIS,
aporte Ley 21.735) van en 0 —la DT aún no publica códigos para la reforma y la tasa de mutual
depende de cada empresa—. Los días trabajados, de licencia y de vacaciones (códigos 1115–1117)
y los descuentos por anticipos y préstamos (3188) salen de las **novedades del período**; si no
hay novedades, se asume mes completo de 30 días. La descarga es Pro.

## Cuentas en Postgres (opcional)

Si el entorno de despliegue define `DATABASE_URL`, las APIs `/api/register`, `/api/login`, `/api/reset-request` y `/api/reset-confirm` usan esa base. Si falta, las APIs responden 501 (`no_backend`) y la interfaz sigue en modo solo local, sin fingir que se envió un correo.

El esquema está en `sql/001.sql` (cuentas), `sql/002.sql` (giro, dirección, clave de logo y documentos), `sql/003.sql` (firma, `disabled_at`, sesiones de admin), `sql/004.sql` (plan Gratis/Pro y movimientos del mes), `sql/005.sql` (ids de Mercado Pago y vigencia de Pro), `sql/006.sql` (registro de envíos de documentos por correo) y `sql/007.sql` (ids de Flow). Se aplica en el primer request si es seguro. Las migraciones incrementales no borran cuentas existentes.

## Envío de documentos por correo

`POST /api/enviar` genera **un PDF por trabajador** (nunca el fusionado de la descarga), lo guarda en R2, lo adjunta con Resend y registra el resultado en `envios`. `GET /api/enviar` responde solo `{ ok, mail }` sin nombres de variables. Sin `RESEND_API_KEY` responde 501 `no_mail`. `RESEND_FROM` debe ser un dominio verificado en Resend; de lo contrario los correos se rechazan o caen en spam. El asunto no incluye montos. En Gratis el envío es uno a uno, igual que la emisión.

## Nómina bancaria

`js/bancos.js` concentra el catálogo de instituciones (códigos CMF / CLCMF). `js/nomina.js` define perfiles declarativos (`verificado: false` hasta citar el instructivo del banco en `fuente`). No se inventan layouts de largo fijo «por analogía». La empresa puede guardar un perfil personalizado en `localStorage` (`emp.nomina`).

Opcional en el host, nunca en el repositorio:

- `DATABASE_URL` — conexión de la app
- `DATABASE_URL_UNPOOLED` — preferida para aplicar el SQL
- `RESEND_API_KEY` y `RESEND_FROM` — recuperación de clave y envío de liquidaciones/finiquitos; `RESEND_FROM` debe usar dominio verificado en Resend
- `PUBLIC_ORIGIN` — origen público del enlace (por defecto https://www.haberes.cl)
- `R2_ACCOUNT_ID` (o `CLOUDFLARE_ACCOUNT_ID`, `CF_ACCOUNT_ID`), `R2_ACCESS_KEY_ID` (o `AWS_ACCESS_KEY_ID`, `R2_ACCESS_KEY`), `R2_SECRET_ACCESS_KEY` (o `AWS_SECRET_ACCESS_KEY`, `R2_SECRET`), `R2_BUCKET` (o `R2_BUCKET_NAME`, `BUCKET_NAME`) — depósito privado para logos, firmas y PDF. Si faltan, `/api/logo`, `/api/firma` y `/api/documento` responden 501 (`no_storage`) y la interfaz lo dice; no se finge la subida. `/api/me`, `/api/admin-me` y `GET /api/storage` informan solo `{ storage: true|false }`, sin nombres ni valores de variables.
- `ADMIN_EMAILS` — correos de operadores, separados por coma
- `ADMIN_PASSWORD_HASH` — hash Argon2id de la clave de admin. Sin ambos, `/admin` responde 503 (`admin_unavailable`). No hay clave por defecto. El hash se genera con `node scripts/admin-hash.mjs 'SuClave'` y se pega en el host; nunca en el repositorio.
- `mp_access_token` (o `mp_access`, `MP_ACCESS_YOKEN`, `MP_ACCESS_TOKEN`, `MERCADOPAGO_ACCESS_TOKEN`, `MP_ACCESS_TOKEN_PROD`, `MP_ACCESS`) — token de Checkout Pro. Se usa el primero que tenga valor. Sin él, `POST /api/checkout` con `provider: "mp"` responde 501 (`mp_unavailable`) y el botón no se muestra; no se finge el pago. No hace falta renombrar la variable.
- `MP_WEBHOOK_SECRET` (o `MERCADOPAGO_WEBHOOK_SECRET`) — si está, `/api/mp-webhook` exige la firma `x-signature` de Mercado Pago.
- `FLOW_API_KEY` (o `flow_api_key`, `FLOW_APIKEY`, `FLOW_KEY`, `API_KEY`, `FLOW_API_KEY_PROD`) y `FLOW_SECRET_KEY` (o `flow_secret_key`, `FLOW_SECRET`, `SECRET_KEY`, `FLOW_SECRET_KEY_PROD`) — credenciales de Flow. Se usa el primero que tenga valor de cada lista. Sin ambos, no aparece el botón de Flow. `FLOW_API_URL` / `FLOW_BASE_URL` opcional; `FLOW_SANDBOX=1` apunta a `https://sandbox.flow.cl/api`. Producción: `https://www.flow.cl/api`.

Pro se cobra **$14.990 + IVA** (IVA 19 % Chile) = **17.838 CLP**. `POST /api/checkout` acepta `{ provider: "mp" | "flow" }` (si se omite, Mercado Pago). `GET /api/checkout` y `/api/me` informan `providers: ["mp", "flow"]` según las claves presentes. Si Mercado Pago autoriza una suscripción mensual (preapproval) para la cuenta cobradora, se usa esa vía. Si no, Checkout Pro cobra un mes. Flow cobra un mes (orden `payment/create`). El webhook deja `plan = pro` por 31 días. Para renovar, la empresa pulsa de nuevo el cobro. El plan no se activa por `?pago=ok` en la URL: solo tras consultar el pago en la API de Mercado Pago o `payment/getStatus` de Flow.

En el panel de Mercado Pago, apunte las notificaciones a `https://www.haberes.cl/api/mp-webhook`. En Flow, `urlConfirmation` de cada orden es `https://www.haberes.cl/api/flow-webhook`; si el dashboard pide una URL de confirmación, use la misma.

No copie secretos, contraseñas ni cadenas de conexión a git, README, comentarios ni archivos de entorno versionados.
