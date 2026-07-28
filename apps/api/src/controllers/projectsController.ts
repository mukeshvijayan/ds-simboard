import type { Request, Response } from "express";
import type { ProjectsService } from "../services/projectsService";
import { ForbiddenError, NotFoundError, ValidationError } from "../services/errors";

/**
 * `requireAuth` runs before create/list/remove/updateVisibility, so
 * `req.user` is guaranteed there. `getById` uses `optionalAuth` instead —
 * viewing an unlisted/public project doesn't require being logged in —
 * so `req.user` may be `undefined` there. See docs/architecture/0011-*.md.
 */
export function createProjectsController(projectsService: ProjectsService) {
  return {
    async create(req: Request, res: Response) {
      try {
        const project = await projectsService.createProject({
          ...req.body,
          ownerId: req.user!.id,
        });
        res.status(201).json(project);
      } catch (err) {
        handleError(err, res);
      }
    },

    async getById(req: Request, res: Response) {
      try {
        const project = await projectsService.getProject(
          req.params.id,
          req.user?.id ?? null
        );
        res.status(200).json(project);
      } catch (err) {
        handleError(err, res);
      }
    },

    async listForOwner(req: Request, res: Response) {
      const projects = await projectsService.listProjectsForOwner(req.user!.id);
      res.status(200).json(projects);
    },

    async remove(req: Request, res: Response) {
      try {
        await projectsService.deleteProject(req.params.id, req.user!.id);
        res.status(204).send();
      } catch (err) {
        handleError(err, res);
      }
    },

    async update(req: Request, res: Response) {
      try {
        const project = await projectsService.updateProject(req.params.id, req.user!.id, {
          name: req.body.name,
          visibility: req.body.visibility,
        });
        res.status(200).json(project);
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
