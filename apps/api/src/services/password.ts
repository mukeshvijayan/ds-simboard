import bcrypt from "bcryptjs";

/**
 * bcrypt cost factor. 12 rounds — OWASP's 2023+ guidance floor is 10; 12
 * costs a login roughly ~150-300ms on typical hardware, which is an
 * acceptable trade-off for the extra brute-force resistance. See
 * docs/architecture/0010-*.md.
 */
const COST_FACTOR = 12;

/** Hashes a plaintext password for storage. Never store the plaintext. */
export async function hashPassword(plaintext: string): Promise<string> {
  return bcrypt.hash(plaintext, COST_FACTOR);
}

/** Compares a plaintext password against a stored bcrypt hash. */
export async function verifyPassword(plaintext: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plaintext, hash);
}
