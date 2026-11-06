import { useMutation, useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { useNavigate, useParams } from "react-router";
import { LIMITS } from "../../../shared/types";
import type { User } from "../../../shared/types";
import { api } from "../../lib/api";
import { onSignedIn } from "../../lib/queryClient";
import { Button } from "../../ui/Button";
import { Field, PasswordField } from "../../ui/Field";
import { AuthLayout } from "./AuthLayout";

export function InvitePage() {
  const { token = "" } = useParams();
  const navigate = useNavigate();
  const [displayName, setDisplayName] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  const check = useQuery({
    queryKey: ["invite", token],
    queryFn: () => api("GET", `/invite/${encodeURIComponent(token)}`),
    retry: false,
    staleTime: Infinity,
  });

  const accept = useMutation({
    mutationFn: () => api<User>("POST", `/invite/${encodeURIComponent(token)}`, { displayName, username, password }),
    onSuccess: (user) => {
      onSignedIn(user);
      navigate("/", { replace: true });
    },
  });

  if (check.isPending) return <AuthLayout title="Dúo" subtitle="Comprobando la invitación…">{null}</AuthLayout>;
  if (check.isError) return <AuthLayout title="Invitación no válida" subtitle={check.error.message}>{null}</AuthLayout>;

  return (
    <AuthLayout title="Crea tu cuenta" subtitle="Solo tú verás tus datos. Este enlace sirve una única vez.">
      <form
        className="form"
        onSubmit={(e) => {
          e.preventDefault();
          accept.mutate();
        }}
      >
        <Field
          label="Tu nombre"
          name="name"
          autoComplete="given-name"
          required
          maxLength={40}
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
        />
        <Field
          label="Usuario para entrar"
          name="username"
          autoComplete="username"
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          required
          value={username}
          onChange={(e) => setUsername(e.target.value)}
        />
        <PasswordField
          label="Contraseña"
          hint={`Mínimo ${LIMITS.passwordMin} caracteres. El móvil puede guardarla por ti.`}
          name="new-password"
          autoComplete="new-password"
          required
          minLength={LIMITS.passwordMin}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        {accept.error && (
          <p className="form__error" role="alert">
            {accept.error.message}
          </p>
        )}
        <Button type="submit" size="large" busy={accept.isPending}>
          Crear cuenta
        </Button>
      </form>
    </AuthLayout>
  );
}
