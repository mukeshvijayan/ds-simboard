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
  it("falls back to 500 for an error that isn't NotFoundError", async () => {
    const service = {
      getUser: () => Promise.reject(new Error("connection lost")),
    } as unknown as UsersService;
    const controller = createUsersController(service);
    const res = fakeRes();

    await controller.getById({ params: { id: "some-id" } } as never, res);

    expect(res.statusCode).toBe(500);
    expect(res.body).toEqual({ error: "Internal server error" });
  });
});
