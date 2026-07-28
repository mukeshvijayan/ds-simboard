import { test, expect } from "./fixtures";
import AxeBuilder from "@axe-core/playwright";

/**
 * The spec's own golden-path example (Part 5.4): a resistor-protected LED
 * lights up at a safe current; an undersized resistor (modeled here by
 * cranking the supply voltage against the same 220Ω resistor) pushes
 * current past the LED's rated max and it burns out — genuinely computed
 * by circuit-engine's solver, not scripted.
 */
test.describe("Breadboard Lab", () => {
  test("a resistor-protected LED lights up; an undersized resistor for a higher supply voltage burns it out", async ({
    page,
  }) => {
    await page.goto("/breadboard-lab");

    // Rail holes all share the same aria-label (they're electrically one
    // node, so any hole along the rail works) — `.first()` picks one.
    const hole = (label: string) =>
      page.getByRole("button", { name: label, exact: true }).first();

    // Resistor: top-positive rail -> column 3
    await page.getByRole("button", { name: "Resistor (220Ω)", exact: true }).click();
    await hole("Breadboard hole, top-positive rail").click();
    await hole("Breadboard hole, row a, column 3").click();

    // LED: column 3 (ties to the resistor's far lead) -> column 5
    await page.getByRole("button", { name: "LED (Red)", exact: true }).click();
    await hole("Breadboard hole, row b, column 3").click();
    await hole("Breadboard hole, row a, column 5").click();

    // Wire: column 5 -> top-negative rail, completing the loop
    await page.getByRole("button", { name: "Draw wire", exact: true }).click();
    await hole("Breadboard hole, row b, column 5").click();
    await hole("Breadboard hole, top-negative rail").click();

    await expect(page.getByRole("status")).toHaveText(/Circuit is live/);
    await expect(page.getByRole("button", { name: /^LED led-/ })).toBeVisible();
    await expect(
      page.getByRole("button", { name: /^LED led-.*, failed/ })
    ).not.toBeVisible();

    // Same circuit, same 220Ω resistor — but at 20V instead of 5V, current
    // through it is (20-2)/220 ≈ 82mA, well past the LED's 30mA max. An
    // undersized resistor for the voltage is the same failure spec Part
    // 2.3 describes, computed by the real solver, not scripted.
    await page.locator('input[type="number"]').fill("20");

    await expect(page.getByRole("button", { name: /^LED led-.*, failed/ })).toBeVisible();
  });

  test("has no automatically detectable accessibility violations", async ({ page }) => {
    await page.goto("/breadboard-lab");
    const results = await new AxeBuilder({ page }).analyze();
    expect(results.violations).toEqual([]);
  });
});
