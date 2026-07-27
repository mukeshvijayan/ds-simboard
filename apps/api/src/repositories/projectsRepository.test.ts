import { createMigratedTestDatabase } from "../db/testDb";
import { createProjectsRepository } from "./projectsRepository";

describe("projectsRepository.updateVisibility", () => {
  it("returns null when the project doesn't exist", async () => {
    const { db, close } = await createMigratedTestDatabase();
    const repository = createProjectsRepository(db);

    const result = await repository.updateVisibility(
      "00000000-0000-0000-0000-000000000000",
      "public"
    );

    expect(result).toBeNull();
    await close();
  });
});
