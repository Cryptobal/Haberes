const KEY = "haberes:theme";

function preferred() {
  try {
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "night" : "day";
  } catch {
    return "day";
  }
}

export function currentTheme() {
  try {
    const t = localStorage.getItem(KEY);
    if (t === "day" || t === "night") return t;
  } catch {
    /* ignore */
  }
  return preferred();
}

export function applyTheme(theme) {
  const t = theme === "night" ? "night" : "day";
  document.documentElement.setAttribute("data-theme", t);
  document.querySelectorAll("[data-theme-toggle]").forEach((btn) => {
    btn.setAttribute("aria-label", t === "night" ? "Cambiar a modo día" : "Cambiar a modo noche");
    btn.setAttribute("aria-pressed", t === "night" ? "true" : "false");
    const label = btn.querySelector("[data-theme-label]");
    if (label) label.textContent = t === "night" ? "Noche" : "Día";
  });
}

export function setTheme(theme) {
  const t = theme === "night" ? "night" : "day";
  try {
    localStorage.setItem(KEY, t);
  } catch {
    /* ignore */
  }
  applyTheme(t);
}

export function wireThemeToggle() {
  applyTheme(currentTheme());
  document.querySelectorAll("[data-theme-toggle]").forEach((btn) => {
    if (btn.dataset.wired) return;
    btn.dataset.wired = "1";
    btn.addEventListener("click", () => {
      setTheme(currentTheme() === "night" ? "day" : "night");
    });
  });
}
