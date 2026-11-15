import path from "node:path";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    include: ["src/**/*.test.{ts,tsx}", "packages/**/*.test.ts"],
    setupFiles: ["./vitest.setup.ts"],
    passWithNoTests: false,
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "@blackjack-edge/engine": path.resolve(
        __dirname,
        "./packages/engine/src/index.ts"
      ),
    },
  },
});