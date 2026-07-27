import type { NextFunction, Request, Response } from "express";
import type { AuthService } from "../services/authService";
import { readSessionCookie, verifySignedSessionId } from "../services/sessionCookie";

async function resolveUser(
  req: Request,
  authService: AuthService,
  sessionSecret: string
) {
  const cookieValue = readSessionCookie(req.headers.cookie);
  const sessionId = verifySignedSessionId(cookieValue, sessionSecret);
  if (!sessionId) {
    return null;
  }
  return authService.getUserForSession(sessionId);
}

/**
 * Attaches `req.user` when a valid session cookie is present, but never
 * rejects the request — for routes where anonymous access is allowed
 * (e.g. viewing an unlisted/public project) but the response still needs
 * to know *who*, if anyone, is asking.
 */
export function createOptionalAuth(authService: AuthService, sessionSecret: string) {
  return async function optionalAuth(
    req: Request,
    _res: Response,
    next: NextFunction
  ): Promise<void> {
    const user = await resolveUser(req, authService, sessionSecret);
    req.user = user ?? undefined;
    next();
  };
}

/** Like optionalAuth, but responds 401 if there's no valid session. */
export function createRequireAuth(authService: AuthService, sessionSecret: string) {
  return async function requireAuth(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    const user = await resolveUser(req, authService, sessionSecret);
    if (!user) {
      res.status(401).json({ error: "Authentication required" });
      return;
    }
    req.user = user;
    next();
  };
}
