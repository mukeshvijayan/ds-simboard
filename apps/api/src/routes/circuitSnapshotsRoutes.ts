import { Router, type RequestHandler } from "express";
import type { createCircuitSnapshotsController } from "../controllers/circuitSnapshotsController";

export function createCircuitSnapshotsRoutes(
  controller: ReturnType<typeof createCircuitSnapshotsController>,
  requireAuth: RequestHandler,
  optionalAuth: RequestHandler
): Router {
  const router = Router({ mergeParams: true });
  router.post("/", requireAuth, (req, res) => controller.create(req, res));
  router.get("/", optionalAuth, (req, res) => controller.listForProject(req, res));
  router.get("/latest", optionalAuth, (req, res) =>
    controller.getLatestForProject(req, res)
  );
  return router;
}
