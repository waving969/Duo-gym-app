import { useEffect } from "react";
import { Navigate, Route, Routes } from "react-router";
import { InvitePage } from "../features/auth/InvitePage";
import { LoginPage } from "../features/auth/LoginPage";
import { useMe } from "../features/auth/useMe";
import { connectOutbox } from "../lib/queryClient";
import { Button } from "../ui/Button";
import { Logo } from "../ui/icons";
import { useToast } from "../ui/Toast";
import { AppShell } from "./AppShell";
import { EXTRA_ROUTES, NAV_ITEMS } from "./navigation";

function Splash() {
  return (
    <div className="splash" role="status" aria-label="Cargando">
      <Logo className="splash__logo" />
    </div>
  );
}

function Protected() {
  const me = useMe();
  useEffect(() => {
    if (me.data) document.documentElement.dataset.accent = me.data.accent;
  }, [me.data]);

  if (me.isPending) return <Splash />;
  // Sin conexión no se te echa al login: tu sesión sigue viva y se reintenta.
  if (me.isError && !me.data) {
    return (
      <div className="splash">
        <Logo className="splash__logo splash__logo--still" />
        <p className="splash__text">No hay conexión con el servidor.</p>
        <Button variant="secondary" onClick={() => me.refetch()} busy={me.isFetching}>
          Reintentar
        </Button>
      </div>
    );
  }
  if (!me.data) return <LoginPage />;
  return <AppShell />;
}

export function App() {
  const toast = useToast();
  useEffect(() => connectOutbox((message) => toast({ message })), [toast]);

  return (
    <Routes>
      <Route path="/invitacion/:token" element={<InvitePage />} />
      <Route element={<Protected />}>
        {[...NAV_ITEMS, ...EXTRA_ROUTES].map(({ path, element }) => (
          <Route key={path} path={path} element={element} />
        ))}
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
