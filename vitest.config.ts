import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

export default defineConfig({
  test: { environment: "node", include: ["tests/**/*.test.ts"], fileParallelism: false },
  resolve: {
    alias: {
      "@": fileURLToPath(new URL(".", import.meta.url)),
      // `server-only` existe para o bundler do Next recusar importar um módulo
      // de servidor no cliente. Fora do Next ele não tem o que fazer, então
      // vira um módulo vazio em vez de quebrar a suíte.
      "server-only": fileURLToPath(new URL("./tests/empty.ts", import.meta.url)),
    },
  },
});
