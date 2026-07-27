import type { Request, Response } from "express";
import type { CircuitSnapshotsService } from "../services/circuitSnapshotsService";
import { ForbiddenError, NotFoundError } from "../services/errors";

/**
 * `create` requires auth (route-mounted `requireAuth`); `listForProject`/
 * `getLatestForProject` use `optionalAuth` since viewing an unlisted/
 * public project's snapshots doesn't require being logged in. See
 * docs/architecture/0011-*.md.
 */
export function createCircuitSnapshotsController(
  circuitSnapshotsService: CircuitSnapshotsService
) {
  return {
    async create(req: Request, res: Response) {
      try {
        // req.body is always a (possibly empty) object here, never
        // null/undefined — app.ts mounts express.json() before this route,
        // which guarantees that.
        const snapshot = await circuitSnapshotsService.saveSnapshot(
          {
            projectId: req.params.projectId,
            graph: req.body.graph,
            sketchCode: req.body.sketchCode ?? null,
          },
          req.user!.id
        );
        res.status(201).json(snapshot);
      } catch (err) {
        handleError(err, res);
      }
    },

    async listForProject(req: Request, res: Response) {
      try {
        const snapshots = await circuitSnapshotsService.listSnapshotsForProject(
          req.params.projectId,
          req.user?.id ?? null
        );
        res.status(200).json(snapshots);
      } catch (err) {
        handleError(err, res);
      }
    },

    async getLatestForProject(req: Request, res: Response) {
      try {
        const snapshot = await circuitSnapshotsService.getLatestSnapshot(
          req.params.projectId,
          req.user?.id ?? null
        );
        if (!snapshot) {
          res
            .status(404)
            .json({ error: `No snapshots for project "${req.params.projectId}"` });
          return;
        }
        res.status(200).json(snapshot);
      } catch (err) {
        handleError(err, res);
      }
    },
  };
}

function handleError(err: unknown, res: Response): void {
  if (err instanceof NotFoundError) {
    res.status(404).json({ error: err.message });
  } else if (err instanceof ForbiddenError) {
    res.status(403).json({ error: err.message });
  } else {
    res.status(500).json({ error: "Internal server error" });
  }
}
