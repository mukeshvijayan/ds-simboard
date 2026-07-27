# DS Inventek — Brand & Design System Reference

This file is a copy of the design-system brief this scaffold was built from.
Keep it in the repo so future work (in Claude Code or otherwise) stays
consistent with the rest of the DS Inventek product family.

## Company facts (tone/credibility only — never narrate on-page)

- Founded by combat robotics World Champions — Games of the Future 2024 World
  Champions, Kazan, Russia
- Trust badges (exactly these three, grayscale small-caps, no color/emoji):
  DPIIT Recognised, AICTE Approved, Startup India Registered
- Based in Chennai & Puducherry, India
- Positioning: "real hardware, not simulations" — genuine engineering
  credibility, not hype
- Parent site: dsinventek.com
- Footer credit: a single understated "A DS Inventek product" line linking to
  dsinventek.com — never a full "About us" section on product pages

## Design tokens

**Color**

- Background: warm ivory `#FAF8F3`
- Text primary: near-black charcoal `#1C1B18`
- Text secondary/muted: lighter charcoal, used for captions/badges/footer
- Accent: muted deep navy `#22314F` (links, primary buttons, hairlines only —
  kept identical to DS BlockCode per this product's brief). No gradients, no
  glow, no neon anywhere. No purple, no cyan, no bright colors.

**Typography**

- Headlines: quiet editorial serif — Source Serif 4 (Georgia fallback)
- Body: Inter
- Utility/code: IBM Plex Mono — monospace never appears in marketing
  headlines, only inside literal code-display panels

**Layout & motion**

- One dominant CTA per section, generous margins, real photography over
  illustration/emoji/icons wherever feasible
- Banned: glassmorphism/blur, background orbs/blobs, custom cursors,
  parallax scrolling, bouncy/elastic easing
- Scroll-reveal: image group animates in first, text group follows ~120–150ms
  later, alternating left/right per section, 20–28px travel, opacity fade,
  450–550ms ease-out, triggers once per section, fully disabled under
  `prefers-reduced-motion` — implemented in `src/components/ScrollReveal.tsx`
  in this package

**Footer**

- Single minimal row (not multi-column) — copyright left, core nav
  center/right, "A DS Inventek product" far right
- Trust badge row sits above the footer row, grayscale small-caps

## Naming convention lesson learned

Avoid embedding a third-party trademarked library/framework name directly in
the product name — this is why "Robotics Blockly" became "DS BlockCode." This
simulator product is named **DS SimBoard** for the same reason: it is
inspired by the _category_ of browser-based electronics simulators (Wokwi
being the best-known example) without referencing that or any other specific
product/library by name.
