import { eq } from "drizzle-orm";
import type { Database } from "../db/client";
import { users } from "../db/schema";

export function createUsersRepository(db: Database) {
  return {
    async create(input: {
      email: string;
      passwordHash: string;
      displayName?: string | null;
    }) {
      const [row] = await db.insert(users).values(input).returning();
      return row;
    },

    async findById(id: string) {
      const [row] = await db.select().from(users).where(eq(users.id, id));
      return row ?? null;
    },

    async findByEmail(email: string) {
      const [row] = await db.select().from(users).where(eq(users.email, email));
      return row ?? null;
    },
  };
}

export type UsersRepository = ReturnType<typeof createUsersRepository>;
