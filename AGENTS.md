# Haberes — notas para agentes

Sitio estático (HTML/JS/CSS) para estimar sueldo líquido, finiquito y liquidaciones en Chile. Las APIs viven en `api/` y se despliegan en Vercel.

## Cómo correrlo

```
npm ci
npm start                 # http://127.0.0.1:8080 (cleanUrls, como Vercel)
node scripts/verify.mjs   # cálculo, contenido y contratos de API
python3 scripts/smoke.py  # interfaz en Playwright (360 px y 1280 px)
```

`npm start` sirve archivos locales. `/sueldo` resuelve a `sueldo.html`. Las rutas `/api/*` responden `501 { ok: false, error: "no_backend" }` porque no hay funciones serverless ni `DATABASE_URL` en este servidor. La calculadora, finiquito y el modo empresa en `localStorage` funcionan igual.

## Cursor Cloud specific instructions

- Tras el arranque, el sitio queda en `http://127.0.0.1:8080`.
- Use `npm run verify` para validar cifras y contenido sin navegador.
- `python3 scripts/smoke.py` levanta su propio servidor en el puerto 8099; no depende de `npm start`.
- No copie secretos (`DATABASE_URL`, `RESEND_*`, `R2_*`, `ADMIN_*`, tokens de Mercado Pago) al repositorio. Sin ellos, las APIs de cuenta/pago/correo responden 501/503 de forma explícita.
- No hace falta Postgres para demostrar la UI. Con `DATABASE_URL` las cuentas pasan a Postgres; sin ella la interfaz sigue en modo solo local.
