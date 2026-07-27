import type { CircuitSnapshot, Project, User } from "@ds-simboard/shared-types";
import type { ProjectRow } from "../repositories/projectsRepository";

/**
 * Drizzle returns `Date` objects for timestamp columns; the shared DTOs
 * use ISO strings (the shape an actual JSON API response needs). This is
 * the boundary where that conversion happens, once, rather than each
 * caller needing to know about it.
 */
export function toProjectDto(row: NonNullable<ProjectRow>): Project {
  return {
    id: row.id,
    ownerId: row.ownerId,
    labType: row.labType,
    name: row.name,
    visibility: row.visibility,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

/** Never includes `passwordHash` — that field must never reach an API response. */
export function toUserDto(row: {
  id: string;
  email: string;
  displayName: string | null;
  createdAt: Date;
}): User {
  return {
    id: row.id,
    email: row.email,
    displayName: row.displayName,
    createdAt: row.createdAt.toISOString(),
  };
}

export function toCircuitSnapshotDto(row: {
  id: string;
  projectId: string;
  graph: unknown;
  sketchCode: string | null;
  createdAt: Date;
}): CircuitSnapshot {
  return {
    id: row.id,
    projectId: row.projectId,
    graph: row.graph,
    sketchCode: row.sketchCode,
    createdAt: row.createdAt.toISOString(),
  };
}
