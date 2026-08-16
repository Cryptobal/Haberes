/**
 * Google Analytics 4 — desactivado por defecto (sin peticiones).
 *
 * Para activarlo más adelante, defina un ID de medición G-… válido:
 *   <script>window.HABERES_GA4 = "G-XXXXXXXXXX";</script>
 *   <script src="js/analytics.js" defer></script>
 * Si HABERES_GA4 está vacío, no es un G-…, o no existe, no se carga gtag
 * ni se llama a Google. No use un identificador de ejemplo.
 */
(function () {
  var raw = typeof window !== "undefined" ? window.HABERES_GA4 : "";
  var id = typeof raw === "string" ? raw.trim() : "";
  if (!id || !/^G-[A-Z0-9]{6,}$/i.test(id)) return;

  window.dataLayer = window.dataLayer || [];
  function gtag() {
    window.dataLayer.push(arguments);
  }
  window.gtag = gtag;
  gtag("js", new Date());
  gtag("config", id);

  var s = document.createElement("script");
  s.async = true;
  s.src = "https://www.googletagmanager.com/gtag/js?id=" + encodeURIComponent(id);
  document.head.appendChild(s);
})();
