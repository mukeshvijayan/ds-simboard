import { Router, type RequestHandler } from "express";
import type { createUsersController } from "../controllers/usersController";

export function createUsersRoutes(
  controller: ReturnType<typeof createUsersController>,
  requireAuth: RequestHandler
): Router {
  const router = Router();
  router.get("/:id", requireAuth, (req, res) => controller.getById(req, res));
  return router;
}
