import { createApp } from "../src/app";
import { createProductionDatabase } from "../src/db/client";

/**
 * Vercel serverless entrypoint (see docs/architecture/0015-*.md). This
 * file — not `src/server.ts`, which calls `app.listen()` for a
 * traditional long-running process — is what Vercel's Node.js runtime
 * actually invokes per request.
 *
 * The database pool and Express app are built once, at module scope, so
 * a warm serverless instance reuses the same connection pool across
 * requests instead of reconnecting every time; only a cold start pays
 * that cost. `pg.Pool`'s own internal pooling then sits in front of
 * Supabase's transaction-mode pooler (see ADR 0015) — pooling on both
 * ends, which is the standard shape for Postgres behind serverless.
 */
const sessionSecret = process.env.SESSION_SECRET;
if (!sessionSecret) {
  throw new Error(
    "SESSION_SECRET is required to sign session cookies — see docs/architecture/0010-*.md"
  );
}

const webAppOrigins = process.env.WEB_APP_ORIGIN?.split(",").map((o) => o.trim());

const db = createProductionDatabase(process.env.DATABASE_URL);
const app = createApp(db, sessionSecret, webAppOrigins);

export default app;
