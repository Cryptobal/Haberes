# Haberes

Sitio estático para estimar **sueldo líquido**, **finiquito** y **liquidaciones** de pymes en Chile.

Estimación generada por inteligencia artificial. **No** es un cálculo de la Dirección del Trabajo ni de Previred. **No** constituye asesoría legal.

## Uso local

Abra `index.html` o despliegue en Vercel (`vercel.json` con `cleanUrls`).

```
node scripts/verify.mjs   # cálculo, contenido y contratos de API (376 aserciones)
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
- `/empresa` cuenta de empresa (RUT + correo + clave), perfil, logo, firma, CSV, liquidación y carta de finiquito
- `/como` cómo funciona
- `/precios` registro gratis; Gratis 5 movimientos/mes; Pro $14.990 + IVA / mes
- `/admin` operadores (no está en el sitemap; exige `ADMIN_EMAILS` + `ADMIN_PASSWORD_HASH`)
- `/reset` cambio de clave con token de un solo uso (no está en el sitemap)

Los trabajadores de la liquidación viven en `localStorage` de este navegador.

## Cuentas en Postgres (opcional)

Si el entorno de despliegue define `DATABASE_URL`, las APIs `/api/register`, `/api/login`, `/api/reset-request` y `/api/reset-confirm` usan esa base. Si falta, las APIs responden 501 (`no_backend`) y la interfaz sigue en modo solo local, sin fingir que se envió un correo.

El esquema está en `sql/001.sql` (cuentas), `sql/002.sql` (giro, dirección, clave de logo y documentos), `sql/003.sql` (firma, `disabled_at`, sesiones de admin) y `sql/004.sql` (plan Gratis/Pro y movimientos del mes). Se aplica en el primer request si es seguro. Las migraciones incrementales no borran cuentas existentes.

Opcional en el host, nunca en el repositorio:

- `DATABASE_URL` — conexión de la app
- `DATABASE_URL_UNPOOLED` — preferida para aplicar el SQL
- `RESEND_API_KEY` y `RESEND_FROM` — solo si quiere envío real del enlace de recuperación
- `PUBLIC_ORIGIN` — origen público del enlace (por defecto https://www.haberes.cl)
- `R2_ACCOUNT_ID` (o `CLOUDFLARE_ACCOUNT_ID`, `CF_ACCOUNT_ID`), `R2_ACCESS_KEY_ID` (o `AWS_ACCESS_KEY_ID`, `R2_ACCESS_KEY`), `R2_SECRET_ACCESS_KEY` (o `AWS_SECRET_ACCESS_KEY`, `R2_SECRET`), `R2_BUCKET` (o `R2_BUCKET_NAME`, `BUCKET_NAME`) — depósito privado para logos, firmas y PDF. Si faltan, `/api/logo`, `/api/firma` y `/api/documento` responden 501 (`no_storage`) y la interfaz lo dice; no se finge la subida. `/api/me`, `/api/admin-me` y `GET /api/storage` informan solo `{ storage: true|false }`, sin nombres ni valores de variables.
- `ADMIN_EMAILS` — correos de operadores, separados por coma
- `ADMIN_PASSWORD_HASH` — hash Argon2id de la clave de admin. Sin ambos, `/admin` responde 503 (`admin_unavailable`). No hay clave por defecto.

No copie secretos, contraseñas ni cadenas de conexión a git, README, comentarios ni archivos de entorno versionados.
