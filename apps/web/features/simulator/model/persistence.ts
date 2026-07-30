import type { CanvasViewport } from "./viewport";
import type {
  CanvasWireModel,
  PlacedBoard,
  PlacedBreadboard,
  PlacedComponent,
} from "./types";

/** Bumped to 2 for Part 2's free-floating-component architecture
 * (docs/architecture/0036-*.md): a `PlacedComponent` now has its own
 * `position` and self-referencing leads instead of being defined by
 * which breadboard holes it was placed into — a version-1 snapshot's
 * components are missing both, so loading one under the version-2 model
 * without a real migration would render broken (undefined position)
 * rather than fail clearly. Pre-launch, actively-developed software with
 * no real saved user data to migrate, so a clean "unsupported version"
 * error is the honest choice over a silent, confusing partial load. */
export const CANVAS_SNAPSHOT_VERSION = 2;

/**
 * Everything the unified canvas needs to fully restore itself — the
 * "graph" a saved `CircuitSnapshot` opaquely carries (P2-5, closing ADR
 * 0029). Lives here, not `packages/shared-types`, since every field's
 * type already lives in this feature's own model; `apps/api` never
 * inspects this shape, only stores/returns it as JSON.
 */
export interface CanvasSnapshot {
  version: typeof CANVAS_SNAPSHOT_VERSION;
  breadboards: PlacedBreadboard[];
  components: PlacedComponent[];
  wires: CanvasWireModel[];
  boards: PlacedBoard[];
  supplyVoltageVolts: number;
  viewport: CanvasViewport;
}

export function serializeCanvas(state: {
  breadboards: PlacedBreadboard[];
  components: PlacedComponent[];
  wires: CanvasWireModel[];
  boards: PlacedBoard[];
  supplyVoltageVolts: number;
  viewport: CanvasViewport;
}): CanvasSnapshot {
  return {
    version: CANVAS_SNAPSHOT_VERSION,
    breadboards: state.breadboards,
    components: state.components,
    wires: state.wires,
    // A board's real execution state (its avr8js/SketchEngine instance)
    // was never part of the serializable model (ADR 0027) — `running`
    // itself is plain data, but restoring it to `true` with no matching
    // engine behind it would show a "running" board that isn't actually
    // executing anything. Forced false on the way *in* to a snapshot
    // isn't right either (a mid-save snapshot should record what was
    // true then); it's `deserializeCanvas`, on the way *out*, that resets
    // it — see there.
    boards: state.boards,
    supplyVoltageVolts: state.supplyVoltageVolts,
    viewport: state.viewport,
  };
}

export type DeserializeResult =
  { status: "ok"; snapshot: CanvasSnapshot } | { status: "error"; message: string };

/**
 * Validates an opaque `graph` value (whatever `apps/api` handed back) is
 * actually a `CanvasSnapshot` this version of the app understands, before
 * trusting any of its fields — a malformed or future-version payload
 * reports a clear error rather than crashing the canvas. Forces every
 * board's `running` to `false` (see `serializeCanvas`'s note).
 */
export function deserializeCanvas(graph: unknown): DeserializeResult {
  if (typeof graph !== "object" || graph === null) {
    return {
      status: "error",
      message: "Saved project data is not a valid canvas snapshot.",
    };
  }
  const candidate = graph as Record<string, unknown>;
  if (candidate.version !== CANVAS_SNAPSHOT_VERSION) {
    return {
      status: "error",
      message: `Saved project data is from an unsupported version (${String(candidate.version)}).`,
    };
  }
  const arrayFields = ["breadboards", "components", "wires", "boards"] as const;
  for (const field of arrayFields) {
    if (!Array.isArray(candidate[field])) {
      return { status: "error", message: `Saved project data is missing "${field}".` };
    }
  }
  if (typeof candidate.supplyVoltageVolts !== "number") {
    return {
      status: "error",
      message: 'Saved project data is missing "supplyVoltageVolts".',
    };
  }
  if (typeof candidate.viewport !== "object" || candidate.viewport === null) {
    return { status: "error", message: 'Saved project data is missing "viewport".' };
  }

  const boards = (candidate.boards as PlacedBoard[]).map((board) => ({
    ...board,
    running: false,
  }));

  return {
    status: "ok",
    snapshot: {
      version: CANVAS_SNAPSHOT_VERSION,
      breadboards: candidate.breadboards as PlacedBreadboard[],
      components: candidate.components as PlacedComponent[],
      wires: candidate.wires as CanvasWireModel[],
      boards,
      supplyVoltageVolts: candidate.supplyVoltageVolts as number,
      viewport: candidate.viewport as CanvasViewport,
    },
  };
}
