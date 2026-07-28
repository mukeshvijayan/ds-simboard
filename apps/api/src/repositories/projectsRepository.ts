import { eq } from "drizzle-orm";
import type { Database } from "../db/client";
import { projects } from "../db/schema";

export interface CreateProjectRow {
  ownerId: string;
  labType: "breadboard" | "arduino" | "esp32";
  name: string;
  visibility?: "private" | "unlisted" | "public";
}

export function createProjectsRepository(db: Database) {
  return {
    async create(input: CreateProjectRow) {
      const [row] = await db.insert(projects).values(input).returning();
      return row;
    },

    async findById(id: string) {
      const [row] = await db.select().from(projects).where(eq(projects.id, id));
      return row ?? null;
    },

    async listByOwner(ownerId: string) {
      return db.select().from(projects).where(eq(projects.ownerId, ownerId));
    },

    async remove(id: string) {
      await db.delete(projects).where(eq(projects.id, id));
    },

    /** Partial update — only the fields present in `patch` change. Used
     * for both renaming and visibility changes (P2-5, ADR 0029), a
     * single generalized method rather than one per field so a caller
     * patching both in one request does one update, not two. */
    async update(
      id: string,
      patch: { name?: string; visibility?: "private" | "unlisted" | "public" }
    ) {
      const [row] = await db
        .update(projects)
        .set({ ...patch, updatedAt: new Date() })
        .where(eq(projects.id, id))
        .returning();
      return row ?? null;
    },
  };
}

export type ProjectsRepository = ReturnType<typeof createProjectsRepository>;
export type ProjectRow = Awaited<ReturnType<ProjectsRepository["findById"]>>;
