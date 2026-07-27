import type { Response } from "express";
import { createAuthController } from "./authController";
import type { AuthService } from "../services/authService";

function fakeRes() {
  const res = {
    statusCode: 0,
    body: undefined as unknown,
    headers: {} as Record<string, string>,
    status(code: number) {
      res.statusCode = code;
      return res;
    },
    json(payload: unknown) {
      res.body = payload;
      return res;
    },
    setHeader(name: string, value: string) {
      res.headers[name] = value;
      return res;
    },
    send() {
      return res;
    },
  };
  return res as unknown as Response & typeof res;
}

describe("authController — unexpected errors", () => {
  it("falls back to 500 for a signup error that isn't ValidationError", async () => {
    // A real scenario this guards: the database becomes unreachable
    // mid-signup, after the email/password have already validated.
    const service = {
      signup: () => Promise.reject(new Error("connection lost")),
    } as unknown as AuthService;
    const controller = createAuthController(service, "test-secret");
    const res = fakeRes();

    await controller.signup(
      {
        body: { email: "a@example.com", password: "correct horse battery staple" },
      } as never,
      res
    );

    expect(res.statusCode).toBe(500);
    expect(res.body).toEqual({ error: "Internal server error" });
  });
});
