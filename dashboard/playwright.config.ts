import { defineConfig } from "@playwright/test";
import { dashboardBasePath } from "./scripts/dashboard-path.mjs";

const baseURL = `http://127.0.0.1:4173${dashboardBasePath}`;

export default defineConfig({
  testDir: "./tests/browser",
  fullyParallel: true,
  workers: 2,
  timeout: 60_000,
  reporter: process.env.CI ? [["line"], ["github"]] : "list",
  use: {
    baseURL,
    browserName: "chromium",
    reducedMotion: "reduce",
    screenshot: "only-on-failure",
    trace: "retain-on-failure",
  },
  webServer: {
    command: "npm run preview -- --host 127.0.0.1 --port 4173 --strictPort",
    url: baseURL,
    reuseExistingServer: false,
  },
});
