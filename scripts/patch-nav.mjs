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
  ["/como", "Cómo"],
  ["/precios", "Precios"],
];

const DRAWER_LINKS = [
  ["/como", "Cómo"],
  ["/precios", "Precios"],
  ["/sueldo", "Sueldo líquido"],
  ["/horas-extras", "Horas extras"],
  ["/gratificacion", "Gratificación"],
  ["/vacaciones-proporcionales", "Vacaciones proporcionales"],
  ["/finiquito", "Finiquito"],
];

const desktop = LINKS.map(([h, t]) => `        <a href="${h}" data-nav>${t}</a>`).join("\n");
const drawer = DRAWER_LINKS.map(([h, t]) => `        <a href="${h}" data-nav>${t}</a>`).join("\n");

const BLOCK = `      <div class="nav-links">
${desktop}
      </div>
      <div class="nav-actions">
        <button type="button" class="theme-toggle" data-theme-toggle aria-label="Cambiar a modo noche" aria-pressed="false">
          <svg class="ic-sun" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="4"/><path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.64 5.64l1.41 1.41M16.95 16.95l1.41 1.41M18.36 5.64l-1.41 1.41M7.05 16.95l-1.41 1.41"/></svg>
          <svg class="ic-moon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 14.35A8.4 8.4 0 1 1 9.65 3 6.6 6.6 0 0 0 21 14.35z"/></svg>
        </button>
        <a class="btn btn-ghost btn-sm nav-login" href="/empresa">Entrar</a>
        <a class="btn btn-sm nav-cta" href="/empresa?registro=1">Empezar gratis</a>
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
          <a class="btn" href="/empresa?registro=1">Empezar gratis</a>
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
  if (html.includes("Empezar gratis") && html.includes('href="/como" data-nav>Cómo</a>')) continue;
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
