import { createProjectsService } from "./projectsService";
import type { ProjectsRepository } from "../repositories/projectsRepository";

describe("projectsService.updateProject — concurrent deletion", () => {
  it("throws NotFoundError if the project is deleted between the ownership check and the update", async () => {
    // A genuine (if rare) race: another request deletes the project after
    // findById confirms it exists but before update runs. Not
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
      update: () => Promise.resolve(null),
    } as unknown as ProjectsRepository;

    const projectsService = createProjectsService(projectsRepository);

    await expect(
      projectsService.updateProject("p1", "owner-1", { visibility: "public" })
    ).rejects.toThrow('No project with id "p1"');
  });
});

describe("projectsService.updateProject — validation", () => {
  it("throws ValidationError when neither name nor visibility is provided", async () => {
    const projectsService = createProjectsService({} as ProjectsRepository);
    await expect(projectsService.updateProject("p1", "owner-1", {})).rejects.toThrow(
      "Provide a name or visibility to update"
    );
  });
});
