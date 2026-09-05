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

import os
import subprocess
import sys
import time
import urllib.error
import urllib.request

from playwright.sync_api import sync_playwright

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PORT = 8099
BASE = f"http://127.0.0.1:{PORT}"


def serve():
    """Mismo servidor que npm start (cleanUrls + sitemap), en el puerto 8099."""
    env = os.environ.copy()
    env["PORT"] = str(PORT)
    env["HOST"] = "127.0.0.1"
    proc = subprocess.Popen(
        ["node", os.path.join(ROOT, "scripts/serve.mjs")],
        cwd=ROOT,
        env=env,
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
    )
    deadline = time.time() + 10
    while time.time() < deadline:
        if proc.poll() is not None:
            raise RuntimeError("scripts/serve.mjs salió antes de escuchar")
        try:
            urllib.request.urlopen(BASE + "/", timeout=0.4)
            return proc
        except Exception:
            time.sleep(0.1)
    proc.terminate()
    raise RuntimeError("scripts/serve.mjs no respondió en http://127.0.0.1:8099")


def check_http():
    """Sitemap y las guías espesadas deben responder como en Vercel."""
    cases = [
        ("/sitemap.xml", 200, "xml"),
        ("/sitemap", 200, "xml"),
        ("/api/sitemap", 200, "xml"),
        ("/guias/liquidacion-de-sueldo", 200, "html"),
        ("/guias/finiquito", 200, "html"),
        ("/guias/impuesto-unico", 200, "html"),
        ("/guias/carta-aviso-termino-contrato", 200, "html"),
        ("/guias/gratificacion-legal", 200, "html"),
        ("/guias/indemnizacion-por-anos-de-servicio", 200, "html"),
        ("/guias/semana-corrida", 200, "html"),
        ("/guias/aguinaldo-fiestas-patrias", 200, "html"),
        ("/horas-extras", 200, "html"),
        ("/vacaciones-proporcionales", 200, "html"),
        ("/gratificacion", 200, "html"),
        ("/impuesto-unico", 200, "html"),
        ("/cotizaciones-previsionales", 200, "html"),
        ("/costo-empresa", 200, "html"),
        ("/seguro-cesantia", 200, "html"),
        ("/recargo-domingo-comercio", 200, "html"),
        ("/feriado-irrenunciable", 200, "html"),
        ("/semana-corrida", 200, "html"),
        ("/asignacion-familiar", 200, "html"),
        ("/colacion-movilizacion", 200, "html"),
        ("/sueldo-minimo", 200, "html"),
        ("/descuento-atrasos", 200, "html"),
        ("/licencia-medica", 200, "html"),
        ("/boleta-honorarios", 200, "html"),
        ("/feriado-anual", 200, "html"),
        ("/feriado-progresivo", 200, "html"),
        ("/indemnizacion-anos-servicio", 200, "html"),
        ("/aguinaldo", 200, "html"),
        ("/finiquito-casa-particular", 200, "html"),
        ("/sueldo-proporcional", 200, "html"),
        ("/indemnizacion-aviso-previo", 200, "html"),
        ("/blog", 404, None),
        ("/noticias", 404, None),
    ]
    for path, expected, kind in cases:
        req = urllib.request.Request(BASE + path, headers={"User-Agent": "curl/8.0"})
        try:
            with urllib.request.urlopen(req, timeout=8) as res:
                status = res.status
                ctype = res.headers.get("Content-Type") or ""
                disp = res.headers.get("Content-Disposition") or ""
                body = res.read()
        except urllib.error.HTTPError as e:
            status = e.code
            ctype = e.headers.get("Content-Type") or ""
            disp = e.headers.get("Content-Disposition") or ""
            body = e.read()
        if status != expected:
            note(f"{path} status {status} (esperado {expected})")
            continue
        if kind == "xml":
            if "text/xml" not in ctype.lower():
                note(f"{path} content-type {ctype!r}")
            if disp:
                note(f"{path} content-disposition {disp!r}")
            if b"<urlset" not in body:
                note(f"{path} sin urlset")
        if kind == "html" and b"<h1" not in body:
            note(f"{path} HTML incompleto")


