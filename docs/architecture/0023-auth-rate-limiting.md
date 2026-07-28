# ADR 0023: Rate limiting on `/auth/signup` and `/auth/login`

- **Date:** 2026-07-28
- **Status:** Accepted

## Context

`/auth/signup` and `/auth/login` had no rate limiting at all — a real,
currently-live exposure (unbounded password brute-forcing against any
known email, and unbounded fake-account creation), flagged as the
highest-priority item in this run.

`apps/api` runs as Vercel serverless functions (ADR 0015): many
concurrent, short-lived function instances, no memory shared between
them, and a cold start discards whatever state a prior instance held.
An in-memory rate limiter (e.g. a plain `Map` inside the process) would
reset every cold start and wouldn't be shared across concurrent warm
instances either — it would look like real protection in a local dev
server (`app.listen()`, one process) while doing close to nothing in
production, which is exactly the kind of gap "real, tested middleware,
not a token gesture" was called out to avoid.

## Decision

**A Postgres-backed, atomic, fixed-window counter**, reusing the
connection this app already has (Supabase via the transaction pooler,
ADR 0015) rather than adding a new piece of infrastructure (Redis, an
external rate-limiting service) for one table's worth of state:

1. **`auth_rate_limit_attempts`** (`db/schema.ts`): one row per `key`
   (e.g. `"login:203.0.113.5"`), storing `windowStart` and `count`.
2. **`rateLimitRepository.recordAttempt(key, now, windowMs)`**: a single
   `INSERT ... ON CONFLICT (key) DO UPDATE` — not a read-then-write —
   with a `CASE` expression deciding whether the existing window is
   still current (increment) or expired (reset to 1). Atomicity matters
   here specifically because concurrent requests against the same key
   are exactly the scenario a rate limiter has to get right; a
   read-then-write would let two simultaneous attempts each read a
   stale, too-low count and both slip through.
3. **`createRateLimiter` middleware** (`middleware/rateLimiter.ts`): keys
   on `` `${routeName}:${req.ip}` `` — `routeName` (`"signup"`/`"login"`)
   keeps the two endpoints' budgets independent, so exhausting one
   doesn't block the other. Responds `429` with a `Retry-After` header
   once `count` exceeds the configured `maxAttempts`, otherwise calls
   `next()`.
4. **Thresholds**: login — 5 attempts per 15 minutes per IP (a standard
   brute-force-resistance figure: enough for a real user's own typos,
   tight enough to make credential-stuffing impractical). Signup — 10 per
   hour per IP (looser, since account creation isn't the same kind of
   secret-guessing target, but still bounded against scripted spam
   signups).
5. **`app.set("trust proxy", true)`** — added because Vercel's edge
   network sits in front of every request; without this, Express's
   `req.ip` would read the proxy's own address for every caller (via the
   raw socket peer) instead of the real client IP from
   `x-forwarded-for`, which would rate-limit _all_ users together as if
   they were one caller — a correctness bug that would have made the
   limiter effectively useless in production while appearing to work
   correctly in every local test (where there's no proxy to matter).

## Alternatives considered

- **In-memory counter** (a plain `Map`/`express-rate-limit`'s default
  in-memory store) — rejected per the Context section: doesn't hold
  under this app's actual serverless deployment shape.
- **A separate Redis/Upstash instance for rate-limit state** — the more
  common production answer for exactly this problem, and worth
  reconsidering if this table's write volume ever becomes a real
  bottleneck on the shared Postgres connection pool. Rejected for now:
  this project already has a Postgres connection built specifically for
  serverless (the transaction pooler, ADR 0015), and standing up a
  second stateful service for one small counter table is real added
  operational surface for a problem the existing database already
  solves correctly.
- **Rate-limit by email instead of (or in addition to) IP** — considered
  for login specifically (limits credential-stuffing against one account
  from many IPs). Rejected for this pass to keep scope to the one clear,
  high-value protection this run was flagged for; per-IP is the standard
  first-layer defense and is what's built here. Per-email limiting (or
  combining both) is a reasonable follow-up if abuse patterns ever show
  it's needed.

## Consequences

- Real behavior change: the 6th login attempt within 15 minutes from
  the same IP now gets `429` instead of being evaluated — verified via
  a full-stack `supertest` integration test (`app.test.ts`) hitting the
  actual middleware, actual routes, and actual (embedded) Postgres, not
  a mocked limiter.
- A new migration (`0002_faulty_rumiko_fujikawa.sql`) must be applied to
  the production Supabase database by the project owner, from their own
  shell, per ADR 0015's decision 3 (migrations are never run
  automatically) — this assistant cannot and does not run it against
  production.
- `createAuthRoutes` and `createApp`'s signatures changed (new required
  rate-limiter parameters) — both are internal to `apps/api` and have no
  other callers, so this isn't a breaking change for anything else in
  the monorepo.
