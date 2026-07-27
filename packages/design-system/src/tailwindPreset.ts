import type { Config } from "tailwindcss";
import { colors, fontFamily } from "./tokens";

/**
 * Tailwind preset carrying the DS Inventek design tokens. Consuming apps
 * add this to their own `tailwind.config.ts` via `presets: [dsInventekPreset]`
 * so every product in the family renders from the same token values instead
 * of copy-pasting the palette.
 */
export const dsInventekPreset: Pick<Config, "theme"> = {
  theme: {
    extend: {
      colors,
      fontFamily,
      maxWidth: {
        content: "1180px",
      },
      transitionTimingFunction: {
        "ease-out-slow": "cubic-bezier(0.16, 1, 0.3, 1)",
      },
    },
  },
};
