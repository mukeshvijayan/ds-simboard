# DS SimBoard — Master Build Specification

### Breadboard → Arduino → ESP32, one progressive simulation platform

_Research + architecture + phased roadmap + the prompt to paste into Claude Code_

---

## PART 1 — Research: how the reference platforms actually work

| Platform                                                                    | Core engine                                                                            | What it's good at                                                                                                             | Where it stops                                                                                       |
| --------------------------------------------------------------------------- | -------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| **Tinkercad Circuits** (Autodesk)                                           | Simplified analog + digital models, Arduino Uno stepped in a real AVR-like interpreter | Fastest possible "drag, wire, blink an LED" loop; exports a real `.ino` file for physical upload                              | Only Arduino Uno, no ESP32, no true SPICE analysis, simplified component math                        |
| **EasyEDA** (JLCPCB)                                                        | ngspice-based mixed-mode SPICE simulation + schematic capture + PCB layout             | Professional schematic symbols, real SPICE accuracy, goes all the way to a manufacturable PCB                                 | Steeper learning curve, schematic-first (not breadboard-first), no microcontroller _code_ simulation |
| **CircuitJS1** (Falstad, open source)                                       | Custom real-time circuit solver, runs in-browser, no install                           | Open source, lightweight, good generic component models (R/C/L, diodes, transistors, logic gates), live animated current flow | Not schematic-symbol professional, no microcontroller simulation, no PCB export                      |
| **ngspice-in-WASM** (e.g. EEcircuit)                                        | The actual `ngspice` C engine compiled to WebAssembly                                  | Real industry-standard SPICE: DC/AC/transient analysis, accurate transistor & diode models                                    | Netlist/schematic-first, not aimed at "breadboard realism" or microcontrollers at all                |
| **Wokwi** (reference for the microcontroller layer only — not to be copied) | Real AVR chip emulation (`avr8js`) + component simulation                              | Genuinely runs compiled AVR machine code, real timing                                                                         | Closed source; ESP32 support relies on heavier Xtensa emulation                                      |

**What this means for DS SimBoard's design:**

1. **Breadboard Lab needs a _circuit solver_, not just visuals.** Tinkercad's "just animate the LED" approach isn't enough for the resistor/capacitor/transistor education you described. The right open-source reference architecture is **CircuitJS1's model**: represent the circuit as a graph of nodes and elements, run a real (if simplified) DC/transient solve every simulation tick, and derive every visual (LED brightness, capacitor charge indicator, smoke-on-burnout) from the _actual computed current and voltage_, not from a scripted animation.
2. **Arduino/ESP32 Labs need a _chip emulator_, not a keyword interpreter**, once you're past a demo. `avr8js` (the open-source engine real Arduino-in-browser tools are built on) executes compiled AVR bytecode instruction-by-instruction, so `pinMode`/`digitalWrite`/`analogRead`/interrupts/timers all behave exactly like real hardware — including _wrong code producing wrong (or dangerous) behavior_, which is exactly the "if I wire it wrong, the LED should burn" realism you asked for.
3. **The breadboard's electrical model must match a real breadboard's physical layout**, not a generic canvas: a real breadboard is two power rails (+ and −, running the full length) and a center block of two independent halves, each split into columns of 5 holes that are electrically tied together _vertically_ but not across the central gap. This single rule is what makes "drag a resistor between rows and it just connects" actually behave like a real breadboard instead of an arbitrary wiring canvas.

---

## PART 2 — Electronics component & physics model

### 2.1 Breadboard connectivity model

- **Power rails**: two pairs (top `+`/`−`, bottom `+`/`−`), each rail electrically continuous along its full length.
- **Terminal strips**: rows `a`–`e` and `f`–`j` on either side of the center gap. Within a single column (e.g. all of `a1`–`e1`), all 5 holes are one electrical node. The center gap is _not_ connected — this is where ICs straddle.
- Every component pin dropped into a hole joins that hole's node. Wires simply union two nodes.

### 2.2 Component library (v1 — matches your Arduino Uno + ESP32 scope)

