import type { NextFunction, Request, Response } from "express";
import type { RateLimitRepository } from "../repositories/rateLimitRepository";

export interface RateLimiterOptions {
  /** Distinguishes e.g. `"signup"` from `"login"` so the two endpoints
   * get independent counters per IP, not one shared budget. */
  routeName: string;
  maxAttempts: number;
  windowMs: number;
}

/**
 * Real, per-IP rate limiting for a sensitive auth endpoint — see
 * docs/architecture/0023-*.md. Backed by `RateLimitRepository`'s atomic
 * DB counter rather than an in-memory count, so it actually holds under
 * `apps/api`'s serverless deployment (ADR 0015).
 */
export function createRateLimiter(
  rateLimitRepository: RateLimitRepository,
  options: RateLimiterOptions
) {
  return async function rateLimiter(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    const key = `${options.routeName}:${req.ip}`;
    const row = await rateLimitRepository.recordAttempt(
      key,
      new Date(),
      options.windowMs
    );

    if (row.count > options.maxAttempts) {
      const retryAfterSeconds = Math.max(
        1,
        Math.ceil((row.windowStart.getTime() + options.windowMs - Date.now()) / 1000)
      );
      res.setHeader("Retry-After", retryAfterSeconds.toString());
      res.status(429).json({ error: "Too many attempts. Please try again later." });
      return;
    }

    next();
  };
}
