import type {
  CircuitSnapshot,
  CreateCircuitSnapshotInput,
} from "@ds-simboard/shared-types";
import type { CircuitSnapshotsRepository } from "../repositories/circuitSnapshotsRepository";
import type { ProjectsRepository } from "../repositories/projectsRepository";
import { NotFoundError } from "./errors";
import { toCircuitSnapshotDto } from "./mappers";

export function createCircuitSnapshotsService(
  circuitSnapshotsRepository: CircuitSnapshotsRepository,
  projectsRepository: ProjectsRepository
) {
  return {
    /**
     * Verifies the project exists before saving — a clearer error than
     * letting the database's foreign-key constraint reject it.
     */
    async saveSnapshot(input: CreateCircuitSnapshotInput): Promise<CircuitSnapshot> {
      const project = await projectsRepository.findById(input.projectId);
      if (!project) {
        throw new NotFoundError(`No project with id "${input.projectId}"`);
      }
      const row = await circuitSnapshotsRepository.create({
        projectId: input.projectId,
        graph: input.graph,
        sketchCode: input.sketchCode,
      });
      return toCircuitSnapshotDto(row);
    },

    async listSnapshotsForProject(projectId: string): Promise<CircuitSnapshot[]> {
      const rows = await circuitSnapshotsRepository.listByProject(projectId);
      return rows.map(toCircuitSnapshotDto);
    },

    async getLatestSnapshot(projectId: string): Promise<CircuitSnapshot | null> {
      const row = await circuitSnapshotsRepository.latestForProject(projectId);
      return row ? toCircuitSnapshotDto(row) : null;
    },
  };
}

export type CircuitSnapshotsService = ReturnType<typeof createCircuitSnapshotsService>;
