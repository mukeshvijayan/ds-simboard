import { ValidationError } from "./errors";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Trims and lowercases an email, throwing if it doesn't look like an email. */
export function parseEmail(rawEmail: string): string {
  const email = rawEmail.trim().toLowerCase();
  if (!EMAIL_PATTERN.test(email)) {
    throw new ValidationError(`"${rawEmail}" is not a valid email address`);
  }
  return email;
}
