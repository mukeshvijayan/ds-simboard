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

  test("a transistor switch (3 clicks) turns on and lights its collector-side LED", async ({
    page,
  }) => {
    await page.goto("/simulator");
    const hole = (label: string) =>
      page.getByRole("button", { name: label, exact: true }).first();

    // Transistor needs 3 clicks in order: base, collector, emitter — the
    // two-phase resolve this test proves (P2-2 part 2, closing ADR
    // 0022/0026): base current from a first solve decides whether the
    // collector-emitter branch conducts in a real second solve.
    await page
      .getByRole("button", { name: "Transistor (NPN Switch)", exact: true })
      .click();
    await expect(page.getByText(/base hole \(1 of 3\)/)).toBeVisible();
    await hole("Breadboard hole, row a, column 1").click();
    await expect(page.getByText(/collector hole \(2 of 3\)/)).toBeVisible();
    await hole("Breadboard hole, row a, column 3").click();
    await expect(page.getByText(/emitter hole \(3 of 3\)/)).toBeVisible();
    await hole("Breadboard hole, top-negative rail").click();

    // Base resistor: positive rail -> row b, column 1 (ties to the base).
    await page.getByRole("button", { name: "Resistor (220Ω)", exact: true }).click();
    await hole("Breadboard hole, top-positive rail").click();
    await hole("Breadboard hole, row b, column 1").click();

    // Collector-side load: a current-limiting resistor and an LED, tied
    // to the collector via row b, column 3.
    await page.getByRole("button", { name: "Resistor (330Ω)", exact: true }).click();
    await hole("Breadboard hole, top-positive rail").click();
    await hole("Breadboard hole, row a, column 5").click();
    await page.getByRole("button", { name: "LED (Red)", exact: true }).click();
    await hole("Breadboard hole, row b, column 5").click(); // anode
    await hole("Breadboard hole, row b, column 3").click(); // cathode, ties to collector

    await expect(page.getByRole("status")).toHaveText(/Circuit is live/);
    await expect(page.getByRole("button", { name: /^LED led-/ })).toBeVisible();
    await expect(
      page.getByRole("button", { name: /^LED led-.*, failed/ })
    ).not.toBeVisible();
    await expect(
      page.getByRole("button", { name: /^Transistor \(NPN Switch\) transistor-/ })
    ).toBeVisible();
  });

  test("placing a relay module (4 clicks) energizes the coil and closes the contact", async ({
    page,
  }) => {
    await page.goto("/simulator");
    const hole = (label: string) =>
      page.getByRole("button", { name: label, exact: true }).first();
    // The relay's glyph is centered on its 4 leads' centroid — since two
    // of those leads sit on the rails, its glyph can end up overlapping a
    // rail hole near the start of the board. `.last()` picks a rail hole
    // far enough along the board to stay clear of it.
    const railHoleFarFromGlyph = (label: string) =>
      page.getByRole("button", { name: label, exact: true }).last();

    // Relay needs 4 clicks in order: coil lead 1, coil lead 2, common
    // contact, normally-open contact — the coil and contact branches
    // deliberately share no node (docs/architecture/0026-*.md). The
    // common contact ties to the positive rail too (a relay's contact
    // pole is often wired to the same supply as its coil), so once the
    // coil pulls the contact closed, the load resistor below completes a
    // real second, independent current path.
    await page.getByRole("button", { name: "Relay Module", exact: true }).click();
    await expect(page.getByText(/coil lead 1 hole \(1 of 4\)/)).toBeVisible();
    await hole("Breadboard hole, top-positive rail").click();
    await expect(page.getByText(/coil lead 2 hole \(2 of 4\)/)).toBeVisible();
    await hole("Breadboard hole, top-negative rail").click();
    await expect(page.getByText(/common contact hole \(3 of 4\)/)).toBeVisible();
    await hole("Breadboard hole, top-positive rail").click();
    await expect(page.getByText(/normally-open contact hole \(4 of 4\)/)).toBeVisible();
    await hole("Breadboard hole, row a, column 1").click();

    // Load resistor: row b, column 1 (ties to the contact) -> negative rail.
    await page.getByRole("button", { name: "Resistor (220Ω)", exact: true }).click();
    await hole("Breadboard hole, row b, column 1").click();
    await railHoleFarFromGlyph("Breadboard hole, top-negative rail").click();

    await expect(page.getByRole("status")).toHaveText(/Circuit is live/);
    const relayButton = page.getByRole("button", { name: /^Relay Module relay-/ });
    await expect(relayButton).toBeVisible();
    await expect(
      page.getByRole("button", { name: /^Relay Module relay-.*, failed/ })
    ).not.toBeVisible();

    // Select it to confirm the coil actually energized and closed the
    // contact — the two-phase resolve's real, observable outcome.
    await relayButton.click();
    await expect(page.getByText("Energized")).toBeVisible();
    await expect(page.getByText("Closed")).toBeVisible();
  });

  test("an Arduino Uno running Blink lights a real LED wired to pin 13 (P2-3, closing ADR 0027)", async ({
    page,
  }) => {
    await page.goto("/simulator");
    const hole = (label: string) =>
      page.getByRole("button", { name: label, exact: true }).first();

    await page.getByRole("button", { name: "+ Arduino Uno", exact: true }).click();
    const unoPin = (name: string) =>
      page.getByRole("button", { name: `Arduino Uno pin ${name}`, exact: true });

    // Base resistor-equivalent for the LED: pin 13 -> a breadboard strip
    // hole, then the LED from that same column to the Uno's own GND pin —
    // powered entirely by the board's real GPIO, not the breadboard rails.
    await page.getByRole("button", { name: "Resistor (220Ω)", exact: true }).click();
    await unoPin("D13").click();
    await hole("Breadboard hole, row a, column 1").click();
    await page.getByRole("button", { name: "LED (Red)", exact: true }).click();
    await hole("Breadboard hole, row b, column 1").click();
    await unoPin("GND").click();

    // The default breadboard is always present too (its own rails are
    // "always live," ADR 0006) but otherwise unwired here — tie its
    // ground to the Uno's so the solver sees one connected circuit, not
    // two disconnected grounded islands (same requirement as two
    // unconnected breadboards, ADR 0018).
    await page.getByRole("button", { name: "Draw wire", exact: true }).click();
    await unoPin("GND").click();
    await hole("Breadboard hole, top-negative rail").click();

    // Select the board (clicking its body, not a pin) and start Blink.
    await page.getByRole("group", { name: "Arduino Uno — drag to move" }).click({
      position: { x: 200, y: 100 },
    });
    await page.getByRole("button", { name: /Stopped \(click to run\)/ }).click();
    await expect(
      page.getByRole("button", { name: /Running \(click to stop\)/ })
    ).toBeVisible();

    // Blink's tuned toggle interval is ~1s (see chip-emulation's
    // programs/blink.ts) — poll the LED glyph's actual rendered color
    // until the real, live-stepped avr8js CPU has driven pin 13 high at
    // least once, lighting it for real (not scripted): lit red is
    // rgb(214, 69, 69) (#D64545), vs. off's rgb(167, 165, 157) (#A7A59D).
    const ledGlyph = page.getByRole("button", { name: /^LED led-/ });
    await expect(ledGlyph).toBeVisible();
    await expect
      .poll(async () => ledGlyph.evaluate((el) => getComputedStyle(el).backgroundColor), {
        timeout: 15_000,
      })
      .toBe("rgb(214, 69, 69)");
    await expect(
      page.getByRole("button", { name: /^LED led-.*, failed/ })
    ).not.toBeVisible();
  });

  test("an ESP32 running its default sketch lights a real LED wired to pin D2, and reports over Serial", async ({
    page,
  }) => {
    await page.goto("/simulator");
    const hole = (label: string) =>
      page.getByRole("button", { name: label, exact: true }).first();

    await page.getByRole("button", { name: "+ ESP32", exact: true }).click();
    const esp32Pin = (name: string) =>
      page.getByRole("button", { name: `ESP32 Dev Board pin ${name}`, exact: true });

    await page.getByRole("button", { name: "Resistor (220Ω)", exact: true }).click();
    await esp32Pin("D2").click();
    await hole("Breadboard hole, row a, column 1").click();
    await page.getByRole("button", { name: "LED (Red)", exact: true }).click();
    await hole("Breadboard hole, row b, column 1").click();
    await esp32Pin("GND").click();

    await page.getByRole("button", { name: "Draw wire", exact: true }).click();
    await esp32Pin("GND").click();
    await hole("Breadboard hole, top-negative rail").click();

    await page.getByRole("group", { name: "ESP32 Dev Board — drag to move" }).click({
      position: { x: 150, y: 30 },
    });
    await page.getByRole("button", { name: /Stopped \(click to run\)/ }).click();
    await expect(
      page.getByRole("button", { name: /Running \(click to stop\)/ })
    ).toBeVisible();

    const ledGlyph = page.getByRole("button", { name: /^LED led-/ });
    await expect(ledGlyph).toBeVisible();
    await expect
      .poll(async () => ledGlyph.evaluate((el) => getComputedStyle(el).backgroundColor), {
        timeout: 15_000,
      })
      .toBe("rgb(214, 69, 69)");

    // The default sketch's real Serial.println output — SketchEngine's
    // interpreter, not avr8js, but the same "genuinely emitted, not
    // scripted" bar (ADR 0008). Scoped to the serial log (not the code
    // editor, which also shows the same string as sketch source).
    await expect(page.getByRole("log").getByText("On-board LED on")).toBeVisible();
  });

  test("has no automatically detectable accessibility violations", async ({ page }) => {
    await page.goto("/simulator");
    const results = await new AxeBuilder({ page }).analyze();
    expect(results.violations).toEqual([]);
  });
});
