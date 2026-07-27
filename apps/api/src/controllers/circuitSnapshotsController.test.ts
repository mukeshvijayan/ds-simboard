import type { Response } from "express";
import { createCircuitSnapshotsController } from "./circuitSnapshotsController";
import type { CircuitSnapshotsService } from "../services/circuitSnapshotsService";

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

describe("circuitSnapshotsController — unexpected errors", () => {
  it("falls back to 500 for an error that isn't NotFoundError", async () => {
    const service = {
      saveSnapshot: () => Promise.reject(new Error("unexpected DB failure")),
    } as unknown as CircuitSnapshotsService;
    const controller = createCircuitSnapshotsController(service);
    const res = fakeRes();

    await controller.create(
      {
        params: { projectId: "p1" },
        body: { graph: {} },
        user: { id: "u1", email: "u1@example.com", displayName: null, createdAt: "" },
      } as never,
      res
    );

    expect(res.statusCode).toBe(500);
    expect(res.body).toEqual({ error: "Internal server error" });
  });
});
