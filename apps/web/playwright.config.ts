import { defineConfig, devices } from "@playwright/test";
export default defineConfig({ testDir: "./e2e", use: { ...devices["Desktop Chrome"] }, webServer: { command: "pnpm dev --host 127.0.0.1", port: 5173, reuseExistingServer: !process.env.CI } });
