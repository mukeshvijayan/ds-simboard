/** Emitted by {@link AtmegaRuntime} as the emulated CPU runs. */
export type ChipEvent =
  | { type: "pin-change"; pin: string; value: 0 | 1 }
  | { type: "serial"; text: string }
  | { type: "status"; status: "running" | "stopped" };
