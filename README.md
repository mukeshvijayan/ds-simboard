# DS SimBoard

A browser-based circuit simulator for Arduino Uno and ESP32, built in the DS
Inventek design system (same tokens as DS BlockCode). This repo is being
built out against `docs/MASTER_BUILD_SPEC.md` — **read that first**; it's
the source of truth for the electronics/physics model, the target
architecture, and the phase-by-phase roadmap. This README is the "what's
here today" companion to that spec. See `docs/onboarding.md` for a fuller
new-developer walkthrough.

## Stack

- pnpm workspaces + Turborepo monorepo (see `docs/architecture/0001-*.md`
  for why)
- Next.js 14 (App Router) + TypeScript, in `apps/web`
- Tailwind CSS, tokens defined in `packages/design-system` (see
  `packages/design-system/BRAND_REFERENCE.md`)
- Framer Motion for the scroll-reveal pattern on the landing page
- `@uiw/react-codemirror` + `@codemirror/lang-cpp` for the sketch editor
- `lucide-react` for the handful of functional UI icons (toolbar, remove
  button)

## Getting started

```bash
corepack enable
pnpm install
pnpm dev
```

Open `http://localhost:3000` for the landing page, `/simulator` for the app
shell.

## Project structure

```
apps/
  web/                        The Next.js app
    app/
      page.tsx                 Landing page
      simulator/page.tsx        Simulator shell — owns all app state
      layout.tsx                Fonts + metadata
    components/
      landing/                  Landing page sections
      simulator/                Toolbar, palette, canvas, editor, serial monitor
      simulator/boards/          SVG visuals: ArduinoUno, ESP32, LED, Servo,
                                  UltrasonicSensor, LCD1602
    lib/
      simulation/
        types.ts                 Shared domain types
        boards.ts                 Board catalog + default sketches
        engine.ts                 The sketch interpreter (see below — this is
                                   the main thing to replace)
packages/
  design-system/               DS Inventek tokens + Button/Container/
                                 ScrollReveal, shared across the product
                                 family (see docs/architecture/0002-*.md and
                                 0003-*.md for how/why it's structured)
docs/
  MASTER_BUILD_SPEC.md          The spec — read this first
  architecture/                 ADRs, one file per non-obvious decision
  onboarding.md                 New-developer walkthrough
```

`packages/circuit-engine`, `packages/chip-emulation`,
`packages/component-library`, `packages/shared-types`, and `apps/api` from
the spec's target architecture don't exist yet — see the roadmap in
`docs/MASTER_BUILD_SPEC.md` Part 6 for when each one lands.

## What's real vs. stubbed

**Real and working out of the box:**

- Landing page, fully built to the brand spec
- Simulator layout: board canvas, drag-and-drop component placement, pin
  assignment per component, code editor, run/stop/reset, serial monitor
- The default Blink sketches run end-to-end: press Run and the on-canvas LED
  actually lights up in sync with `digitalWrite`, and Serial output streams
  into the serial monitor

**Deliberately simplified — read `apps/web/lib/simulation/engine.ts` before
extending:**

- `SketchEngine` is a small line-stepping interpreter, not a real chip
  emulator. It recognizes a fixed set of calls (`pinMode`, `digitalWrite`,
  `analogWrite`, `delay`, `Serial.begin`, `Serial.print/println`) inside
  `setup()`/`loop()`. It does **not** evaluate variables, conditionals, loops,
  or custom functions.
- This is intentional: it makes the scaffold demonstrably functional without
  taking on a full compiler/emulator build here. The event interface
  (`EngineEvent`) is the seam to swap in a real implementation — see spec
  Phase 5 (`packages/chip-emulation`, `avr8js` for AVR).
- Component behavior is similarly simplified: the ultrasonic sensor doesn't
  compute a real distance from canvas geometry yet, and the LCD isn't wired
  to a `LiquidCrystal`-style API — both currently show placeholder state.
  `components/simulator/BoardCanvas.tsx` → `ComponentVisual` is where each
  component reads its live value. This becomes `packages/component-library`
  in spec Phase 3.
- Wiring is modeled as "one component → one pin" via a dropdown, not literal
  drawn wires, and there's no breadboard/resistor/capacitor circuit at all
  yet — that's spec Phase 2–4 (`packages/circuit-engine` + Breadboard Lab
  UI).

## Design system

Full token rationale is in `packages/design-system/BRAND_REFERENCE.md`.
Short version: ivory background, charcoal text, muted navy accent, Source
Serif 4 + Inter, no gradients/glow/glassmorphism/parallax anywhere. Keep new
UI consistent with this rather than introducing new colors or effects.

## Common commands

See `docs/onboarding.md` for the full table. Short version: `pnpm dev`,
`pnpm build`, `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm format` — all
run repo-wide via Turborepo.
