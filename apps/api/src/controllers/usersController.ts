import type { Request, Response } from "express";
import type { UsersService } from "../services/usersService";
import { NotFoundError, ValidationError } from "../services/errors";

export function createUsersController(usersService: UsersService) {
  return {
    async create(req: Request, res: Response) {
      try {
        const user = await usersService.createUser(req.body);
        res.status(201).json(user);
      } catch (err) {
        handleError(err, res);
      }
    },

    async getById(req: Request, res: Response) {
      try {
        const user = await usersService.getUser(req.params.id);
        res.status(200).json(user);
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
  } else {
    res.status(500).json({ error: "Internal server error" });
  }
}
