# ADR 0013: Code-split CodeMirror out of the initial route bundle

- **Date:** 2026-07-28
- **Status:** Accepted

## Context

Spec Part 6 Phase 10 asks for a performance pass covering Core Web Vitals
and code-splitting. Before guessing at what to optimize, `pnpm run build`'s
own First Load JS numbers were checked directly — real, build-produced
evidence rather than a Lighthouse run this environment can't easily host:

| Route             | Before  | After                           |
| ----------------- | ------- | ------------------------------- |
| `/esp32-lab`      | 263 kB  | 92.2 kB                         |
| `/simulator`      | 272 kB  | 102 kB                          |
| `/arduino-lab`    | 96.4 kB | 96.7 kB (unchanged — no editor) |
| `/breadboard-lab` | 93.9 kB | 94.2 kB (unchanged — no editor) |

`/esp32-lab` and `/simulator` were the two routes far heavier than
`/arduino-lab` and `/breadboard-lab` — and the two routes that both use
`CodeEditor` (`@uiw/react-codemirror` + `@codemirror/lang-cpp` +
`@codemirror/view`), a sizeable, client-only, DOM-dependent editor. It was
being statically imported, so its full weight loaded and parsed before the
rest of either page could render, even though the editor doesn't need to
exist before the user starts typing.

## Decision

**`CodeEditor` is now loaded via `next/dynamic` with `ssr: false`** in both
call sites (`features/esp32-lab/ESP32Lab.tsx`, `app/simulator/page.tsx`),
rather than a static top-of-file import. This moves CodeMirror into its
own on-demand chunk, fetched only once the page actually mounts the editor
— cutting `/esp32-lab`'s First Load JS by ~65% and `/simulator`'s by ~63%,
per the real build output above. `ssr: false` is correct (not just
convenient) here since CodeMirror is a `contenteditable`-based editor that
requires a real DOM to initialize — it was never a server-renderable
component to begin with.

`/arduino-lab` and `/breadboard-lab` don't use `CodeEditor` at all, so
their bundle sizes are unaffected (and confirm the fix is precisely
targeted, not a broad, unrelated change).

## What wasn't found to need fixing

- **The solver loop** (`resolveCircuit` in `breadboard-lab`'s model):
  invoked via `useMemo` keyed on `[components, wires, supplyVoltage]` — it
  only re-runs when the user actually changes the circuit, not on a timer
  or per-frame basis. There's no continuous polling loop to profile away.
- **Fonts**: already loaded via `next/font` (`app/layout.tsx`), which
  self-hosts and subsets Google Fonts at build time and avoids
  render-blocking external font requests — already the recommended
  pattern, nothing to change.

## Deferred, not forgotten

- A real Lighthouse/Core Web Vitals (LCP/CLS/INP) run against a deployed
  URL — this environment has no browser-based Lighthouse tooling and no
  production deployment yet (see ADR 0009's still-open `DATABASE_URL`/
  hosting question) to run it against. The build-output evidence above is
  a genuine, measured proxy for initial-load cost in the meantime.
- Further code-splitting of the CodeMirror language package
  (`@codemirror/lang-cpp`) itself, if a future language-support expansion
  (e.g. Python for a future board) makes bundling multiple language
  packages together worth splitting further.
