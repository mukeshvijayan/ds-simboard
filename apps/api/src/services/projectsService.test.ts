import { createProjectsService } from "./projectsService";
import type { ProjectsRepository } from "../repositories/projectsRepository";

describe("projectsService.updateVisibility — concurrent deletion", () => {
  it("throws NotFoundError if the project is deleted between the ownership check and the update", async () => {
    // A genuine (if rare) race: another request deletes the project after
    // findById confirms it exists but before updateVisibility runs. Not
    // reproducible on demand through the real HTTP+DB stack, so a fake
    // repository is the only way to exercise this branch.
    const projectsRepository = {
      findById: () =>
        Promise.resolve({
          id: "p1",
          ownerId: "owner-1",
          labType: "breadboard" as const,
          name: "Doomed project",
          visibility: "private" as const,
          createdAt: new Date(),
          updatedAt: new Date(),
        }),
      updateVisibility: () => Promise.resolve(null),
    } as unknown as ProjectsRepository;

    const projectsService = createProjectsService(projectsRepository);

    await expect(
      projectsService.updateVisibility("p1", "owner-1", "public")
    ).rejects.toThrow('No project with id "p1"');
  });
});
