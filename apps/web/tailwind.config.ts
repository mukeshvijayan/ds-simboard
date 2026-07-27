import type { Config } from "tailwindcss";
import { dsInventekPreset } from "@ds-simboard/design-system/tailwindPreset";

/**
 * DS Inventek design tokens now live in packages/design-system (see
 * dsInventekPreset) so every product in the family renders from the same
 * source of truth — see packages/design-system/BRAND_REFERENCE.md for the
 * rationale. Only place we could have diverged (the accent color) was
 * deliberately kept as navy per brief.
 */
const config: Config = {
  presets: [dsInventekPreset],
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./features/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
    "../../packages/design-system/src/**/*.{ts,tsx}",
  ],
  plugins: [],
};

export default config;
