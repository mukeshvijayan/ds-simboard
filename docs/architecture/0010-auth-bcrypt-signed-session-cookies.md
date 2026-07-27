# ADR 0010: Password auth via bcrypt + custom signed session cookies

- **Date:** 2026-07-27
- **Status:** Accepted

## Context

Spec Phase 9 ("Auth & accounts") needs real login. ADR 0009 deliberately
left `users` without password/session fields specifically so this
decision wasn't preempted. The project owner made the two decisions this
ADR builds on directly, rather than delegating them:

1. Roll-your-own auth: bcrypt password hashing, signed session cookies
   (not JWT-in-localStorage) for session state.
2. New project default visibility is `private` (see ADR 0011 for the
   access-control semantics built on top of that).

This ADR covers the implementation choices underneath decision 1: which
password-hashing library, how the session cookie is constructed and
verified, where session state lives, and the parameters chosen for each.

## Decisions

**1. `bcryptjs`, not native `bcrypt`, at cost factor 12.** `bcryptjs` is a
pure-JavaScript implementation of the same algorithm — no native addon,
no `node-gyp` compile step. That matches this repo's existing bias toward
avoiding native bindings (`@electric-sql/pglite` is WASM for the same
reason, per ADR 0009). Cost factor 12 sits above OWASP's 2023+ floor of
10; the extra ~2x hashing time (roughly 150-300ms per login/signup on
typical hardware) is an acceptable trade-off for the added brute-force
resistance, and it's the same cost factor used in both tests and
production — no test-only shortcut that would let the tests pass without
proving the real parameters work.

**2. A custom signed cookie, not `express-session` or a JWT.**

- **Not a bare JWT**: a JWT carrying the user id would be self-verifying
  (no DB lookup needed), but that's exactly the problem — there's no
  server-side way to invalidate one before it expires. Logout, and any
  future "sign out of all devices" feature, need to actually work.
- **Not `express-session`**: it's a fine, well-tested library, but it
  pulls in its own session-store abstraction and defaults tuned for
  scenarios (multiple store backends, rolling sessions, etc.) this
  project doesn't need yet. The equivalent of what it does here — sign a
  session id, verify it, look it up in a table — is a small enough amount
  of code to own directly and test directly, consistent with this
  project's existing "Drizzle over Prisma," "Express over Next Route
  Handlers" pattern of preferring the smaller, more direct tool.
- **The mechanism**: `services/sessionCookie.ts` HMAC-SHA256-signs the
  session id with `SESSION_SECRET` (`id.signature`, base64url), verified
  with `crypto.timingSafeEqual` so a byte-by-byte guessing attack via
  response timing isn't feasible. The `cookie` package (small,
  dependency-free, the same one Express itself uses internally) handles
  `Set-Cookie`/`Cookie` header parsing so that part isn't hand-rolled.

**3. Sessions live in their own `sessions` table, not as columns on
`users`.** The original instruction described this as adding
"password/session fields to the `users` table." The password field
(`passwordHash`) does belong there — one per account. Session state
doesn't fit the same grain: a single user can be logged in from multiple
browsers/devices at once, and each of those needs its own expiry and its
own ability to be individually revoked (logging out of one device
shouldn't log out every device). That's a per-_login_ fact, not a
per-_account_ fact, so it needs its own row. This is a reasoned
implementation-level deviation from the literal instruction, not a
reinterpretation of the actual decision (bcrypt + signed cookies) the
owner made.

**4. Fixed 7-day expiry, not a sliding window.** A session simply expires
7 days after creation; visiting the site doesn't refresh it. Simpler to
reason about and test than a sliding-expiry scheme; revisit if user
feedback says 7 days is inconvenient.

**5. `SESSION_SECRET` is a required environment variable in production,
never hardcoded — but tests don't read `process.env` at all.**
`createApp(db, sessionSecret)` takes the secret as a parameter (mirroring
`db/client.ts`'s `Database` parameter from ADR 0009); `server.ts` reads
`process.env.SESSION_SECRET` and throws immediately if it's missing, the
same "fail loudly, don't silently degrade" pattern as
`createProductionDatabase`'s missing-`DATABASE_URL` check. Tests pass a
fixed, comitted, dev-only string constant instead — anyone who reads it
learns nothing about a real secret, and tests don't depend on environment
state. **Still genuinely blocked on the user:** generating and storing a
real production `SESSION_SECRET` value is a deployment-time action (see
`apps/api/.env.example`), not something to fabricate here — same
"seam is ready, nothing is deployed yet" position as `DATABASE_URL`.

**6. Cookie attributes**: `httpOnly` (blocks JS access — an XSS bug can't
read/exfiltrate it), `sameSite: "lax"` (blocks it being sent on
cross-site POST requests — the standard CSRF mitigation — while still
allowing a shared project link to work when clicked from an external
site, which `sameSite: "strict"` would break), `secure` only outside
development (`NODE_ENV === "production"` — local dev/test runs over plain
HTTP, where a `secure` cookie would never be sent at all).

**7. Signup replaces `POST /users` as the only way to create a `users`
row.** Every account now requires a password, so a passwordless
"create a user" endpoint no longer makes sense; `authService.signup` is
now the single real path, and `usersService`/`usersController` are
read-only (`GET /users/:id`, now itself behind `requireAuth`). This is a
breaking change to an internal, unreleased API — acceptable since nothing
is deployed.

## Deferred, not forgotten

- **Expired-session cleanup**: expired sessions are treated as invalid at
  lookup time (`expiresAt` is checked on every read) but aren't
  proactively deleted. Over time this is unbounded table growth, not a
  security problem — a periodic cleanup job (cron, or a `DELETE ... WHERE
expires_at < now()` on a schedule) is a reasonable later addition, not
  built speculatively here.
- **Password reset / email verification**: no "forgot password" flow and
  no email-confirmation-on-signup exist yet. Both need an email-sending
  integration (a real external service/credential decision), which
  wasn't part of the two decisions the owner made for this phase.
- **Rate limiting on login/signup**: brute-force protection beyond
  bcrypt's inherent slowness (e.g., IP-based throttling, account
  lockout) isn't built. Reasonable, but a separate concern from "how does
  auth work at all," and better addressed once the app has a real
  deployment target to rate-limit against.

## Alternatives considered

- **JWT stored in an httpOnly cookie** (rather than a bare JWT in
  localStorage, which the owner's instruction already ruled out) — this
  would still work but reintroduces the revocation problem from decision
  2 without actually avoiding a database, since revocation support means
  either a blocklist table (extra complexity for no simplicity gain over
  just using the session id directly) or accepting that logout doesn't
  really work until expiry.
- **Argon2** over bcrypt — arguably the stronger modern choice, but the
  owner's instruction named bcrypt specifically, and bcryptjs's zero
  native-dependency property was the deciding factor for _which_ bcrypt
  implementation, not a case for switching algorithms.
