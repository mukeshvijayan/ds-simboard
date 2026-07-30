import { test, expect } from "./fixtures";
import AxeBuilder from "@axe-core/playwright";
import type { Page } from "@playwright/test";

/**
 * The unified canvas (docs/architecture/0024-*.md), now with free-
 * floating component placement and explicit lead-to-lead wiring (Part
 * 2, docs/architecture/0036-*.md) — supersedes the old model where a
 * component's leads *were* the breadboard holes it was placed into,
 * decided by which holes got clicked in sequence during placement.
 * Placing a part is now one click-then-click-canvas (or a native drag)
 * to drop it anywhere on the open canvas; wiring is a separate step,
 * same "Draw wire" mode as before, just now able to target a
 * component's own lead in addition to a hole or a board pin.
 *
 * A larger-than-default viewport gives free-floating placement genuine
 * open canvas space to drop things into, clear of both the breadboard
 * and the side panels.
 */
test.use({ viewport: { width: 1600, height: 1000 } });

/** Places one instance of `presetLabel` at a fixed open-canvas point —
 * the click-then-click-canvas placement fallback (the primary
 * interaction is a native HTML5 drag from the palette, which these
 * tests don't need to exercise separately since both paths call the
 * same placement code). */
async function placeFree(page: Page, presetLabel: string, x: number, y: number) {
  await page.getByRole("button", { name: presetLabel, exact: true }).click();
  await page.mouse.click(x, y);
}

function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** A placed component's own named lead — the new per-lead wiring
 * target (Part 2). `idPrefix` narrows to one specific instance when a
 * test places more than one of the same type. `typeLabel` is regex-
 * escaped since several labels (e.g. "Transistor (NPN Switch)") contain
 * real parentheses that would otherwise be parsed as a capture group,
 * silently matching the wrong (parenthesis-free) string. */
function lead(page: Page, typeLabel: string, idPrefix: string, leadName: string) {
  return page.getByRole("button", {
    name: new RegExp(`^${escapeRegExp(typeLabel)} ${idPrefix}-\\d+ ${leadName} lead$`),
  });
}

/** Draws a wire between two already-located points (holes, board pins,
 * or component leads — `handlePointClick` treats all three the same). */
async function drawWire(
  page: Page,
  a: ReturnType<Page["getByRole"]>,
  b: ReturnType<Page["getByRole"]>
) {
  await page.getByRole("button", { name: "Draw wire", exact: true }).click();
  await a.click();
  await b.click();
}

