import type { Response } from "express";
import { createProjectsController } from "./projectsController";
import type { ProjectsService } from "../services/projectsService";

function fakeRes() {
  const res = {
    statusCode: 0,
    body: undefined as unknown,
    status(code: number) {
      res.statusCode = code;
      return res;
    },
    json(payload: unknown) {
      res.body = payload;
      return res;
    },
  };
  return res as unknown as Response & typeof res;
}

const fakeUser = { id: "u1", email: "u1@example.com", displayName: null, createdAt: "" };

describe("projectsController — unexpected errors", () => {
  it("falls back to 500 for an error that isn't Validation/NotFound/Forbidden", async () => {
    // A real scenario this guards: the database itself becomes
    // unreachable mid-request — a failure mode that isn't any of the
    // three typed errors the service otherwise throws.
    const service = {
      createProject: () => Promise.reject(new Error("connection lost")),
    } as unknown as ProjectsService;
    const controller = createProjectsController(service);
    const res = fakeRes();

    await controller.create(
      {
        body: { labType: "breadboard", name: "Doesn't matter" },
        user: fakeUser,
      } as never,
      res
    );

    expect(res.statusCode).toBe(500);
    expect(res.body).toEqual({ error: "Internal server error" });
  });
});
