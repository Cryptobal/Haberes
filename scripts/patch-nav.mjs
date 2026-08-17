/**
 * Reescribe la cabecera de todas las páginas con la navegación nueva:
 * enlaces de escritorio + botón hamburguesa + cajón inferior en móvil.
 * Se ejecuta una sola vez; es idempotente (no toca páginas ya migradas).
 */
import { readFileSync, writeFileSync, readdirSync, statSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

const LINKS = [
  ["/sueldo", "Sueldo líquido"],
  ["/finiquito", "Finiquito"],
  ["/empresa", "Para mi empresa"],
  ["/como", "Cómo funciona"],
  ["/precios", "Precios"],
];

const desktop = LINKS.map(([h, t]) => `        <a href="${h}" data-nav>${t}</a>`).join("\n");
const drawer = LINKS.map(([h, t]) => `        <a href="${h}" data-nav>${t}</a>`).join("\n");

const BLOCK = `      <div class="nav-links">
${desktop}
      </div>
      <div class="nav-actions">
        <button type="button" class="theme-toggle" data-theme-toggle aria-label="Cambiar a modo noche" aria-pressed="false">
          <span data-theme-label>Día</span>
        </button>
        <a class="btn btn-sm nav-cta" href="/empresa">Entrar</a>
        <button type="button" class="nav-burger" data-nav-burger aria-expanded="false" aria-controls="navDrawer" aria-label="Abrir menú">
          <i aria-hidden="true"></i>
        </button>
      </div>
    </nav>
  </header>
  <div class="nav-drawer" id="navDrawer" data-nav-drawer hidden>
      <div class="nav-drawer-scrim" data-nav-scrim></div>
      <div class="nav-drawer-panel" role="dialog" aria-modal="true" aria-label="Menú de navegación">
        <div class="nav-drawer-grab" aria-hidden="true"></div>
${drawer}
        <div class="nav-drawer-foot">
          <a class="btn" href="/empresa">Entrar a mi empresa</a>
          <button type="button" class="btn btn-ghost" data-nav-close>Cerrar</button>
        </div>
      </div>
    </div>`;

const files = [];
function walk(dir, base = "") {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    const rel = base ? `${base}/${name}` : name;
    if (statSync(full).isDirectory()) {
      if (["node_modules", "api", "scripts", "sql", "ejemplos", "fonts", "img", "css", "js"].includes(name)) continue;
      walk(full, rel);
    } else if (name.endsWith(".html")) {
      files.push(rel);
    }
  }
}
walk(root);

let changed = 0;

for (const f of files) {
  const path = join(root, f);
  const html = readFileSync(path, "utf8");
  if (html.includes("data-nav-drawer")) continue;
  const next = html.replace(
    /( {6}<div class="nav-links">[\s\S]*?<\/div>\n {4}<\/nav>)/,
    BLOCK,
  );
  if (next === html) {
    console.error(`sin cambios: ${f}`);
    continue;
  }
  writeFileSync(path, next);
  changed += 1;
}

console.log(`nav actualizada en ${changed} página(s)`);
