import type { HoleAddress } from "@ds-simboard/circuit-engine";
import type { BreadboardComponentType } from "./types";

/**
 * What clicking a hole on the canvas currently does. For a polarized part
 * (LED/diode), the click order sets polarity: the first hole clicked
 * becomes the anode.
 */
export type InteractionMode =
  | { kind: "idle" }
  | { kind: "placing"; type: BreadboardComponentType; firstHole?: HoleAddress }
  | { kind: "wiring"; firstHole?: HoleAddress };
