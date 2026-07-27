import { createHmac, timingSafeEqual } from "node:crypto";
import { parse, serialize } from "cookie";

/** Name of the cookie that carries the signed session id. */
export const SESSION_COOKIE_NAME = "ds_simboard_session";

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

function sign(sessionId: string, secret: string): string {
  return createHmac("sha256", secret).update(sessionId).digest("base64url");
}

/**
 * Combines a session id with an HMAC-SHA256 signature (`id.signature`) so
 * the cookie can be verified without a database round-trip and can't be
 * forged or tampered with unless `secret` (SESSION_SECRET) leaks. See
 * docs/architecture/0010-*.md for why this is a custom signed cookie
 * rather than a JWT (revocable via the `sessions` table) or
 * `express-session` (no extra dependency for something this small).
 */
export function signSessionId(sessionId: string, secret: string): string {
  return `${sessionId}.${sign(sessionId, secret)}`;
}

/**
 * Verifies a signed cookie value and returns the session id if — and only
 * if — the signature matches. Uses a constant-time comparison so response
 * timing can't be used to guess a valid signature byte-by-byte.
 */
export function verifySignedSessionId(
  cookieValue: string | undefined,
  secret: string
): string | null {
  if (!cookieValue) {
    return null;
  }
  const separatorIndex = cookieValue.lastIndexOf(".");
  if (separatorIndex === -1) {
    return null;
  }
  const sessionId = cookieValue.slice(0, separatorIndex);
  const providedSignature = cookieValue.slice(separatorIndex + 1);
  const expectedSignature = sign(sessionId, secret);

  const provided = Buffer.from(providedSignature);
  const expected = Buffer.from(expectedSignature);
  if (provided.length !== expected.length || !timingSafeEqual(provided, expected)) {
    return null;
  }
  return sessionId;
}

/** Reads the raw (still-signed) session cookie value out of a `Cookie` header. */
export function readSessionCookie(cookieHeader: string | undefined): string | undefined {
  if (!cookieHeader) {
    return undefined;
  }
  return parse(cookieHeader)[SESSION_COOKIE_NAME];
}

/**
 * Builds the `Set-Cookie` header value for a new session.
 * `httpOnly` blocks JS access (XSS can't read/steal it); `sameSite: lax`
 * stops it being sent on cross-site POSTs (CSRF) while still allowing a
 * shared project link to work when clicked from elsewhere; `secure` is
 * only enabled outside development, since local dev/test runs over plain
 * HTTP.
 */
export function buildSessionCookie(
  sessionId: string,
  secret: string,
  expiresAt: Date,
  isProduction: boolean
): string {
  return serialize(SESSION_COOKIE_NAME, signSessionId(sessionId, secret), {
    httpOnly: true,
    sameSite: "lax",
    secure: isProduction,
    path: "/",
    expires: expiresAt,
  });
}

/** Builds the `Set-Cookie` header value that clears the session cookie on logout. */
export function buildClearedSessionCookie(isProduction: boolean): string {
  return serialize(SESSION_COOKIE_NAME, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: isProduction,
    path: "/",
    maxAge: 0,
  });
}

/** A new session's expiry, measured from now. Fixed-length, not sliding — see docs/architecture/0010-*.md. */
export function sessionExpiryFromNow(): Date {
  return new Date(Date.now() + SEVEN_DAYS_MS);
}
