import type { Request, Response } from "express";
import type { AuthService } from "../services/authService";
import { ValidationError } from "../services/errors";
import {
  buildClearedSessionCookie,
  buildSessionCookie,
  readSessionCookie,
  verifySignedSessionId,
} from "../services/sessionCookie";

function handleError(err: unknown, res: Response): void {
  if (err instanceof ValidationError) {
    res.status(400).json({ error: err.message });
  } else {
    res.status(500).json({ error: "Internal server error" });
  }
}

export function createAuthController(authService: AuthService, sessionSecret: string) {
  const isProduction = process.env.NODE_ENV === "production";

  return {
    async signup(req: Request, res: Response) {
      try {
        const { user, sessionId, expiresAt } = await authService.signup(req.body);
        res.setHeader(
          "Set-Cookie",
          buildSessionCookie(sessionId, sessionSecret, expiresAt, isProduction)
        );
        res.status(201).json(user);
      } catch (err) {
        handleError(err, res);
      }
    },

    async login(req: Request, res: Response) {
      try {
        const { user, sessionId, expiresAt } = await authService.login(req.body);
        res.setHeader(
          "Set-Cookie",
          buildSessionCookie(sessionId, sessionSecret, expiresAt, isProduction)
        );
        res.status(200).json(user);
      } catch (err) {
        handleError(err, res);
      }
    },

    async logout(req: Request, res: Response) {
      const sessionId = verifySignedSessionId(
        readSessionCookie(req.headers.cookie),
        sessionSecret
      );
      if (sessionId) {
        await authService.logout(sessionId);
      }
      res.setHeader("Set-Cookie", buildClearedSessionCookie(isProduction));
      res.status(204).send();
    },

    // `requireAuth` runs before this handler and guarantees `req.user` is set.
    async me(req: Request, res: Response) {
      res.status(200).json(req.user);
    },
  };
}
