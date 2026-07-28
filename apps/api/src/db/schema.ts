import {
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

/** Spec Part 3's three progressive labs. */
export const labTypeEnum = pgEnum("lab_type", ["breadboard", "arduino", "esp32"]);

/** Sharing *permissions* are Phase 9 work — this is just the stored value. */
export const projectVisibilityEnum = pgEnum("project_visibility", [
  "private",
  "unlisted",
  "public",
]);

/**
 * Password auth landed in Phase 9 (see docs/architecture/0010-*.md).
 * `passwordHash` is a bcrypt hash, never the plaintext password.
 */
export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: text("email").notNull().unique(),
  displayName: text("display_name"),
  passwordHash: text("password_hash").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

/**
 * One row per logged-in session (not per-user) — a user can be logged in
 * from multiple browsers/devices at once, and each needs its own
 * expiry/revocation, so the session's fields belong on their own row
 * rather than on `users`. See docs/architecture/0010-*.md. The session
 * cookie holds a signed reference to `id`; this table is what makes
 * logout and expiry actually enforceable server-side (unlike a bare JWT).
 */
export const sessions = pgTable("sessions", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const projects = pgTable("projects", {
  id: uuid("id").primaryKey().defaultRandom(),
  ownerId: uuid("owner_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  labType: labTypeEnum("lab_type").notNull(),
  name: text("name").notNull(),
  visibility: projectVisibilityEnum("visibility").notNull().default("private"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

/**
 * Versioned save points for a project — spec Part 4: "versioned so 'undo
 * history' and 'save points' are just rows." `graph`'s actual shape
 * depends on `labType` and isn't validated at the schema level — see
 * `@ds-simboard/shared-types`'s `CircuitSnapshot` doc comment.
 */
export const circuitSnapshots = pgTable("circuit_snapshots", {
  id: uuid("id").primaryKey().defaultRandom(),
  projectId: uuid("project_id")
    .notNull()
    .references(() => projects.id, { onDelete: "cascade" }),
  graph: jsonb("graph").notNull(),
  sketchCode: text("sketch_code"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

/**
 * Seed/catalog data for the component palette — spec Part 4: "adding a
 * component is a data change, not always a code change."
 */
export const componentDefinitions = pgTable("component_definitions", {
  id: uuid("id").primaryKey().defaultRandom(),
  type: text("type").notNull().unique(),
  label: text("label").notNull(),
  defaultParams: jsonb("default_params").notNull(),
});

/**
 * Fixed-window rate-limit counters for `/auth/signup` and `/auth/login`
 * (see docs/architecture/0023-*.md). One row per `key` (e.g.
 * `"login:203.0.113.5"`) — a shared, persistent counter rather than an
 * in-memory one, since `apps/api` runs as Vercel serverless functions
 * (ADR 0015): many concurrent instances with no shared memory, so an
 * in-memory counter would let each cold-started instance reset its own
 * count, defeating the limit entirely.
 */
export const authRateLimitAttempts = pgTable("auth_rate_limit_attempts", {
  id: uuid("id").primaryKey().defaultRandom(),
  key: text("key").notNull().unique(),
  windowStart: timestamp("window_start", { withTimezone: true }).notNull(),
  count: integer("count").notNull(),
});
