/**
 * DS Inventek design tokens — the single source of truth for color and
 * typography values shared across every product in the family (DS
 * BlockCode, DS SimBoard, ...). Kept identical to DS BlockCode's system on
 * purpose; see BRAND_REFERENCE.md in this package for the full rationale.
 *
 * `tailwindPreset.ts` turns these into a Tailwind preset; `globals.css` in
 * each consuming app hardcodes a handful of these same values for
 * non-Tailwind CSS (custom properties, focus rings) and must be kept in
 * sync with this file by hand.
 */
export const colors = {
  ivory: "#FAF8F3",
  charcoal: {
    DEFAULT: "#1C1B18",
    muted: "#6B6A64",
    faint: "#A7A59D",
  },
  navy: {
    DEFAULT: "#22314F",
    dark: "#1A2540",
    light: "#3B4C70",
  },
  hairline: "rgba(28, 27, 24, 0.08)",
} as const;

/**
 * CSS variable names each consuming app's `next/font` setup must bind to
 * (e.g. `variable: fontVariables.serif` on the Source Serif 4 font loader).
 */
export const fontVariables = {
  serif: "--font-serif",
  sans: "--font-inter",
  mono: "--font-mono",
} as const;

// Not `as const`: Tailwind's Config type wants mutable `string[]` values here.
export const fontFamily: Record<"serif" | "sans" | "mono", string[]> = {
  serif: [`var(${fontVariables.serif})`, "Georgia", "serif"],
  sans: [`var(${fontVariables.sans})`, "system-ui", "sans-serif"],
  mono: [`var(${fontVariables.mono})`, "ui-monospace", "monospace"],
};