| Component                                                | Key parameters                                                                                       | Real-world behavior to model                                                                                                                                                                                        |
| -------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Resistor                                                 | resistance (Ω), color-code bands                                                                     | Ohm's law: `V = I·R`; drives every other component's math                                                                                                                                                           |
| Capacitor (ceramic / electrolytic)                       | capacitance (µF), polarity (electrolytic only), voltage rating                                       | RC charge/discharge curve: `V(t) = V₀(1 − e^(−t/RC))`; reversed electrolytic polarity or over-voltage → failure state                                                                                               |
| LED (standard + RGB)                                     | forward voltage `Vf` (~2V red, ~3.2V blue/white), max current (~20mA typical, ~30–40mA absolute max) | Brightness ∝ current through it; **no series resistor, or resistor too small → computed current exceeds max → LED enters a permanent "burned" visual state** (blackened, stops responding) exactly as you described |
| Transistor (NPN e.g. BC547/2N2222, PNP)                  | hFE (gain), Vce(sat)                                                                                 | Acts as a current-controlled switch/amplifier — base current gates collector-emitter current                                                                                                                        |
| Diode (1N4007)                                           | Vf, reverse breakdown                                                                                | Blocks reverse current; models flyback protection for motors/relays                                                                                                                                                 |
| Pushbutton / switch                                      | momentary vs. latching                                                                               | Opens/closes a node connection                                                                                                                                                                                      |
| Potentiometer                                            | resistance range                                                                                     | Variable resistor, live-draggable wiper                                                                                                                                                                             |
| Buzzer / DC motor / servo / relay                        | operating voltage, current draw                                                                      | Load elements — draw current per the same solver                                                                                                                                                                    |
| Sensors: LDR, thermistor, HC-SR04 ultrasonic, PIR, DHT11 | analog/digital signal model                                                                          | Feed simulated environmental values back into the circuit as inputs                                                                                                                                                 |
| ICs: 555 timer, basic op-amp                             | pin-accurate behavior                                                                                | Optional v2 — flagged as a stretch goal, not v1 blocking                                                                                                                                                            |
| Arduino Uno / ESP32                                      | full pinout, chip emulation                                                                          | The "brain" node — see Part 1 point 2                                                                                                                                                                               |

### 2.3 Failure & safety modeling (the "wrong wiring should look wrong" requirement)

Define a `ComponentHealth` state machine per component instance: `nominal → stressed → failed`.

- **Over-current** (e.g. LED with no/undersized resistor, motor stalled): compute `I` every tick; cross a component's rated max → flip to `failed`, trigger the failure visual (LED: blackened + cracked SVG state; resistor: scorch mark + smoke puff; IC: smoke puff), and **latch it** — a failed component stays failed until the user replaces it, same as reality.
- **Reverse polarity**: electrolytic capacitor or LED wired backwards either does nothing (ideal diode, LED case) or is flagged `failed` immediately (capacitor case) per real datasheets.
- **Short circuit** (power rail directly to ground with no load): detect near-zero resistance path, show a "short circuit" warning state and clamp simulated current rather than producing `Infinity`.
  This state machine is the shared contract every component implements — it's also what makes the "block structure" you asked about possible: every new component is just a new implementation of the same interface, not special-cased code.

---

## PART 3 — Product structure: three progressive labs, one engine

```
DS SimBoard
├── Breadboard Lab   — resistors, capacitors, transistors, LEDs, raw circuit building
├── Arduino Lab       — everything from Breadboard Lab, plus an Arduino Uno driving it via real code
└── ESP32 Lab         — everything from Arduino Lab, plus ESP32-specific peripherals (Wi-Fi stub, more GPIO)
```

All three share **one circuit graph engine** (Part 2) and **one component library** — Arduino Lab and ESP32 Lab simply add a "brain" component whose pins are driven by the code engine instead of the user's mouse. This is the same architecture principle as Tinkercad's own progression (breadboard view → Arduino code view on the _same_ circuit) and keeps you from building three separate apps.

---

## PART 4 — Full-stack, enterprise-grade architecture

This is a monorepo, feature-organized, TypeScript-strict codebase — structured the way a services company (TCS/Cognizant-style delivery team) would hand off a codebase to a new engineer with zero ramp-up conversation needed.

