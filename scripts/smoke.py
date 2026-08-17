"""
Smoke test de interfaz para Haberes.

No reemplaza a scripts/verify.mjs (que valida cálculo y contenido).
Aquí se comprueba lo que solo se ve en un navegador real:
  - errores de consola y peticiones fallidas
  - desborde horizontal en 360 px
  - áreas táctiles menores a 44 px
  - cajón de navegación, picker, diálogo y avisos flotantes
Genera capturas en /tmp/shots.
"""

import functools
import http.server
import os
import socketserver
import sys
import threading

from playwright.sync_api import sync_playwright

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PORT = 8099
BASE = f"http://127.0.0.1:{PORT}"


class Quiet(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *args):
        pass


def serve():
    """Servidor estático propio: el test no depende de un proceso externo."""
    handler = functools.partial(Quiet, directory=ROOT)
    socketserver.TCPServer.allow_reuse_address = True
    httpd = socketserver.TCPServer(("127.0.0.1", PORT), handler)
    threading.Thread(target=httpd.serve_forever, daemon=True).start()
    return httpd
SHOTS = "/tmp/shots"
PAGES = [
    ("index.html", "inicio"),
    ("sueldo.html", "sueldo"),
    ("finiquito.html", "finiquito"),
    ("empresa.html", "empresa"),
    ("precios.html", "precios"),
    ("como.html", "como"),
]
MOBILE = {"width": 360, "height": 780}
DESKTOP = {"width": 1280, "height": 900}

problems = []
os.makedirs(SHOTS, exist_ok=True)


def note(msg):
    problems.append(msg)
    print(f"  !! {msg}")


def audit(page, label, viewport):
    """Desborde horizontal y áreas táctiles."""
    overflow = page.evaluate(
        """() => {
          const de = document.documentElement;
          const out = [];
          if (de.scrollWidth > de.clientWidth + 1) {
            for (const el of document.querySelectorAll('body *')) {
              const r = el.getBoundingClientRect();
              if (r.width === 0) continue;
              // un elemento dentro de un carrusel con scroll propio no desborda la página
              let inScroller = false;
              for (let a = el.parentElement; a && a !== document.body; a = a.parentElement) {
                const ov = getComputedStyle(a).overflowX;
                if ((ov === 'auto' || ov === 'scroll') && a.scrollWidth > a.clientWidth) {
                  inScroller = true;
                  break;
                }
              }
              if (inScroller) continue;
              if (r.right > de.clientWidth + 1 || r.left < -1) {
                out.push({
                  tag: el.tagName.toLowerCase(),
                  cls: (el.className && el.className.baseVal) || String(el.className || ''),
                  right: Math.round(r.right),
                  left: Math.round(r.left),
                });
                if (out.length > 6) break;
              }
            }
            return { over: de.scrollWidth - de.clientWidth, nodes: out };
          }
          return null;
        }"""
    )
    if overflow:
        note(f"{label} [{viewport['width']}px] desborde {overflow['over']}px: {overflow['nodes']}")

    small = page.evaluate(
        """() => {
          const out = [];
          const sel = 'a[href], button, input:not([type=hidden]), label.btn, .picker-trigger';
          for (const el of document.querySelectorAll(sel)) {
            const r = el.getBoundingClientRect();
            if (r.width === 0 || r.height === 0) continue;
            const cs = getComputedStyle(el);
            if (cs.display === 'contents') continue;
            // enlaces dentro de prosa e insignias no son objetivos táctiles primarios
            if (el.tagName === 'A' && el.closest('p, li, .footer-legal, .footer-credit, .prose')) continue;
            if (el.type === 'checkbox' || el.type === 'radio') continue;
            if (r.height < 40) {
              out.push({
                tag: el.tagName.toLowerCase(),
                cls: String(el.className || '').slice(0, 48),
                h: Math.round(r.height),
                txt: (el.textContent || '').trim().slice(0, 28),
              });
            }
          }
          return out.slice(0, 8);
        }"""
    )
    if small and viewport["width"] <= 480:
        note(f"{label} [{viewport['width']}px] objetivos táctiles bajo 40px: {small}")


