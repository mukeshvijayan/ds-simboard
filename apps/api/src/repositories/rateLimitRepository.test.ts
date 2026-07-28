import { createMigratedTestDatabase } from "../db/testDb";
import { createRateLimitRepository } from "./rateLimitRepository";

describe("rateLimitRepository", () => {
  it("starts a key at count 1 on its first attempt", async () => {
    const { db, close } = await createMigratedTestDatabase();
    const repository = createRateLimitRepository(db);

    const row = await repository.recordAttempt(
      "login:1.2.3.4",
      new Date(),
      15 * 60 * 1000
    );

    expect(row.count).toBe(1);
    await close();
  });

  it("increments the count for repeated attempts within the same window", async () => {
    const { db, close } = await createMigratedTestDatabase();
    const repository = createRateLimitRepository(db);
    const windowMs = 15 * 60 * 1000;
    const now = new Date("2026-01-01T00:00:00Z");

    await repository.recordAttempt("login:1.2.3.4", now, windowMs);
    await repository.recordAttempt(
      "login:1.2.3.4",
      new Date(now.getTime() + 1000),
      windowMs
    );
    const third = await repository.recordAttempt(
      "login:1.2.3.4",
      new Date(now.getTime() + 2000),
      windowMs
    );

    expect(third.count).toBe(3);
    await close();
  });

  it("keeps independent counts for different keys", async () => {
    const { db, close } = await createMigratedTestDatabase();
    const repository = createRateLimitRepository(db);
    const now = new Date();

    await repository.recordAttempt("login:1.2.3.4", now, 15 * 60 * 1000);
    const other = await repository.recordAttempt("login:5.6.7.8", now, 15 * 60 * 1000);
    const signup = await repository.recordAttempt("signup:1.2.3.4", now, 60 * 60 * 1000);

    expect(other.count).toBe(1);
    expect(signup.count).toBe(1);
    await close();
  });

  it("resets the count once the previous window has expired", async () => {
    const { db, close } = await createMigratedTestDatabase();
    const repository = createRateLimitRepository(db);
    const windowMs = 15 * 60 * 1000;
    const windowStart = new Date("2026-01-01T00:00:00Z");

    await repository.recordAttempt("login:1.2.3.4", windowStart, windowMs);
    await repository.recordAttempt(
      "login:1.2.3.4",
      new Date(windowStart.getTime() + 1000),
      windowMs
    );

    // Well past the 15-minute window — should start a fresh one, not
    // keep accumulating forever.
    const afterWindow = await repository.recordAttempt(
      "login:1.2.3.4",
      new Date(windowStart.getTime() + windowMs + 1000),
      windowMs
    );

    expect(afterWindow.count).toBe(1);
    await close();
  });

  it("accumulates correctly under concurrent attempts against the same key", async () => {
    // The real scenario this guards: a burst of simultaneous requests
    // from the same IP shouldn't each read a stale count and all think
    // they're "attempt #1" — the atomic upsert must serialize them.
    const { db, close } = await createMigratedTestDatabase();
    const repository = createRateLimitRepository(db);
    const now = new Date();

    const results = await Promise.all(
      Array.from({ length: 8 }, () =>
        repository.recordAttempt("login:1.2.3.4", now, 15 * 60 * 1000)
      )
    );

    const counts = results.map((r) => r.count).sort((a, b) => a - b);
    expect(counts).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
    await close();
  });
});