```
ds-simboard/
├── apps/
│   ├── web/                      Next.js frontend (App Router)
│   │   ├── app/                  Routes only — no business logic here
│   │   ├── features/             One folder per feature, self-contained
│   │   │   ├── breadboard-lab/
│   │   │   ├── arduino-lab/
│   │   │   ├── esp32-lab/
│   │   │   ├── project-management/   (save/load/share)
│   │   │   └── auth/
│   │   └── shared/                Cross-feature UI (design system components)
│   └── api/                       Node/Express (or Next Route Handlers) service layer
│       ├── controllers/
│       ├── services/              Business logic, no framework code
│       ├── repositories/          DB access only, no business logic
│       └── routes/
├── packages/
│   ├── circuit-engine/            The node-graph solver from Part 2 — framework-agnostic, unit-testable in isolation
│   ├── chip-emulation/            avr8js integration for Arduino Uno; ESP32 emulation seam
│   ├── component-library/         Every electronic component: visual (SVG) + electrical model + health state machine, one folder per component, uniform interface
│   ├── design-system/             DS Inventek tokens (already built in DS BlockCode/DS SimBoard) — colors, type, ScrollReveal, Button, etc., shared by every product in the family
│   └── shared-types/              TypeScript types shared by web + api + engine packages
├── docs/
│   ├── architecture/               ADRs (Architecture Decision Records) — one file per major decision, dated, with rationale
│   ├── component-authoring-guide.md   How to add a new component to component-library/ (the "block" contract)
│   └── onboarding.md               New-developer ramp-up doc
├── .github/workflows/              CI: lint → typecheck → unit tests → build, on every PR
└── turbo.json / pnpm-workspace.yaml   Monorepo tooling (Turborepo + pnpm recommended)
```

**Backend data model (PostgreSQL, via Prisma or Drizzle):**
`users`, `projects` (owner, lab_type, name, visibility), `circuit_snapshots` (project_id, graph JSON, sketch_code, created_at — versioned so "undo history" and "save points" are just rows), `component_definitions` (seed data describing every component in the palette, so adding a component is a data change, not always a code change).

**Why this shape:** each `packages/*` is independently testable and independently reusable across the DS Inventek family (design-system already is; circuit-engine could power a future product too). Each `features/*` folder in the web app owns its own components/hooks/state — a new developer can be handed exactly one feature folder and be productive without reading the rest of the repo.

---

## PART 5 — Code & documentation standards

