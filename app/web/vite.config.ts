import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import { existsSync, readFileSync } from "node:fs";

// Only in `npm run dev` (never in a build or in tests), read the local token so `npm run dev` can talk to the server. It is NEVER put in a production build.
const tokenFile = new URL("../token.txt", import.meta.url);
const devToken = existsSync(tokenFile) ? readFileSync(tokenFile, "utf8").trim() : "";

export default defineConfig(({ command, mode }) => ({
  plugins: [react()],
  define: { __DEV_TOKEN__: JSON.stringify(command === "serve" && mode === "development" ? devToken : "") },
  server: { proxy: { "/api": "http://127.0.0.1:8787", "/files": "http://127.0.0.1:8787" } },
  build: { outDir: "dist", emptyOutDir: true },
  test: { environment: "jsdom", setupFiles: ["./src/test/setup.ts"], css: false },
}));
