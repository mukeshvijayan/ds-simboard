import request from "supertest";
import { createApp } from "./app";
import { createMigratedTestDatabase } from "./db/testDb";

const TEST_SESSION_SECRET = "test-only-session-secret-do-not-use-in-production";

async function setup() {
  const { db, close } = await createMigratedTestDatabase();
  const app = createApp(db, TEST_SESSION_SECRET);
  const agent = request.agent(app);
  const email = `${Date.now()}-${Math.random()}@example.com`;
  const signupRes = await agent
    .post("/auth/signup")
    .send({ email, password: "correct horse battery staple" });
  return { app, agent, close, userId: signupRes.body.id as string, email };
}

/**
 * For cross-user authorization tests: two logged-in agents against the
 * *same* app/database. Two separate `setup()` calls would each spin up
 * their own isolated pglite instance — "user B can't touch user A's
 * project" would then pass vacuously (B's database never had A's project
 * in it at all, not because authorization actually blocked it).
 */
async function setupTwoUsers() {
  const { db, close } = await createMigratedTestDatabase();
  const app = createApp(db, TEST_SESSION_SECRET);
  const ownerAgent = request.agent(app);
  const otherAgent = request.agent(app);
  const ownerRes = await ownerAgent.post("/auth/signup").send({
    email: `owner-${Date.now()}-${Math.random()}@example.com`,
    password: "correct horse battery staple",
  });
  await otherAgent.post("/auth/signup").send({
    email: `other-${Date.now()}-${Math.random()}@example.com`,
    password: "correct horse battery staple",
  });
  return { app, ownerAgent, otherAgent, close, ownerId: ownerRes.body.id as string };
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

describe("auth", () => {
  it("signs up, returning the user (never a password hash) and setting a session cookie", async () => {
    const { db, close } = await createMigratedTestDatabase();
    const app = createApp(db, TEST_SESSION_SECRET);
    const res = await request(app)
      .post("/auth/signup")
      .send({ email: "New@Example.com", password: "correct horse battery staple" });

    expect(res.status).toBe(201);
    expect(res.body.email).toBe("new@example.com");
    expect(res.body.displayName).toBeNull();
    expect(res.body.passwordHash).toBeUndefined();
    expect(res.headers["set-cookie"]?.[0]).toMatch(/^ds_simboard_session=/);
    await close();
  });

  it("stores a provided displayName on signup", async () => {
    const { db, close } = await createMigratedTestDatabase();
    const app = createApp(db, TEST_SESSION_SECRET);
    const res = await request(app).post("/auth/signup").send({
      email: "named@example.com",
      password: "correct horse battery staple",
      displayName: "Ada Lovelace",
    });

    expect(res.status).toBe(201);
    expect(res.body.displayName).toBe("Ada Lovelace");
    await close();
  });

  it("rejects a malformed email", async () => {
    const { db, close } = await createMigratedTestDatabase();
    const app = createApp(db, TEST_SESSION_SECRET);
    const res = await request(app)
      .post("/auth/signup")
      .send({ email: "not-an-email", password: "correct horse battery staple" });
    expect(res.status).toBe(400);
    await close();
  });

  it("rejects a password shorter than 8 characters", async () => {
    const { db, close } = await createMigratedTestDatabase();
    const app = createApp(db, TEST_SESSION_SECRET);
    const res = await request(app)
      .post("/auth/signup")
      .send({ email: "short@example.com", password: "short" });
    expect(res.status).toBe(400);
    await close();
  });

  it("rejects signing up twice with the same email", async () => {
    const { db, close } = await createMigratedTestDatabase();
    const app = createApp(db, TEST_SESSION_SECRET);
    await request(app)
      .post("/auth/signup")
      .send({ email: "dup@example.com", password: "correct horse battery staple" });
    const res = await request(app)
      .post("/auth/signup")
      .send({ email: "dup@example.com", password: "another password entirely" });
    expect(res.status).toBe(400);
    await close();
  });

  it("logs in with correct credentials and sets a session cookie", async () => {
    const { db, close } = await createMigratedTestDatabase();
    const app = createApp(db, TEST_SESSION_SECRET);
    await request(app)
      .post("/auth/signup")
      .send({ email: "login@example.com", password: "correct horse battery staple" });

    const res = await request(app)
      .post("/auth/login")
      .send({ email: "login@example.com", password: "correct horse battery staple" });
    expect(res.status).toBe(200);
    expect(res.body.email).toBe("login@example.com");
    expect(res.headers["set-cookie"]?.[0]).toMatch(/^ds_simboard_session=/);
    await close();
  });

  it("gives the same generic error for a wrong password and an unknown email", async () => {
    const { db, close } = await createMigratedTestDatabase();
    const app = createApp(db, TEST_SESSION_SECRET);
    await request(app)
      .post("/auth/signup")
      .send({ email: "known@example.com", password: "correct horse battery staple" });

    const wrongPassword = await request(app)
      .post("/auth/login")
      .send({ email: "known@example.com", password: "totally wrong password" });
    const unknownEmail = await request(app)
      .post("/auth/login")
      .send({ email: "nobody@example.com", password: "whatever password" });

    expect(wrongPassword.status).toBe(400);
    expect(unknownEmail.status).toBe(400);
    expect(wrongPassword.body.error).toBe(unknownEmail.body.error);
    await close();
  });

  it("GET /auth/me requires authentication", async () => {
    const { app, close } = await setup();
    const res = await request(app).get("/auth/me");
    expect(res.status).toBe(401);
    await close();
  });

  it("GET /auth/me returns the logged-in user", async () => {
    const { agent, close, userId } = await setup();
    const res = await agent.get("/auth/me");
    expect(res.status).toBe(200);
    expect(res.body.id).toBe(userId);
    await close();
  });

  it("logout clears the session — a subsequent /auth/me is 401", async () => {
    const { agent, close } = await setup();
    const logoutRes = await agent.post("/auth/logout");
    expect(logoutRes.status).toBe(204);

    const meRes = await agent.get("/auth/me");
    expect(meRes.status).toBe(401);
    await close();
  });

  it("invalidates the underlying session on logout, not just the client's cookie", async () => {
    const { db, close } = await createMigratedTestDatabase();
    const app = createApp(db, TEST_SESSION_SECRET);
    const signupRes = await request(app)
      .post("/auth/signup")
      .send({
        email: `${Date.now()}@example.com`,
        password: "correct horse battery staple",
      });
    const rawCookie = signupRes.headers["set-cookie"][0];

    // Reuse the *same* signed cookie value after logout deletes its
    // session row server-side — the signature is still valid, but the
    // session it refers to no longer exists.
    await request(app).post("/auth/logout").set("Cookie", rawCookie);
    const res = await request(app).get("/auth/me").set("Cookie", rawCookie);

    expect(res.status).toBe(401);
    await close();
  });
});

describe("GET /users/:id", () => {
  it("requires authentication", async () => {
    const { app, close, userId } = await setup();
    const res = await request(app).get(`/users/${userId}`);
    expect(res.status).toBe(401);
    await close();
  });

  it("fetches a user by id", async () => {
    const { agent, close, userId } = await setup();
    const res = await agent.get(`/users/${userId}`);
    expect(res.status).toBe(200);
    expect(res.body.id).toBe(userId);
    await close();
  });

  it("404s for an unknown user id", async () => {
    const { agent, close } = await setup();
    const res = await agent.get("/users/00000000-0000-0000-0000-000000000000");
    expect(res.status).toBe(404);
    await close();
  });
});

describe("POST /projects", () => {
  it("creates a project, private by default", async () => {
    const { agent, close, userId } = await setup();
    const res = await agent
      .post("/projects")
      .send({ labType: "breadboard", name: "My first circuit" });

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

  it("ignores a client-supplied ownerId and uses the authenticated user instead", async () => {
    const { agent, close, userId } = await setup();
    const res = await agent.post("/projects").send({
      ownerId: "00000000-0000-0000-0000-000000000000",
      labType: "breadboard",
      name: "Can't spoof this",
    });
    expect(res.status).toBe(201);
    expect(res.body.ownerId).toBe(userId);
    await close();
  });

  it("requires authentication", async () => {
    const { app, close } = await setup();
    const res = await request(app)
      .post("/projects")
      .send({ labType: "breadboard", name: "Anonymous attempt" });
    expect(res.status).toBe(401);
    await close();
  });

  it("rejects an empty name with 400", async () => {
    const { agent, close } = await setup();
    const res = await agent
      .post("/projects")
      .send({ labType: "breadboard", name: "   " });
    expect(res.status).toBe(400);
    await close();
  });

  it("rejects a name longer than 120 characters with 400", async () => {
    const { agent, close } = await setup();
    const res = await agent
      .post("/projects")
      .send({ labType: "breadboard", name: "x".repeat(121) });
    expect(res.status).toBe(400);
    await close();
  });

  it("rejects an invalid labType with 400", async () => {
    const { agent, close } = await setup();
    const res = await agent
      .post("/projects")
      .send({ labType: "commodore64", name: "Retro" });
    expect(res.status).toBe(400);
    await close();
  });
});

describe("GET /projects/:id", () => {
  it("lets the owner fetch their own private project", async () => {
    const { agent, close } = await setup();
    const created = await agent
      .post("/projects")
      .send({ labType: "arduino", name: "Blink" });

    const res = await agent.get(`/projects/${created.body.id}`);
    expect(res.status).toBe(200);
    expect(res.body.name).toBe("Blink");
    await close();
  });

  it("returns 404 for an unknown id", async () => {
    const { agent, close } = await setup();
    const res = await agent.get("/projects/00000000-0000-0000-0000-000000000000");
    expect(res.status).toBe(404);
    await close();
  });

  it("404s (not 403) when a different authenticated user requests a private project", async () => {
    const { ownerAgent, otherAgent, close } = await setupTwoUsers();
    const created = await ownerAgent
      .post("/projects")
      .send({ labType: "breadboard", name: "Not yours" });

    const res = await otherAgent.get(`/projects/${created.body.id}`);
    expect(res.status).toBe(404);
    await close();
  });

  it("404s an anonymous request for a private project", async () => {
    const { app, agent, close } = await setup();
    const created = await agent
      .post("/projects")
      .send({ labType: "breadboard", name: "Still private" });

    const res = await request(app).get(`/projects/${created.body.id}`);
    expect(res.status).toBe(404);
    await close();
  });

  it("lets an anonymous request view an unlisted project", async () => {
    const { app, agent, close } = await setup();
    const created = await agent
      .post("/projects")
      .send({ labType: "breadboard", name: "Shared via link" });
    await agent.patch(`/projects/${created.body.id}`).send({ visibility: "unlisted" });

    const res = await request(app).get(`/projects/${created.body.id}`);
    expect(res.status).toBe(200);
    expect(res.body.name).toBe("Shared via link");
    await close();
  });
});

describe("GET /projects (list mine)", () => {
  it("requires authentication", async () => {
    const { app, close } = await setup();
    const res = await request(app).get("/projects");
    expect(res.status).toBe(401);
    await close();
  });

  it("lists only the authenticated user's own projects", async () => {
    const { ownerAgent, otherAgent, close } = await setupTwoUsers();
    await ownerAgent.post("/projects").send({ labType: "esp32", name: "One" });
    await ownerAgent.post("/projects").send({ labType: "esp32", name: "Two" });
    await otherAgent.post("/projects").send({ labType: "esp32", name: "Someone else's" });

    const res = await ownerAgent.get("/projects");
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(2);
    await close();
  });
});

describe("PATCH /projects/:id (visibility)", () => {
  it("lets the owner set visibility to unlisted", async () => {
    const { agent, close } = await setup();
    const created = await agent
      .post("/projects")
      .send({ labType: "breadboard", name: "Going public soon" });

    const res = await agent
      .patch(`/projects/${created.body.id}`)
      .send({ visibility: "unlisted" });
    expect(res.status).toBe(200);
    expect(res.body.visibility).toBe("unlisted");
    await close();
  });

  it("refuses a non-owner's attempt with 403", async () => {
    const { ownerAgent, otherAgent, close } = await setupTwoUsers();
    const created = await ownerAgent
      .post("/projects")
      .send({ labType: "breadboard", name: "Not yours to share" });

    const res = await otherAgent
      .patch(`/projects/${created.body.id}`)
      .send({ visibility: "public" });
    expect(res.status).toBe(403);
    await close();
  });

  it("requires authentication", async () => {
    const { app, agent, close } = await setup();
    const created = await agent
      .post("/projects")
      .send({ labType: "breadboard", name: "Anonymous can't touch this" });

    const res = await request(app)
      .patch(`/projects/${created.body.id}`)
      .send({ visibility: "public" });
    expect(res.status).toBe(401);
    await close();
  });

  it("rejects an invalid visibility value with 400", async () => {
    const { agent, close } = await setup();
    const created = await agent
      .post("/projects")
      .send({ labType: "breadboard", name: "Bad value" });

    const res = await agent
      .patch(`/projects/${created.body.id}`)
      .send({ visibility: "friends-only" });
    expect(res.status).toBe(400);
    await close();
  });

  it("404s an unknown project id", async () => {
    const { agent, close } = await setup();
    const res = await agent
      .patch("/projects/00000000-0000-0000-0000-000000000000")
      .send({ visibility: "public" });
    expect(res.status).toBe(404);
    await close();
  });
});

describe("DELETE /projects/:id", () => {
  it("deletes a project when the requester is the owner", async () => {
    const { agent, close } = await setup();
    const created = await agent
      .post("/projects")
      .send({ labType: "breadboard", name: "To delete" });

    const res = await agent.delete(`/projects/${created.body.id}`);
    expect(res.status).toBe(204);

    const getRes = await agent.get(`/projects/${created.body.id}`);
    expect(getRes.status).toBe(404);
    await close();
  });

  it("refuses to delete on behalf of a different user", async () => {
    const { ownerAgent, otherAgent, close } = await setupTwoUsers();
    const created = await ownerAgent
      .post("/projects")
      .send({ labType: "breadboard", name: "Not yours" });

    const res = await otherAgent.delete(`/projects/${created.body.id}`);
    expect(res.status).toBe(403);
    await close();
  });

  it("requires authentication", async () => {
    const { app, agent, close } = await setup();
    const created = await agent
      .post("/projects")
      .send({ labType: "breadboard", name: "Anonymous can't delete" });

    const res = await request(app).delete(`/projects/${created.body.id}`);
    expect(res.status).toBe(401);
    await close();
  });

  it("404s deleting an unknown project", async () => {
    const { agent, close } = await setup();
    const res = await agent.delete("/projects/00000000-0000-0000-0000-000000000000");
    expect(res.status).toBe(404);
    await close();
  });
});

describe("circuit snapshots", () => {
  it("saves and retrieves snapshots for the owner's project, newest first", async () => {
    const { agent, close } = await setup();
    const project = await agent
      .post("/projects")
      .send({ labType: "breadboard", name: "Snapshot test" });
    const projectId = project.body.id;

    await agent.post(`/projects/${projectId}/snapshots`).send({ graph: { version: 1 } });
    await new Promise((r) => setTimeout(r, 5)); // ensure a distinct createdAt ordering
    const second = await agent
      .post(`/projects/${projectId}/snapshots`)
      .send({ graph: { version: 2 }, sketchCode: "void setup() {}" });

    expect(second.status).toBe(201);

    const list = await agent.get(`/projects/${projectId}/snapshots`);
    expect(list.status).toBe(200);
    expect(list.body).toHaveLength(2);
    expect(list.body[0].graph).toEqual({ version: 2 }); // newest first

    const latest = await agent.get(`/projects/${projectId}/snapshots/latest`);
    expect(latest.status).toBe(200);
    expect(latest.body.graph).toEqual({ version: 2 });
    await close();
  });

  it("500s saving a snapshot with no request body at all (graph is required)", async () => {
    const { agent, close } = await setup();
    const project = await agent
      .post("/projects")
      .send({ labType: "breadboard", name: "No body sent" });

    const res = await agent.post(`/projects/${project.body.id}/snapshots`);
    expect(res.status).toBe(500);
    await close();
  });

  it("requires authentication to save a snapshot", async () => {
    const { app, agent, close } = await setup();
    const project = await agent
      .post("/projects")
      .send({ labType: "breadboard", name: "Auth required" });

    const res = await request(app)
      .post(`/projects/${project.body.id}/snapshots`)
      .send({ graph: {} });
    expect(res.status).toBe(401);
    await close();
  });

  it("refuses to let a non-owner save a snapshot", async () => {
    const { ownerAgent, otherAgent, close } = await setupTwoUsers();
    const project = await ownerAgent
      .post("/projects")
      .send({ labType: "breadboard", name: "Not yours to edit" });

    const res = await otherAgent
      .post(`/projects/${project.body.id}/snapshots`)
      .send({ graph: {} });
    expect(res.status).toBe(403);
    await close();
  });

  it("404s saving a snapshot against a nonexistent project", async () => {
    const { agent, close } = await setup();
    const res = await agent
      .post("/projects/00000000-0000-0000-0000-000000000000/snapshots")
      .send({ graph: {} });
    expect(res.status).toBe(404);
    await close();
  });

  it("404s fetching the latest snapshot when there are none yet", async () => {
    const { agent, close } = await setup();
    const project = await agent
      .post("/projects")
      .send({ labType: "breadboard", name: "No snapshots yet" });

    const res = await agent.get(`/projects/${project.body.id}/snapshots/latest`);
    expect(res.status).toBe(404);
    await close();
  });

  it("404s an anonymous request for a private project's snapshots", async () => {
    const { app, agent, close } = await setup();
    const project = await agent
      .post("/projects")
      .send({ labType: "breadboard", name: "Private snapshots" });
    await agent
      .post(`/projects/${project.body.id}/snapshots`)
      .send({ graph: { version: 1 } });

    const res = await request(app).get(`/projects/${project.body.id}/snapshots`);
    expect(res.status).toBe(404);
    await close();
  });

  it("404s an anonymous request for a private project's latest snapshot", async () => {
    const { app, agent, close } = await setup();
    const project = await agent
      .post("/projects")
      .send({ labType: "breadboard", name: "Private latest" });
    await agent
      .post(`/projects/${project.body.id}/snapshots`)
      .send({ graph: { version: 1 } });

    const res = await request(app).get(`/projects/${project.body.id}/snapshots/latest`);
    expect(res.status).toBe(404);
    await close();
  });

  it("lets an anonymous request view a public project's snapshots", async () => {
    const { app, agent, close } = await setup();
    const project = await agent
      .post("/projects")
      .send({ labType: "breadboard", name: "Public snapshots" });
    await agent.patch(`/projects/${project.body.id}`).send({ visibility: "public" });
    await agent
      .post(`/projects/${project.body.id}/snapshots`)
      .send({ graph: { version: 1 } });

    const res = await request(app).get(`/projects/${project.body.id}/snapshots`);
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
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
