import path from "node:path";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { createProductionDatabase } from "./client";

/**
 * Applies the committed migration files (`src/db/migrations`) to the real
 * production database — the same migrations `createMigratedTestDatabase`
 * already proves work against a real (embedded) Postgres in every test
 * run (see docs/architecture/0009-*.md). This is a one-time/per-schema-
 * change operation run by hand from a shell with a real `DATABASE_URL`
 * set — it is deliberately not run automatically at request time or
 * app startup (`api/index.ts`/`src/server.ts`), so a schema change is a
 * conscious, reviewed action, not a side effect of traffic hitting a new
 * deployment. See docs/architecture/0015-*.md.
 */
async function main() {
  const db = createProductionDatabase(process.env.DATABASE_URL);
  await migrate(db, { migrationsFolder: path.join(__dirname, "migrations") });
  // eslint-disable-next-line no-console
  console.log("Migrations applied successfully.");
  await db.$client.end();
}

/* istanbul ignore next -- CLI entrypoint, not exercised by tests */
if (require.main === module) {
  main().catch((err) => {
    // eslint-disable-next-line no-console
    console.error("Migration failed:", err);
    process.exit(1);
  });
}
