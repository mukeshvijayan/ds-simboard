import type { ConnectionPointRef } from "./connectionPoint";

/**
 * What clicking a connection point on the canvas currently does. For a
 * polarized part (LED/diode), the click order sets polarity: the first
 * point clicked becomes the anode. Generalizes Breadboard Lab's
 * `HoleAddress`-only version (docs/architecture/0024-*.md) — the first
 * point can be a breadboard hole, a bare canvas lead, or (P2-3) a board
 * pin, in any combination.
 *
 * `collectedPoints` grows by one per click while placing — a plain
 * 2-lead part finalizes after two clicks, same as before; a multi-lead
 * part (P2-2, closing ADR 0022 — an RGB LED's four leads, a 7-segment
 * display's nine) needs as many clicks as `presetLeadNames` (`constants.ts`)
 * says it does, in that same order.
 */
export type InteractionMode =
  | { kind: "idle" }
  | { kind: "placing"; presetId: string; collectedPoints: ConnectionPointRef[] }
  | { kind: "wiring"; firstPoint?: ConnectionPointRef };
