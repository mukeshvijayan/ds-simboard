# ADR 0030: Phase A3 (grade 9-10 components) — scope research, stopping for a real product decision

- **Date:** 2026-07-30
- **Status:** Research — not decided; stopping for user input, same category
  as ADR 0028's Raspberry Pi stop (a genuine product/data decision, not an
  implementation choice this run should make unilaterally)

## Context

With P2-1 through P2-3, P2-5, and P2-6 built, verified, and pushed, and
P2-4/Phase B2 both blocked on credentials only the user can supply, Phase
A3 ("grade 9-10 components") was the one remaining item on the master
to-do list without an external blocker. Before writing any code for it,
I checked what it actually specifies — same discipline as every other
phase in this project (ADR 0007/0008's real searches, ADR 0017/0022's
component audits before building).

**Finding: Phase A3 has no real specification anywhere in this repo.**
The entire written record is two sentences, in two ADRs:

- ADR 0017: _"Real bus protocols (I2C) are a second, separate deferred
  effort, picked up more fully in A3 where the original request already
  anticipated needing it."_
- ADR 0022: _"Phase A3 (grade 9–10 components, several of which will
  also need this same capability for logic-gate/shift-register-style
  multi-pin parts) both resume after Phase B is addressed."_

Both sentences reference an **"original request"** — a conversation with
the user — that specified more detail than either ADR captured. That
original detail isn't written down anywhere in the repo: not in
`docs/MASTER_BUILD_SPEC.md` (read in full; it predates the grade-band
scheme entirely and has no grade 9-10 tier, no logic-gate/shift-register/
bus-protocol component anywhere in its own component table), not in any
of the other 29 ADRs, not in any commit message, not in any code.

By contrast, both earlier grade bands got a real audit before building:
ADR 0016 names Phase A1's actual grade 3-5 component set; ADR 0017 opens
by auditing "Phase A2's grade 6-8 component list (~16 named parts)"
against what the solver could handle at the time. **Phase A3 never
received that treatment.** There is no equivalent list to audit.

**The engineering gap is as large as the scope gap.** `packages/
circuit-engine` is exclusively an analog/resistive Modified Nodal
Analysis solver (A-Engine, ADRs 0018-0021) — voltages, currents,
resistances, diode piecewise-linearity. A logic gate (AND/OR/NAND/...)
is a boolean function of its inputs' _digital_ states, not a resistive
network; a shift register needs clocked, edge-triggered state that
persists across simulation ticks; an I2C device needs a real bus
protocol (addressing, ack/nack, clocked serial data) between multiple
parts. None of this exists anywhere in the codebase today — confirmed by
reading `circuit-engine/src`'s actual file list (`breadboard/`, `graph/`,
`mna/`, `physics/ohmsLaw.ts` — nothing digital-logic-shaped) and
grepping the whole repo for `NAND`/`shift register`/`74HC`/`I2C` masters
list, finding zero matches outside the two ADR sentences above.

## Decision

**Not building Phase A3 tonight.** Two things are missing, and both are
genuine product/data decisions, not implementation choices:

1. **Which specific components.** "Logic-gate/shift-register-style
   multi-pin parts" and "I2C" name categories, not parts — a real
   curriculum-facing product needs to know if that means, concretely,
   e.g. a 74HC08 AND gate breakout, a 74HC595 shift register, an I2C
   LCD1602 backpack, an SSD1306 OLED, some combination, or something
   else entirely. Guessing this invents scope the "original request"
   apparently already settled, in a conversation this repo has no record
   of.
2. **What "simulate" means for digital logic here.** Real edge-triggered/
   clocked digital logic simulation is a materially different engine
   than the analog MNA solver this project has invested four ADRs
   (0018-0021) building correctly — building it well needs the same
   kind of scoping conversation A-Engine got ("build a real general
   circuit solver first," an explicit, deliberate user decision) before
   any code exists, not an inferred approximation.

This mirrors ADR 0028's Raspberry Pi stop exactly: real research done,
nothing built, a clear account of what's missing, waiting for the
user's actual answer rather than filling the gap with a guess late at
night with no way to confirm it.

## Alternatives considered

- **Build a plausible-looking digital logic subset anyway** (e.g., guess
  at AND/OR/NOT gates with a hand-rolled boolean evaluator) — rejected:
  exactly the kind of unilateral scope invention the "original request"
  reference warns against; wrong guesses here cost real rework, and
  there's no way to verify a guess against curriculum intent without the
  user.
- **Treat P2-6's new "Advanced" palette tier as already covering A3** —
  rejected, and worth being explicit about: that tier (RGB LED,
  7-segment, transistor, relay, boards) is a relabeling of already-built
  A2-resume work, not new digital-logic/bus-protocol capability. Phase
  A3 remains fully unbuilt.

## Consequences

- The master to-do list's only remaining items are all blocked on the
  user: P2-4 (an unconfirmed credential, flagged separately), Phase B2
  (a missing `RESEND_API_KEY`), and Phase A3 (this scope decision).
- Whenever Phase A3 is picked back up, the first real step is recovering
  or re-deciding the "original request"'s actual component list — the
  same kind of audit ADR 0016/0017 did for A1/A2 — before any engine or
  component work starts.
