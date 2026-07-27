import { eq } from "drizzle-orm";
import { createMigratedTestDatabase } from "./testDb";
import { circuitSnapshots, componentDefinitions, projects, users } from "./schema";

describe("schema migrations — applied against a real (embedded) Postgres", () => {
  let close: () => Promise<void>;

  afterEach(async () => {
    await close();
  });

  it("creates all four tables with working constraints", async () => {
    const { db, close: closeDb } = await createMigratedTestDatabase();
    close = closeDb;

    const [user] = await db
      .insert(users)
      .values({ email: "a@example.com", passwordHash: "hash" })
      .returning();
    expect(user.id).toBeDefined();
    expect(user.createdAt).toBeInstanceOf(Date);

    const [project] = await db
      .insert(projects)
      .values({ ownerId: user.id, labType: "breadboard", name: "My circuit" })
      .returning();
    expect(project.visibility).toBe("private"); // default applied

    const [snapshot] = await db
      .insert(circuitSnapshots)
      .values({ projectId: project.id, graph: { components: [] } })
      .returning();
    expect(snapshot.graph).toEqual({ components: [] });

    const [definition] = await db
      .insert(componentDefinitions)
      .values({
        type: "resistor",
        label: "Resistor",
        defaultParams: { resistanceOhms: 220 },
      })
      .returning();
    expect(definition.type).toBe("resistor");
  });

  it("enforces the email unique constraint", async () => {
    const { db, close: closeDb } = await createMigratedTestDatabase();
    close = closeDb;
    await db.insert(users).values({ email: "dup@example.com", passwordHash: "hash" });
    await expect(
      db.insert(users).values({ email: "dup@example.com", passwordHash: "hash" })
    ).rejects.toThrow();
  });

  it("enforces the component_definitions type unique constraint", async () => {
    const { db, close: closeDb } = await createMigratedTestDatabase();
    close = closeDb;
    await db
      .insert(componentDefinitions)
      .values({ type: "led", label: "LED", defaultParams: {} });
    await expect(
      db
        .insert(componentDefinitions)
        .values({ type: "led", label: "LED (dup)", defaultParams: {} })
    ).rejects.toThrow();
  });

  it("enforces the projects.owner_id foreign key", async () => {
    const { db, close: closeDb } = await createMigratedTestDatabase();
    close = closeDb;
    await expect(
      db.insert(projects).values({
        ownerId: "00000000-0000-0000-0000-000000000000",
        labType: "arduino",
        name: "Orphan project",
      })
    ).rejects.toThrow();
  });

  it("cascades project deletion to its circuit snapshots", async () => {
    const { db, close: closeDb } = await createMigratedTestDatabase();
    close = closeDb;
    const [user] = await db
      .insert(users)
      .values({ email: "cascade@example.com", passwordHash: "hash" })
      .returning();
    const [project] = await db
      .insert(projects)
      .values({ ownerId: user.id, labType: "esp32", name: "Cascade test" })
      .returning();
    await db.insert(circuitSnapshots).values({ projectId: project.id, graph: {} });

    await db.delete(projects).where(eq(projects.id, project.id));

    const remaining = await db
      .select()
      .from(circuitSnapshots)
      .where(eq(circuitSnapshots.projectId, project.id));
    expect(remaining).toHaveLength(0);
  });
});
