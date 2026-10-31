import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
export default defineConfig({
  plugins: [react()],
  resolve: { alias: { "@airdraw/contracts": new URL("../../packages/contracts/src/index.ts", import.meta.url).pathname } },
  test: { environment: "jsdom", include: ["src/**/*.test.{ts,tsx}"] },
});
