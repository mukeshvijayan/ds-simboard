import { desc, eq } from "drizzle-orm";
import type { Database } from "../db/client";
import { circuitSnapshots } from "../db/schema";

export interface CreateCircuitSnapshotRow {
  projectId: string;
  graph: unknown;
  sketchCode?: string | null;
}

export function createCircuitSnapshotsRepository(db: Database) {
  return {
    async create(input: CreateCircuitSnapshotRow) {
      const [row] = await db.insert(circuitSnapshots).values(input).returning();
      return row;
    },

    async listByProject(projectId: string) {
      return db
        .select()
        .from(circuitSnapshots)
        .where(eq(circuitSnapshots.projectId, projectId))
        .orderBy(desc(circuitSnapshots.createdAt));
    },

    async latestForProject(projectId: string) {
      const [row] = await db
        .select()
        .from(circuitSnapshots)
        .where(eq(circuitSnapshots.projectId, projectId))
        .orderBy(desc(circuitSnapshots.createdAt))
        .limit(1);
      return row ?? null;
    },
  };
}

export type CircuitSnapshotsRepository = ReturnType<
  typeof createCircuitSnapshotsRepository
>;
