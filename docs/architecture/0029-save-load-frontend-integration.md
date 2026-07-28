# ADR 0029: Save/load — wiring the unified canvas to the existing backend

- **Date:** 2026-07-29
- **Status:** Accepted

## Context

P2-5 asks for the unified canvas to save/load against `apps/api`'s
already-built projects/circuit-snapshots/auth backend, framed as "real
frontend work against real, existing backend infrastructure — no backend
changes needed." Checking rather than assuming (same discipline as every
prior phase) turned up two backend gaps that assumption didn't hold for,
confirmed with the user before building:

1. **No project rename endpoint existed** — only create/list/get/delete/
   visibility-patch. Generalized `PATCH /projects/:id` to accept `name`
   alongside `visibility` (one partial-update method,
   `projectsService.updateProject`/`projectsRepository.update`, not one
   per field) rather than adding a second endpoint.
2. **No CORS support existed.** `apps/web` and `apps/api` deploy as two
   independent Vercel projects (ADR 0015) with no shared domain, and
   `apps/api` had zero CORS middleware — a session cookie literally
   cannot reach it cross-origin without one. Added `middleware/cors.ts`,
   hand-rolled rather than the `cors` package (the actual need — one or a
   few known origins, always with credentials, so never a wildcard
   `Access-Control-Allow-Origin` — doesn't justify a new dependency),
   configured via a new `WEB_APP_ORIGIN` env var (comma-separated,
   defaults to the local Next.js dev origin).

Both are small, same-repo, no-new-infrastructure, no-licensing-
implication changes — nothing like the Raspberry Pi/Velxio situation —
so they proceeded under the same "build → verify → commit" authorization
as the rest of this session, just flagged transparently rather than
built silently past the stated premise.

## Decision

### 1. The canvas snapshot shape lives in `apps/web`, not `shared-types`

`CircuitSnapshot.graph: unknown` (`packages/shared-types`) was left
deliberately opaque, with its own doc comment inviting exactly this:
"unifying [lab state] into one canonical persisted shape is real design
work for whichever phase first wires up 'Save project' in the UI."
`CanvasSnapshot` (`apps/web/features/simulator/model/persistence.ts`) is
that shape:

```ts
interface CanvasSnapshot {
  version: 1;
  breadboards: PlacedBreadboard[];
  components: PlacedComponent[];
  wires: CanvasWireModel[];
  boards: PlacedBoard[];
  supplyVoltageVolts: number;
  viewport: CanvasViewport;
}
```

It stays in `apps/web` rather than `packages/shared-types` because every
field's type (`PlacedBreadboard`, `PlacedComponent`, `PlacedBoard`, ...)
already lives in `apps/web/features/simulator/model/`; hoisting the
snapshot type into `shared-types` would mean either duplicating those
types there (drift risk) or `shared-types` depending back on `apps/web`
(backwards — packages don't depend on apps). `apps/api` never inspects
`graph`'s contents at all (confirmed: it's stored as opaque `jsonb` and
returned as `unknown` everywhere), so nothing on the backend needs to
know this shape exists.

Every field already serializes to JSON as-is (no `Map`s or class
instances anywhere in `Placed*`/`CanvasWireModel`/`CanvasViewport`) with
one deliberate exception: **`PlacedBoard.running` is forced to `false`
on load**, regardless of what was saved. A board's actual execution
state (the `AtmegaRuntime`/`SketchEngine` instance, its CPU
registers/interpreter position) was never part of the serializable model
to begin with (ADR 0027) — loading a snapshot that claims `running:
true` with no matching engine behind it would show a "running" board
that isn't actually executing anything, exactly the kind of scripted-
looking-but-not-real state this whole project has avoided everywhere
else. The user re-clicks Run; that's honest, not a regression.

`deserializeCanvas` does a lightweight structural check (an object,
`version === 1`, every top-level field is the right JS type) and reports
a clear error rather than crashing on a malformed/future-version
payload — proportionate to a project with no runtime schema-validation
library anywhere yet (`zod`/`ajv`/etc.), not a reason to add one for
this alone.

### 2. `labType` is always `"breadboard"` for a unified-canvas project

`LabType` (`"breadboard" | "arduino" | "esp32"`) is a holdover from the
pre-P2-1 three-separate-labs model the unified canvas has since replaced
(P2-1). Since editing that enum is exactly the kind of backend/db change
this pass explicitly avoided expanding into, every project this UI
creates is saved as `labType: "breadboard"` — a label the backend still
requires but the unified canvas UI never surfaces or branches on. A
later phase revisiting `LabType` (e.g. dropping it, since one canvas can
hold boards _and_ breadboards at once) is a real but separate, small
follow-up.

### 3. Auth and My Projects live inside `/simulator`, not new top-level nav

P2-1 fixed site navigation to exactly Home/Docs/Open Simulator. Sign-in,
sign-up, and the My Projects view are all reachable from _within_ the
simulator page (toolbar buttons opening modals) rather than as new
routes — consistent with that constraint, and with every other
simulator control (Inspector, palette, board panel) already living the
same way.

### 4. Save = new snapshot every time; load = latest snapshot (or a chosen one from history)

Matches what the backend actually offers: there's no snapshot
update/overwrite endpoint (`POST .../snapshots` is always "create a new
row"). "Save" always creates a fresh snapshot; "load" defaults to the
most recent one but the My Projects view can list and open any earlier
one too, since the list endpoint already supports it — undo-by-history
this way, for free, is a nice side effect of the existing API's shape,
not a new feature invented here.

## Alternatives considered

- **Add a snapshot-update endpoint (overwrite-in-place save)** —
  rejected: the existing "every save is a new row, newest-first" design
  already gives free version history; changing it would be new backend
  work beyond the two gaps already flagged, for a feature (explicit
  overwrite) nothing asked for.
- **Put `CanvasSnapshot` in `packages/shared-types` anyway, duplicating
  the `Placed*` field shapes** — rejected for the drift risk noted above;
  `apps/api`'s own `graph: unknown` design already anticipated and
  invited keeping this in `apps/web`.

## Consequences

- Loading an older snapshot after the canvas model changes shape (a
  future phase adds a new `PlacedComponent` variant, say) has no
  migration path yet beyond the version-number check catching a
  mismatch — a real, currently-unsolved but currently-unneeded problem
  (nothing has shipped a second `version` yet).
- `LabType`'s three-lab-era values leak into the persisted data for every
  unified-canvas project as pure legacy labeling; harmless today, a
  candidate for cleanup whenever `shared-types`/the db schema is next
  touched for an unrelated reason.
