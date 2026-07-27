/**
 * Deliberately minimal — no password/session fields. Spec Phase 9 (Auth
 * & accounts) decides how authentication is handled; that's a real
 * security/privacy decision the user asked to make directly, not
 * preempted by this schema (see docs/architecture/0009-*.md).
 */
export interface User {
  id: string;
  email: string;
  displayName: string | null;
  createdAt: string;
}
