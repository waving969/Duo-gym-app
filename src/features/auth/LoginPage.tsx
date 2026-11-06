import { useMutation } from "@tanstack/react-query";
import { motion } from "motion/react";
import { useState } from "react";
import type { User } from "../../../shared/types";
import { api } from "../../lib/api";
import { onSignedIn } from "../../lib/queryClient";
import { Button } from "../../ui/Button";
import { Field, PasswordField } from "../../ui/Field";
import { AuthLayout } from "./AuthLayout";

export function LoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  const login = useMutation({
    mutationFn: () => api<User>("POST", "/auth/login", { username, password }),
    onSuccess: onSignedIn,
  });

  return (
    <AuthLayout title="Dúo" subtitle="Entra una vez y la sesión se queda abierta en este dispositivo.">
      <form
        className="form"
        onSubmit={(e) => {
          e.preventDefault();
          login.mutate();
        }}
      >
        <Field
          label="Usuario"
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
          name="password"
          autoComplete="current-password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        {login.error && (
          <motion.p
            key={login.failureCount + login.error.message + login.submittedAt}
            className="form__error"
            role="alert"
            initial={{ x: 0 }}
            animate={{ x: [0, -6, 6, -4, 4, 0] }}
            transition={{ duration: 0.35 }}
          >
            {login.error.message}
          </motion.p>
        )}
        <Button type="submit" size="large" busy={login.isPending}>
          Entrar
        </Button>
      </form>
    </AuthLayout>
  );
}
