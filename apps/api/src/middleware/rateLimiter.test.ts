import type { Request, Response } from "express";
import { createRateLimiter } from "./rateLimiter";
import type { RateLimitRepository } from "../repositories/rateLimitRepository";

function fakeRateLimitRepository(counts: Record<string, number>): RateLimitRepository {
  return {
    async recordAttempt(key: string, now: Date) {
      counts[key] = (counts[key] ?? 0) + 1;
      return { id: "row", key, windowStart: now, count: counts[key] };
    },
  } as unknown as RateLimitRepository;
}

function fakeReq(ip: string): Request {
  return { ip } as unknown as Request;
}

function fakeRes() {
  const res = {
    statusCode: 0,
    body: undefined as unknown,
    headers: {} as Record<string, string>,
    status(code: number) {
      res.statusCode = code;
      return res;
    },
    json(payload: unknown) {
      res.body = payload;
      return res;
    },
    setHeader(name: string, value: string) {
      res.headers[name] = value;
      return res;
    },
  };
  return res as unknown as Response & typeof res;
}

describe("createRateLimiter", () => {
  it("calls next() for attempts at or under the limit", async () => {
    const limiter = createRateLimiter(fakeRateLimitRepository({}), {
      routeName: "login",
      maxAttempts: 3,
      windowMs: 1000,
    });
    const next = jest.fn();

    await limiter(fakeReq("1.2.3.4"), fakeRes(), next);
    await limiter(fakeReq("1.2.3.4"), fakeRes(), next);
    await limiter(fakeReq("1.2.3.4"), fakeRes(), next);

    expect(next).toHaveBeenCalledTimes(3);
  });

  it("responds 429 once the limit is exceeded, and does not call next()", async () => {
    const limiter = createRateLimiter(fakeRateLimitRepository({}), {
      routeName: "login",
      maxAttempts: 2,
      windowMs: 1000,
    });
    const next = jest.fn();

    await limiter(fakeReq("1.2.3.4"), fakeRes(), next);
    await limiter(fakeReq("1.2.3.4"), fakeRes(), next);
    const res = fakeRes();
    await limiter(fakeReq("1.2.3.4"), res, next);

    expect(next).toHaveBeenCalledTimes(2);
    expect(res.statusCode).toBe(429);
    expect(res.body).toEqual({ error: "Too many attempts. Please try again later." });
    expect(res.headers["Retry-After"]).toBeDefined();
  });

  it("keeps independent limits per IP", async () => {
    const limiter = createRateLimiter(fakeRateLimitRepository({}), {
      routeName: "login",
      maxAttempts: 1,
      windowMs: 1000,
    });
    const next = jest.fn();
    const resA1 = fakeRes();
    const resA2 = fakeRes();
    const resB1 = fakeRes();

    await limiter(fakeReq("1.1.1.1"), resA1, next);
    await limiter(fakeReq("1.1.1.1"), resA2, next);
    await limiter(fakeReq("2.2.2.2"), resB1, next);

    expect(resA1.statusCode).toBe(0); // allowed, next() called instead
    expect(resA2.statusCode).toBe(429); // second attempt from the same IP
    expect(resB1.statusCode).toBe(0); // a different IP starts its own count
  });

  it("keeps independent limits per route name for the same IP", async () => {
    const counts: Record<string, number> = {};
    const repository = fakeRateLimitRepository(counts);
    const signupLimiter = createRateLimiter(repository, {
      routeName: "signup",
      maxAttempts: 1,
      windowMs: 1000,
    });
    const loginLimiter = createRateLimiter(repository, {
      routeName: "login",
      maxAttempts: 1,
      windowMs: 1000,
    });
    const next = jest.fn();
    const signupRes = fakeRes();
    const loginRes = fakeRes();

    await signupLimiter(fakeReq("1.2.3.4"), signupRes, next);
    await loginLimiter(fakeReq("1.2.3.4"), loginRes, next);

    expect(signupRes.statusCode).toBe(0);
    expect(loginRes.statusCode).toBe(0);
    expect(counts["signup:1.2.3.4"]).toBe(1);
    expect(counts["login:1.2.3.4"]).toBe(1);
  });
});
