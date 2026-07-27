import { jsonb, pgEnum, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

/** Spec Part 3's three progressive labs. */
export const labTypeEnum = pgEnum("lab_type", ["breadboard", "arduino", "esp32"]);

/** Sharing *permissions* are Phase 9 work — this is just the stored value. */
export const projectVisibilityEnum = pgEnum("project_visibility", [
  "private",
  "unlisted",
  "public",
]);

/**
 * Deliberately minimal — no password/session columns yet. See
 * docs/architecture/0009-*.md: authentication is spec Phase 9, a decision
 * the user asked to make directly rather than have preempted here.
 */
export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: text("email").notNull().unique(),
  displayName: text("display_name"),
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
