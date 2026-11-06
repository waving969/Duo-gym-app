import { useMutation } from "@tanstack/react-query";
import { motion } from "motion/react";
import { useState } from "react";
import { avatarName } from "../../../shared/avatars";
import { ACCENTS, LIMITS } from "../../../shared/types";
import { api } from "../../lib/api";
import { formatKg } from "../../lib/format";
import { Avatar } from "../../ui/Avatar";
import { Button } from "../../ui/Button";
import { Toggle } from "../../ui/controls";
import { Field, PasswordField } from "../../ui/Field";
import { CheckIcon, MinusIcon, PlusIcon } from "../../ui/icons";
import { Sheet } from "../../ui/Sheet";
import { useToast } from "../../ui/Toast";
import { logout, useUpdateProfile, useUser } from "../auth/useMe";
import { AvatarSheet } from "./AvatarSheet";
import { NotificationsCard } from "./NotificationsCard";
import { ThemeCard } from "./ThemeCard";

const ACCENT_NAMES = { lima: "Lima", coral: "Coral", violeta: "Violeta", cielo: "Cielo", menta: "Menta" } as const;

function NumberSetting({ label, hint, value, onCommit, suffix, decimal }: {
  label: string;
  hint?: string;
  value: number | null;
  onCommit: (value: number | null) => void;
  suffix: string;
  decimal?: boolean;
}) {
  const shown = value === null ? "" : decimal ? formatKg(value) : String(value);
  const [text, setText] = useState(shown);
  const [synced, setSynced] = useState(shown);
  if (shown !== synced) {
    setSynced(shown);
    setText(shown);
  }
  return (
    <Field
      label={label}
      hint={hint}
      inputMode={decimal ? "decimal" : "numeric"}
      value={text}
      onChange={(e) => setText(e.target.value)}
      onBlur={() => {
        const raw = text.trim().replace(",", ".");
        const next = raw === "" ? null : Number(raw);
        if (next !== value) onCommit(next);
      }}
      suffix={<span className="field__suffix">{suffix}</span>}
    />
  );
}

