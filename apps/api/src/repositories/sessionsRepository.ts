import { eq } from "drizzle-orm";
import type { Database } from "../db/client";
import { sessions } from "../db/schema";

export function createSessionsRepository(db: Database) {
  return {
    async create(input: { userId: string; expiresAt: Date }) {
      const [row] = await db.insert(sessions).values(input).returning();
      return row;
    },

    async findById(id: string) {
      const [row] = await db.select().from(sessions).where(eq(sessions.id, id));
      return row ?? null;
    },

    async remove(id: string) {
      await db.delete(sessions).where(eq(sessions.id, id));
    },
  };
}

export type SessionsRepository = ReturnType<typeof createSessionsRepository>;