def run():
    with sync_playwright() as p:
        browser = p.chromium.launch()

        for viewport, tag in ((MOBILE, "movil"), (DESKTOP, "escritorio")):
            ctx = browser.new_context(viewport=viewport, device_scale_factor=2)
            page = ctx.new_page()
            errors = []
            page.on("console", lambda m: errors.append(m.text) if m.type == "error" else None)
            page.on("pageerror", lambda e: errors.append(f"pageerror: {e}"))
            ignore = ("googletagmanager", "fonts.g", "/api/")
            page.on(
                "requestfailed",
                lambda r: errors.append(f"request failed: {r.url}")
                if not any(x in r.url for x in ignore)
                else None,
            )
            page.on(
                "response",
                lambda r: errors.append(f"HTTP {r.status}: {r.url}")
                if r.status >= 400 and not any(x in r.url for x in ignore)
                else None,
            )

            for file, label in PAGES:
                errors.clear()
                print(f"[{tag}] {label}")
                page.goto(f"{BASE}/{file}", wait_until="networkidle")
                page.wait_for_timeout(350)
                audit(page, label, viewport)
                page.screenshot(path=f"{SHOTS}/{tag}-{label}.png", full_page=True)
                real = [e for e in errors if "/api/" not in e and "404" not in e]
                if real:
                    note(f"{label} [{tag}] consola: {real[:4]}")

            ctx.close()

        # ---- Interacciones en móvil ----
        ctx = browser.new_context(viewport=MOBILE, device_scale_factor=2)
        page = ctx.new_page()
        js_errors = []
        page.on("pageerror", lambda e: js_errors.append(str(e)))

        print("[interacción] cajón de navegación")
        page.goto(f"{BASE}/index.html", wait_until="networkidle")
        page.click("[data-nav-burger]")
        page.wait_for_timeout(400)
        if page.is_hidden("[data-nav-drawer]"):
            note("el cajón de navegación no se abrió")
        else:
            page.screenshot(path=f"{SHOTS}/movil-drawer.png")
        page.keyboard.press("Escape")
        page.wait_for_timeout(350)
        if not page.is_hidden("[data-nav-drawer]"):
            note("el cajón no se cerró con Escape")

        print("[interacción] picker como hoja inferior")
        page.goto(f"{BASE}/sueldo.html", wait_until="networkidle")
        page.wait_for_timeout(400)
        trigger = page.query_selector("#pickAfp .picker-trigger")
        if not trigger:
            note("no se encontró el picker de AFP en /sueldo")
        else:
            trigger.click()
            page.wait_for_timeout(400)
            if not page.query_selector(".picker-backdrop"):
                note("el picker no montó el velo en móvil")
            else:
                capas = page.evaluate(
                    """() => ({
                      velo: +getComputedStyle(document.querySelector('.picker-backdrop')).zIndex,
                      cabecera: +getComputedStyle(document.querySelector('.site-header')).zIndex,
                      hoja: +getComputedStyle(document.querySelector('.picker.is-open .picker-panel')).zIndex,
                    })"""
                )
                if capas["velo"] <= capas["cabecera"]:
                    note(f"el velo del picker queda bajo la cabecera: {capas}")
                if capas["hoja"] <= capas["velo"]:
                    note(f"la hoja del picker queda bajo su propio velo: {capas}")
            page.screenshot(path=f"{SHOTS}/movil-picker.png")
            opts = page.query_selector_all("#pickAfp .picker-option")
            if len(opts) < 2:
                note("el picker de AFP no listó opciones")
            else:
                opts[1].click()
                page.wait_for_timeout(300)
                if page.query_selector(".picker-backdrop"):
                    note("el velo del picker quedó tras elegir")
                if page.evaluate("document.body.classList.contains('is-locked')"):
                    note("el scroll quedó bloqueado tras cerrar el picker")

        print("[interacción] alta, diálogo y avisos en /empresa")
        page.goto(f"{BASE}/empresa.html", wait_until="networkidle")
        page.wait_for_timeout(400)
        # el radio está recortado y con pointer-events:none; se activa por su etiqueta
        page.click('label:has([data-auth-modo][value="registro"])')
        page.wait_for_timeout(200)
        if page.is_hidden("#formRegistro"):
            note("el control segmentado no mostró el registro")
        page.fill("#regRazon", "Comercial Prueba SpA")
        page.fill("#regRut", "76.086.428-5")
        page.fill("#regEmail", "prueba@empresa.cl")
        page.fill("#regClave", "clave-larga-123")
        page.click("#formRegistro button[type=submit]")
        page.wait_for_timeout(900)
        if page.is_hidden("#app"):
            note(f"no se abrió el espacio de trabajo: {page.text_content('#errAuth')}")
        else:
            page.screenshot(path=f"{SHOTS}/movil-workspace.png", full_page=True)
            if not page.query_selector(".toast"):
                note("no apareció el aviso flotante tras crear la cuenta")

            page.click('[data-tab="trabajadores"]')
            page.wait_for_timeout(400)
            page.fill("#altaNombre", "Ana Pérez")
            page.fill("#altaRut", "12.345.678-5")
            page.fill("#altaCargo", "Vendedora")
            page.click("#btnAltaGuardar")
            page.wait_for_timeout(500)
            if not page.query_selector(".data-item"):
                note("la nómina no renderizó tarjetas en móvil")
            page.screenshot(path=f"{SHOTS}/movil-nomina.png", full_page=True)
            audit(page, "empresa/nomina", MOBILE)

            page.click(".only-mobile [data-del]")
            page.wait_for_timeout(450)
            if not page.query_selector(".modal-card"):
                note("el diálogo de confirmación no se abrió")
            else:
                page.screenshot(path=f"{SHOTS}/movil-dialogo.png")
                if not page.evaluate("document.body.classList.contains('is-locked')"):
                    note("el diálogo no bloqueó el scroll del fondo")
                page.keyboard.press("Escape")
                page.wait_for_timeout(500)
                if page.query_selector(".modal-card"):
                    note("el diálogo no se cerró con Escape")
                if page.evaluate("document.body.classList.contains('is-locked')"):
                    note("el scroll quedó bloqueado tras cerrar el diálogo")
                if not page.query_selector(".data-item"):
                    note("Escape borró el trabajador (debía cancelar)")

            page.click('[data-tab="documentos"]')
            page.wait_for_timeout(400)
            page.screenshot(path=f"{SHOTS}/movil-documentos.png", full_page=True)
            audit(page, "empresa/documentos", MOBILE)

        if js_errors:
            note(f"errores de JS durante la interacción: {js_errors[:4]}")

        ctx.close()
        browser.close()


httpd = serve()
try:
    run()
finally:
    httpd.shutdown()

print("\n" + "=" * 60)
if problems:
    print(f"{len(problems)} hallazgo(s):")
    for x in problems:
        print(" -", x)
    sys.exit(1)
print("Smoke test OK")
