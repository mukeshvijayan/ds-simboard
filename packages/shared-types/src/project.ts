/** Which lab a project belongs to — spec Part 3's three progressive labs. */
export type LabType = "breadboard" | "arduino" | "esp32";

/**
 * Who can see a project. Sharing *permissions* (read-only vs. editable
 * links) are spec Phase 9 (Auth & accounts) work — this is just the
 * stored visibility, not the access-control logic built on top of it.
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
