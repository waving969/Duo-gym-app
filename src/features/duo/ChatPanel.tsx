import { AnimatePresence, motion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { toISODate } from "../../../shared/stats";
import { LIMITS, NUDGES } from "../../../shared/types";
import { formatLongDate } from "../../lib/format";
import { useOutboxCount } from "../../lib/outbox";
import { useToday } from "../../lib/useToday";
import { useToast } from "../../ui/Toast";
import { markRead, useMessages, useSendMessage } from "./useDuo";

const time = new Intl.DateTimeFormat("es-ES", { hour: "2-digit", minute: "2-digit" });

export function ChatPanel({ partnerName }: { partnerName: string }) {
  const { data: messages = [], isPending } = useMessages(true);
  const send = useSendMessage();
  const toast = useToast();
  const today = useToday();
  const pending = useOutboxCount();
  const [text, setText] = useState("");
  const end = useRef<HTMLDivElement>(null);
  const count = useRef(0);

  const hasUnread = messages.some((m) => !m.fromMe && m.readAt === null);
  useEffect(() => {
    if (hasUnread && document.visibilityState === "visible") void markRead().catch(() => {});
  }, [hasUnread, messages.length]);

  useEffect(() => {
    if (messages.length === count.current) return;
    const first = count.current === 0;
    count.current = messages.length;
    // Al abrir se espera a que termine la transición de pantalla, que vuelve arriba del todo.
    const timer = setTimeout(() => end.current?.scrollIntoView({ behavior: first ? "auto" : "smooth", block: "end" }), first ? 240 : 0);
    return () => clearTimeout(timer);
  }, [messages.length]);

  const lastSeen = [...messages].reverse().find((m) => m.fromMe && m.readAt !== null)?.id;
  let previousDay = "";

  return (
    <div className="chat">
      <div className="nudges" role="group" aria-label="Dar un toque">
        {NUDGES.map((n) => (
          <motion.button
            key={n.text}
            type="button"
            className="nudge"
            whileTap={{ scale: 0.92 }}
            onClick={() => {
              send("nudge", `${n.emoji} ${n.text}`);
              toast({ message: `Toque enviado a ${partnerName}` });
            }}
          >
            <span aria-hidden>{n.emoji}</span> {n.text}
          </motion.button>
        ))}
      </div>

      <div className="chat__list" aria-live="polite" aria-busy={isPending}>
        {!isPending && messages.length === 0 && <p className="chart-empty">Mandad el primer mensaje o dad un toque.</p>}
        <AnimatePresence initial={false}>
          {messages.map((m) => {
            const day = toISODate(new Date(m.createdAt));
            const showDay = day !== previousDay;
            previousDay = day;
            return (
              <div key={m.id} className="chat__group">
                {showDay && <p className="chat__day">{day === today ? "Hoy" : formatLongDate(day)}</p>}
                {m.kind === "text" ? (
                  <motion.div
                    className={`bubble ${m.fromMe ? "bubble--me" : ""}`}
                    initial={{ opacity: 0, y: 10, scale: 0.97 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    transition={{ type: "spring", stiffness: 480, damping: 32 }}
                  >
                    <p>{m.body}</p>
                    <time>{time.format(m.createdAt)}</time>
                  </motion.div>
                ) : (
                  <motion.p
                    className={`chat__event ${m.kind === "nudge" ? "chat__event--nudge" : ""}`}
                    initial={{ opacity: 0, scale: 0.85 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ type: "spring", stiffness: 420, damping: 20 }}
                  >
                    {m.kind === "nudge" ? `${m.fromMe ? "Tu toque" : `${partnerName}`}: ${m.body}` : m.body}
                  </motion.p>
                )}
                {m.id === lastSeen && <p className="chat__seen">Visto</p>}
              </div>
            );
          })}
        </AnimatePresence>
        {pending > 0 && !navigator.onLine && <p className="chat__seen">Se enviará al tener cobertura</p>}
        <div ref={end} className="chat__end" />
      </div>

      <form
        className="composer"
        onSubmit={(e) => {
          e.preventDefault();
          const body = text.trim();
          if (!body) return;
          send("text", body);
          setText("");
        }}
      >
        <input
          aria-label={`Mensaje para ${partnerName}`}
          placeholder={`Mensaje para ${partnerName}…`}
          maxLength={LIMITS.messageMax}
          enterKeyHint="send"
          value={text}
          onChange={(e) => setText(e.target.value)}
        />
        <button type="submit" className="composer__send" disabled={!text.trim()}>
          Enviar
        </button>
      </form>
    </div>
  );
}
