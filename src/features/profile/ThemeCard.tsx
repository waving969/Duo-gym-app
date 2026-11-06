import { useState } from "react";
import { Segmented } from "../../ui/controls";

type ThemePreference = "auto" | "light" | "dark";

// Lo define public/theme.js, que se carga antes que la app.
declare global {
  interface Window {
    duoTheme: { get: () => ThemePreference; set: (preference: ThemePreference) => void };
  }
}

const OPTIONS = [
  { id: "auto", label: "Automático" },
  { id: "light", label: "Claro" },
  { id: "dark", label: "Oscuro" },
] as const;

export function ThemeCard() {
  const [preference, setPreference] = useState(() => window.duoTheme.get());

  return (
    <section className="card">
      <h2 className="card__title">Tema</h2>
      <Segmented
        id="theme-pill"
        label="Tema de la app"
        value={preference}
        options={OPTIONS}
        onChange={(next) => {
          window.duoTheme.set(next);
          setPreference(next);
        }}
      />
      <p className="field__hint">{preference === "auto" ? "Sigue el modo claro u oscuro del dispositivo." : "Se guarda en este dispositivo."}</p>
    </section>
  );
}
