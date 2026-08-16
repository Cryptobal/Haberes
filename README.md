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
- `/empresa` cuenta local (RUT + correo + clave), CSV, impresión

Los datos de empresa viven en `localStorage` de este navegador.
