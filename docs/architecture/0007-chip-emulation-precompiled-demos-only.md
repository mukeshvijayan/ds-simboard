# ADR 0007: `chip-emulation` uses real `avr8js` CPU emulation, precompiled demos only — no live sketch compilation

- **Date:** 2026-07-27
- **Status:** Accepted (per explicit user decision after a feasibility investigation)

## Context

Spec Phase 5 asks to "integrate `avr8js`" and "replace the current
line-stepping `SketchEngine` with real compiled-code execution." Before
writing any code, I investigated whether a live path exists from a
user-typed Arduino sketch to AVR machine code, running entirely in the
browser (no server-side build step) — since without that, "real compiled-
code execution" can only ever run fixed, precompiled programs, not
whatever the user just typed in the editor.

**Finding: no clean live-compilation path exists.**

- `avr8js` itself (the CPU emulator) is legitimate — MIT-licensed,
  maintained by Wokwi, zero dependencies. Verified working (see below).
- The only npm package claiming full Arduino-sketch-to-WASM compilation,
  `@horang-corp/avr-gcc-wasm`, is a single-maintainer package (personal
  email, 3 versions, published a month before this phase), 55MB of bundled
  GCC+binutils WASM binaries, licensed under whatever's in a
  `THIRD_PARTY_NOTICES.md` — almost certainly GPL, since that's what
  GCC/binutils are licensed under. Bundling that into a commercial product
  is a real license-compliance decision.
- Even with that package, actual Arduino sketches need the Arduino _core_
  library too (`Serial`, `pinMode`, `digitalWrite` aren't AVR-GCC/libc —
  they're Arduino framework source that would also need vendoring).
- Building a real avr-gcc→WASM toolchain from scratch is a multi-week
  cross-compilation project, not achievable for real in one session.

**This was presented to the user directly** (not decided silently, per
standing instructions for this run) with four options: (1) real CPU
emulation for a small set of precompiled demos only, (2) accept the GPL/
unvetted-package risk to get live compilation working, (3) skip Phase 5
for now, (4) attempt a from-scratch toolchain build. **The user chose
option 1.**

## Decision

`packages/chip-emulation` wraps `avr8js`'s real `CPU` + `AVRIOPort`
classes in `AtmegaRuntime`, which runs a **precompiled** `Uint16Array`
machine-code image (not user-typed source) and emits `pin-change`/
`status` events from the CPU's _actual_ GPIO state as it executes real
AVR instructions — verified with a hand-written "Blink" program (toggle
pin 13 with a busy-wait delay) that produces a real, cycle-accurate,
periodic toggle (`AtmegaRuntime.test.ts` asserts the toggle interval is
constant across cycles, which only holds if the emulator is genuinely
executing the delay loop instruction-by-instruction).

The demo program's machine code (`src/programs/blink.ts`) was generated
**once, at development time**, using `avr8js`'s own bundled assembler
(`avr8js/dist/cjs/utils/test-utils.js`'s `asmProgram`) — not a live
compilation step, and not a runtime dependency of the shipped app. That
assembler isn't exported from `avr8js`'s public package entry point (it's
an internal utility used for the library's own test suite), so relying on
its import path at runtime would be fragile against future `avr8js`
versions. Using it only as a one-off code-gen tool, with the resulting
bytes committed to source, avoids that fragility entirely — the actual
`AtmegaRuntime` only touches `avr8js`'s fully public, documented API.

## A second finding, discovered while building the demo: no Serial demo yet

I attempted a second demo (Blink + a real `Serial.print`-equivalent
message) to prove `avr8js`'s USART peripheral works too, since spec Phase
6 wants "serial monitor driven by real emulated Serial peripheral." This
turned out to be blocked by the _same_ bundled assembler's limits, a
different and much smaller problem than the compilation question above:
the USART registers (`UCSR0A/B/C`, `UBRR0`, `UDR0`) live at memory
addresses 0xC0–0xC6, outside the 0x00–0x5F range the AVR `in`/`out`
instructions can address — reaching them requires `sts`/`lds` (direct
store/load), and a real serial-transmit loop needs `rcall`/`ret` for a
reusable "wait for UDRE0, then transmit" routine. Checked directly against
the assembler's source: **it doesn't implement `sts`, `lds`, `rcall`,
`ret`, or `sbrs`/`sbrc` at all** — confirmed by grepping for every one of
those mnemonics and finding zero matches, not just failing to find where
they're handled.

**Not solved here.** This is a well-scoped, well-understood gap — not the
open-ended "no C compiler exists" problem — and a real path forward exists
(extend the bundled assembler to support these instructions, or hand-
encode the small number of `sts`/`lds` instructions a serial demo actually
needs). Flagging it rather than either quietly shipping without a serial
demo with no explanation, or spending unplanned time mid-phase extending a
third-party assembler.

## Consequences

- `apps/web`'s existing `SketchEngine` (the line-stepping interpreter) is
  **not replaced or touched** in this phase. It remains the only path from
  user-typed sketch text to running behavior. `AtmegaRuntime` is a
  separate, real emulator that currently only runs the one precompiled
  demo — wiring either of these into the Arduino Lab UI, and deciding how
  (or whether) they coexist, is Phase 6 work.
- Only digital GPIO (pins 0–13, `AVRIOPort` on `PORTB`/`PORTD`) is wired
  up. Analog pins (`PORTC`) and any peripheral other than GPIO (Timer,
  USART, ADC, SPI, TWI — all real, present in `avr8js`) aren't used by
  `AtmegaRuntime` yet, since the one demo doesn't need them.
- If a later phase wants live sketch compilation, this ADR's investigation
  is the starting point: either accept a vetted (or self-audited)
  GPL-licensed compiler dependency and vendor the Arduino core library, or
  commit to a real toolchain-engineering effort. Neither is a quick
  follow-up.
