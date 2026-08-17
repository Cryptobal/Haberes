// Genera el hash Argon2id para ADMIN_PASSWORD_HASH.
//
// Uso:
//   node scripts/admin-hash.mjs 'MiClaveSegura'
//
// Usa exactamente la misma función y parámetros con que el sitio verifica
// la clave (api/_lib.js), así el hash generado siempre es compatible.
// La clave no se guarda en ninguna parte: solo se imprime el hash.

import { hashPassword } from "../api/_lib.js";

const clave = process.argv[2];

if (!clave || clave.length < 10) {
  console.error("Uso: node scripts/admin-hash.mjs 'MiClaveSegura'");
  console.error("La clave debe tener al menos 10 caracteres.");
  process.exit(1);
}

const hash = await hashPassword(clave);
console.log("\nCopie este valor en la variable ADMIN_PASSWORD_HASH de Vercel:\n");
console.log(hash);
console.log("\nNo lo escriba en el repositorio ni en el README.");
