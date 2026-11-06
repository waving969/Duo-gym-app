import { motion } from "motion/react";
import type { HTMLMotionProps } from "motion/react";
import type { ReactNode } from "react";

interface ButtonProps extends Omit<HTMLMotionProps<"button">, "children"> {
  variant?: "primary" | "secondary" | "ghost" | "danger";
  size?: "medium" | "large";
  busy?: boolean;
  children: ReactNode;
}

export function Button({ variant = "primary", size = "medium", busy = false, className = "", children, disabled, ...props }: ButtonProps) {
  return (
    <motion.button
      type="button"
      whileTap={{ scale: 0.97 }}
      transition={{ type: "spring", stiffness: 600, damping: 30 }}
      className={`btn btn--${variant} btn--${size} ${className}`}
      disabled={disabled || busy}
      aria-busy={busy}
      {...props}
    >
      {busy ? <span className="btn__spinner" aria-hidden /> : null}
      <span className={busy ? "btn__label btn__label--busy" : "btn__label"}>{children}</span>
    </motion.button>
  );
}
