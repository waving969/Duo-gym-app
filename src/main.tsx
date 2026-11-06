import "@fontsource-variable/bricolage-grotesque";
import "@fontsource-variable/geist";
import "./styles/tokens.css";
import "./styles/base.css";
import "./styles/components.css";
import "./styles/training.css";
import "./styles/duo.css";

import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";
import { MotionConfig } from "motion/react";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router";
import { App } from "./app/App";
import { registerServiceWorker } from "./lib/pwa";
import { persistOptions, queryClient } from "./lib/queryClient";
import { ToastProvider } from "./ui/Toast";

registerServiceWorker();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <PersistQueryClientProvider client={queryClient} persistOptions={persistOptions}>
      <MotionConfig reducedMotion="user">
        <ToastProvider>
          <BrowserRouter>
            <App />
          </BrowserRouter>
        </ToastProvider>
      </MotionConfig>
    </PersistQueryClientProvider>
  </StrictMode>
);
