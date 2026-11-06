import { useMutation, useQuery } from "@tanstack/react-query";
import { api } from "../../lib/api";
import { currentSubscription, disablePush, enablePush, pushSupport } from "../../lib/pwa";
import { queryClient } from "../../lib/queryClient";
import { Button } from "../../ui/Button";
import { Toggle } from "../../ui/controls";
import { useToast } from "../../ui/Toast";

const KEY = ["push-subscription"];

export function NotificationsCard() {
  const toast = useToast();
  const support = pushSupport();
  const subscription = useQuery({ queryKey: KEY, queryFn: async () => !!(await currentSubscription()), enabled: support === "ok", gcTime: 0 });
  const enabled = subscription.data === true;

  const toggle = useMutation({
    mutationFn: async (on: boolean) => {
      if (on) await enablePush();
      else await disablePush();
      return on;
    },
    onSuccess: (on) => {
      queryClient.setQueryData(KEY, on);
      toast({ message: on ? "Notificaciones activadas" : "Notificaciones desactivadas" });
    },
    onError: (error) => toast({ message: error.message }),
  });

  const test = useMutation({
    mutationFn: () => api("POST", "/push/test"),
    onSuccess: () => toast({ message: "Enviada. Debería llegarte en unos segundos." }),
    onError: (error) => toast({ message: error.message }),
  });

  return (
    <section className="card stack">
      <h2 className="card__title">Notificaciones</h2>
      {support === "needs-install" && (
        <p className="field__hint">
          En iPhone hay que abrir la app desde su icono: en Safari, Compartir → <strong>Añadir a pantalla de inicio</strong>. Después, activa aquí las notificaciones.
        </p>
      )}
      {support === "unsupported" && <p className="field__hint">Este navegador no admite notificaciones.</p>}
      {support === "ok" && (
        <>
          <Toggle
            label="En este dispositivo"
            hint="Mensajes, toques y entrenos terminados de tu pareja."
            checked={enabled}
            disabled={toggle.isPending || subscription.isPending}
            onChange={(on) => toggle.mutate(on)}
          />
          {enabled && (
            <Button variant="secondary" busy={test.isPending} onClick={() => test.mutate()}>
              Enviarme una de prueba
            </Button>
          )}
        </>
      )}
    </section>
  );
}
