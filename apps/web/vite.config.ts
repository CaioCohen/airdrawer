import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import { pngExportPlugin } from "./dev/pngExport";
export default defineConfig({
  plugins: [react(), pngExportPlugin()],
  resolve: { alias: { "@airdraw/contracts": new URL("../../packages/contracts/src/index.ts", import.meta.url).pathname } },
  test: { environment: "jsdom", include: ["src/**/*.test.{ts,tsx}"] },
});
