import { eq } from "drizzle-orm";
import type { Database } from "../db/client";
import { componentDefinitions } from "../db/schema";

export interface UpsertComponentDefinitionRow {
  type: string;
  label: string;
  defaultParams: Record<string, unknown>;
}

export function createComponentDefinitionsRepository(db: Database) {
  return {
    async listAll() {
      return db.select().from(componentDefinitions);
    },

    async findByType(type: string) {
      const [row] = await db
        .select()
        .from(componentDefinitions)
        .where(eq(componentDefinitions.type, type));
      return row ?? null;
    },

    async upsert(input: UpsertComponentDefinitionRow) {
      const [row] = await db
        .insert(componentDefinitions)
        .values(input)
        .onConflictDoUpdate({
          target: componentDefinitions.type,
          set: { label: input.label, defaultParams: input.defaultParams },
        })
        .returning();
      return row;
    },
  };
}

export type ComponentDefinitionsRepository = ReturnType<
  typeof createComponentDefinitionsRepository
>;
