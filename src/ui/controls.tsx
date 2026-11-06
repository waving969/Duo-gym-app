import { motion } from "motion/react";
import type { ReactNode } from "react";
import { MinusIcon, PlusIcon } from "./icons";

export function Segmented<T extends string>({ id, label, value, options, onChange }: {
  id: string;
  label: string;
  value: T;
  options: readonly { id: T; label: ReactNode }[];
  onChange: (id: T) => void;
}) {
  return (
    <div className="segmented" role="group" aria-label={label}>
      {options.map((o) => (
        <button key={o.id} type="button" className="segmented__item" aria-pressed={value === o.id} onClick={() => onChange(o.id)}>
          {value === o.id && (
            <motion.span className="segmented__pill" layoutId={id} transition={{ type: "spring", stiffness: 480, damping: 36 }} />
          )}
          <span className="segmented__label">{o.label}</span>
        </button>
      ))}
    </div>
  );
}

export function Toggle({ label, hint, checked, onChange, disabled }: {
  label: string;
  hint?: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <button type="button" className="toggle-row" role="switch" aria-checked={checked} disabled={disabled} onClick={() => onChange(!checked)}>
      <span className="toggle-row__text">
        <span className="setting-row__label">{label}</span>
        {hint && <span className="field__hint">{hint}</span>}
      </span>
      <span className={`toggle ${checked ? "toggle--on" : ""}`} aria-hidden>
        <motion.span className="toggle__knob" layout transition={{ type: "spring", stiffness: 600, damping: 34 }} />
      </span>
    </button>
  );
}

export function Stepper({ value, label, onMinus, onPlus, minusDisabled, plusDisabled, big }: {
  value: ReactNode;
  label: string;
  onMinus: () => void;
  onPlus: () => void;
  minusDisabled?: boolean;
  plusDisabled?: boolean;
  big?: boolean;
}) {
  return (
    <div className={`step ${big ? "step--big" : ""}`}>
      <button type="button" className="icon-btn step__btn" aria-label={`Menos ${label}`} disabled={minusDisabled} onClick={onMinus}>
        <MinusIcon />
      </button>
      <strong className="step__value tabular" aria-live="polite">
        {value}
      </strong>
      <button type="button" className="icon-btn step__btn" aria-label={`Más ${label}`} disabled={plusDisabled} onClick={onPlus}>
        <PlusIcon />
      </button>
    </div>
  );
}
