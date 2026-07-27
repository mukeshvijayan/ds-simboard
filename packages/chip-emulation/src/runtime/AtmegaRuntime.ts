import {
  CPU,
  avrInstruction,
  AVRIOPort,
  PinState,
  portBConfig,
  portDConfig,
} from "avr8js";
import type { ChipEvent } from "../types";

/** Arduino Uno digital pin → (port, bit) mapping for D0–D13. */
const PORTD_PINS: ReadonlyArray<{ arduinoPin: number; bit: number }> = [
  0, 1, 2, 3, 4, 5, 6, 7,
].map((bit) => ({
  arduinoPin: bit,
  bit,
}));
const PORTB_PINS: ReadonlyArray<{ arduinoPin: number; bit: number }> = [
  0, 1, 2, 3, 4, 5,
].map((bit) => ({
  arduinoPin: bit + 8,
  bit,
}));

/**
 * Wraps `avr8js`'s real, instruction-stepping ATmega328P CPU emulator
 * (the same emulator real browser-based Arduino simulators are built on)
 * and translates GPIO activity into `ChipEvent`s.
 *
 * Scope for this phase (per the "precompiled demos only" decision):
 * `program` is a precompiled machine-code image (a `Uint16Array` — see
 * `../programs/`), not user-typed sketch source. There is currently no
 * live compilation path from a `.ino`-style sketch to this format — see
 * docs/architecture/0007-*.md for why, and what would need to change for
 * that to exist.
 */
export class AtmegaRuntime {
  private readonly cpu: CPU;
  private readonly portB: AVRIOPort;
  private readonly portD: AVRIOPort;
  private readonly lastPinValue = new Map<number, 0 | 1>();
  private running = false;

  constructor(
    program: Uint16Array,
    private readonly onEvent: (event: ChipEvent) => void
  ) {
    this.cpu = new CPU(program);
    this.portB = new AVRIOPort(this.cpu, portBConfig);
    this.portD = new AVRIOPort(this.cpu, portDConfig);

    for (const { arduinoPin, bit } of PORTD_PINS) {
      this.lastPinValue.set(arduinoPin, this.readBit(this.portD, bit));
    }
    for (const { arduinoPin, bit } of PORTB_PINS) {
      this.lastPinValue.set(arduinoPin, this.readBit(this.portB, bit));
    }
  }

  private readBit(port: AVRIOPort, bit: number): 0 | 1 {
    return port.pinState(bit) === PinState.High ? 1 : 0;
  }

  private pollPinChanges(): void {
    for (const { arduinoPin, bit } of PORTD_PINS) {
      this.emitIfChanged(arduinoPin, this.readBit(this.portD, bit));
    }
    for (const { arduinoPin, bit } of PORTB_PINS) {
      this.emitIfChanged(arduinoPin, this.readBit(this.portB, bit));
    }
  }

  private emitIfChanged(arduinoPin: number, value: 0 | 1): void {
    if (this.lastPinValue.get(arduinoPin) !== value) {
      this.lastPinValue.set(arduinoPin, value);
      this.onEvent({ type: "pin-change", pin: String(arduinoPin), value });
    }
  }

  /** Current digital value of an Arduino Uno pin (0–13), from the emulator's actual GPIO state. */
  digitalPinValue(arduinoPin: number): 0 | 1 {
    const value = this.lastPinValue.get(arduinoPin);
    if (value === undefined) {
      throw new RangeError(
        `pin ${arduinoPin} is not a modeled digital pin (expected 0-13)`
      );
    }
    return value;
  }

  /** Total CPU cycles executed so far. */
  get cycles(): number {
    return this.cpu.cycles;
  }

  start(): void {
    this.running = true;
    this.onEvent({ type: "status", status: "running" });
  }

  stop(): void {
    this.running = false;
    this.onEvent({ type: "status", status: "stopped" });
  }

  get isRunning(): boolean {
    return this.running;
  }

  /** Executes exactly one AVR instruction and emits any resulting pin-change events. */
  step(): void {
    avrInstruction(this.cpu);
    this.pollPinChanges();
  }

  /** Executes up to `count` instructions (fewer if `stop()` is called mid-run). */
  runInstructions(count: number): void {
    for (let i = 0; i < count && this.running; i++) {
      this.step();
    }
  }
}
