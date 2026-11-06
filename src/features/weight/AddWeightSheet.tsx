import { useEffect, useState } from "react";
import { LIMITS } from "../../../shared/types";
import { formatKg } from "../../lib/format";
import { useToday } from "../../lib/useToday";
import { Button } from "../../ui/Button";
import { Field } from "../../ui/Field";
import { MinusIcon, PlusIcon } from "../../ui/icons";
import { Sheet } from "../../ui/Sheet";
import { useToast } from "../../ui/Toast";
import { useSaveWeight, useWeights } from "./useWeights";

const parse = (text: string) => Number(text.replace(",", "."));

export function AddWeightSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const today = useToday();
  const { data: entries = [] } = useWeights();
  const save = useSaveWeight();
  const toast = useToast();
  const [date, setDate] = useState(today);
  const [text, setText] = useState("");

  const latest = entries[entries.length - 1];

  useEffect(() => {
    if (!open) return;
    setDate(today);
    setText(latest ? formatKg(latest.kg) : "");
    save.reset();
    // Solo al abrir: mientras está abierto no se pisa lo que escribes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const kg = parse(text);
  const valid = Number.isFinite(kg) && kg >= LIMITS.kgMin && kg <= LIMITS.kgMax;
  const existing = entries.find((e) => e.date === date);

  const step = (delta: number) => {
    const base = valid ? kg : (latest?.kg ?? 70);
    setText(formatKg(Math.round((base + delta) * 10) / 10));
  };

  return (
    <Sheet open={open} title="Apuntar peso" onClose={onClose}>
      <form
        className="form"
        onSubmit={(e) => {
          e.preventDefault();
          if (!valid) return;
          save.mutate(
            { date, kg: Math.round(kg * 10) / 10 },
            {
              onSuccess: () => {
                toast({ message: "Peso guardado" });
                onClose();
              },
            }
          );
        }}
      >
        <div className="stepper">
          <button type="button" className="icon-btn icon-btn--large" aria-label="Restar 0,1 kg" onClick={() => step(-0.1)}>
            <MinusIcon />
          </button>
          <label className="stepper__value">
            <span className="sr-only">Peso en kilos</span>
            <input
              inputMode="decimal"
              autoComplete="off"
              placeholder="0,0"
              value={text}
              onChange={(e) => setText(e.target.value.replace(/[^\d.,]/g, ""))}
            />
            <span className="stepper__unit">kg</span>
          </label>
          <button type="button" className="icon-btn icon-btn--large" aria-label="Sumar 0,1 kg" onClick={() => step(0.1)}>
            <PlusIcon />
          </button>
        </div>

        <Field label="Fecha" type="date" max={today} required value={date} onChange={(e) => setDate(e.target.value)} />

        {existing && (
          <p className="field__hint">Ese día ya tiene {formatKg(existing.kg)} kg: se sustituirá.</p>
        )}
        {text !== "" && !valid && (
          <p className="form__error" role="alert">
            Escribe un peso entre {LIMITS.kgMin} y {LIMITS.kgMax} kg.
          </p>
        )}
        {save.error && (
          <p className="form__error" role="alert">
            {save.error.message}
          </p>
        )}

        <Button type="submit" size="large" disabled={!valid} busy={save.isPending}>
          Guardar
        </Button>
      </form>
    </Sheet>
  );
}
