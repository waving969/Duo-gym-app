// Aplica el tema antes de pintar la página, para que no haya parpadeo al abrir la app.
// Es un archivo aparte, y no un script en línea, porque la CSP no permite estos últimos.
(() => {
  const KEY = "duo-theme"; // se guarda por dispositivo y se conserva al cerrar sesión
  const COLORS = { dark: "#12110f", light: "#f6f3ec" };
  const system = window.matchMedia("(prefers-color-scheme: dark)");

  function get() {
    try {
      const value = localStorage.getItem(KEY);
      return value === "light" || value === "dark" ? value : "auto";
    } catch {
      return "auto";
    }
  }

  function apply() {
    const preference = get();
    const theme = preference === "auto" ? (system.matches ? "dark" : "light") : preference;
    document.documentElement.dataset.theme = theme;
    document.querySelectorAll('meta[name="theme-color"]').forEach((meta) => meta.setAttribute("content", COLORS[theme]));
  }

  function set(preference) {
    try {
      if (preference === "auto") localStorage.removeItem(KEY);
      else localStorage.setItem(KEY, preference);
    } catch {
      // Sin almacenamiento el tema dura hasta cerrar la app.
    }
    apply();
    if (preference !== get()) document.documentElement.dataset.theme = preference === "auto" ? (system.matches ? "dark" : "light") : preference;
  }

  system.addEventListener("change", apply);
  window.duoTheme = { get, set };
  apply();
})();
