/**
 * A single saved point-in-time state of a project — versioned, so "undo
 * history" and named save points are just rows ordered by `createdAt`
 * (spec Part 4).
 *
 * `graph` is deliberately `unknown` here: each lab (Breadboard/Arduino/
 * ESP32) has its own in-memory state shape today (see
 * apps/web/features/*\/model/types.ts), and none of them were designed to
 * be serialized yet — unifying them into one canonical persisted shape is
 * real design work for whichever phase first wires up "Save project" in
 * the UI, not decided here. Callers must validate/narrow `graph`
 * themselves based on `labType`.
 */
export interface CircuitSnapshot {
  id: string;
  projectId: string;
  graph: unknown;
  /** Sketch source for arduino/esp32 projects; null for breadboard (no code). */
  sketchCode: string | null;
  createdAt: string;
}

export interface CreateCircuitSnapshotInput {
  projectId: string;
  graph: unknown;
  sketchCode?: string | null;
}
