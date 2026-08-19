/**
 * Regenera img/og-default.png: wordmark (isotype + «Haberes») sobre paper.
 * Usa Playwright (el mismo que smoke.py) para respetar IBM Plex Sans.
 */
import { writeFileSync, unlinkSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import { INK, PAPER, markSvg } from "./brand-mark.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const tmpHtml = join(root, "img", ".og-wordmark.html");
const outPng = join(root, "img", "og-default.png");
const fontUri = new URL("../fonts/ibm-plex-sans-latin-600-normal.woff2", import.meta.url).href;

const html = `<!DOCTYPE html>
<html lang="es-CL">
<head>
  <meta charset="utf-8" />
  <style>
    @font-face {
      font-family: "IBM Plex Sans";
      font-style: normal;
      font-weight: 600;
      src: url("${fontUri}") format("woff2");
    }
    html, body {
      margin: 0;
      width: 1200px;
      height: 630px;
      background: ${PAPER};
    }
    .wordmark {
      width: 1200px;
      height: 630px;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 28px;
      color: ${INK};
    }
    .wordmark svg {
      width: 112px;
      height: 112px;
      display: block;
      flex-shrink: 0;
    }
    .word {
      font-family: "IBM Plex Sans", system-ui, sans-serif;
      font-weight: 600;
      font-size: 92px;
      letter-spacing: -0.03em;
      line-height: 1;
    }
  </style>
</head>
<body>
  <div class="wordmark">
    ${markSvg({ xmlns: true })}
    <span class="word">Haberes</span>
  </div>
</body>
</html>
`;

writeFileSync(tmpHtml, html);

const py = `
from pathlib import Path
from playwright.sync_api import sync_playwright
html = Path(${JSON.stringify(tmpHtml)})
out = Path(${JSON.stringify(outPng)})
with sync_playwright() as p:
    browser = p.chromium.launch()
    page = browser.new_page(viewport={"width": 1200, "height": 630}, device_scale_factor=1)
    page.goto(html.resolve().as_uri(), wait_until="load")
    page.evaluate("() => document.fonts.ready")
    page.wait_for_timeout(200)
    page.screenshot(path=str(out), type="png")
    browser.close()
print(out.stat().st_size)
`;

const run = spawnSync("python3", ["-c", py], { encoding: "utf8" });
try {
  unlinkSync(tmpHtml);
} catch {
  /* ignore */
}
if (run.status !== 0) {
  process.stderr.write(run.stdout + run.stderr);
  process.exit(run.status || 1);
}
console.log(`og-default.png ${String(run.stdout).trim()} bytes`);
