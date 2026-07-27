import {
  drizzle as drizzleNodePostgres,
  type NodePgDatabase,
} from "drizzle-orm/node-postgres";
import { drizzle as drizzlePglite, type PgliteDatabase } from "drizzle-orm/pglite";
import { PGlite } from "@electric-sql/pglite";
import { Pool } from "pg";
import * as schema from "./schema";

export type Database = NodePgDatabase<typeof schema> | PgliteDatabase<typeof schema>;

/**
 * The real, production database connection — Supabase (ap-northeast-2),
 * via its transaction-mode pooler, per docs/architecture/0015-*.md.
 * Throws rather than silently falling back to anything if `databaseUrl`
 * is empty — a missing `DATABASE_URL` should fail loudly at startup, not
 * degrade into an accidental in-memory database. Returns the underlying
 * `Pool` too (`$client`) so callers (e.g. `migrateProduction.ts`) can
 * close it explicitly rather than leaving connections open.
 */
export function createProductionDatabase(
  databaseUrl: string | undefined
): NodePgDatabase<typeof schema> & { $client: Pool } {
  if (!databaseUrl) {
    throw new Error(
      "DATABASE_URL is required to connect to the production database — see docs/architecture/0009-*.md"
    );
  }
  const pool = new Pool({ connectionString: databaseUrl });
  return drizzleNodePostgres(pool, { schema });
}

/**
 * An embedded, in-process Postgres (via `@electric-sql/pglite`) for tests
 * — genuine Postgres semantics (constraints, enums, jsonb, gen_random_uuid)
 * with no external server and no credential. Never used in production.
 * Returns the underlying client too so tests can close it in `afterEach`
 * — each instance holds real (WASM) resources that must be released.
 */
export function createTestDatabase(): PgliteDatabase<typeof schema> & {
  $client: PGlite;
} {
  return drizzlePglite(new PGlite(), { schema });
}
