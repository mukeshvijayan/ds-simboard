# DS SimBoard

A browser-based circuit simulator for Arduino Uno and ESP32, built in the DS
Inventek design system (same tokens as DS BlockCode). This is a **starter
scaffold**, not a finished product — see "What's real vs. stubbed" below
before you continue building.

## Stack

- Next.js 14 (App Router) + TypeScript
- Tailwind CSS, tokens defined in `tailwind.config.ts` and `BRAND_REFERENCE.md`
- Framer Motion for the scroll-reveal pattern on the landing page
- `@uiw/react-codemirror` + `@codemirror/lang-cpp` for the sketch editor
- `lucide-react` for the handful of functional UI icons (toolbar, remove button)

## Getting started

```bash
npm install
npm run dev
```

Open `http://localhost:3000` for the landing page, `/simulator` for the app
shell.

## Project structure

```
app/
  page.tsx              Landing page
  simulator/page.tsx     Simulator shell — owns all app state
  layout.tsx             Fonts + metadata
components/
  landing/                Landing page sections
  simulator/              Toolbar, palette, canvas, editor, serial monitor
  simulator/boards/        SVG visuals: ArduinoUno, ESP32, LED, Servo,
                            UltrasonicSensor, LCD1602
  ui/                      Shared Button, Container
lib/
  simulation/
    types.ts               Shared domain types
    boards.ts               Board catalog + default sketches
    engine.ts               The sketch interpreter (see below — this is the
                             main thing to replace)
```

## What's real vs. stubbed

**Real and working out of the box:**
- Landing page, fully built to the brand spec
- Simulator layout: board canvas, drag-and-drop component placement, pin
  assignment per component, code editor, run/stop/reset, serial monitor
- The default Blink sketches run end-to-end: press Run and the on-canvas LED
  actually lights up in sync with `digitalWrite`, and Serial output streams
  into the serial monitor

**Deliberately simplified — read `lib/simulation/engine.ts` before extending:**
- `SketchEngine` is a small line-stepping interpreter, not a real chip
  emulator. It recognizes a fixed set of calls (`pinMode`, `digitalWrite`,
  `analogWrite`, `delay`, `Serial.begin`, `Serial.print/println`) inside
  `setup()`/`loop()`. It does **not** evaluate variables, conditionals, loops,
  or custom functions.
- This is intentional: it makes the scaffold demonstrably functional without
  taking on a full compiler/emulator build here. The event interface
  (`EngineEvent`) is the seam to swap in a real implementation:
  - **Arduino Uno (AVR):** compile with an in-browser avr-gcc (WASM) and step
    the CPU with [`avr8js`](https://github.com/wokwi/avr8js) — this is the
    open-source AVR emulator that real browser-based Arduino simulators are
    built on.
  - **ESP32 (Xtensa):** no equivalent lightweight browser emulator is as
    mature; options are a WASM-compiled QEMU build or keeping a simplified
    interpreter for ESP32 sketches while using real emulation for AVR.
- Component behavior is similarly simplified: the ultrasonic sensor doesn't
  compute a real distance from canvas geometry yet, and the LCD isn't wired
  to a `LiquidCrystal`-style API — both currently show placeholder state.
  `components/simulator/BoardCanvas.tsx` → `ComponentVisual` is where each
  component reads its live value.
- Wiring is modeled as "one component → one pin" via a dropdown, not literal
  drawn wires. If you want Wokwi-style wire rendering between exact pin
  coordinates, that's the next layer to add on top of `BoardCanvas`.

## Design system

Full token rationale is in `BRAND_REFERENCE.md`. Short version: ivory
background, charcoal text, muted navy accent, Source Serif 4 + Inter, no
gradients/glow/glassmorphism/parallax anywhere. Keep new UI consistent with
this rather than introducing new colors or effects.

## Suggested next steps in Claude Code

1. `npm install` and confirm `npm run dev` renders both routes.
2. Decide on real chip emulation (`avr8js`) vs. continuing to extend the
   simplified interpreter — this is the highest-leverage decision for how
   far the simulator can go.
3. Add wire rendering between components and board pins.
4. Replace the hero preview SVG mock with a real product screenshot once the
   simulator is further along, per the brand's photography-over-illustration
   preference.
5. Add persistence (save/load a circuit + sketch) if this needs to be more
   than a scratch pad.
