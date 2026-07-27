import type { User } from "@ds-simboard/shared-types";
import type { UsersRepository } from "../repositories/usersRepository";
import type { SessionsRepository } from "../repositories/sessionsRepository";
import { ValidationError } from "./errors";
import { toUserDto } from "./mappers";
import { hashPassword, verifyPassword } from "./password";
import { sessionExpiryFromNow } from "./sessionCookie";
import { parseEmail } from "./validators";

const MIN_PASSWORD_LENGTH = 8;

/**
 * Deliberately vague error message for both "no such account" and "wrong
 * password" — a precise message ("no account with that email") would let
 * an attacker enumerate which emails have accounts.
 */
const INVALID_CREDENTIALS_MESSAGE = "Invalid email or password";

export interface AuthResult {
  user: User;
  sessionId: string;
  expiresAt: Date;
}

function validatePassword(password: string): void {
  if (password.length < MIN_PASSWORD_LENGTH) {
    throw new ValidationError(
      `Password must be at least ${MIN_PASSWORD_LENGTH} characters`
    );
  }
}

/**
 * Signup, login, logout, and session lookup — the only way `users` rows
 * get created now that every account requires a password. See
 * docs/architecture/0010-*.md.
 */
export function createAuthService(
  usersRepository: UsersRepository,
  sessionsRepository: SessionsRepository
) {
  async function createSession(userId: string) {
    const expiresAt = sessionExpiryFromNow();
    const session = await sessionsRepository.create({ userId, expiresAt });
    return { sessionId: session.id, expiresAt: session.expiresAt };
  }

  return {
    async signup(input: {
      email: string;
      password: string;
      displayName?: string | null;
    }): Promise<AuthResult> {
      const email = parseEmail(input.email);
      validatePassword(input.password);

      const existing = await usersRepository.findByEmail(email);
      if (existing) {
        throw new ValidationError(`An account with email "${email}" already exists`);
      }

      const passwordHash = await hashPassword(input.password);
      const row = await usersRepository.create({
        email,
        passwordHash,
        displayName: input.displayName ?? null,
      });
      const { sessionId, expiresAt } = await createSession(row.id);
      return { user: toUserDto(row), sessionId, expiresAt };
    },

    async login(input: { email: string; password: string }): Promise<AuthResult> {
      const email = input.email.trim().toLowerCase();
      const row = await usersRepository.findByEmail(email);
      if (!row) {
        throw new ValidationError(INVALID_CREDENTIALS_MESSAGE);
      }
      const passwordMatches = await verifyPassword(input.password, row.passwordHash);
      if (!passwordMatches) {
        throw new ValidationError(INVALID_CREDENTIALS_MESSAGE);
      }
      const { sessionId, expiresAt } = await createSession(row.id);
      return { user: toUserDto(row), sessionId, expiresAt };
    },

    async logout(sessionId: string): Promise<void> {
      await sessionsRepository.remove(sessionId);
    },

    /**
     * Resolves a session id (already signature-verified by the caller)
     * to its user, or `null` if the session doesn't exist or has expired.
     * Expired sessions aren't proactively deleted here — they're just
     * treated as invalid; see docs/architecture/0010-*.md for why
     * background cleanup is deferred rather than built speculatively.
     */
    async getUserForSession(sessionId: string): Promise<User | null> {
      const session = await sessionsRepository.findById(sessionId);
      if (!session || session.expiresAt.getTime() <= Date.now()) {
        return null;
      }
      // `sessions.userId` has an `onDelete: cascade` FK to `users` (and
      // there's no account-deletion endpoint yet), so a session can only
      // exist while its user does — this can't come back null.
      const user = await usersRepository.findById(session.userId);
      return toUserDto(user!);
    },
  };
}

export type AuthService = ReturnType<typeof createAuthService>;
