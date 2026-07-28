import type { HoleAddress } from "@ds-simboard/circuit-engine";

/**
 * What clicking a hole on the canvas currently does. For a polarized part
 * (LED/diode), the click order sets polarity: the first hole clicked
 * becomes the anode.
 *
 * `presetId` (not a bare `BreadboardComponentType`) identifies exactly
 * which palette preset is being placed — several presets share one
 * underlying type (e.g. every LED color is still `type: "led"`), so the
 * type alone isn't enough to know which preset's params to use. See
 * `constants.ts`'s `PART_PRESETS`.
 */
export type InteractionMode =
  | { kind: "idle" }
  | { kind: "placing"; presetId: string; firstHole?: HoleAddress }
  | { kind: "wiring"; firstHole?: HoleAddress };