SHOTS = "/tmp/shots"
PAGES = [
    ("index.html", "inicio"),
    ("sueldo.html", "sueldo"),
    ("horas-extras.html", "horas-extras"),
    ("vacaciones-proporcionales.html", "vacaciones-proporcionales"),
    ("gratificacion.html", "gratificacion"),
    ("impuesto-unico.html", "impuesto-unico"),
    ("cotizaciones-previsionales.html", "cotizaciones-previsionales"),
    ("costo-empresa.html", "costo-empresa"),
    ("seguro-cesantia.html", "seguro-cesantia"),
    ("recargo-domingo-comercio.html", "recargo-domingo-comercio"),
    ("feriado-irrenunciable.html", "feriado-irrenunciable"),
    ("semana-corrida.html", "semana-corrida"),
    ("asignacion-familiar.html", "asignacion-familiar"),
    ("colacion-movilizacion.html", "colacion-movilizacion"),
    ("sueldo-minimo.html", "sueldo-minimo"),
    ("feriado-progresivo.html", "feriado-progresivo"),
    ("indemnizacion-anos-servicio.html", "indemnizacion-anos-servicio"),
    ("aguinaldo.html", "aguinaldo"),
    ("finiquito-casa-particular.html", "finiquito-casa-particular"),
    ("sueldo-proporcional.html", "sueldo-proporcional"),
    ("descuento-atrasos.html", "descuento-atrasos"),
    ("licencia-medica.html", "licencia-medica"),
    ("boleta-honorarios.html", "boleta-honorarios"),
    ("feriado-anual.html", "feriado-anual"),
    ("indemnizacion-aviso-previo.html", "indemnizacion-aviso-previo"),
    ("finiquito.html", "finiquito"),
    ("empresa.html", "empresa"),
    ("precios.html", "precios"),
    ("como.html", "como"),
    ("privacidad.html", "privacidad"),
    ("terminos.html", "terminos"),
    ("admin.html", "admin"),
    ("guias.html", "guias"),
    ("guias/liquidacion-de-sueldo.html", "guia-liquidacion"),
    ("guias/finiquito.html", "guia-finiquito"),
    ("guias/impuesto-unico.html", "guia-impuesto"),
    ("guias/carta-aviso-termino-contrato.html", "guia-carta"),
    ("guias/gratificacion-legal.html", "guia-gratificacion"),
    ("guias/indemnizacion-por-anos-de-servicio.html", "guia-ias"),
    ("guias/semana-corrida.html", "guia-semana-corrida"),
    ("guias/aguinaldo-fiestas-patrias.html", "guia-aguinaldo-fiestas-patrias"),
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

        print("[marca] isotype en inicio y tema noche")
        mark_ctx = browser.new_context(viewport=DESKTOP, device_scale_factor=2)
        mark_page = mark_ctx.new_page()
        mark_page.goto(f"{BASE}/", wait_until="networkidle")
        mark_page.wait_for_timeout(250)
        mark_day = mark_page.evaluate(
            """() => {
              const mark = document.querySelector('.brand-mark');
              const svg = mark && mark.querySelector('svg');
              return {
                hasSvg: Boolean(svg),
                rects: svg ? svg.querySelectorAll('rect').length : 0,
                day: mark ? getComputedStyle(mark).color : '',
                letterH: mark ? (mark.textContent || '').trim() : '',
              };
            }"""
        )
        mark_page.evaluate("document.documentElement.setAttribute('data-theme', 'night')")
        mark_page.wait_for_timeout(200)
        mark_night = mark_page.evaluate(
            """() => {
              const mark = document.querySelector('.brand-mark');
              const root = getComputedStyle(document.documentElement);
              return {
                night: mark ? getComputedStyle(mark).color : '',
                fill: mark ? getComputedStyle(mark.querySelector('svg')).fill : '',
                paper: root.getPropertyValue('--paper').trim(),
                ink: root.getPropertyValue('--ink').trim(),
              };
            }"""
        )
        mark_info = {**(mark_day or {}), **(mark_night or {})}
        if not mark_info.get("hasSvg") or mark_info.get("rects") != 11:
            note(f"inicio sin isotype SVG de 11 rects: {mark_info}")
        if mark_info.get("letterH"):
            note(f"brand-mark aún muestra texto: {mark_info['letterH']!r}")
        if mark_info.get("ink", "").lower() != "#6fe3b4":
            note(f"noche --ink no es el mint de marca: {mark_info.get('ink')!r}")
        night_color = mark_info.get("night") or ""
        if "111, 227, 180" not in night_color:
            note(f"marca de noche no toma currentColor mint: {night_color!r}")
        mark_page.screenshot(path=f"{SHOTS}/escritorio-inicio-noche-marca.png")
        mark_ctx.close()

        for viewport, tag in ((MOBILE, "movil"), (DESKTOP, "escritorio")):
            ctx = browser.new_context(viewport=viewport, device_scale_factor=2)
            page = ctx.new_page()
            errors = []
            page.on("console", lambda m: errors.append(m.text) if m.type == "error" else None)
            page.on("pageerror", lambda e: errors.append(f"pageerror: {e}"))
            ignore = ("googletagmanager", "google-analytics", "fonts.g", "/api/")
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
                real = [
                    e
                    for e in errors
                    if "/api/" not in e and "404" not in e and "501" not in e
                ]
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

        print("[interacción] hamburguesa en /admin")
        page.goto(f"{BASE}/admin.html", wait_until="networkidle")
        page.wait_for_timeout(300)
        if page.locator("#adminAuth").count() == 0:
            note("admin no mostró el acceso")
        if page.locator('[data-tab="suscripciones"]').count() == 0:
            note("admin no trae la pestaña Suscripciones")
        if page.locator('[data-tab="outbound"]').count() == 0:
            note("admin no trae la pestaña Outbound")
        page.click("[data-nav-burger]")
        page.wait_for_timeout(400)
        drawer_admin = page.locator("#navDrawer")
        if drawer_admin.get_attribute("hidden") is not None:
            note("el cajón de /admin sigue hidden tras el clic")
        else:
            panel_admin = page.locator("#navDrawer .nav-drawer-panel")
            box_a = panel_admin.bounding_box()
            vp_a = page.viewport_size
            if box_a and box_a["y"] + box_a["height"] < vp_a["height"] * 0.7:
                note(f"el cajón de /admin quedó atrapado en la cabecera: {box_a}")
            page.screenshot(path=f"{SHOTS}/movil-admin-drawer.png")
            page.keyboard.press("Escape")
            page.wait_for_timeout(300)

        print("[interacción] hamburguesa 390px")
        ctx390 = browser.new_context(viewport={"width": 390, "height": 844}, device_scale_factor=2)
        page390 = ctx390.new_page()
        page390.goto(f"{BASE}/index.html", wait_until="networkidle")
        page390.wait_for_timeout(350)
        burger390 = page390.locator("[data-nav-burger]")
        if burger390.count() == 0 or not burger390.is_visible():
            note("hamburguesa no visible a 390px")
        else:
            box_b = burger390.bounding_box()
            if box_b and (box_b["width"] < 44 or box_b["height"] < 44):
                note(f"hamburguesa bajo 44px a 390px: {box_b}")
            burger390.click()
            page390.wait_for_timeout(400)
            drawer390 = page390.locator("#navDrawer")
            if drawer390.get_attribute("hidden") is not None:
                note("el cajón #navDrawer sigue hidden tras clic a 390px")
            elif page390.is_hidden("#navDrawer"):
                note("el cajón #navDrawer no es visible tras clic a 390px")
            else:
                panel = page390.locator("#navDrawer .nav-drawer-panel")
                box = panel.bounding_box()
                vp = page390.viewport_size
                if not box:
                    note("el panel del cajón no tiene caja a 390px")
                elif box["y"] + box["height"] < vp["height"] * 0.7:
                    note(f"el panel no está anclado al fondo a 390px: {box}")
                if page390.locator("#navDrawer a").count() < 5:
                    note("el cajón no listó los enlaces")
                if page390.locator("[data-nav-close]").count() == 0:
                    note("el cajón no tiene botón Cerrar")
                page390.screenshot(path=f"{SHOTS}/movil-390-drawer.png")
                page390.click("[data-nav-close]")
                page390.wait_for_timeout(350)
                if drawer390.get_attribute("hidden") is None:
                    note("Cerrar no ocultó #navDrawer a 390px")
                burger390.click()
                page390.wait_for_timeout(350)
                if drawer390.get_attribute("hidden") is not None:
                    note("el segundo clic no reabrió el cajón a 390px")
                else:
                    page390.locator("[data-nav-scrim]").click(position={"x": 10, "y": 10}, force=True)
                    page390.wait_for_timeout(350)
                    if drawer390.get_attribute("hidden") is None:
                        note("el velo no cerró #navDrawer a 390px")
        ctx390.close()

        print("[interacción] fecha de finiquito como calendario")
        page.goto(f"{BASE}/finiquito.html", wait_until="networkidle")
        page.wait_for_timeout(400)
        ingreso = page.locator("#pickIngreso .picker-trigger")
        if ingreso.count() == 0:
            note("no se encontró el campo de fecha de ingreso en /finiquito")
        else:
            txt = (ingreso.text_content() or "").lower()
            if "enero" not in txt:
                note(f"la fecha de ingreso no muestra el mes completo: {txt!r}")
            if page.locator("#pickIngreso [data-pick-m]").count():
                note("el finiquito público sigue usando tres selects de fecha")
            ingreso.click()
            page.wait_for_timeout(400)
            cal = page.locator("#pickIngreso .date-cal-grid")
            if cal.count() == 0 or not cal.is_visible():
                note("el calendario de ingreso no se abrió")
            else:
                caption = (page.locator("#pickIngreso .date-cal-caption").text_content() or "").lower()
                if "enero" not in caption:
                    note(f"el calendario no muestra el mes en el título: {caption!r}")
                page.screenshot(path=f"{SHOTS}/movil-finiquito-calendario.png")
            page.keyboard.press("Escape")
            page.wait_for_timeout(250)
            if page.locator("#pickIngreso.is-open").count():
                note("Escape no cerró el calendario de ingreso")

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

            # Libro de Remuneraciones Electrónico (LRE)
            if not page.query_selector("#lreRegionPick .picker-trigger"):
                note("el selector de región del LRE no renderizó")
            if page.is_hidden("#lreFaltantes"):
                note("el LRE no avisa los datos faltantes (la trabajadora no tiene fecha de ingreso)")
            elif "fecha de ingreso" not in (page.text_content("#lreFaltantes") or ""):
                note("la nota de faltantes del LRE no menciona la fecha de ingreso")
            page.fill("#lreComuna", "13101")
            page.click("#btnLreCsv")
            page.wait_for_timeout(400)
            if page.is_hidden("#errLre"):
                note("el LRE no bloqueó la descarga en plan Gratis (es una función Pro)")
            elif "Pro" not in (page.text_content("#errLre") or ""):
                note("el error del LRE en plan Gratis no explica que es una función Pro")
            page.locator("#btnLreCsv").scroll_into_view_if_needed()
            page.screenshot(path=f"{SHOTS}/movil-lre.png")

        if js_errors:
            note(f"errores de JS durante la interacción: {js_errors[:4]}")

        ctx.close()
        browser.close()


httpd = serve()
try:
    check_http()
    run()
finally:
    httpd.terminate()
    try:
        httpd.wait(timeout=5)
    except subprocess.TimeoutExpired:
        httpd.kill()
        httpd.wait(timeout=3)

print("\n" + "=" * 60)
if problems:
    print(f"{len(problems)} hallazgo(s):")
    for x in problems:
        print(" -", x)
    sys.exit(1)
print("Smoke test OK")
