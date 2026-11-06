import { AnimatePresence, motion } from "motion/react";
import { useMemo, useState } from "react";
import { addDays, weightChange } from "../../../shared/stats";
import { formatDelta, formatKg, formatShortDateYear } from "../../lib/format";
import { useToday } from "../../lib/useToday";
import { Button } from "../../ui/Button";
import { Segmented } from "../../ui/controls";
import { PlusIcon, TrashIcon } from "../../ui/icons";
import { useToast } from "../../ui/Toast";
import { useUser } from "../auth/useMe";
import { AddWeightSheet } from "./AddWeightSheet";
import { useDeleteWeight, useSaveWeight, useWeights } from "./useWeights";
import { WeightChart } from "./WeightChart";

const RANGES = [
  { id: "1M", label: "1 mes", days: 31 },
  { id: "3M", label: "3 meses", days: 92 },
  { id: "1A", label: "1 año", days: 366 },
  { id: "all", label: "Todo", days: null },
] as const;

type RangeId = (typeof RANGES)[number]["id"];

export function WeightPanel() {
  const user = useUser();
  const today = useToday();
  const { data: entries = [], isPending } = useWeights();
  const remove = useDeleteWeight();
  const save = useSaveWeight();
  const toast = useToast();
  const [range, setRange] = useState<RangeId>("3M");
  const [sheetOpen, setSheetOpen] = useState(false);

  const visible = useMemo(() => {
    const days = RANGES.find((r) => r.id === range)?.days;
    if (days === null || days === undefined) return entries;
    const from = addDays(today, -days);
    return entries.filter((e) => e.date >= from);
  }, [entries, range, today]);

  const latest = entries[entries.length - 1];
  const change = weightChange(entries, 30);
  const toGoal = latest && user.goalKg !== null ? Math.round((latest.kg - user.goalKg) * 10) / 10 : null;

  return (
    <>
      <div className="panel-bar">
        <p className="panel-hint">{user.shareWeight ? "Tu pareja también lo ve." : "Solo lo ves tú."}</p>
        <Button onClick={() => setSheetOpen(true)}>
          <PlusIcon width={18} height={18} aria-hidden /> Apuntar
        </Button>
      </div>

      {isPending ? (
        <div className="card skeleton" style={{ height: 340 }} />
      ) : !latest ? (
        <section className="card empty">
          <h2>Tu primer registro</h2>
          <p>Apunta tu peso de hoy y aquí verás cómo evoluciona.</p>
          <Button onClick={() => setSheetOpen(true)}>Apuntar peso</Button>
        </section>
      ) : (
        <>
          <section className="card">
            <div className="hero-number">
              <span className="hero-number__value tabular">{formatKg(latest.kg)}</span>
              <span className="hero-number__unit">kg</span>
            </div>
            <p className="hero-number__meta">
              {change !== null && (
                <>
                  <strong className="tabular">{formatDelta(change)} kg</strong> en 30 días ·{" "}
                </>
              )}
              {formatShortDateYear(latest.date)}
              {toGoal !== null && (
                <>
                  {" · "}
                  {toGoal === 0 ? "¡objetivo conseguido!" : `a ${formatKg(Math.abs(toGoal))} kg del objetivo`}
                </>
              )}
            </p>

            <Segmented id="range-pill" label="Periodo de la gráfica" value={range} options={RANGES} onChange={setRange} />

            {visible.length >= 2 ? (
              <WeightChart entries={visible} goalKg={user.goalKg} />
            ) : (
              <p className="chart-empty">
                {visible.length === 1
                  ? "Con dos registros en este periodo ya verás la línea."
                  : "No hay registros en este periodo."}
              </p>
            )}
          </section>

          <section className="card card--list" aria-labelledby="history-title">
            <h2 className="card__title" id="history-title">
              Historial
            </h2>
            <ul className="history">
              <AnimatePresence initial={false}>
                {[...entries].reverse().map((entry, i, list) => {
                  const previous = list[i + 1];
                  const delta = previous ? Math.round((entry.kg - previous.kg) * 10) / 10 : null;
                  return (
                    <motion.li
                      key={entry.date}
                      className="history__row"
                      layout="position"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.18 }}
                    >
                      <span className="history__date">{formatShortDateYear(entry.date)}</span>
                      <span className="history__delta tabular">{delta !== null ? formatDelta(delta) : ""}</span>
                      <strong className="history__kg tabular">{formatKg(entry.kg)} kg</strong>
                      <button
                        type="button"
                        className="icon-btn icon-btn--quiet"
                        aria-label={`Borrar el registro del ${formatShortDateYear(entry.date)}`}
                        onClick={() =>
                          remove.mutate(entry.date, {
                            onSuccess: () =>
                              toast({
                                message: "Registro borrado",
                                actionLabel: "Deshacer",
                                onAction: () => save.mutate(entry),
                              }),
                            onError: (error) => toast({ message: error.message }),
                          })
                        }
                      >
                        <TrashIcon width={18} height={18} />
                      </button>
                    </motion.li>
                  );
                })}
              </AnimatePresence>
            </ul>
          </section>
        </>
      )}

      <AddWeightSheet open={sheetOpen} onClose={() => setSheetOpen(false)} />
    </>
  );
}
