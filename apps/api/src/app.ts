import express, { type Express } from "express";
import type { Database } from "./db/client";
import { createUsersRepository } from "./repositories/usersRepository";
import { createProjectsRepository } from "./repositories/projectsRepository";
import { createCircuitSnapshotsRepository } from "./repositories/circuitSnapshotsRepository";
import { createComponentDefinitionsRepository } from "./repositories/componentDefinitionsRepository";
import { createUsersService } from "./services/usersService";
import { createProjectsService } from "./services/projectsService";
import { createCircuitSnapshotsService } from "./services/circuitSnapshotsService";
import { createUsersController } from "./controllers/usersController";
import { createProjectsController } from "./controllers/projectsController";
import { createCircuitSnapshotsController } from "./controllers/circuitSnapshotsController";
import { createComponentDefinitionsController } from "./controllers/componentDefinitionsController";
import { createUsersRoutes } from "./routes/usersRoutes";
import { createProjectsRoutes } from "./routes/projectsRoutes";
import { createCircuitSnapshotsRoutes } from "./routes/circuitSnapshotsRoutes";
import { createComponentDefinitionsRoutes } from "./routes/componentDefinitionsRoutes";

/**
 * Assembles the full controllers/services/repositories/routes stack over
 * a given `Database` — takes the database as a parameter (rather than
 * importing a single global connection) so tests can pass an embedded
 * pglite database and production passes a real Postgres connection,
 * without either one needing different code paths. See
 * docs/architecture/0009-*.md.
 */
export function createApp(db: Database): Express {
  const usersRepository = createUsersRepository(db);
  const projectsRepository = createProjectsRepository(db);
  const circuitSnapshotsRepository = createCircuitSnapshotsRepository(db);
  const componentDefinitionsRepository = createComponentDefinitionsRepository(db);

  const usersService = createUsersService(usersRepository);
  const projectsService = createProjectsService(projectsRepository);
  const circuitSnapshotsService = createCircuitSnapshotsService(
    circuitSnapshotsRepository,
    projectsRepository
  );

  const usersController = createUsersController(usersService);
  const projectsController = createProjectsController(projectsService);
  const circuitSnapshotsController = createCircuitSnapshotsController(
    circuitSnapshotsService
  );
  const componentDefinitionsController = createComponentDefinitionsController(
    componentDefinitionsRepository
  );

  const app = express();
  app.use(express.json());

  app.get("/health", (_req, res) => res.status(200).json({ status: "ok" }));
  app.use("/users", createUsersRoutes(usersController));
  app.use("/projects", createProjectsRoutes(projectsController));
  app.use(
    "/projects/:projectId/snapshots",
    createCircuitSnapshotsRoutes(circuitSnapshotsController)
  );
  app.use(
    "/component-definitions",
    createComponentDefinitionsRoutes(componentDefinitionsController)
  );

  return app;
}
