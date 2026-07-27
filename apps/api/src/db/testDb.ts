import path from "node:path";
import { migrate } from "drizzle-orm/pglite/migrator";
import { createTestDatabase } from "./client";

/**
 * A fresh, fully-migrated embedded database for one test. Applies the
 * *actual* committed migration files (`src/db/migrations`) — the same
 * ones that would run against production — rather than a hand-written
 * parallel schema, so a passing test means the real migration works.
 *
 * Call `close()` in `afterEach`/`afterAll` — each instance holds real
 * (WASM) resources that must be released, not garbage-collected.
 */
export async function createMigratedTestDatabase() {
  const db = createTestDatabase();
  await migrate(db, { migrationsFolder: path.join(__dirname, "migrations") });
  return { db, close: () => db.$client.close() };
}
