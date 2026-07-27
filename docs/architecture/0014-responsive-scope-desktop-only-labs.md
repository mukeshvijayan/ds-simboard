# ADR 0014: Labs stay desktop/tablet-width; landing page is fully responsive

- **Date:** 2026-07-28
- **Status:** Accepted

## Context

Spec Part 6 Phase 10 asks for a responsive pass across mobile, tablet, and
desktop. Auditing the current state first (rather than assuming): the
landing page already had real `sm`/`md`/`lg` Tailwind breakpoint usage
throughout (`Hero`, `Features`, `HowItWorks`, `SupportedBoards`, etc.) —
with one genuine bug, not a missing breakpoint: `Header`'s nav was
`hidden md:flex` with **no mobile fallback at all** — below `md` (768px),
every nav link (including the links to all three labs) simply
disappeared, with nothing replacing them. That's fixed directly (a real
hamburger-triggered mobile menu, `components/landing/Header.tsx`) — not a
scope question, just a bug.

The three labs (Breadboard/Arduino/ESP32) are a different, genuine scope
question. Each is a fixed multi-pane layout — a parts palette, a wiring
canvas, and an inspector for Breadboard Lab; a board view and a 420px-wide
code/serial panel for Arduino/ESP32 Lab — built around `w-[220px]`/
`w-[240px]`/`w-[420px]` fixed-width panes. This is a deliberate,
information-dense engineering-tool layout (the same category of UI as
Tinkercad Circuits, CircuitJS1 — spec Part 1's own reference platforms),
not a content page that reflows naturally.

## Decision

**The three labs render a real UI only at `lg` (1024px) and above.**
Below that, each renders `<DesktopOnlyNotice>` (`components/shared/
DesktopOnlyNotice.tsx`) instead — an honest "best experienced on a larger
screen" message, not a squished, half-broken attempt at the same
multi-pane layout on a phone. **The landing page has no such gate** — it
remains fully responsive end to end, including the now-fixed mobile nav.

This is the same "honest UI over a fake/broken feature" pattern already
established elsewhere in this project (the "not wired up yet" Arduino
serial monitor from ADR 0007, the "empty board" and "unsupported
topology" states in Breadboard Lab from ADR 0006) — applied to viewport
width instead of a missing capability.

## Why not attempt a mobile wiring canvas

- **Fine-motor wiring (dragging a wire between two specific holes a few
  pixels apart) doesn't work well with a fingertip on a small screen**,
  independent of how much CSS reflowing is applied — this is a real
  interaction-design constraint, not a solvable layout problem.
- **A silently squished 3-pane layout would be worse than an honest
  notice.** A palette, canvas, and inspector all fighting for space in a
  375px-wide viewport doesn't become usable by making the panes
  narrower — it becomes illegible. Users are better served knowing to
  switch devices than fighting a broken-looking page.
- **This scopes the actual, valuable responsive work correctly**: the
  landing page — where a visitor decides whether to try the product at
  all, quite possibly from a phone — getting real, full responsive
  treatment (now including working navigation) matters far more for this
  product than a marginal, low-quality mobile wiring experience would.

## What this unblocks vs. defers

- **`lg` (1024px) was chosen, not `md` (768px)**, because a tablet in
  portrait (commonly ~768-820px) still doesn't comfortably fit a
  220px + fluid-canvas + 240px (or 420px-fixed-panel) layout;
  `lg` reliably captures "laptop or larger," which the panes were
  actually sized for.
- **Deferred, a real future decision, not ruled out**: a genuinely
  redesigned single-pane, touch-first mobile wiring interaction (e.g., a
  tap-to-select-two-holes flow with a bottom-sheet inspector) is a
  substantial, separate UX design effort — worth doing if mobile usage
  data ever justifies it, not speculatively built now.
