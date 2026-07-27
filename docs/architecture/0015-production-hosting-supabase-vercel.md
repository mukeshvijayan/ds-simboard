# ADR 0015: Production hosting — Supabase (ap-northeast-2, transaction pooler) + Vercel

- **Date:** 2026-07-28
- **Status:** Accepted

## Context

ADR 0009 deliberately left the production database credential and
hosting provider undecided — "a real product/cost decision for the
project owner, not made in code." That decision has now been made:
**Supabase**, region **ap-northeast-2**, connected via its **transaction-
mode connection pooler**, with **Vercel** as the deployment target for
both `apps/web` and `apps/api`. `SESSION_SECRET` (ADR 0010) and
`DATABASE_URL` are set directly in Vercel's dashboard — never committed,
never passed through this codebase or this assistant as plaintext.

## Decisions

**1. Supabase for the production Postgres.** A managed Postgres with a
generous free/low tier, a dashboard for inspecting data directly, and
(relevant to decision 2) a built-in connection pooler purpose-built for
exactly this deployment shape — no separate pooler service to run or
maintain.

**2. The transaction-mode pooler, not a direct connection.** `apps/api`
runs as Vercel serverless functions (decision 4) — many short-lived
function instances can exist concurrently under real traffic, each
potentially opening its own `pg.Pool`. A direct Postgres connection has a
hard, fairly low connection limit; a burst of concurrent invocations
against it is a real, common way to take a serverless+Postgres deployment
down. Supabase's transaction-mode pooler (PgBouncer under the hood) sits
in front of Postgres and multiplexes many client connections onto a much
smaller set of real ones, handing a connection out per-transaction rather
than per-client-lifetime — the standard, recommended shape for serverless
callers. (Supabase's _session_-mode pooler, by contrast, holds a
connection for the client's full session — the wrong choice here for the
same reason a direct connection would be.)

**3. Migrations run by hand, from a real shell, never automatically.**
`apps/api/src/db/migrateProduction.ts` applies the committed migration
files via Drizzle's own `migrate()` — the exact same function
`createMigratedTestDatabase()` already calls in every test run, so this
was already proven correct against real Postgres semantics before it
ever touched Supabase. It is deliberately **not** wired into
`api/index.ts`, `src/server.ts`, or any deploy hook: running a schema
migration automatically the moment a new deployment receives its first
request (or during a Vercel build step, which runs on every push) would
make a schema change a side effect of traffic or of an unrelated code
change, rather than a conscious, reviewed action taken once per schema
change. The first run against the real Supabase database was done by the
project owner directly, from their own shell, with `DATABASE_URL` set
locally — never shared with or run by this assistant, consistent with
the credential boundary ADR 0009/0010 already established.

**4. `apps/api` deploys to Vercel as its own project, via a thin
serverless adapter — `apps/api` was never structured for this
before now.** `src/server.ts` (`app.listen()`) is a traditional
long-running process; Vercel's Node.js runtime instead expects a
per-request handler. `apps/api/api/index.ts` builds the `Database`
connection and Express `app` once, at module scope (reused across a warm
serverless instance — only a cold start pays the connection-setup cost),
and exports the `Express` app directly — Express apps already implement
the `(req, res) => void` signature Vercel's runtime expects, so no
further wrapping is needed. `apps/api/vercel.json` rewrites every
incoming path to that one function; Vercel's rewrite mechanism resolves
_which_ function serves a request without altering the `req.url` the
function itself receives, so Express's own internal routing (`/health`,
`/users`, `/projects/*`, `/auth/*`, ...) still works against the real
requested path.

`apps/web` and `apps/api` are two separate Vercel projects pointed at the
same GitHub repo with different **Root Directory** settings (`apps/web`
and `apps/api` respectively) — standard Vercel monorepo support, and
necessary since they're two independently deployable units (already the
premise of ADR 0009's Express-over-Next-Route-Handlers decision).
**Environment variables in Vercel are scoped per project** — `apps/web`'s
project having `DATABASE_URL`/`SESSION_SECRET` set does not make them
available to `apps/api`'s separate project; each needs them configured
independently. (`apps/web` doesn't currently call `apps/api` at all — see
the "known v1 limitations" note in the Phase 10 completion report — so
today only `apps/api`'s project actually needs these two variables.)

## What this unblocks vs. still requires action

- **Done**: schema, migrations, and now the real production database
  itself — created, migrated, and verified reachable with real Postgres
  semantics (constraints, enums, cascades — the same things every test
  already proved against pglite, now proved again against the real
  Supabase instance).
- **Requires the project owner's Vercel dashboard access** (this
  assistant has no Vercel account/CLI credential): creating `apps/api`'s
  Vercel project (Root Directory = `apps/api`), and setting
  `DATABASE_URL`/`SESSION_SECRET` on that project specifically. Firing
  the actual deployment and confirming the resulting URL is reachable is
  likewise a dashboard/CLI action outside this assistant's access.

## Alternatives considered

- **Vercel Postgres / Neon / Railway** (the other options ADR 0009 named
  as reasonable) — Supabase was chosen on cost/dashboard-tooling
  preference; nothing about the codebase favors one over another, since
  all speak the same Postgres wire protocol Drizzle already targets.
- **A traditional Node host for `apps/api`** (Render/Railway/Fly.io,
  running `src/server.ts` as-is via `app.listen()`) — would have avoided
  building a serverless adapter entirely, but the project owner's own
  choice was Vercel for both apps, for one dashboard/one deployment
  provider to manage rather than two.
- **Running migrations automatically on deploy** — rejected per decision
  3's reasoning: a schema change should never be an incidental side
  effect of a deployment or a burst of traffic.