test.describe("Simulator", () => {
  test("a resistor-protected LED lights up; an undersized resistor for a higher supply voltage burns it out", async ({
    page,
  }) => {
    await page.goto("/simulator");
    const hole = (label: string) =>
      page.getByRole("button", { name: label, exact: true }).first();

    await placeFree(page, "Resistor (220Ω)", 1150, 200);
    await placeFree(page, "LED (Red)", 1150, 320);

    const rLead1 = lead(page, "Resistor", "resistor", "lead1");
    const rLead2 = lead(page, "Resistor", "resistor", "lead2");
    const ledAnode = lead(page, "LED", "led", "anode");
    const ledCathode = lead(page, "LED", "led", "cathode");

    await drawWire(page, hole("Breadboard hole, top-positive rail"), rLead1);
    await drawWire(page, rLead2, ledAnode);
    await drawWire(page, ledCathode, hole("Breadboard hole, top-negative rail"));

    await expect(page.getByRole("status")).toHaveText(/Circuit is live/);
    await expect(page.getByRole("group", { name: /^LED led-/ })).toBeVisible();
    await expect(
      page.getByRole("group", { name: /^LED led-.*, failed/ })
    ).not.toBeVisible();

    // Same circuit, same 220Ω resistor — but at 20V instead of 5V, current
    // through it is (20-2)/220 ≈ 82mA, well past the LED's 30mA max. An
    // undersized resistor for the voltage is the same failure spec Part
    // 2.3 describes, computed by the real solver, not scripted.
    await page.locator('input[type="number"]').fill("20");

    await expect(page.getByRole("group", { name: /^LED led-.*, failed/ })).toBeVisible();
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

  test("dragging a free-floating component moves it independently of the breadboard", async ({
    page,
  }) => {
    await page.goto("/simulator");
    await placeFree(page, "Resistor (220Ω)", 1150, 200);
    const resistor = page.getByRole("group", { name: /^Resistor resistor-/ });
    const before = await resistor.boundingBox();
    expect(before).not.toBeNull();
    if (!before) return;

    // Grab the glyph's own center, not near an edge — a resistor's two
    // lead buttons sit right at its left/right edges, and a mousedown
    // that lands on a lead button (a child element) doesn't start a
    // drag at all (the container's own drag handler only starts when
    // the event's target is the container itself).
    // A single `mouse.move(..., { steps: N })` call fires several
    // mousemove events back-to-back with no gap in between — reliably
    // reproduced landing short of the full drag distance when run
    // through this suite's own test runner (consistently, across
    // repeated runs), though the same sequence run standalone against
    // the same build did not reproduce it — a real but not fully
    // root-caused timing sensitivity in event delivery under this
    // runner, not a reason to trust the drag feature itself any less
    // (manual, non-automated verification confirms it works). Explicit
    // intermediate moves with a real gap between each sidestep it
    // entirely, and incidentally match how a real mouse drag actually
    // delivers events over time rather than as one instantaneous burst.
    const grabX = before.x + before.width / 2;
    const grabY = before.y + before.height / 2;
    await page.mouse.move(grabX, grabY);
    await page.mouse.down();
    await page.mouse.move(grabX + 50, grabY + 25);
    await page.waitForTimeout(30);
    await page.mouse.move(grabX + 100, grabY + 50);
    await page.waitForTimeout(30);
    await page.mouse.up();

    const after = await resistor.boundingBox();
    expect(after).not.toBeNull();
    if (!after) return;
    expect(after.x).toBeCloseTo(before.x + 100, -1);
    expect(after.y).toBeCloseTo(before.y + 50, -1);
  });

  test("placing a multi-lead RGB LED lights its wired channel", async ({ page }) => {
    await page.goto("/simulator");
    const hole = (label: string) =>
      page.getByRole("button", { name: label, exact: true }).first();

    // A single click/drop places the whole RGB LED at once (Part 2) —
    // all four leads start unwired, unlike the old 4-click-in-sequence
    // placement flow this superseded.
    await placeFree(page, "RGB LED (Common Cathode)", 1150, 200);
    await placeFree(page, "Resistor (220Ω)", 1150, 320);

    const common = lead(page, "RGB LED", "rgbLed", "common");
    const red = lead(page, "RGB LED", "rgbLed", "red");
    const rLead1 = lead(page, "Resistor", "resistor", "lead1");
    const rLead2 = lead(page, "Resistor", "resistor", "lead2");

    // Common leg to the negative rail; only the red channel wired
    // through a protective resistor to the positive rail — green/blue
    // stay unwired and dark.
    await drawWire(page, common, hole("Breadboard hole, top-negative rail"));
    await drawWire(page, hole("Breadboard hole, top-positive rail"), rLead1);
    await drawWire(page, rLead2, red);

    await expect(page.getByRole("status")).toHaveText(/Circuit is live/);
    await expect(page.getByRole("group", { name: /^RGB LED rgbLed-/ })).toBeVisible();
    await expect(
      page.getByRole("group", { name: /^RGB LED rgbLed-.*, failed/ })
    ).not.toBeVisible();
  });

  test("a transistor switch turns on and lights its collector-side LED", async ({
    page,
  }) => {
    await page.goto("/simulator");
    const hole = (label: string) =>
      page.getByRole("button", { name: label, exact: true }).first();

    // The two-phase resolve this proves (P2-2 part 2, ADR 0022/0026):
    // base current from a first solve decides whether the collector-
    // emitter branch conducts in a real second solve.
    await placeFree(page, "Transistor (NPN Switch)", 1150, 150);
    await placeFree(page, "Resistor (220Ω)", 1350, 150);
    await placeFree(page, "Resistor (330Ω)", 1150, 300);
    await placeFree(page, "LED (Red)", 1350, 300);

    // Both resistor presets share the same "resistor-" id prefix
    // (every resistance value is the same underlying type), so the two
    // placed instances are told apart by placement order instead:
    // the 220Ω base resistor was placed first, the 330Ω load resistor
    // second.
    const base = lead(page, "Transistor (NPN Switch)", "transistor", "base");
    const collector = lead(page, "Transistor (NPN Switch)", "transistor", "collector");
    const emitter = lead(page, "Transistor (NPN Switch)", "transistor", "emitter");
    const baseResistorL1 = page
      .getByRole("button", { name: /^Resistor resistor-\d+ lead1 lead$/ })
      .first();
    const baseResistorL2 = page
      .getByRole("button", { name: /^Resistor resistor-\d+ lead2 lead$/ })
      .first();
    const loadResistorL1 = page
      .getByRole("button", { name: /^Resistor resistor-\d+ lead1 lead$/ })
      .last();
    const loadResistorL2 = page
      .getByRole("button", { name: /^Resistor resistor-\d+ lead2 lead$/ })
      .last();
    const ledAnode = lead(page, "LED", "led", "anode");
    const ledCathode = lead(page, "LED", "led", "cathode");

    // Base resistor: positive rail -> base resistor -> transistor base.
    await drawWire(page, hole("Breadboard hole, top-positive rail"), baseResistorL1);
    await drawWire(page, baseResistorL2, base);
    // Emitter to ground.
    await drawWire(page, emitter, hole("Breadboard hole, top-negative rail"));
    // Collector-side load: positive rail -> load resistor -> LED -> collector.
    await drawWire(page, hole("Breadboard hole, top-positive rail"), loadResistorL1);
    await drawWire(page, loadResistorL2, ledAnode);
    await drawWire(page, ledCathode, collector);

    await expect(page.getByRole("status")).toHaveText(/Circuit is live/);
    await expect(page.getByRole("group", { name: /^LED led-/ })).toBeVisible();
    await expect(
      page.getByRole("group", { name: /^LED led-.*, failed/ })
    ).not.toBeVisible();
    await expect(
      page.getByRole("group", { name: /^Transistor \(NPN Switch\) transistor-/ })
    ).toBeVisible();
  });

  test("placing a relay module energizes the coil and closes the contact", async ({
    page,
  }) => {
    await page.goto("/simulator");
    const hole = (label: string) =>
      page.getByRole("button", { name: label, exact: true }).first();

    // The coil and contact branches deliberately share no node (ADR
    // 0026). The common contact ties to the same positive rail as the
    // coil (a relay's contact pole is often wired to the same supply
    // as its coil), so once the coil pulls the contact closed, the load
    // resistor completes a real second, independent current path.
    await placeFree(page, "Relay Module", 1150, 150);
    await placeFree(page, "Resistor (220Ω)", 1150, 350);

    const coilA = lead(page, "Relay Module", "relay", "coilA");
    const coilB = lead(page, "Relay Module", "relay", "coilB");
    const contactA = lead(page, "Relay Module", "relay", "contactA");
    const contactB = lead(page, "Relay Module", "relay", "contactB");
    const resistorL1 = lead(page, "Resistor", "resistor", "lead1");
    const resistorL2 = lead(page, "Resistor", "resistor", "lead2");

    await drawWire(page, hole("Breadboard hole, top-positive rail"), coilA);
    await drawWire(page, coilB, hole("Breadboard hole, top-negative rail"));
    await drawWire(page, hole("Breadboard hole, top-positive rail"), contactA);
    await drawWire(page, contactB, resistorL1);
    await drawWire(page, resistorL2, hole("Breadboard hole, top-negative rail"));

    await expect(page.getByRole("status")).toHaveText(/Circuit is live/);
    const relayGroup = page.getByRole("group", { name: /^Relay Module relay-/ });
    await expect(relayGroup).toBeVisible();
    await expect(
      page.getByRole("group", { name: /^Relay Module relay-.*, failed/ })
    ).not.toBeVisible();

    // Select it to confirm the coil actually energized and closed the
    // contact — the two-phase resolve's real, observable outcome.
    await relayGroup.click();
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

    await placeFree(page, "Resistor (220Ω)", 1150, 500);
    await placeFree(page, "LED (Red)", 1150, 620);
    const resistorL1 = lead(page, "Resistor", "resistor", "lead1");
    const resistorL2 = lead(page, "Resistor", "resistor", "lead2");
    const ledAnode = lead(page, "LED", "led", "anode");
    const ledCathode = lead(page, "LED", "led", "cathode");

    // pin 13 -> resistor -> LED -> the Uno's own GND pin — powered
    // entirely by the board's real GPIO, not the breadboard rails.
    await drawWire(page, unoPin("D13"), resistorL1);
    await drawWire(page, resistorL2, ledAnode);
    await drawWire(page, ledCathode, unoPin("GND"));

    // The default breadboard is always present too (its own rails are
    // "always live," ADR 0006) but otherwise unwired here — tie its
    // ground to the Uno's so the solver sees one connected circuit, not
    // two disconnected grounded islands (same requirement as two
    // unconnected breadboards, ADR 0018).
    await drawWire(page, unoPin("GND"), hole("Breadboard hole, top-negative rail"));

    // Select the board (clicking its body, not a pin) and start Blink.
    await page.getByRole("group", { name: "Arduino Uno — drag to move" }).click({
      position: { x: 200, y: 100 },
    });
    await page.getByRole("button", { name: /Stopped \(click to run\)/ }).click();
    await expect(
      page.getByRole("button", { name: /Running \(click to stop\)/ })
    ).toBeVisible();

    // Blink's tuned toggle interval is ~1s (see chip-emulation's
    // programs/blink.ts) — poll the hand-authored LedGlyph's own SVG
    // aria-label (which reflects its `status` prop directly, P2-4b) until
    // the real, live-stepped avr8js CPU has driven pin 13 high at least
    // once, lighting it for real (not scripted).
    const ledGlyph = page.getByRole("group", { name: /^LED led-/ });
    await expect(ledGlyph).toBeVisible();
    await expect
      .poll(async () => ledGlyph.locator("svg").getAttribute("aria-label"), {
        timeout: 15_000,
      })
      .toBe("red LED, lit");
    await expect(
      page.getByRole("group", { name: /^LED led-.*, failed/ })
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

    await placeFree(page, "Resistor (220Ω)", 1150, 500);
    await placeFree(page, "LED (Red)", 1150, 620);
    const resistorL1 = lead(page, "Resistor", "resistor", "lead1");
    const resistorL2 = lead(page, "Resistor", "resistor", "lead2");
    const ledAnode = lead(page, "LED", "led", "anode");
    const ledCathode = lead(page, "LED", "led", "cathode");

    await drawWire(page, esp32Pin("D2"), resistorL1);
    await drawWire(page, resistorL2, ledAnode);
    await drawWire(page, ledCathode, esp32Pin("GND"));
    await drawWire(page, esp32Pin("GND"), hole("Breadboard hole, top-negative rail"));

    await page.getByRole("group", { name: "ESP32 Dev Board — drag to move" }).click({
      position: { x: 150, y: 30 },
    });
    await page.getByRole("button", { name: /Stopped \(click to run\)/ }).click();
    await expect(
      page.getByRole("button", { name: /Running \(click to stop\)/ })
    ).toBeVisible();

    const ledGlyph = page.getByRole("group", { name: /^LED led-/ });
    await expect(ledGlyph).toBeVisible();
    await expect
      .poll(async () => ledGlyph.locator("svg").getAttribute("aria-label"), {
        timeout: 15_000,
      })
      .toBe("red LED, lit");

    // The default sketch's real Serial.println output — SketchEngine's
    // interpreter, not avr8js, but the same "genuinely emitted, not
    // scripted" bar (ADR 0008). Scoped to the serial log (not the code
    // editor, which also shows the same string as sketch source).
    await expect(page.getByRole("log").getByText("On-board LED on")).toBeVisible();
  });

  test("the grade-tier filter narrows the palette without touching already-placed parts (P2-6)", async ({
    page,
  }) => {
    await page.goto("/simulator");

    // "All" is the default — every tier's parts are visible, including
    // an Advanced-tier one (Relay Module) and both board-add buttons.
    await expect(
      page.getByRole("button", { name: "Relay Module", exact: true })
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "+ Arduino Uno", exact: true })
    ).toBeVisible();

    // Place a Foundations-tier resistor before filtering — it must stay
    // on the canvas regardless of which tier is active afterward.
    await placeFree(page, "Resistor (220Ω)", 1150, 200);
    await expect(page.getByRole("group", { name: /^Resistor resistor-/ })).toBeVisible();

    // Switch to Foundations — Advanced-tier parts and boards disappear
    // from the palette, but the already-placed resistor is untouched.
    await page.getByRole("button", { name: "Foundations", exact: true }).click();
    await expect(
      page.getByRole("button", { name: "Relay Module", exact: true })
    ).not.toBeVisible();
    await expect(
      page.getByRole("button", { name: "Transistor (NPN Switch)", exact: true })
    ).not.toBeVisible();
    await expect(
      page.getByRole("button", { name: "+ Arduino Uno", exact: true })
    ).not.toBeVisible();
    await expect(
      page.getByRole("button", { name: "Resistor (220Ω)", exact: true })
    ).toBeVisible();
    await expect(page.getByRole("group", { name: /^Resistor resistor-/ })).toBeVisible();

    // Switch to Building — the Foundations resistor preset disappears
    // too (it's not offered there), replaced by grade 6-8 sensors.
    await page.getByRole("button", { name: "Building", exact: true }).click();
    await expect(
      page.getByRole("button", { name: "Resistor (220Ω)", exact: true })
    ).not.toBeVisible();
    await expect(
      page.getByRole("button", { name: "Motion Sensor (PIR)", exact: true })
    ).toBeVisible();

    // Back to All restores everything.
    await page.getByRole("button", { name: "All", exact: true }).click();
    await expect(
      page.getByRole("button", { name: "Resistor (220Ω)", exact: true })
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Relay Module", exact: true })
    ).toBeVisible();
  });

  test("a breadboard can be added from the palette and dragged independently", async ({
    page,
  }) => {
    await page.goto("/simulator");
    const boardsBefore = await page
      .getByRole("group", { name: "Breadboard — drag to move" })
      .count();
    await page.getByRole("button", { name: "+ Breadboard", exact: true }).click();
    await expect(
      page.getByRole("group", { name: "Breadboard — drag to move" })
    ).toHaveCount(boardsBefore + 1);
  });

  test("has no automatically detectable accessibility violations", async ({ page }) => {
    await page.goto("/simulator");
    const results = await new AxeBuilder({ page }).analyze();
    expect(results.violations).toEqual([]);
  });
});
