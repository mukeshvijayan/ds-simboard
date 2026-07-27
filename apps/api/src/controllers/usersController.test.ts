import type { Response } from "express";
import { createUsersController } from "./usersController";
import type { UsersService } from "../services/usersService";

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

describe("usersController — unexpected errors", () => {
  it("falls back to 500 for an error that isn't ValidationError/NotFoundError", async () => {
    // A real scenario this guards: two concurrent signups for the same
    // email both pass the service's findByEmail check before either
    // insert commits, and the database's own unique constraint (not the
    // service's pre-check) is what actually rejects the second one.
    const service = {
      createUser: () => Promise.reject(new Error("unique constraint violation")),
    } as unknown as UsersService;
    const controller = createUsersController(service);
    const res = fakeRes();

    await controller.create({ body: { email: "race@example.com" } } as never, res);

    expect(res.statusCode).toBe(500);
    expect(res.body).toEqual({ error: "Internal server error" });
  });
});
