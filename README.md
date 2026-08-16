# Haberes

Sitio estático para estimar **sueldo líquido**, **finiquito** y **liquidaciones** de pymes en Chile.

Estimación generada por inteligencia artificial. **No** es un cálculo de la Dirección del Trabajo ni de Previred. **No** constituye asesoría legal.

## Uso local

Abra `index.html` o despliegue en Vercel (`vercel.json` con `cleanUrls`).

```
node scripts/verify.mjs
```

UF y UTM se leen de [mindicador.cl](https://mindicador.cl/api) con caché de 12 horas. Si la UF sale del rango 20.000–80.000 se usa el valor de respaldo.

## Páginas

- `/` inicio
- `/sueldo` calculadora simple y completa
- `/finiquito` arts. 159 / 160 / 161
- `/empresa` cuenta de empresa (RUT + correo + clave), CSV, impresión
- `/reset` cambio de clave con token de un solo uso (no está en el sitemap)

Los trabajadores de la liquidación viven en `localStorage` de este navegador.

## Cuentas en Postgres (opcional)

Si el entorno de despliegue define `DATABASE_URL`, las APIs `/api/register`, `/api/login`, `/api/reset-request` y `/api/reset-confirm` usan esa base. Si falta, las APIs responden 501 (`no_backend`) y la interfaz sigue en modo solo local, sin fingir que se envió un correo.

Opcional en el host, nunca en el repositorio:

- `DATABASE_URL` — conexión de la app
- `DATABASE_URL_UNPOOLED` — preferida para aplicar `sql/001.sql`
- `RESEND_API_KEY` y `RESEND_FROM` — solo si quiere envío real del enlace de recuperación
- `PUBLIC_ORIGIN` — origen público del enlace (por defecto https://www.haberes.cl)

No copie secretos, contraseñas ni cadenas de conexión a git, README, comentarios ni archivos de entorno versionados. El esquema está en `sql/001.sql` (sin secretos) y se aplica en el primer request si es seguro.
