import type { Request, Response } from "express";
import type { ProjectsService } from "../services/projectsService";
import { ForbiddenError, NotFoundError, ValidationError } from "../services/errors";

/**
 * No authentication exists yet (spec Phase 9), so `ownerId`/
 * `requestingUserId` come from the request body/query rather than a
 * verified session — this is deliberately a placeholder wiring, not a
 * real authorization boundary. It'll be replaced once Phase 9 decides how
 * sessions work.
 */
export function createProjectsController(projectsService: ProjectsService) {
  return {
    async create(req: Request, res: Response) {
      try {
        const project = await projectsService.createProject(req.body);
        res.status(201).json(project);
      } catch (err) {
        handleError(err, res);
      }
    },

    async getById(req: Request, res: Response) {
      try {
        const project = await projectsService.getProject(req.params.id);
        res.status(200).json(project);
      } catch (err) {
        handleError(err, res);
      }
    },

    async listForOwner(req: Request, res: Response) {
      const ownerId = req.query.ownerId;
      if (typeof ownerId !== "string") {
        res.status(400).json({ error: "ownerId query parameter is required" });
        return;
      }
      const projects = await projectsService.listProjectsForOwner(ownerId);
      res.status(200).json(projects);
    },

    async remove(req: Request, res: Response) {
      try {
        // req.body is always a (possibly empty) object here, never
        // null/undefined — app.ts mounts express.json() before this route,
        // which guarantees that.
        const requestingUserId = req.body.requestingUserId;
        if (typeof requestingUserId !== "string") {
          res.status(400).json({ error: "requestingUserId is required" });
          return;
        }
        await projectsService.deleteProject(req.params.id, requestingUserId);
        res.status(204).send();
      } catch (err) {
        handleError(err, res);
      }
    },
  };
}

function handleError(err: unknown, res: Response): void {
  if (err instanceof ValidationError) {
    res.status(400).json({ error: err.message });
  } else if (err instanceof NotFoundError) {
    res.status(404).json({ error: err.message });
  } else if (err instanceof ForbiddenError) {
    res.status(403).json({ error: err.message });
  } else {
    res.status(500).json({ error: "Internal server error" });
  }
}
