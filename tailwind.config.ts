import type { Config } from "tailwindcss";

/**
 * DS Inventek design tokens.
 * Kept identical to DS BlockCode's system on purpose — see
 * /BRAND_REFERENCE.md for the full rationale. Only place we could have
 * diverged (the accent color) was deliberately kept as navy per brief.
 */
const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
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
      },
      fontFamily: {
        serif: ["var(--font-serif)", "Georgia", "serif"],
        sans: ["var(--font-inter)", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "ui-monospace", "monospace"],
      },
      maxWidth: {
        content: "1180px",
      },
      transitionTimingFunction: {
        "ease-out-slow": "cubic-bezier(0.16, 1, 0.3, 1)",
      },
    },
  },
  plugins: [],
};

export default config;
