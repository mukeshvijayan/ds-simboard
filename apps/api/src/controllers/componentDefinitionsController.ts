import type { Request, Response } from "express";
import type { ComponentDefinitionsRepository } from "../repositories/componentDefinitionsRepository";

/** No business logic beyond fetching — this is a straight read-through catalog. */
export function createComponentDefinitionsController(
  repository: ComponentDefinitionsRepository
) {
  return {
    async listAll(_req: Request, res: Response) {
      const definitions = await repository.listAll();
      res.status(200).json(definitions);
    },
  };
}
