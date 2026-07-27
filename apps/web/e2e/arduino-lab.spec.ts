import { test, expect } from "./fixtures";
import AxeBuilder from "@axe-core/playwright";

test.describe("Arduino Lab", () => {
  test("running the Blink demo actually toggles the emulated pin 13 LED", async ({
    page,
  }) => {
    await page.goto("/arduino-lab");

    const led = page.getByRole("img", { name: /LED, (lit|off)/ });
    await expect(led).toHaveAttribute("aria-label", "LED, off");

    await page.getByRole("button", { name: "Run Blink demo" }).click();
    await expect(page.getByRole("button", { name: "Stop" })).toBeVisible();

    // The demo is tuned for a ~1s toggle (see features/arduino-lab/constants.ts)
    // — driven by a real, instruction-stepping AVR CPU emulator, not an
    // animation, so this genuinely proves the emulator is executing.
    await expect(led).toHaveAttribute("aria-label", "LED, lit", { timeout: 5000 });
    await expect(led).toHaveAttribute("aria-label", "LED, off", { timeout: 5000 });

    await page.getByRole("button", { name: "Stop" }).click();
    await expect(page.getByRole("button", { name: "Run Blink demo" })).toBeVisible();
  });

  test("has no automatically detectable accessibility violations", async ({ page }) => {
    await page.goto("/arduino-lab");
    const results = await new AxeBuilder({ page }).analyze();
    expect(results.violations).toEqual([]);
  });
});
