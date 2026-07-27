# ADR 0009: Drizzle + Express for `apps/api`, tested against an embedded Postgres

- **Date:** 2026-07-27
- **Status:** Accepted

## Context

Spec Phase 8 asks for `apps/api` (controllers/services/repositories/routes)
and a Postgres schema (`users`, `projects`, `circuit_snapshots`,
`component_definitions`, per spec Part 4) via "Prisma or Drizzle." A real
production database needs a connection string and a hosting decision only
the user can make — a genuine stopping condition, already flagged before
this phase started.

That credential gap doesn't have to block _all_ of Phase 8, though. Before
assuming it did, I checked whether backend code could be developed and
genuinely verified without a live production database — and it can:
`@electric-sql/pglite` (Apache-2.0, ElectricSQL) is a real WASM build of
Postgres itself (not a mock, not SQLite-pretending-to-be-Postgres) that
runs embedded, in-process, with zero external server. Verified directly:
created a table, inserted a row, and confirmed a real unique-constraint
violation fires correctly — genuine Postgres semantics, no server, no
credential.

## Decisions

**1. Drizzle over Prisma.** Drizzle's schema is plain TypeScript (the
table definitions themselves are the source of truth Drizzle infers types
from), not a separate `.prisma` schema language requiring a codegen step —
consistent with how every other package in this repo defines its domain
model directly in TypeScript. `drizzle-orm/pglite` also has a first-class
embedded-Postgres driver, which is what makes decision 3 below possible
without extra glue.

**2. Express over Next.js Route Handlers for `apps/api`.** `apps/api`'s
job is business logic and data access — it never renders anything.
Building it as a plain Express app keeps it free of any React/Next
coupling (routing conventions, the App Router's file-based structure)
that exists to serve UI rendering, which this app never does. It's also a
genuinely separate deployable unit in the monorepo, matching spec Part
4's tree exactly.

**3. Repository- and service-layer tests run against `pglite`, not a
mock.** A mocked repository only proves the service layer calls a
function; it proves nothing about whether the actual SQL a repository
issues is correct (right table, right column, right constraint). Every
repository test in this phase runs real Drizzle queries against a real
(embedded) Postgres and asserts on the actual result — including that
constraints (uniqueness, foreign keys, NOT NULL) are actually enforced by
the database, not merely assumed.

## What this does and doesn't unblock

- **Unblocked without a credential:** schema design, migrations
  (`drizzle-kit generate`), the full repository/service/controller/route
  implementation, and real tests proving the SQL is correct.
- **Still blocked on the user:** the actual _production_ `DATABASE_URL`
  and a hosting choice (Vercel Postgres, Supabase, Neon, Railway, or
  self-hosted are all reasonable; this is a real product/cost decision,
  not an implementation detail, so it isn't made here). `apps/api`'s
  `db/client.ts` reads `DATABASE_URL` from the environment for exactly
  this reason — the seam is ready, nothing is hardcoded, but nothing has
  been deployed or connected to a real server either.
- **Deferred to Phase 9 on purpose, not forgotten:** the `users` table
  here has no password/session fields. Spec Phase 9 ("Auth & accounts")
  is where "how passwords or sessions are handled" gets decided — the
  user's own stopping condition names this exact question as one they
  want to make, not delegate. Building it into the Phase 8 schema now
  would preempt that decision.

## Alternatives considered

- **Prisma** — more mature ecosystem (Prisma Studio, more tutorials), but
  the separate schema DSL + generated client step is more machinery than
  this project's existing "domain model lives in plain TypeScript"
  convention (circuit-engine, component-library) calls for.
- **Skip real repository tests, just write the code and flag it
  unverified** — rejected once `pglite` was confirmed working: writing
  untested database code and calling it done would break this project's
  established verify-before-claiming-done discipline for no real reason,
  since a genuine verification path existed.
- **SQLite for tests, Postgres for production** — a common pattern, but
  it means the tests don't actually prove the production SQL dialect
  works (Postgres-specific features — `SERIAL`, `JSONB`, certain
  constraint behaviors — can differ from SQLite). `pglite` avoids that
  gap entirely by being real Postgres.
