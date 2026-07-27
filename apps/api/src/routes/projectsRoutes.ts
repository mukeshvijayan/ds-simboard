import { Router } from "express";
import type { createProjectsController } from "../controllers/projectsController";

export function createProjectsRoutes(
  controller: ReturnType<typeof createProjectsController>
): Router {
  const router = Router();
  router.post("/", (req, res) => controller.create(req, res));
  router.get("/", (req, res) => controller.listForOwner(req, res));
  router.get("/:id", (req, res) => controller.getById(req, res));
  router.delete("/:id", (req, res) => controller.remove(req, res));
  return router;
}
