import { Router } from "express";
import type { createCircuitSnapshotsController } from "../controllers/circuitSnapshotsController";

export function createCircuitSnapshotsRoutes(
  controller: ReturnType<typeof createCircuitSnapshotsController>
): Router {
  const router = Router({ mergeParams: true });
  router.post("/", (req, res) => controller.create(req, res));
  router.get("/", (req, res) => controller.listForProject(req, res));
  router.get("/latest", (req, res) => controller.getLatestForProject(req, res));
  return router;
}
