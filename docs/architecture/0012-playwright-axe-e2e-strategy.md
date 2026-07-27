# ADR 0012: Playwright + axe-core for golden-path e2e and automated accessibility checks

- **Date:** 2026-07-28
- **Status:** Accepted

## Context

Spec Part 5.4/Part 6 Phase 10 asks for "Playwright end-to-end tests for
the two or three golden-path flows" and an accessibility pass. Rather than
writing the accessibility pass as a one-time manual audit whose findings
could silently regress later, this phase wires an automated
(`@axe-core/playwright`) accessibility scan into the same e2e suite that
proves the golden paths — both run on every push (see `.github/workflows/
ci.yml`), so a future change that breaks either is a red CI check, not a
missed review comment.

## Decisions

**1. One golden-path spec per lab, plus the landing page** —
`apps/web/e2e/{landing,breadboard-lab,arduino-lab,esp32-lab}.spec.ts`.
Each proves the thing that specific lab actually claims to do, using the
real running app (a genuine `next build && next start`, not `next dev`):

- **Breadboard Lab**: spec Part 5.4's own named example — a
  resistor-protected LED lights up at a safe, solver-computed current;
  the _same_ resistor+LED at a higher supply voltage (an undersized
  resistor for that voltage is the same real-world failure) pushes
  current past the LED's rated max and the component's health genuinely
  flips to `failed` — computed by circuit-engine's real solver, not
  scripted. (The original draft of this test tried "no resistor at all,
  wired directly across the rails" for the failure case; that produced
  a 1-element bridge with no intermediate node, which isn't a topology
  the current solver walks — see `packages/circuit-engine`'s degree-2
  walk requirement. Reusing the working series topology at a higher
  voltage is both simpler and closer to spec Part 2.3's literal wording
  anyway: "no _or an undersized_ series resistor.")
- **Arduino Lab**: clicking Run genuinely toggles the emulated pin 13 LED
  within the ~1s window `chip-emulation`'s tuning produces — proves
  `avr8js` is really executing instructions, not animating.
- **ESP32 Lab**: running the default sketch produces real serial output
  and flips the Wi-Fi stub to "connected" — proves `SketchEngine` is
  really interpreting the sketch text, not faking the transcript.

**2. Chromium only, for now.** `playwright.config.ts`'s `projects` list
has one entry. Full cross-browser (Firefox/WebKit) coverage is the
obvious next step the `projects` array is shaped for, deferred rather
than built now purely to keep browser-install size and CI time down in
this environment — not a claim that Firefox/WebKit compatibility doesn't
matter.

**3. A dedicated port (3100), and `reuseExistingServer: false`,
always.** During development, a stray `next dev` process was repeatedly
found already bound to port 3000 in this environment (started by tooling
outside this session's control). With `reuseExistingServer: !CI` (the
Playwright default recipe) and the default port 3000, a local test run
would silently attach to that stale dev server instead of the fresh
production build it just made — producing bizarre, hard-to-diagnose
failures (a page rendering as nothing but Next's router-announcer `role
="alert"` element, or `nextjs-portal` dev-only elements showing up in
axe's report). Moving to port 3100 and never reusing an existing server
makes a test run deterministic: it always tests the build it just
produced, or fails loudly if the port is unexpectedly occupied.

**4. `prefers-reduced-motion: reduce` emulated for every test**
(`e2e/fixtures.ts` wraps `@playwright/test`'s `page` fixture with
`page.emulateMedia({ reducedMotion: "reduce" })`). Without it, axe's
color-contrast check would sometimes race an in-flight `ScrollReveal`
fade-in (opacity animating from 0), and read an interim blended color
that doesn't reflect the page's actual steady-state contrast — a timing
flakiness, not a real bug. This has the added benefit of genuinely
exercising the `@media (prefers-reduced-motion: reduce)` CSS this app
already ships in `globals.css`, rather than merely trusting it's correct.

**5. Accessibility findings are fixed in the app, not suppressed in the
test.** Every violation this suite caught during Phase 10 was a real,
fixable issue — landmark/heading structure, duplicate unlabeled
landmarks, insufficient color contrast, a non-keyboard-focusable
scrollable region, an unlabeled ARIA input — and each was fixed at the
source (see the Phase 10 commit) rather than excluded from the axe scan.
The one genuinely third-party issue (CodeMirror's bundled dark theme
having a token color at 4.38:1, just under the 4.5:1 AA floor) was fixed
by replacing the bundled `theme="dark"` preset with a custom
`HighlightStyle` verified against this app's own editor background,
rather than suppressed.

## Deferred, not forgotten

- Firefox/WebKit projects (see decision 2).
- A dedicated golden-path test for `/simulator` — it's the same
  `SketchEngine` interpreter ESP32 Lab's test already exercises, so the
  marginal coverage gain was judged lower priority than covering the
  three purpose-built labs first.
