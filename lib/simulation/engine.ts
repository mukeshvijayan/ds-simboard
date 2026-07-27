import { EngineEvent } from "./types";

/**
 * SketchEngine
 * ------------
 * This is a deliberately simple, line-stepping interpreter — NOT a real
 * AVR/Xtensa emulator. It recognizes a small, common subset of the Arduino
 * API (pinMode, digitalWrite, digitalRead, analogWrite, delay, Serial.begin,
 * Serial.print/println) executed in a straight line inside setup()/loop().
 * It does not evaluate expressions, variables, conditionals, or loops.
 *
 * This exists so the scaffold runs an end-to-end demo (the default blink
 * sketches work out of the box) while keeping a clean seam to swap in a
 * real emulator later:
 *
 *   - For AVR boards (Arduino Uno), wire this up to `avr8js`
 *     (https://github.com/wokwi/avr8js) — compile the sketch with an
 *     in-browser avr-gcc (e.g. via a WASM toolchain) and step the CPU
 *     instead of this interpreter.
 *   - For ESP32, look at `esptool-js` / QEMU-based Xtensa emulation for
 *     the same role.
 *
 * Swap point: replace `SketchEngine.start()` internals; keep emitting the
 * same `EngineEvent` shape so the UI layer (BoardCanvas, SerialMonitor)
 * doesn't need to change.
 */
export class SketchEngine {
  private running = false;
  private timeoutHandle: ReturnType<typeof setTimeout> | null = null;
  private pendingResolve: (() => void) | null = null;
  private serialActive = false;

  constructor(
    private sketch: string,
    private onEvent: (event: EngineEvent) => void
  ) {}

  async start() {
    this.running = true;
    this.onEvent({ type: "status", status: "running" });

    try {
      const setupBody = extractBlock(this.sketch, "setup");
      const loopBody = extractBlock(this.sketch, "loop");

      if (setupBody === null || loopBody === null) {
        throw new Error("Sketch must define both setup() and loop().");
      }

      await this.runStatements(setupBody);

      while (this.running) {
        await this.runStatements(loopBody);
        // Yield to the browser even if the sketch's loop() has no delay(),
        // otherwise an all-microtask loop never returns control to the
        // event loop and the tab hard-freezes.
        if (this.running) await this.wait(0);
      }
    } catch (err) {
      this.onEvent({
        type: "error",
        message: err instanceof Error ? err.message : "Unknown simulation error",
      });
      this.onEvent({ type: "status", status: "error" });
      this.running = false;
    }
  }

  stop() {
    this.running = false;
    if (this.timeoutHandle) clearTimeout(this.timeoutHandle);
    // Unblock a pending delay() so the interpreter loop can actually exit
    // instead of leaving its await chain hung forever.
    this.pendingResolve?.();
    this.pendingResolve = null;
    this.onEvent({ type: "status", status: "stopped" });
  }

  private async runStatements(body: string) {
    const statements = splitStatements(body);

    for (const raw of statements) {
      if (!this.running) return;
      const statement = raw.trim();
      if (!statement) continue;
      await this.execute(statement);
    }
  }

  private async execute(statement: string) {
    let match: RegExpMatchArray | null;

    if ((match = statement.match(/^pinMode\s*\(\s*([\w]+)\s*,\s*(\w+)\s*\)$/))) {
      // Mode tracking is implicit in this simplified engine — no-op besides
      // validating the call shape.
      return;
    }

    if ((match = statement.match(/^digitalWrite\s*\(\s*([\w]+)\s*,\s*(HIGH|LOW)\s*\)$/))) {
      const [, pin, level] = match;
      this.onEvent({ type: "pin-change", pin, value: level === "HIGH" ? 1 : 0 });
      return;
    }

    if ((match = statement.match(/^analogWrite\s*\(\s*([\w]+)\s*,\s*(\d+)\s*\)$/))) {
      const [, pin, value] = match;
      this.onEvent({ type: "pin-change", pin, value: Number(value) });
      return;
    }

    if ((match = statement.match(/^delay\s*\(\s*(\d+)\s*\)$/))) {
      const ms = Math.min(Number(match[1]), 3000); // capped so demo runs stay responsive
      await this.wait(ms);
      return;
    }

    if (/^Serial\.begin\s*\(\s*\d+\s*\)$/.test(statement)) {
      this.serialActive = true;
      return;
    }

    if ((match = statement.match(/^Serial\.(print|println)\s*\(\s*(.*)\s*\)$/))) {
      if (!this.serialActive) return;
      const [, , rawArg] = match;
      const text = rawArg.trim().replace(/^"(.*)"$/, "$1");
      this.onEvent({ type: "serial", text });
      return;
    }

    // Unrecognized statement — ignored rather than thrown, so partially
    // unsupported sketches (e.g. containing variables or for-loops) still
    // run as far as this engine can take them.
  }

  private wait(ms: number): Promise<void> {
    return new Promise((resolve) => {
      this.pendingResolve = resolve;
      this.timeoutHandle = setTimeout(() => {
        this.pendingResolve = null;
        resolve();
      }, ms);
    });
  }
}

/** Extracts the body of `void <name>() { ... }` respecting brace balance. */
function extractBlock(source: string, name: string): string | null {
  const headerRegex = new RegExp(`void\\s+${name}\\s*\\(\\s*\\)\\s*{`);
  const headerMatch = source.match(headerRegex);
  if (!headerMatch || headerMatch.index === undefined) return null;

  const start = headerMatch.index + headerMatch[0].length;
  let depth = 1;
  let i = start;

  while (i < source.length && depth > 0) {
    if (source[i] === "{") depth++;
    if (source[i] === "}") depth--;
    i++;
  }

  if (depth !== 0) return null;
  return source.slice(start, i - 1);
}

/** Splits a block body into statements on top-level semicolons. */
function splitStatements(body: string): string[] {
  return body
    .split("\n")
    .map((line) => line.replace(/\/\/.*$/, "").trim())
    .filter(Boolean)
    .join(" ")
    .split(";")
    .map((s) => s.trim())
    .filter(Boolean);
}
