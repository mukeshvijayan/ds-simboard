import { test, expect } from "./fixtures";
import AxeBuilder from "@axe-core/playwright";

/**
 * The unified canvas (docs/architecture/0024-*.md) collapsing Breadboard
 * Lab, Arduino Lab, and ESP32 Lab into one route. The spec's own
 * golden-path example (Part 5.4): a resistor-protected LED lights up at a
 * safe current; an undersized resistor (modeled here by cranking the
 * supply voltage against the same 220Ω resistor) pushes current past the
 * LED's rated max and it burns out — genuinely computed by the general
 * MNA solver, not scripted.
 */
test.describe("Simulator", () => {
  test("a resistor-protected LED lights up; an undersized resistor for a higher supply voltage burns it out", async ({
    page,
  }) => {
    await page.goto("/simulator");

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

  test("panning the canvas background moves the breadboard on screen", async ({
    page,
  }) => {
    await page.goto("/simulator");
    const breadboard = page.getByRole("group", { name: "Breadboard — drag to move" });
    const before = await breadboard.boundingBox();
    expect(before).not.toBeNull();

    const canvas = page.getByRole("group", { name: /drag the background to pan/i });
    const canvasBox = await canvas.boundingBox();
    expect(canvasBox).not.toBeNull();
    if (!canvasBox) return;

    // Drag from a point clearly outside the breadboard's own bounds so
    // this pans the whole canvas rather than dragging the board itself.
    // Content follows the cursor (the standard "grab and drag" pan
    // convention): dragging left+down moves the breadboard left+down too.
    // A single move (no intermediate `steps`) — the pan math is computed
    // fresh from the drag-start snapshot each event, not accumulated, so
    // stepping adds no test value and only adds a race under parallel
    // load (mouse.up reaching the page before the last of several
    // stepped mousemove events does).
    await page.mouse.move(canvasBox.x + canvasBox.width - 20, canvasBox.y + 20);
    await page.mouse.down();
    await page.mouse.move(canvasBox.x + canvasBox.width - 120, canvasBox.y + 120);
    await page.mouse.up();

    const after = await breadboard.boundingBox();
    expect(after).not.toBeNull();
    if (!before || !after) return;
    expect(after.x).toBeCloseTo(before.x - 100, -1);
    expect(after.y).toBeCloseTo(before.y + 100, -1);
  });

  test("placing a multi-lead RGB LED (4 clicks) lights its wired channel", async ({
    page,
  }) => {
    await page.goto("/simulator");
    const hole = (label: string) =>
      page.getByRole("button", { name: label, exact: true }).first();

    // RGB LED needs 4 clicks in order: common leg, red, green, blue —
    // the multi-lead placement flow this test proves (P2-2, closing ADR
    // 0022), generalized from the old fixed-2-click flow.
    await page
      .getByRole("button", { name: "RGB LED (Common Cathode)", exact: true })
      .click();
    await expect(page.getByText(/common leg hole \(1 of 4\)/)).toBeVisible();
    await hole("Breadboard hole, top-negative rail").click();
    await expect(page.getByText(/red lead hole \(2 of 4\)/)).toBeVisible();
    await hole("Breadboard hole, row a, column 3").click();
    await expect(page.getByText(/green lead hole \(3 of 4\)/)).toBeVisible();
    await hole("Breadboard hole, row a, column 5").click(); // left unwired — stays dark
    await hole("Breadboard hole, row a, column 7").click(); // blue, also left unwired

    // Resistor protecting the red channel: positive rail -> row b, column
    // 3 (same strip column as the RGB LED's red lead).
    await page.getByRole("button", { name: "Resistor (220Ω)", exact: true }).click();
    await hole("Breadboard hole, top-positive rail").click();
    await hole("Breadboard hole, row b, column 3").click();

    await expect(page.getByRole("status")).toHaveText(/Circuit is live/);
    await expect(page.getByRole("button", { name: /^RGB LED rgbLed-/ })).toBeVisible();
    await expect(
      page.getByRole("button", { name: /^RGB LED rgbLed-.*, failed/ })
    ).not.toBeVisible();
  });

  test("has no automatically detectable accessibility violations", async ({ page }) => {
    await page.goto("/simulator");
    const results = await new AxeBuilder({ page }).analyze();
    expect(results.violations).toEqual([]);
  });
});
