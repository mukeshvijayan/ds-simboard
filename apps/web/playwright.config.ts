import { defineConfig, devices } from "@playwright/test";

/**
 * Golden-path e2e per spec Part 5.4/Part 6 Phase 10 — Chromium is the
 * primary CI target (kept to one browser to keep install size/CI time
 * down in this environment); the `projects` list is where Firefox/WebKit
 * would be added for full cross-browser coverage once that's worth the
 * added CI time. See docs/architecture/0012-*.md.
 */
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? "github" : "list",
  use: {
    baseURL: "http://127.0.0.1:3100",
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: {
    // A dedicated port (not 3000, where a stray `next dev` has repeatedly
    // been found squatting in this environment) and `reuseExistingServer:
    // false` always, so a test run is never silently pointed at a stale
    // dev build instead of the fresh production one it just built.
    command: "pnpm run build && pnpm exec next start -p 3100",
    url: "http://127.0.0.1:3100",
    reuseExistingServer: false,
    timeout: 120_000,
  },
});