1. **TSDoc on every exported function, class, and type** — one-line summary + `@param`/`@returns` where non-obvious. No exceptions in `packages/circuit-engine` or `packages/component-library`, since those are the modules a new engineer must trust without re-deriving the physics.
2. **Strict TypeScript** (`strict: true`, no `any` without a `// justified: ...` comment).
3. **ESLint + Prettier + Husky pre-commit hook** — nothing merges unformatted or failing lint.
4. **Testing pyramid**: Jest unit tests for every circuit-engine calculation (Ohm's law, RC curve, failure thresholds — these are pure functions, they should have near-100% coverage), integration tests for API routes, Playwright end-to-end tests for the two or three "golden path" flows (place LED + resistor + battery → it lights up; remove resistor → it burns out).
5. **ADRs in `docs/architecture/`** for every non-obvious decision (e.g. "why avr8js over writing our own AVR interpreter," "why Postgres over Mongo for circuit snapshots") — this is exactly the artifact that lets a new developer understand _why_, not just _what_.
6. **The "block contract"** — every component in `component-library/` implements the same TypeScript interface (`ElectricalModel`, `VisualState`, `HealthState`). This is the direct equivalent, in this product, of DS BlockCode's visual programming blocks: a uniform, predictable unit that composes with every other unit the same way.
7. **Conventional Commits** (`feat:`, `fix:`, `refactor:`, `docs:`) + a PR template requiring "what changed / why / how tested."

---

## PART 6 — Ten-phase build roadmap

| Phase                          | Deliverable                                                                                                                                                                                     |
| ------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **1. Foundations**             | Monorepo scaffold (Turborepo/pnpm), design-system package extracted from the existing DS SimBoard landing page, CI pipeline, ADR template, onboarding doc                                       |
| **2. Circuit engine core**     | `packages/circuit-engine`: node/graph model, breadboard connectivity rules (Part 2.1), Ohm's law solver, unit tests for every formula                                                           |
| **3. Component library v1**    | Resistor, capacitor, LED, transistor, diode, pushbutton, potentiometer — visual + electrical model + health state machine each, authored against the "block contract"                           |
| **4. Breadboard Lab UI**       | Drag-and-drop palette → canvas (building on the existing `BoardCanvas` pattern), real-time wiring, live solver feedback, failure-state visuals (burned LED, smoke, scorch marks)                |
| **5. Arduino chip emulation**  | Integrate `avr8js`; replace the current line-stepping `SketchEngine` with real compiled-code execution; Arduino Lab wired to the same circuit engine from Phase 2–4                             |
| **6. Arduino Lab UI**          | Code editor + real Arduino Uno pinout on the breadboard canvas; serial monitor driven by real emulated `Serial` peripheral                                                                      |
| **7. ESP32 Lab**               | ESP32 pinout/component, extended GPIO, second emulation path (or extended interpreter, per the README trade-off already documented), Wi-Fi/peripheral stubs                                     |
| **8. Backend & persistence**   | `apps/api` service/repository layers, Postgres schema, save/load/share projects, versioned snapshots                                                                                            |
| **9. Auth & accounts**         | Login, per-user project library, sharing via link (read-only vs. editable)                                                                                                                      |
| **10. Polish, QA, deployment** | Playwright golden-path tests, accessibility pass (keyboard wiring, focus states, reduced motion — already partly in place), performance pass on the solver loop, production deployment pipeline |

---

## PART 7 — The prompt to paste into Claude Code

Copy everything in the box below as your next message to Claude Code. It references this document, so keep this file in the repo (e.g. `docs/MASTER_BUILD_SPEC.md`) before pasting.

```
You are continuing work on DS SimBoard, an Arduino/ESP32/breadboard circuit
simulator for DS Inventek. A working landing page + basic simulator shell
already exists in this repo (Next.js, TypeScript, Tailwind, the DS Inventek
design system — ivory/charcoal/navy, Source Serif 4 + Inter). Read
docs/MASTER_BUILD_SPEC.md in full before writing any code — it contains the
research, the electronics/physics model, the target architecture, and the
coding standards for this project. Follow it exactly rather than improvising
a different structure.

Your job is to evolve the current scaffold into the architecture described
in Part 4 of that document, and build out the ten phases in Part 6, one
phase at a time. Work phase by phase — do not skip ahead. After each phase:
(1) summarize what you built, (2) list what you deliberately deferred and
why, (3) stop and wait for my go-ahead before starting the next phase.

Non-negotiable standards for every phase, per Part 5 of the spec:
- Strict TypeScript, no untyped `any` without a justification comment.
- TSDoc comments on every exported function/class/type, especially in
  packages/circuit-engine and packages/component-library — a new engineer
  with zero context must be able to read these two packages and trust the
  physics without re-deriving it.
- Every component in packages/component-library implements the same
  ElectricalModel / VisualState / HealthState contract (the "block
  contract" — this is the equivalent, in this product, of DS BlockCode's
  visual programming blocks: uniform units that compose predictably).
- Unit tests for every pure calculation in circuit-engine (Ohm's law, RC
  charge/discharge, over-current failure thresholds). Aim for near-100%
  coverage on that package specifically.
- One ADR per non-obvious architectural decision, written to
  docs/architecture/, dated, with the alternatives you considered and why
  you didn't pick them.
- Conventional Commits, and a short PR-style summary (what changed / why /
  how it was tested) at the end of each phase even though we're not
  actually opening PRs in this session.

Electrical realism requirements (do not simplify these away):
- Model the breadboard's real connectivity: two continuous power rails,
  and terminal-strip columns of 5 holes tied together on each side of the
  center gap, per spec Part 2.1.
- Every component's visual state must be *derived from the solver's actual
  computed current/voltage*, never from a scripted animation standing in
  for it.
- Implement the ComponentHealth state machine (nominal → stressed →
  failed) from spec Part 2.3: an LED wired with no or undersized series
  resistor must compute a current that exceeds its rated max and
  permanently enter a "burned" visual state until the user replaces it in
  the simulation. Reversed electrolytic capacitors and shorted power rails
  must be handled the same way, per the spec.

Start now with Phase 1 (Foundations) from Part 6 of the spec: set up the
monorepo structure from Part 4, extract the existing design-system code
into packages/design-system, wire up the CI pipeline, and create the ADR
template and onboarding doc. Then stop and report back before Phase 2.
```

---

### Notes on scope

This spec deliberately treats **Phase 5 (real AVR chip emulation via `avr8js`)** as the single highest-effort, highest-payoff step — it's what turns "wrong code" and "wrong wiring" into _genuinely_ wrong outcomes instead of a scripted demo, which is the realism you asked for. Everything in Phases 1–4 is buildable and testable on its own before you commit to that step, so the roadmap de-risks it rather than betting the whole project on it up front.
