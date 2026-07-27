import type {
  CircuitSnapshot,
  CreateCircuitSnapshotInput,
} from "@ds-simboard/shared-types";
import type { CircuitSnapshotsRepository } from "../repositories/circuitSnapshotsRepository";
import type { ProjectsRepository } from "../repositories/projectsRepository";
import { ForbiddenError, NotFoundError } from "./errors";
import { toCircuitSnapshotDto } from "./mappers";
import { canViewProject } from "./projectsService";

export function createCircuitSnapshotsService(
  circuitSnapshotsRepository: CircuitSnapshotsRepository,
  projectsRepository: ProjectsRepository
) {
  async function findProjectOrThrow(projectId: string) {
    const project = await projectsRepository.findById(projectId);
    if (!project) {
      throw new NotFoundError(`No project with id "${projectId}"`);
    }
    return project;
  }

  return {
    /** Only the project's owner may save a new snapshot to it. */
    async saveSnapshot(
      input: CreateCircuitSnapshotInput,
      requestingUserId: string
    ): Promise<CircuitSnapshot> {
      const project = await findProjectOrThrow(input.projectId);
      if (project.ownerId !== requestingUserId) {
        throw new ForbiddenError("Only the project's owner can save a snapshot to it");
      }
      const row = await circuitSnapshotsRepository.create({
        projectId: input.projectId,
        graph: input.graph,
        sketchCode: input.sketchCode,
      });
      return toCircuitSnapshotDto(row);
    },

    /**
     * Same read-access rule as viewing the project itself (see
     * `canViewProject`/docs/architecture/0011-*.md) — if you can't see
     * the project, you can't see its snapshots either.
     */
    async listSnapshotsForProject(
      projectId: string,
      requestingUserId: string | null
    ): Promise<CircuitSnapshot[]> {
      const project = await findProjectOrThrow(projectId);
      if (!canViewProject(project, requestingUserId)) {
        throw new NotFoundError(`No project with id "${projectId}"`);
      }
      const rows = await circuitSnapshotsRepository.listByProject(projectId);
      return rows.map(toCircuitSnapshotDto);
    },

    async getLatestSnapshot(
      projectId: string,
      requestingUserId: string | null
    ): Promise<CircuitSnapshot | null> {
      const project = await findProjectOrThrow(projectId);
      if (!canViewProject(project, requestingUserId)) {
        throw new NotFoundError(`No project with id "${projectId}"`);
      }
      const row = await circuitSnapshotsRepository.latestForProject(projectId);
      return row ? toCircuitSnapshotDto(row) : null;
    },
  };
}

export type CircuitSnapshotsService = ReturnType<typeof createCircuitSnapshotsService>;
