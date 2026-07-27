import type { Request, Response } from "express";
import type { CircuitSnapshotsService } from "../services/circuitSnapshotsService";
import { NotFoundError } from "../services/errors";

export function createCircuitSnapshotsController(
  circuitSnapshotsService: CircuitSnapshotsService
) {
  return {
    async create(req: Request, res: Response) {
      try {
        // req.body is always a (possibly empty) object here, never
        // null/undefined — app.ts mounts express.json() before this route,
        // which guarantees that.
        const snapshot = await circuitSnapshotsService.saveSnapshot({
          projectId: req.params.projectId,
          graph: req.body.graph,
          sketchCode: req.body.sketchCode ?? null,
        });
        res.status(201).json(snapshot);
      } catch (err) {
        handleError(err, res);
      }
    },

    async listForProject(req: Request, res: Response) {
      const snapshots = await circuitSnapshotsService.listSnapshotsForProject(
        req.params.projectId
      );
      res.status(200).json(snapshots);
    },

    async getLatestForProject(req: Request, res: Response) {
      const snapshot = await circuitSnapshotsService.getLatestSnapshot(
        req.params.projectId
      );
      if (!snapshot) {
        res
          .status(404)
          .json({ error: `No snapshots for project "${req.params.projectId}"` });
        return;
      }
      res.status(200).json(snapshot);
    },
  };
}

function handleError(err: unknown, res: Response): void {
  // circuitSnapshotsService only ever throws NotFoundError today — no
  // ValidationError branch here, since one that can never trigger would
  // be untested, unreachable code, not real error handling.
  if (err instanceof NotFoundError) {
    res.status(404).json({ error: err.message });
  } else {
    res.status(500).json({ error: "Internal server error" });
  }
}
