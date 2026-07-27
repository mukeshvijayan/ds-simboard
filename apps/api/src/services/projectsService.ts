import type { CreateProjectInput, LabType, Project } from "@ds-simboard/shared-types";
import type { ProjectsRepository } from "../repositories/projectsRepository";
import { ForbiddenError, NotFoundError, ValidationError } from "./errors";
import { toProjectDto } from "./mappers";

const MAX_NAME_LENGTH = 120;
const VALID_LAB_TYPES: LabType[] = ["breadboard", "arduino", "esp32"];

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

    async getProject(id: string): Promise<Project> {
      const row = await projectsRepository.findById(id);
      if (!row) {
        throw new NotFoundError(`No project with id "${id}"`);
      }
      return toProjectDto(row);
    },

    async listProjectsForOwner(ownerId: string): Promise<Project[]> {
      const rows = await projectsRepository.listByOwner(ownerId);
      return rows.map(toProjectDto);
    },

    /**
     * Only the owner may delete their project. Full auth (verifying
     * `requestingUserId` is who they claim to be) is spec Phase 9 — this
     * is the authorization check that sits on top of that once it exists.
     */
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
  };
}

export type ProjectsService = ReturnType<typeof createProjectsService>;
