# Uso de IA — memo interno (no es documento de cliente)

Este archivo es para quien opera Haberes. No va en el sitio, el sitemap, el menú ni `robots`.
`.vercelignore` excluye `docs/` del deploy. El servidor local responde 404 a `/docs`.

## Qué es el producto

Haberes es una calculadora determinista de sueldo líquido, finiquito y documentos de apoyo en Chile.
Usa tablas publicadas (AFP, impuesto único, topes) y UF/UTM (mindicador.cl + respaldo).
No es un modelo que decida sobre personas (contratación, crédito, scoring).

«Exactitud» aquí significa usar las cifras y reglas publicadas, no una métrica de aprendizaje automático.

## Cómo usamos asistentes

Usamos asistentes (Cursor y agentes) para escribir código y operar el producto.
No se pegan en chats ni se usan para entrenar modelos: liquidaciones de clientes, claves,
tokens de pago ni datos de trabajadores.

## Qué no decimos en público

Haberes no se presenta como «IA». No hay páginas públicas de ética, sesgo, exactitud de modelos
ni gobernanza de IA (`/ia`, `/etica`, `/gobernanza` no existen y no se crean).

## Riesgos

- Cálculo laboral mal aplicado → el disclaimer ya lo dice: no es DT ni Previred; el usuario verifica con contador o canales oficiales.
- Filtración → R2 privado, clave como hash, sin datos de tarjeta; el correo sale solo a direcciones que cargó la empresa.
- Texto de privacidad desactualizado → se reescribe cuando cambia el stack.

## Mejora continua

Cuando cambian las reglas o las tablas, se actualizan en el código.
Cuando cambia dónde se guardan los datos, se actualiza `/privacidad`.
Este memo no se enlaza desde el producto.