export function ProfilePage() {
  const user = useUser();
  const update = useUpdateProfile();
  const toast = useToast();
  const [avatarOpen, setAvatarOpen] = useState(false);
  const [passwordOpen, setPasswordOpen] = useState(false);
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");

  const save = (patch: Parameters<typeof update.mutate>[0]) =>
    update.mutate(patch, {
      onSuccess: () => toast({ message: "Guardado" }),
      onError: (error) => toast({ message: error.message }),
    });

  const changePassword = useMutation({
    mutationFn: () => api("POST", "/auth/password", { current, next }),
    onSuccess: () => {
      setPasswordOpen(false);
      setCurrent("");
      setNext("");
      toast({ message: "Contraseña cambiada. Los demás dispositivos se han desconectado." });
    },
  });

  const logoutOthers = useMutation({
    mutationFn: () => api("POST", "/auth/logout-others"),
    onSuccess: () => toast({ message: "Sesión cerrada en los demás dispositivos" }),
    onError: (error) => toast({ message: error.message }),
  });

  const signOut = useMutation({ mutationFn: logout, onError: (error) => toast({ message: error.message }) });

  const exportData = useMutation({
    mutationFn: () => api<unknown>("GET", "/me/export"),
    onSuccess: (data) => {
      const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }));
      const a = document.createElement("a");
      a.href = url;
      a.download = `duo-${user.username}-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
    },
    onError: (error) => toast({ message: error.message }),
  });

  return (
    <>
      <header className="profile-head">
        <motion.button
          type="button"
          className="profile-head__avatar"
          aria-label="Cambiar avatar"
          whileTap={{ scale: 0.93 }}
          onClick={() => setAvatarOpen(true)}
        >
          <Avatar avatar={user.avatar} name={user.displayName} accent={user.accent} size={84} />
          <span className="profile-head__edit" aria-hidden>
            Cambiar
          </span>
        </motion.button>
        <div className="profile-head__text">
          <h1 className="page__title">{user.displayName}</h1>
          <p className="page__subtitle">{avatarName(user.avatar) ?? "Toca para elegir tu avatar"}</p>
          <p className="field__hint">@{user.username}</p>
        </div>
      </header>

      <ThemeCard />

      <section className="card">
        <h2 className="card__title">Tu color</h2>
        <div className="swatches" role="radiogroup" aria-label="Color de la app">
          {ACCENTS.map((accent) => (
            <motion.button
              key={accent}
              type="button"
              role="radio"
              aria-checked={user.accent === accent}
              aria-label={ACCENT_NAMES[accent]}
              data-swatch={accent}
              className="swatch"
              whileTap={{ scale: 0.9 }}
              onClick={() => {
                document.documentElement.dataset.accent = accent;
                save({ accent });
              }}
            >
              {user.accent === accent && <CheckIcon width={20} height={20} aria-hidden />}
            </motion.button>
          ))}
        </div>
      </section>

      <section className="card">
        <h2 className="card__title">Objetivos y datos</h2>
        <div className="setting-row">
          <div>
            <p className="setting-row__label">Días de gym a la semana</p>
            <p className="field__hint">Se usa para calcular tu racha.</p>
          </div>
          <div className="mini-stepper">
            <button
              type="button"
              className="icon-btn"
              aria-label="Un día menos"
              disabled={user.weeklyGoal <= LIMITS.weeklyGoalMin}
              onClick={() => save({ weeklyGoal: user.weeklyGoal - 1 })}
            >
              <MinusIcon />
            </button>
            <strong className="tabular" aria-live="polite">
              {user.weeklyGoal}
            </strong>
            <button
              type="button"
              className="icon-btn"
              aria-label="Un día más"
              disabled={user.weeklyGoal >= LIMITS.weeklyGoalMax}
              onClick={() => save({ weeklyGoal: user.weeklyGoal + 1 })}
            >
              <PlusIcon />
            </button>
          </div>
        </div>
        <div className="form">
          <Field
            key={user.displayName}
            label="Tu nombre"
            defaultValue={user.displayName}
            maxLength={40}
            onBlur={(e) => {
              const name = e.target.value.trim();
              if (name && name !== user.displayName) save({ displayName: name });
            }}
          />
          <NumberSetting
            label="Peso objetivo"
            hint="Opcional. Aparece como línea en tu gráfica."
            suffix="kg"
            decimal
            value={user.goalKg}
            onCommit={(goalKg) => save({ goalKg })}
          />
          <NumberSetting
            label="Altura"
            hint="Opcional."
            suffix="cm"
            value={user.heightCm}
            onCommit={(heightCm) => save({ heightCm })}
          />
        </div>
      </section>

      <section className="card">
        <h2 className="card__title">Privacidad: qué ve tu pareja</h2>
        <Toggle label="Calendario" hint="Los días que vas al gym." checked={user.shareCalendar} onChange={(shareCalendar) => save({ shareCalendar })} />
        <Toggle
          label="Entrenos y cardio"
          hint="Rutinas, pesos de cada ejercicio y minutos de cardio."
          checked={user.shareWorkouts}
          onChange={(shareWorkouts) => save({ shareWorkouts })}
        />
        <Toggle label="Peso corporal" hint="Desactivado salvo que tú lo actives." checked={user.shareWeight} onChange={(shareWeight) => save({ shareWeight })} />
      </section>

      <NotificationsCard />

      <section className="card stack">
        <h2 className="card__title">Cuenta</h2>
        <Button variant="secondary" onClick={() => setPasswordOpen(true)}>
          Cambiar contraseña
        </Button>
        <Button variant="secondary" busy={exportData.isPending} onClick={() => exportData.mutate()}>
          Descargar mis datos
        </Button>
        <Button variant="secondary" busy={logoutOthers.isPending} onClick={() => logoutOthers.mutate()}>
          Cerrar sesión en otros dispositivos
        </Button>
        <Button variant="danger" busy={signOut.isPending} onClick={() => signOut.mutate()}>
          Cerrar sesión
        </Button>
      </section>

      <AvatarSheet user={user} open={avatarOpen} onClose={() => setAvatarOpen(false)} />

      <Sheet open={passwordOpen} title="Cambiar contraseña" onClose={() => setPasswordOpen(false)}>
        <form
          className="form"
          onSubmit={(e) => {
            e.preventDefault();
            changePassword.mutate();
          }}
        >
          <PasswordField
            label="Contraseña actual"
            autoComplete="current-password"
            required
            value={current}
            onChange={(e) => setCurrent(e.target.value)}
          />
          <PasswordField
            label="Contraseña nueva"
            hint={`Mínimo ${LIMITS.passwordMin} caracteres.`}
            autoComplete="new-password"
            required
            minLength={LIMITS.passwordMin}
            value={next}
            onChange={(e) => setNext(e.target.value)}
          />
          {changePassword.error && (
            <p className="form__error" role="alert">
              {changePassword.error.message}
            </p>
          )}
          <Button type="submit" size="large" busy={changePassword.isPending}>
            Guardar
          </Button>
        </form>
      </Sheet>
    </>
  );
}
