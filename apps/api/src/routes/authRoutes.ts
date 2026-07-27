import { Router, type RequestHandler } from "express";
import type { createAuthController } from "../controllers/authController";

export function createAuthRoutes(
  controller: ReturnType<typeof createAuthController>,
  requireAuth: RequestHandler
): Router {
  const router = Router();
  router.post("/signup", (req, res) => controller.signup(req, res));
  router.post("/login", (req, res) => controller.login(req, res));
  router.post("/logout", (req, res) => controller.logout(req, res));
  router.get("/me", requireAuth, (req, res) => controller.me(req, res));
  return router;
}
