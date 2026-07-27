import { AtmegaRuntime } from "./AtmegaRuntime";
import { BLINK_PROGRAM } from "../programs/blink";
import type { ChipEvent } from "../types";

describe("AtmegaRuntime — the Blink program, running on the real avr8js CPU emulator", () => {
  it("starts pin 13 low", () => {
    const runtime = new AtmegaRuntime(BLINK_PROGRAM, () => {});
    expect(runtime.digitalPinValue(13)).toBe(0);
  });

  it("toggles pin 13 as the emulated CPU actually executes the program", () => {
    const events: ChipEvent[] = [];
    const runtime = new AtmegaRuntime(BLINK_PROGRAM, (e) => events.push(e));
    runtime.start();
    runtime.runInstructions(8_000_000);

    const pin13Changes = events.filter((e) => e.type === "pin-change" && e.pin === "13");
    // The delay loop's tuned length (~1.58M cycles/toggle — see
    // programs/blink.ts) means several toggles happen within 8M
    // instructions — this is the real CPU executing real machine code,
    // not a scripted animation.
    expect(pin13Changes.length).toBeGreaterThan(2);
    expect(pin13Changes[0]).toMatchObject({ type: "pin-change", pin: "13", value: 1 });
  });

  it("toggles at a consistent, computable cycle interval (the delay loop is deterministic)", () => {
    const cyclesAtToggle: number[] = [];
    const runtime = new AtmegaRuntime(BLINK_PROGRAM, (e) => {
      if (e.type === "pin-change" && e.pin === "13") {
        cyclesAtToggle.push(runtime.cycles);
      }
    });
    runtime.start();
    runtime.runInstructions(10_000_000);

    expect(cyclesAtToggle.length).toBeGreaterThanOrEqual(4);
    // Steady-state toggles (skip the first, which includes one-time setup
    // instructions) should be evenly spaced.
    const steadyStateDeltas = cyclesAtToggle
      .slice(2)
      .map((c, i) => c - cyclesAtToggle[i + 1]);
    const [first, ...rest] = steadyStateDeltas;
    for (const delta of rest) {
      expect(delta).toBe(first);
    }
  });

  it("throws for a pin outside the modeled digital range", () => {
    const runtime = new AtmegaRuntime(BLINK_PROGRAM, () => {});
    expect(() => runtime.digitalPinValue(14)).toThrow(RangeError);
  });

  it("emits a running status on start and a stopped status on stop", () => {
    const events: ChipEvent[] = [];
    const runtime = new AtmegaRuntime(BLINK_PROGRAM, (e) => events.push(e));
    runtime.start();
    runtime.stop();
    expect(events).toContainEqual({ type: "status", status: "running" });
    expect(events).toContainEqual({ type: "status", status: "stopped" });
  });

  it("stops executing instructions once stopped", () => {
    const runtime = new AtmegaRuntime(BLINK_PROGRAM, () => {});
    runtime.start();
    runtime.stop();
    const cyclesBefore = runtime.cycles;
    runtime.runInstructions(1000);
    expect(runtime.cycles).toBe(cyclesBefore);
    expect(runtime.isRunning).toBe(false);
  });
});
