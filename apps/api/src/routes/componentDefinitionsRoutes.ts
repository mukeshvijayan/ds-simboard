import { Router } from "express";
import type { createComponentDefinitionsController } from "../controllers/componentDefinitionsController";

export function createComponentDefinitionsRoutes(
  controller: ReturnType<typeof createComponentDefinitionsController>
): Router {
  const router = Router();
  router.get("/", (req, res) => controller.listAll(req, res));
  return router;
}
