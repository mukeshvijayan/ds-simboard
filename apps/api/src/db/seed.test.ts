import { createComponentDefinitionsRepository } from "../repositories/componentDefinitionsRepository";
import { createMigratedTestDatabase } from "./testDb";
import { seedComponentDefinitions } from "./seed";

describe("seedComponentDefinitions", () => {
  it("seeds all 7 component-library component types", async () => {
    const { db, close } = await createMigratedTestDatabase();
    const repository = createComponentDefinitionsRepository(db);

    await seedComponentDefinitions(repository);

    const all = await repository.listAll();
    expect(all.map((c) => c.type).sort()).toEqual(
      [
        "capacitor",
        "diode",
        "led",
        "potentiometer",
        "pushbutton",
        "resistor",
        "transistor",
      ].sort()
    );
    await close();
  });

  it("is idempotent — running it twice doesn't duplicate rows", async () => {
    const { db, close } = await createMigratedTestDatabase();
    const repository = createComponentDefinitionsRepository(db);

    await seedComponentDefinitions(repository);
    await seedComponentDefinitions(repository);

    const all = await repository.listAll();
    expect(all).toHaveLength(7);
    await close();
  });
});
