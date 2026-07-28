import type {
  CreateProjectInput,
  LabType,
  Project,
  ProjectVisibility,
} from "@ds-simboard/shared-types";
import type { ProjectRow, ProjectsRepository } from "../repositories/projectsRepository";
import { ForbiddenError, NotFoundError, ValidationError } from "./errors";
import { toProjectDto } from "./mappers";

const MAX_NAME_LENGTH = 120;
const VALID_LAB_TYPES: LabType[] = ["breadboard", "arduino", "esp32"];
const VALID_VISIBILITIES: ProjectVisibility[] = ["private", "unlisted", "public"];

function validateName(name: string): string {
  const trimmed = name.trim();
  if (trimmed.length === 0) {
    throw new ValidationError("Project name cannot be empty");
  }
  if (trimmed.length > MAX_NAME_LENGTH) {
    throw new ValidationError(
      `Project name must be ${MAX_NAME_LENGTH} characters or fewer`
    );
  }
  return trimmed;
}

/**
 * The read-access rule behind sharing links (see docs/architecture/0011-*.md):
 * a `private` project is visible only to its owner; `unlisted`/`public`
 * are visible to anyone, including an anonymous (unauthenticated) caller.
 * This never grants *write* access — that's always ownership-only,
 * checked separately.
 */
export function canViewProject(
  project: NonNullable<ProjectRow>,
  requestingUserId: string | null | undefined
): boolean {
  return project.visibility !== "private" || project.ownerId === requestingUserId;
}

export function createProjectsService(projectsRepository: ProjectsRepository) {
  return {
    async createProject(input: CreateProjectInput): Promise<Project> {
      if (!VALID_LAB_TYPES.includes(input.labType)) {
        throw new ValidationError(
          `labType must be one of: ${VALID_LAB_TYPES.join(", ")}`
        );
      }
      const name = validateName(input.name);
      const row = await projectsRepository.create({
        ownerId: input.ownerId,
        labType: input.labType,
        name,
        visibility: input.visibility,
      });
      return toProjectDto(row);
    },

    /**
     * `requestingUserId` is `null` for an anonymous caller. A private
     * project a non-owner (or nobody) requests reports 404, not 403 — a
     * 403 would confirm the project exists, leaking its existence to
     * someone who isn't allowed to know that.
     */
    async getProject(id: string, requestingUserId: string | null): Promise<Project> {
      const row = await projectsRepository.findById(id);
      if (!row || !canViewProject(row, requestingUserId)) {
        throw new NotFoundError(`No project with id "${id}"`);
      }
      return toProjectDto(row);
    },

    async listProjectsForOwner(ownerId: string): Promise<Project[]> {
      const rows = await projectsRepository.listByOwner(ownerId);
      return rows.map(toProjectDto);
    },

    /** Only the project's owner may delete it. */
    async deleteProject(id: string, requestingUserId: string): Promise<void> {
      const row = await projectsRepository.findById(id);
      if (!row) {
        throw new NotFoundError(`No project with id "${id}"`);
      }
      if (row.ownerId !== requestingUserId) {
        throw new ForbiddenError("Only the project's owner can delete it");
      }
      await projectsRepository.remove(id);
    },

    /**
     * Only the owner may rename a project or change its visibility —
     * changing either is an explicit action, never implicit (same
     * reasoning as visibility alone, see docs/architecture/0011-*.md).
     * A single generalized method rather than one per field (P2-5, ADR
     * 0029) — `patch` only carries whichever field the caller actually
     * wants to change, and at least one of the two is required.
     */
    async updateProject(
      id: string,
      requestingUserId: string,
      patch: { name?: string; visibility?: ProjectVisibility }
    ): Promise<Project> {
      if (patch.name === undefined && patch.visibility === undefined) {
        throw new ValidationError("Provide a name or visibility to update");
      }
      if (
        patch.visibility !== undefined &&
        !VALID_VISIBILITIES.includes(patch.visibility)
      ) {
        throw new ValidationError(
          `visibility must be one of: ${VALID_VISIBILITIES.join(", ")}`
        );
      }
      const name = patch.name !== undefined ? validateName(patch.name) : undefined;

      const row = await projectsRepository.findById(id);
      if (!row) {
        throw new NotFoundError(`No project with id "${id}"`);
      }
      if (row.ownerId !== requestingUserId) {
        throw new ForbiddenError("Only the project's owner can update it");
      }
      const updated = await projectsRepository.update(id, {
        ...(name !== undefined ? { name } : {}),
        ...(patch.visibility !== undefined ? { visibility: patch.visibility } : {}),
      });
      if (!updated) {
        // Deleted by another request between the findById above and this
        // update — a genuine (if rare) race, not a scenario worth a
        // different error shape than "the project isn't there".
        throw new NotFoundError(`No project with id "${id}"`);
      }
      return toProjectDto(updated);
    },
  };
}

export type ProjectsService = ReturnType<typeof createProjectsService>;
