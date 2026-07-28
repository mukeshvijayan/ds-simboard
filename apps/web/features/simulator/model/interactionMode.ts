import type { ConnectionPointRef } from "./connectionPoint";

/**
 * What clicking a connection point on the canvas currently does. For a
 * polarized part (LED/diode), the click order sets polarity: the first
 * point clicked becomes the anode. Generalizes Breadboard Lab's
 * `HoleAddress`-only version (docs/architecture/0024-*.md) — the first
 * point can be a breadboard hole, a bare canvas lead, or (P2-3) a board
 * pin, in any combination.
 */
export type InteractionMode =
  | { kind: "idle" }
  | { kind: "placing"; presetId: string; firstPoint?: ConnectionPointRef }
  | { kind: "wiring"; firstPoint?: ConnectionPointRef };
