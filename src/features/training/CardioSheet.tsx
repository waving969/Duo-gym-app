import { useEffect, useState } from "react";
import { CARDIO_KINDS, LIMITS } from "../../../shared/types";
import type { CardioKind } from "../../../shared/types";
import { useToday } from "../../lib/useToday";
import { Button } from "../../ui/Button";
import { Stepper } from "../../ui/controls";
import { Sheet } from "../../ui/Sheet";
import { useToast } from "../../ui/Toast";
import { saveCardio } from "./useTraining";

export function CardioKindChips({ value, onChange }: { value: CardioKind; onChange: (kind: CardioKind) => void }) {
  return (
    <div className="chips" role="group" aria-label="Tipo de cardio">
      {(Object.keys(CARDIO_KINDS) as CardioKind[]).map((kind) => (
        <button key={kind} type="button" className="chip" aria-pressed={value === kind} onClick={() => onChange(kind)}>
          {CARDIO_KINDS[kind]}
        </button>
      ))}
    </div>
  );
}

export function CardioSheet({ open, onClose, date }: { open: boolean; onClose: () => void; date?: string }) {
  const today = useToday();
  const toast = useToast();
  const [kind, setKind] = useState<CardioKind>("cinta");
  const [minutes, setMinutes] = useState(15);
  const target = date ?? today;

  useEffect(() => {
    if (open) setMinutes(15);
  }, [open]);

  return (
    <Sheet open={open} title="Apuntar cardio" onClose={onClose}>
      <div className="form">
        <CardioKindChips value={kind} onChange={setKind} />
        <Stepper
          big
          label="5 minutos"
          value={`${minutes} min`}
          minusDisabled={minutes <= 5}
          plusDisabled={minutes >= LIMITS.cardioMinutesMax}
          onMinus={() => setMinutes(minutes - 5)}
          onPlus={() => setMinutes(minutes + 5)}
        />
        <Button
          size="large"
          onClick={() => {
            saveCardio({ id: crypto.randomUUID(), date: target, kind, minutes });
            toast({ message: `${CARDIO_KINDS[kind]}: ${minutes} min apuntados` });
            onClose();
          }}
        >
          Guardar
        </Button>
      </div>
    </Sheet>
  );
}
