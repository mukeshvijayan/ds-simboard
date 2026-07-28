import express, { type Express } from "express";
import type { Database } from "./db/client";
import { createUsersRepository } from "./repositories/usersRepository";
import { createProjectsRepository } from "./repositories/projectsRepository";
import { createCircuitSnapshotsRepository } from "./repositories/circuitSnapshotsRepository";
import { createComponentDefinitionsRepository } from "./repositories/componentDefinitionsRepository";
import { createSessionsRepository } from "./repositories/sessionsRepository";
import { createRateLimitRepository } from "./repositories/rateLimitRepository";
import { createUsersService } from "./services/usersService";
import { createProjectsService } from "./services/projectsService";
import { createCircuitSnapshotsService } from "./services/circuitSnapshotsService";
import { createAuthService } from "./services/authService";
import { createUsersController } from "./controllers/usersController";
import { createProjectsController } from "./controllers/projectsController";
import { createCircuitSnapshotsController } from "./controllers/circuitSnapshotsController";
import { createComponentDefinitionsController } from "./controllers/componentDefinitionsController";
import { createAuthController } from "./controllers/authController";
import { createUsersRoutes } from "./routes/usersRoutes";
import { createProjectsRoutes } from "./routes/projectsRoutes";
import { createCircuitSnapshotsRoutes } from "./routes/circuitSnapshotsRoutes";
import { createComponentDefinitionsRoutes } from "./routes/componentDefinitionsRoutes";
import { createAuthRoutes } from "./routes/authRoutes";
import { createOptionalAuth, createRequireAuth } from "./middleware/auth";
import { createRateLimiter } from "./middleware/rateLimiter";

/**
 * Assembles the full controllers/services/repositories/routes stack over
 * a given `Database` — takes the database as a parameter (rather than
 * importing a single global connection) so tests can pass an embedded
 * pglite database and production passes a real Postgres connection,
 * without either one needing different code paths. See
 * docs/architecture/0009-*.md.
 *
 * `sessionSecret` signs/verifies session cookies (see
 * docs/architecture/0010-*.md) — also passed in rather than read from
 * `process.env` here, so tests can use a fixed test-only secret without
 * depending on environment state.
 */
export function createApp(db: Database, sessionSecret: string): Express {
  const usersRepository = createUsersRepository(db);
  const projectsRepository = createProjectsRepository(db);
  const circuitSnapshotsRepository = createCircuitSnapshotsRepository(db);
  const componentDefinitionsRepository = createComponentDefinitionsRepository(db);
  const sessionsRepository = createSessionsRepository(db);
  const rateLimitRepository = createRateLimitRepository(db);

  const usersService = createUsersService(usersRepository);
  const projectsService = createProjectsService(projectsRepository);
  const circuitSnapshotsService = createCircuitSnapshotsService(
    circuitSnapshotsRepository,
    projectsRepository
  );
  const authService = createAuthService(usersRepository, sessionsRepository);

  const usersController = createUsersController(usersService);
  const projectsController = createProjectsController(projectsService);
  const circuitSnapshotsController = createCircuitSnapshotsController(
    circuitSnapshotsService
  );
  const componentDefinitionsController = createComponentDefinitionsController(
    componentDefinitionsRepository
  );
  const authController = createAuthController(authService, sessionSecret);

  const requireAuth = createRequireAuth(authService, sessionSecret);
  const optionalAuth = createOptionalAuth(authService, sessionSecret);

  // Real client IPs behind Vercel's edge network come through
  // `x-forwarded-for`, not the raw socket peer — required for the rate
  // limiters below to key on distinct callers rather than one shared
  // proxy IP. See docs/architecture/0023-*.md.
  const signupRateLimiter = createRateLimiter(rateLimitRepository, {
    routeName: "signup",
    maxAttempts: 10,
    windowMs: 60 * 60 * 1000,
  });
  const loginRateLimiter = createRateLimiter(rateLimitRepository, {
    routeName: "login",
    maxAttempts: 5,
    windowMs: 15 * 60 * 1000,
  });

  const app = express();
  app.set("trust proxy", true);
  app.use(express.json());

  app.get("/health", (_req, res) => res.status(200).json({ status: "ok" }));
  app.use(
    "/auth",
    createAuthRoutes(authController, requireAuth, signupRateLimiter, loginRateLimiter)
  );
  app.use("/users", createUsersRoutes(usersController, requireAuth));
  app.use(
    "/projects",
    createProjectsRoutes(projectsController, requireAuth, optionalAuth)
  );
  app.use(
    "/projects/:projectId/snapshots",
    createCircuitSnapshotsRoutes(circuitSnapshotsController, requireAuth, optionalAuth)
  );
  app.use(
    "/component-definitions",
    createComponentDefinitionsRoutes(componentDefinitionsController)
  );

  return app;
}
