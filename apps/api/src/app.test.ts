import request from "supertest";
import { createApp } from "./app";
import { createMigratedTestDatabase } from "./db/testDb";

async function setup() {
  const { db, close } = await createMigratedTestDatabase();
  const app = createApp(db);
  const userRes = await request(app)
    .post("/users")
    .send({ email: `${Date.now()}-${Math.random()}@example.com` });
  return { app, close, userId: userRes.body.id as string };
}

describe("GET /health", () => {
  it("responds ok", async () => {
    const { app, close } = await setup();
    const res = await request(app).get("/health");
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: "ok" });
    await close();
  });
});

describe("POST /projects", () => {
  it("creates a project", async () => {
    const { app, close, userId } = await setup();
    const res = await request(app)
      .post("/projects")
      .send({ ownerId: userId, labType: "breadboard", name: "My first circuit" });

    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({
      ownerId: userId,
      labType: "breadboard",
      name: "My first circuit",
      visibility: "private",
    });
    expect(typeof res.body.id).toBe("string");
    await close();
  });

  it("rejects an empty name with 400", async () => {
    const { app, close, userId } = await setup();
    const res = await request(app)
      .post("/projects")
      .send({ ownerId: userId, labType: "breadboard", name: "   " });
    expect(res.status).toBe(400);
    await close();
  });

  it("rejects a name longer than 120 characters with 400", async () => {
    const { app, close, userId } = await setup();
    const res = await request(app)
      .post("/projects")
      .send({ ownerId: userId, labType: "breadboard", name: "x".repeat(121) });
    expect(res.status).toBe(400);
    await close();
  });

  it("rejects an invalid labType with 400", async () => {
    const { app, close, userId } = await setup();
    const res = await request(app)
      .post("/projects")
      .send({ ownerId: userId, labType: "commodore64", name: "Retro" });
    expect(res.status).toBe(400);
    await close();
  });

  it("returns 500 for a nonexistent owner (a real DB foreign-key failure surfacing as a 500, not a crash)", async () => {
    const { app, close } = await setup();
    const res = await request(app).post("/projects").send({
      ownerId: "00000000-0000-0000-0000-000000000000",
      labType: "arduino",
      name: "Orphan",
    });
    expect(res.status).toBe(500);
    await close();
  });
});

describe("GET /projects/:id and GET /projects?ownerId=", () => {
  it("fetches a project by id", async () => {
    const { app, close, userId } = await setup();
    const created = await request(app)
      .post("/projects")
      .send({ ownerId: userId, labType: "arduino", name: "Blink" });

    const res = await request(app).get(`/projects/${created.body.id}`);
    expect(res.status).toBe(200);
    expect(res.body.name).toBe("Blink");
    await close();
  });

  it("returns 404 for an unknown id", async () => {
    const { app, close } = await setup();
    const res = await request(app).get("/projects/00000000-0000-0000-0000-000000000000");
    expect(res.status).toBe(404);
    await close();
  });

  it("lists every project for an owner", async () => {
    const { app, close, userId } = await setup();
    await request(app)
      .post("/projects")
      .send({ ownerId: userId, labType: "esp32", name: "One" });
    await request(app)
      .post("/projects")
      .send({ ownerId: userId, labType: "esp32", name: "Two" });

    const res = await request(app).get(`/projects?ownerId=${userId}`);
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(2);
    await close();
  });

  it("requires the ownerId query parameter", async () => {
    const { app, close } = await setup();
    const res = await request(app).get("/projects");
    expect(res.status).toBe(400);
    await close();
  });
});

describe("DELETE /projects/:id", () => {
  it("deletes a project when the requester is the owner", async () => {
    const { app, close, userId } = await setup();
    const created = await request(app)
      .post("/projects")
      .send({ ownerId: userId, labType: "breadboard", name: "To delete" });

    const res = await request(app)
      .delete(`/projects/${created.body.id}`)
      .send({ requestingUserId: userId });
    expect(res.status).toBe(204);

    const getRes = await request(app).get(`/projects/${created.body.id}`);
    expect(getRes.status).toBe(404);
    await close();
  });

  it("refuses to delete on behalf of a different user", async () => {
    const { app, close, userId } = await setup();
    const created = await request(app)
      .post("/projects")
      .send({ ownerId: userId, labType: "breadboard", name: "Not yours" });

    const res = await request(app)
      .delete(`/projects/${created.body.id}`)
      .send({ requestingUserId: "00000000-0000-0000-0000-000000000000" });
    expect(res.status).toBe(403);
    await close();
  });

  it("requires requestingUserId in the body", async () => {
    const { app, close, userId } = await setup();
    const created = await request(app)
      .post("/projects")
      .send({ ownerId: userId, labType: "breadboard", name: "No requester" });

    const res = await request(app).delete(`/projects/${created.body.id}`).send({});
    expect(res.status).toBe(400);
    await close();
  });

  it("requires requestingUserId when no request body is sent at all", async () => {
    const { app, close, userId } = await setup();
    const created = await request(app)
      .post("/projects")
      .send({ ownerId: userId, labType: "breadboard", name: "No body sent" });

    const res = await request(app).delete(`/projects/${created.body.id}`);
    expect(res.status).toBe(400);
    await close();
  });

  it("404s deleting an unknown project", async () => {
    const { app, close, userId } = await setup();
    const res = await request(app)
      .delete("/projects/00000000-0000-0000-0000-000000000000")
      .send({ requestingUserId: userId });
    expect(res.status).toBe(404);
    await close();
  });
});

