/** Which lab a project belongs to — spec Part 3's three progressive labs. */
export type LabType = "breadboard" | "arduino" | "esp32";

/**
 * Who can see a project. `private` (the default): only the owner.
 * `unlisted`/`public`: anyone with the project's link can view it
 * read-only — link-based access never grants write access; only the
 * authenticated owner can rename/delete/save a snapshot/change
 * visibility. See docs/architecture/0011-*.md.
 */
export type ProjectVisibility = "private" | "unlisted" | "public";

export interface Project {
  id: string;
  ownerId: string;
  labType: LabType;
  name: string;
  visibility: ProjectVisibility;
  createdAt: string;
  updatedAt: string;
}

/** Shape needed to create a project — server assigns id/timestamps. */
export interface CreateProjectInput {
  ownerId: string;
  labType: LabType;
  name: string;
  visibility?: ProjectVisibility;
}
