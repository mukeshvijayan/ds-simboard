import { Router, type RequestHandler } from "express";
import type { createProjectsController } from "../controllers/projectsController";

export function createProjectsRoutes(
  controller: ReturnType<typeof createProjectsController>,
  requireAuth: RequestHandler,
  optionalAuth: RequestHandler
): Router {
  const router = Router();
  router.post("/", requireAuth, (req, res) => controller.create(req, res));
  router.get("/", requireAuth, (req, res) => controller.listForOwner(req, res));
  router.get("/:id", optionalAuth, (req, res) => controller.getById(req, res));
  router.patch("/:id", requireAuth, (req, res) => controller.update(req, res));
  router.delete("/:id", requireAuth, (req, res) => controller.remove(req, res));
  return router;
}
