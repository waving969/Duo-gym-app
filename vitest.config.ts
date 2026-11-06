import { defineConfig } from "vitest/config";

// Configuración propia: los tests de lógica no necesitan el plugin de Cloudflare.
export default defineConfig({
  test: { include: ["shared/**/*.test.ts", "src/**/*.test.ts", "worker/**/*.test.ts"] },
});
