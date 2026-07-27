# ADR 0008: ESP32 Lab keeps the line-stepping interpreter — no Xtensa emulator exists

- **Date:** 2026-07-27
- **Status:** Accepted

## Context

Spec Phase 7 names the decision explicitly: "second emulation path (or
extended interpreter, per the README trade-off already documented)." The
README (written before Phase 1) already anticipated this: "ESP32 (Xtensa):
no equivalent lightweight browser emulator is as mature; options are a
WASM-compiled QEMU build or keeping a simplified interpreter for ESP32
sketches while using real emulation for AVR."

Before treating that as settled, I checked rather than assumed: searched
npm for any Xtensa CPU emulator, ESP32-specific JS/WASM emulator, or
similar (`xtensa`, `esp32 emulator wasm`, `esp32-js`) — nothing relevant
came back, only irrelevant unrelated packages and a 404 for the most
likely name. This matches Phase 5's finding for AVR compilation: real
Xtensa emulation would mean either a from-scratch QEMU-in-WASM port (a
large undertaking, well beyond a single phase) or nothing.

## Decision

ESP32 Lab (`apps/web/features/esp32-lab`, the new `/esp32-lab` route) uses
the _same_ `SketchEngine` line-stepping interpreter the original scaffold
already had — not a new emulator. Two real, additive pieces of work came
out of this phase instead of a new execution engine:

1. **Extended GPIO** was already done before this phase — `BOARDS.esp32`
   already lists all 19 digital pins and 6 analog pins, and the `ESP32`
   board SVG already renders them dynamically. Confirmed by reading the
   existing code rather than assumed; no changes needed here.
2. **A Wi-Fi stub**: `SketchEngine` now recognizes `WiFi.begin(ssid,
password?)` and `WiFi.disconnect()` as statements and emits a new
   `wifi` `EngineEvent` reporting a canned "connected"/"disconnected"
   outcome — there's no real handshake, no real network stack, and (like
   every other statement this interpreter recognizes) no expression
   evaluation, so `WiFi.status()` used in a condition still isn't
   supported. This is additive to the shared engine (used by both the old
   `/simulator` page and the new ESP32 Lab) and doesn't change existing
   recognized-statement behavior — confirmed with new regression tests
   covering the pre-existing statement types alongside the new ones,
   since `lib/simulation/engine.ts` had zero test coverage before this
   phase despite being shared, load-bearing code.

## Alternatives considered

- **Build a QEMU-in-WASM Xtensa port.** Rejected for the same reason as
  Phase 5's from-scratch avr-gcc option: a multi-week (likely
  multi-month) systems project, not achievable for real in this
  engagement, and not something to fake a shortcut for.
- **Leave ESP32 without its own dedicated lab**, since the interpreter
  isn't new. Rejected — spec Part 3 frames three separate labs as the
  product structure, and the existing `/simulator` page bundles Uno+ESP32
  behind a board-selector dropdown rather than giving ESP32 its own
  space. `/esp32-lab` gives it one, consistent with Breadboard Lab and
  Arduino Lab's precedent from Phases 4 and 6.
- **Model `WiFi.status()` for conditionals** — rejected as out of scope:
  this interpreter fundamentally doesn't evaluate expressions or
  conditionals for _any_ statement (a documented limitation since Phase
  0), so special-casing one function's return value would be
  inconsistent with everything else the engine does.

## Consequences

- Arduino Lab (Phase 6, real `avr8js` CPU emulation) and ESP32 Lab (this
  phase, interpreter + Wi-Fi stub) are now asymmetric in a way that's
  real, not accidental: Arduino Lab can only run one precompiled demo but
  with genuine instruction-level accuracy; ESP32 Lab can run arbitrary
  (simple, straight-line) user-typed sketches but with the same
  simplified interpreter the project started with. Both UIs say what
  they are rather than papering over the difference.
- If real Xtensa emulation ever becomes available (or someone builds one
  in-house), this ADR is the seam: swap `SketchEngine`'s internals for
  ESP32 sketches specifically, keeping the same `EngineEvent` shape so
  `ESP32Lab.tsx` doesn't need to change — the same swap point the
  original engine.ts docstring already described.