describe("circuit snapshots", () => {
  it("saves and retrieves snapshots for a project, newest first", async () => {
    const { app, close, userId } = await setup();
    const project = await request(app)
      .post("/projects")
      .send({ ownerId: userId, labType: "breadboard", name: "Snapshot test" });
    const projectId = project.body.id;

    await request(app)
      .post(`/projects/${projectId}/snapshots`)
      .send({ graph: { version: 1 } });
    await new Promise((r) => setTimeout(r, 5)); // ensure a distinct createdAt ordering
    const second = await request(app)
      .post(`/projects/${projectId}/snapshots`)
      .send({ graph: { version: 2 }, sketchCode: "void setup() {}" });

    expect(second.status).toBe(201);

    const list = await request(app).get(`/projects/${projectId}/snapshots`);
    expect(list.status).toBe(200);
    expect(list.body).toHaveLength(2);
    expect(list.body[0].graph).toEqual({ version: 2 }); // newest first

    const latest = await request(app).get(`/projects/${projectId}/snapshots/latest`);
    expect(latest.status).toBe(200);
    expect(latest.body.graph).toEqual({ version: 2 });
    await close();
  });

  it("500s saving a snapshot with no request body at all (graph is required)", async () => {
    const { app, close, userId } = await setup();
    const project = await request(app)
      .post("/projects")
      .send({ ownerId: userId, labType: "breadboard", name: "No body sent" });

    const res = await request(app).post(`/projects/${project.body.id}/snapshots`);
    expect(res.status).toBe(500);
    await close();
  });

  it("404s saving a snapshot against a nonexistent project", async () => {
    const { app, close } = await setup();
    const res = await request(app)
      .post("/projects/00000000-0000-0000-0000-000000000000/snapshots")
      .send({ graph: {} });
    expect(res.status).toBe(404);
    await close();
  });

  it("404s fetching the latest snapshot when there are none yet", async () => {
    const { app, close, userId } = await setup();
    const project = await request(app)
      .post("/projects")
      .send({ ownerId: userId, labType: "breadboard", name: "No snapshots yet" });

    const res = await request(app).get(`/projects/${project.body.id}/snapshots/latest`);
    expect(res.status).toBe(404);
    await close();
  });
});

describe("component definitions", () => {
  it("lists the catalog", async () => {
    const { app, close } = await setup();
    const seed = await request(app).get("/component-definitions");
    expect(seed.status).toBe(200);
    expect(seed.body).toEqual([]);
    await close();
  });
});

describe("POST /users and GET /users/:id", () => {
  it("creates a user, lowercasing the email", async () => {
    const { app, close } = await setup();
    const res = await request(app).post("/users").send({ email: "Person@Example.com" });
    expect(res.status).toBe(201);
    expect(res.body.email).toBe("person@example.com");
    expect(res.body.displayName).toBeNull();
    await close();
  });

  it("stores a provided displayName", async () => {
    const { app, close } = await setup();
    const res = await request(app)
      .post("/users")
      .send({ email: "named@example.com", displayName: "Ada Lovelace" });
    expect(res.status).toBe(201);
    expect(res.body.displayName).toBe("Ada Lovelace");
    await close();
  });

  it("rejects a malformed email", async () => {
    const { app, close } = await setup();
    const res = await request(app).post("/users").send({ email: "not-an-email" });
    expect(res.status).toBe(400);
    await close();
  });

  it("rejects a duplicate email", async () => {
    const { app, close } = await setup();
    await request(app).post("/users").send({ email: "same@example.com" });
    const res = await request(app).post("/users").send({ email: "same@example.com" });
    expect(res.status).toBe(400);
    await close();
  });

  it("fetches a user by id", async () => {
    const { app, close, userId } = await setup();
    const res = await request(app).get(`/users/${userId}`);
    expect(res.status).toBe(200);
    expect(res.body.id).toBe(userId);
    await close();
  });

  it("404s for an unknown user id", async () => {
    const { app, close } = await setup();
    const res = await request(app).get("/users/00000000-0000-0000-0000-000000000000");
    expect(res.status).toBe(404);
    await close();
  });
});
