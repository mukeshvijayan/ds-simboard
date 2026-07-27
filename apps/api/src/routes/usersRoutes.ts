import { Router } from "express";
import type { createUsersController } from "../controllers/usersController";

export function createUsersRoutes(
  controller: ReturnType<typeof createUsersController>
): Router {
  const router = Router();
  router.post("/", (req, res) => controller.create(req, res));
  router.get("/:id", (req, res) => controller.getById(req, res));
  return router;
}
