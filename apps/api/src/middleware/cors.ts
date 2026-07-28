import type { NextFunction, Request, Response } from "express";

/**
 * Real cross-origin support for `apps/web` (P2-5, closing ADR 0029) — it
 * and `apps/api` deploy as two independent Vercel projects with no
 * shared domain (ADR 0015), so a plain same-origin `fetch` never reaches
 * this API at all. Hand-rolled rather than the `cors` npm package: the
 * actual requirement is narrow (one or a few known origins, always with
 * credentials) and doesn't justify a new dependency.
 *
 * `Access-Control-Allow-Origin` can never be `"*"` here — session cookies
 * require `Access-Control-Allow-Credentials: true`, and the CORS spec
 * forbids combining that with a wildcard origin. `allowedOrigins` must
 * therefore be an explicit list, echoing back only a request's `Origin`
 * header when it's actually on that list.
 */
export function createCors(allowedOrigins: readonly string[]) {
  return function cors(req: Request, res: Response, next: NextFunction): void {
    const origin = req.headers.origin;
    if (origin && allowedOrigins.includes(origin)) {
      res.setHeader("Access-Control-Allow-Origin", origin);
      res.setHeader("Access-Control-Allow-Credentials", "true");
      res.setHeader("Vary", "Origin");
    }

    if (req.method === "OPTIONS") {
      res.setHeader("Access-Control-Allow-Methods", "GET,POST,PATCH,DELETE,OPTIONS");
      res.setHeader("Access-Control-Allow-Headers", "Content-Type");
      res.status(204).end();
      return;
    }

    next();
  };
}
