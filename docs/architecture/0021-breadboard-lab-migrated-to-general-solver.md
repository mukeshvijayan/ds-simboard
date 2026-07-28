# ADR 0021: A-Engine M4 — Breadboard Lab migrated to the general MNA/diode solver

- **Date:** 2026-07-28
- **Status:** Accepted

## Context

A-Engine M1–M3 (ADRs 0018–0020) built and proved a general nodal-analysis
solver capable of arbitrary topology, kept it fully unwired from any
consumer, and deliberately deferred touching the live Breadboard Lab UI.
M4 is that migration: `apps/web/features/breadboard-lab` now solves every
circuit through `solveMnaFromGraphWithDiodes` instead of
`walkSeriesLoop`/`solveSeriesLoopFromGraph`, and the series-only solver
stack that nothing depends on anymore is deleted.

Three real design questions came up doing this, each decided here rather
than discovered mid-migration:

1. **Diode/LED polarity.** The general solver's convention (`nodeA` is
   always the anode) doesn't automatically match `PlacedLed`/`PlacedDiode`'s
   `leadZeroIsPositive` flag, which records which physical lead the user
   wired as positive independent of graph construction order.
2. **A single scalar `currentAmps` no longer means anything board-wide.**
   The old series-only result had exactly one current, because a series
   loop has exactly one. Once parallel branches are real, each branch has
   its own current — there's no one honest "the current" to report at
   the top level anymore.
3. **What replaces `walkSeriesLoop`'s "unsupported-topology" rejection?**
   Branch points, the main thing that state existed to reject, are now
   solved, not rejected. Something still needs to happen for the rare
   case the solver's diode-state iteration doesn't converge.

## Decision

1. **`buildCircuitGraph` (`model/circuitGraph.ts`) now orients a polarized
   component's graph edge so `nodeA` is always its anode**, swapping
   `leads[0]`/`leads[1]` when `leadZeroIsPositive` is false, instead of
   always defaulting to `leads[0]` regardless of marked polarity. Every
   other component type is unaffected (resistors etc. have no polarity to
   get wrong).
2. **`resolveCircuit.ts`'s `describeElement` no longer pre-computes bias
   at all.** LEDs/diodes are described to the solver as
   `{ kind: "diode", forwardVoltageVolts, reverseResistanceOhms: Infinity }`
   (or a permanent `0Ω` short if already failed) and the iterative
   companion-model solver (M2) determines forward/reverse itself from the
   actual topology — including genuine branch-point circuits (a diode
   inside a bridge, or one of several parallel LED branches) that the old
   `bias.ts`/`physicalEntryNode` topological trick could never have
   handled correctly, since it only worked because a series loop has
   exactly one current path. **`bias.ts` and `bias.test.ts` are deleted**
   — the general solver's own diode-state iteration is a strict
   superset of what that file did.
3. **`ResolveCircuitResult`'s `"conducting"`/`"non-conducting"` statuses
   are merged into one `"solved"` status carrying `supplyCurrentAmps`**
   (the supply element's own net current — always well-defined,
   board-wide, regardless of how many parallel branches exist, since it's
   just "how much current is the battery/rails delivering in total").
   `StatusBanner` now derives the old two-message UX ("Circuit is live"
   vs. "No current is flowing") from whether `supplyCurrentAmps` is
   above/below a small epsilon, rather than the solver reporting two
   different top-level statuses for what is, for a multi-branch board,
   not actually a single yes/no fact.
4. **`"unsupported-topology"` is replaced by `"unresolved"`**, triggered
   only by the solver's `"non-convergent"` outcome (the diode-state
   iteration didn't settle within its cap — see ADR 0019) — expected to
   be vanishingly rare for realistic breadboard-scale wiring, unlike the
   old status, which fired routinely for perfectly ordinary parallel
   wiring. **A component with a dangling/unwired lead is no longer an
   error at all**: the general solver treats it as a floating branch
   (0A, per ADR 0018), which is arguably the more honest behavior — a
   component you haven't finished wiring yet just does nothing, rather
   than putting the whole board into an error state.
5. **The now-fully-unused series-only solver stack is deleted**:
   `walkSeriesLoop`, `solveSeriesLoopFromGraph`
   (`graph/seriesLoopBridge.ts`), `solveSeriesLoop`
   (`physics/seriesLoop.ts`), and `solveSeriesCircuit`
   (`physics/seriesCircuit.ts`), plus their test files. **`SeriesLoopElementDescriptor`
   is kept, relocated to its own file** (`graph/elementDescriptor.ts`) —
   every `component-library` model (`resistorSeriesElement`,
   `ledSeriesElement`, etc.) still returns it as their "how do I present
   electrically" contract type, and renaming a type that widely used for
   a label change with zero behavior difference isn't worth the churn
   this milestone would otherwise add for no functional benefit.

## Alternatives considered

- **Report per-branch currents at the top level instead of one
  `supplyCurrentAmps`** — rejected for `StatusBanner`'s purposes: the UI
  needs one "is the board doing anything" signal, and the supply's net
  current is the one number that answers that honestly for the whole
  board regardless of internal topology. Per-component current is still
  fully available via `componentResults`, unchanged.
- **Keep two statuses (`"conducting"`/`"non-conducting"`) computed from
  `supplyCurrentAmps` at the `resolveCircuit` layer** instead of merging
  into `"solved"` and deciding in `StatusBanner` — rejected: the epsilon
  choice is purely a presentation concern (what counts as "nothing is
  happening" for a status pill), not a fact about the solve itself, so it
  belongs in the component that owns that copy, not baked into the
  result type every other consumer has to match against.
- **Silently keep `"unsupported-topology"` around for the rare
  non-convergent case** — rejected: the phrase specifically described
  the old degree-2 rejection, which no longer happens for that reason;
  reusing it for an unrelated, much rarer failure mode would be
  misleading to a future reader (or user) trying to understand why it
  fired.

## Consequences

- Real, verified behavior change for actual users of Breadboard Lab:
  **parallel branches now work** — two LEDs (or any components) wired
  straight across the rails, previously rejected with "Not a complete
  loop yet," now solve correctly and independently. Proven via new tests
  in `resolveCircuit.test.ts` and confirmed end-to-end through a real
  browser via the existing Breadboard Lab e2e suite (still 9/9 green,
  including the golden-path LED burnout scenario).
- `circuit-engine` is down to two solve-adjacent capabilities
  (`solveMna`/`solveMnaWithDiodes`, plus the still-useful `solveLinearSystem`
  underneath) — the two-solvers-coexisting discoverability cost ADR 0018
  and ADR 0020 flagged as temporary is now resolved.
- `component-library`'s component models
  (`resistorSeriesElement`/`ledSeriesElement`/etc.) are **completely
  unchanged** — this migration only touched the graph-building and
  solving layer in `apps/web`, never the electrical models themselves.
- A2's deferred components (transistor-as-switch, relay, RGB LED,
  7-segment, and others blocked on branch-point support per ADR 0017) can
  now be revisited — the actual architectural blocker they were deferred
  for no longer exists in the shipped product, not just in an unwired
  `circuit-engine` capability. That work resumes next per the master
  to-do list, picking up exactly where A2 left off.
