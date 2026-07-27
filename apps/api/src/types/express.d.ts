import type { User } from "@ds-simboard/shared-types";

declare global {
  namespace Express {
    interface Request {
      /** Set by requireAuth/optionalAuth once the session cookie is verified. */
      user?: User;
    }
  }
}

export {};
