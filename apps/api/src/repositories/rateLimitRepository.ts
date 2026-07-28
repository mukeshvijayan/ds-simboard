import { sql } from "drizzle-orm";
import type { Database } from "../db/client";
import { authRateLimitAttempts } from "../db/schema";

export function createRateLimitRepository(db: Database) {
  return {
    /**
     * Atomically records one attempt against `key` (e.g. `"login:1.2.3.4"`)
     * and returns the resulting count for the current fixed window. A
     * single `INSERT ... ON CONFLICT DO UPDATE` — not a
     * read-then-write — so concurrent requests against the same key
     * (exactly the scenario this exists to police) can't race past each
     * other and both read a stale, too-low count.
     *
     * If the row's existing window started before `now - windowMs`, it's
     * treated as a new window (count resets to 1) rather than
     * accumulating forever.
     */
    async recordAttempt(key: string, now: Date, windowMs: number) {
      const windowCutoff = new Date(now.getTime() - windowMs);
      const [row] = await db
        .insert(authRateLimitAttempts)
        .values({ key, windowStart: now, count: 1 })
        .onConflictDoUpdate({
          target: authRateLimitAttempts.key,
          set: {
            count: sql`CASE WHEN ${authRateLimitAttempts.windowStart} <= ${windowCutoff.toISOString()} THEN 1 ELSE ${authRateLimitAttempts.count} + 1 END`,
            windowStart: sql`CASE WHEN ${authRateLimitAttempts.windowStart} <= ${windowCutoff.toISOString()} THEN ${now.toISOString()} ELSE ${authRateLimitAttempts.windowStart} END`,
          },
        })
        .returning();
      return row;
    },
  };
}

export type RateLimitRepository = ReturnType<typeof createRateLimitRepository>;
