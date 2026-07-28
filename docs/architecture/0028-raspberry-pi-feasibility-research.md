# ADR 0028: Raspberry Pi as a canvas component — feasibility research only

- **Date:** 2026-07-29
- **Status:** Resolved — out of scope for now (see Resolution below)

## Context

P2-3 asked Arduino Uno and ESP32 to become real canvas components
(delivered — ADR 0027), and named Raspberry Pi as a third board to
research feasibility for, explicitly **not to build yet**: write a short
research ADR and stop for user input before committing to an approach.
This is that research. Nothing below has been built.

**The first thing this research surfaced: "Raspberry Pi" is ambiguous
between two genuinely different products**, and which one is meant
changes the feasibility answer completely. Checking rather than
assuming (same discipline ADR 0007/0008 used for AVR compilation and
Xtensa emulation):

## Option A: Raspberry Pi Pico (the RP2040 microcontroller board)

Not a Raspberry Pi at all in the SBC sense — a $4, dual-core
Cortex-M0+ **microcontroller** board, electrically and architecturally
in the same category as the Arduino Uno/ESP32 already built. Real,
mature tooling exists:

- **`rp2040js`** (npm, MIT licensed, maintained by Wokwi — the same team
  and pattern as `avr8js`): a real, instruction-level RP2040 CPU
  emulator, actively published (latest release a few months old at time
  of writing), runs Arduino-style compiled code, MicroPython, and
  CircuitPython.
- This is **directly comparable in feasibility to what was just built**:
  a small, real, MIT-licensed, dependency-light CPU emulator with a
  GPIO model amenable to the exact same bridging architecture ADR 0027
  already established (real register-level pin state, injectable
  external input). No new licensing question, no new architecture
  question — the same "precompiled demo, bidirectional GPIO bridge"
  shape, just a second chip.

## Option B: Raspberry Pi (the actual single-board computer — Pi 3/4/5, running Linux)

A fundamentally different, much larger proposition — not a bare-metal
microcontroller running one program, but a full ARM Cortex-A SoC
booting a Linux kernel, with GPIO exposed through the OS (`sysfs`/
`gpiochip`/`libgpiod`), not a program touching a memory-mapped register
directly. Searched rather than assumed (same as ADR 0008's Xtensa
search):

- **No lightweight, purpose-built JS/WASM Raspberry-Pi-SBC emulator
  exists** comparable to `avr8js`/`rp2040js`. The one real candidate
  found, **Velxio**, does claim in-browser Raspberry Pi 3 emulation
  (ARM Cortex-A53 + Linux, via QEMU compiled to WASM), but:
  - **It's dual-licensed AGPLv3 (copyleft) / commercial** — using it
    as a dependency would require either open-sourcing this app under
    AGPL too, or a paid commercial license. That's a real product/
    licensing decision for the project owner, not a technical one —
    exactly the category of decision ADR 0007 already flagged (and
    stopped for) over the GPL-licensed `avr-gcc-wasm` package.
  - It's a young, fast-iterating project (public version numbering
    suggests rapid recent churn) — maturity and long-term stability
    as a dependency aren't established.
  - A full QEMU-booted Linux system is a categorically bigger runtime
    than anything in this app so far — tens of megabytes and real boot
    time (seconds, not the near-instant `avr8js` CPU construction used
    today), and its GPIO surface (OS-mediated, permissioned, device-tree
    driven) doesn't fit the same "read a register, inject a pin" bridge
    ADR 0027 built; it would need its own, separately-designed bridge.
  - **The other alternative is a from-scratch QEMU-in-WASM effort** —
    the same category of undertaking ADR 0007 (AVR-GCC toolchain) and
    ADR 0008 (Xtensa emulator) already declined as multi-week-to-multi-
    month systems projects, not achievable for real in one session.

## Decision

Two independent questions were raised for the project owner, since they
change the answer: which "Raspberry Pi" was meant (Pico vs. the full
Linux SBC), and — if the SBC — whether to accept Velxio's AGPLv3/
commercial licensing tradeoff. See Resolution below for how this was
actually answered.

## Resolution

The full Linux-capable Raspberry Pi SBC (Option B) was the one meant.
On learning that Velxio isn't a library but a separate, self-hosted
full-stack service (its own Python/FastAPI/QEMU backend, no npm
package, no documented embedding API) — meaning "integrate it" would
mean standing up and hosting a second backend service, not just adding
a dependency — **Raspberry Pi support was pulled back out of scope
entirely.** No AGPL relicensing, no Velxio integration, no separate
infrastructure. Reasoning: a repo-wide license change (this project
currently has no LICENSE file at all — AGPL would be its first) is a
legal decision that needs real legal input specifically, not something
to settle as a side effect of one board-integration task.

Arduino Uno and ESP32 (ADR 0027) remain the boards on the canvas.
Raspberry Pi is not planned further unless it becomes a real priority
later, at which point it needs its own properly-scoped decision —
starting with which product (Pico vs. SBC) is actually wanted, and, if
the SBC, a licensing decision made with real legal input rather than
inside a board-integration task.

## Alternatives considered

- **Assume "Raspberry Pi" meant the SBC and build against Velxio
  anyway** — rejected: a copyleft licensing commitment is not a call
  to make unilaterally on the project owner's behalf, exactly the
  reasoning ADR 0007 already used for the GPL-licensed compiler
  package.
- **Assume "Raspberry Pi" meant the Pico and just build it** —
  rejected for the same reason in the other direction: building the
  wrong one wastes the effort and still leaves the real question
  (what to do about the SBC case) unanswered.

## Consequences

- No Raspberry Pi (either kind) is on the canvas, and none is planned
  for the current Phase 2 work.
- This repo has no LICENSE file and stays that way — the AGPL question
  was never acted on (no file was ever written to the repo; nothing to
  revert).
- If Raspberry Pi support is revisited later: Pico would reuse ADR
  0027's architecture almost unchanged, no licensing question attached.
  The full SBC would need its own architecture ADR for an OS-mediated
  GPIO bridge, a real infrastructure/hosting decision, and a licensing
  decision made with actual legal input — not bundled into a board-
  integration task the way this pass approached it.
