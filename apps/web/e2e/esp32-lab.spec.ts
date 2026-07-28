import { test, expect } from "./fixtures";
import AxeBuilder from "@axe-core/playwright";

test.describe("ESP32 Lab", () => {
  test("running the default sketch produces real serial output and a Wi-Fi stub connection", async ({
    page,
  }) => {
    await page.goto("/esp32-lab");

    await page.getByRole("button", { name: "Run", exact: true }).click();
    await expect(page.getByRole("button", { name: "Stop" })).toBeVisible();

    // Scoped to the serial monitor's log region — the code editor next to
    // it also displays this same string as part of the sketch source.
    const serialLog = page.getByRole("log");
    await expect(serialLog.getByText("On-board LED on")).toBeVisible({ timeout: 5000 });
    await expect(page.getByText(/Connected to HomeNetwork/)).toBeVisible();

    await page.getByRole("button", { name: "Stop" }).click();
    await expect(page.getByRole("button", { name: "Run", exact: true })).toBeVisible();
  });

  test("has no automatically detectable accessibility violations", async ({ page }) => {
    await page.goto("/esp32-lab");
    // CodeMirror is dynamically imported (see docs/architecture/0013-*.md)
    // and injects its own stylesheet on mount — under parallel test load,
    // axe can occasionally scan before that stylesheet lands, reading
    // syntax-highlight token colors against the *page's* background
    // instead of the editor's own dark one. Waiting for the real,
    // rendered background color settles that race before scanning.
    await expect(page.locator(".cm-editor")).toHaveCSS(
      "background-color",
      "rgb(28, 27, 24)"
    );
    const results = await new AxeBuilder({ page }).analyze();
    expect(results.violations).toEqual([]);
  });
});
