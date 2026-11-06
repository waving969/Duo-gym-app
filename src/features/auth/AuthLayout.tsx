import { motion } from "motion/react";
import type { ReactNode } from "react";
import { Logo } from "../../ui/icons";

export function AuthLayout({ title, subtitle, children }: { title: string; subtitle: string; children: ReactNode }) {
  return (
    <main className="auth">
      <motion.div
        className="auth__card"
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 260, damping: 26 }}
      >
        <Logo className="auth__logo" />
        <h1 className="auth__title">{title}</h1>
        <p className="auth__subtitle">{subtitle}</p>
        {children}
      </motion.div>
    </main>
  );
}
