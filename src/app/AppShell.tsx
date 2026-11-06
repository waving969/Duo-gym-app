import { AnimatePresence, motion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { NavLink, useLocation, useOutlet } from "react-router";
import { useUnread } from "../features/duo/useDuo";
import { NAV_ITEMS } from "./navigation";

/** Mantiene la pantalla anterior mientras hace su animación de salida. */
function FrozenOutlet() {
  const outlet = useOutlet();
  const [frozen] = useState(outlet);
  return frozen;
}

const tabIndex = (pathname: string) => {
  const first = `/${pathname.split("/")[1] ?? ""}`;
  return NAV_ITEMS.findIndex((item) => item.path === first);
};

/** Las secciones internas de Progreso comparten pantalla; el resto tiene transición propia. */
const screenKey = (pathname: string) => (pathname.startsWith("/progreso") ? "/progreso" : pathname);

export function AppShell() {
  const { pathname } = useLocation();
  const { data: unread = 0 } = useUnread();
  const index = tabIndex(pathname);
  const previous = useRef(index);
  const direction = index >= previous.current ? 1 : -1;
  const key = screenKey(pathname);
  const immersive = pathname === "/entrenar/sesion";

  useEffect(() => {
    previous.current = index;
    window.scrollTo(0, 0);
  }, [index, key]);

  return (
    <div className="shell">
      <AnimatePresence mode="wait" initial={false} custom={direction}>
        <motion.main
          key={key}
          className={`page ${immersive ? "page--immersive" : ""}`}
          custom={direction}
          variants={{
            enter: (d: number) => ({ opacity: 0, x: 18 * d }),
            center: { opacity: 1, x: 0 },
            exit: (d: number) => ({ opacity: 0, x: -18 * d }),
          }}
          initial="enter"
          animate="center"
          exit="exit"
          transition={{ duration: 0.16, ease: "easeOut" }}
        >
          <FrozenOutlet />
        </motion.main>
      </AnimatePresence>

      {!immersive && (
        <nav className="dock" aria-label="Navegación principal">
          {NAV_ITEMS.map(({ path, label, icon: Icon }) => (
            <NavLink key={path} to={path} end={path === "/"} className="dock__item">
              {({ isActive }) => (
                <>
                  {isActive && (
                    <motion.span className="dock__pill" layoutId="dock-pill" transition={{ type: "spring", stiffness: 420, damping: 34 }} />
                  )}
                  <span className="dock__icon-wrap">
                    <Icon className="dock__icon" aria-hidden />
                    {path === "/duo" && unread > 0 && (
                      <span className="badge" aria-label={`${unread} sin leer`}>
                        {unread}
                      </span>
                    )}
                  </span>
                  <span className="dock__label">{label}</span>
                </>
              )}
            </NavLink>
          ))}
        </nav>
      )}
    </div>
  );
}
