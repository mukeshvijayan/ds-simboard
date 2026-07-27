import { createMigratedTestDatabase } from "../db/testDb";
import { createComponentDefinitionsRepository } from "./componentDefinitionsRepository";

describe("componentDefinitionsRepository", () => {
  it("upserts a new definition and finds it by type", async () => {
    const { db, close } = await createMigratedTestDatabase();
    const repository = createComponentDefinitionsRepository(db);

    await repository.upsert({
      type: "resistor",
      label: "Resistor",
      defaultParams: { resistanceOhms: 220, ratedPowerWatts: 0.25 },
    });

    const found = await repository.findByType("resistor");
    expect(found?.label).toBe("Resistor");
    expect(found?.defaultParams).toEqual({ resistanceOhms: 220, ratedPowerWatts: 0.25 });
    await close();
  });

  it("updates label/defaultParams on a second upsert with the same type, rather than duplicating", async () => {
    const { db, close } = await createMigratedTestDatabase();
    const repository = createComponentDefinitionsRepository(db);

    await repository.upsert({
      type: "led",
      label: "LED",
      defaultParams: { ratedCurrentAmps: 0.02 },
    });
    await repository.upsert({
      type: "led",
      label: "LED (updated)",
      defaultParams: { ratedCurrentAmps: 0.03 },
    });

    const all = await repository.listAll();
    expect(all).toHaveLength(1);
    expect(all[0].label).toBe("LED (updated)");
    await close();
  });

  it("returns null for an unknown type", async () => {
    const { db, close } = await createMigratedTestDatabase();
    const repository = createComponentDefinitionsRepository(db);
    expect(await repository.findByType("does-not-exist")).toBeNull();
    await close();
  });
});
