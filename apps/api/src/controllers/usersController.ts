import type { Request, Response } from "express";
import type { UsersService } from "../services/usersService";
import { NotFoundError } from "../services/errors";

/** Account creation moved to authController.signup — see docs/architecture/0010-*.md. */
export function createUsersController(usersService: UsersService) {
  return {
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
  if (err instanceof NotFoundError) {
    res.status(404).json({ error: err.message });
  } else {
    res.status(500).json({ error: "Internal server error" });
  }
}
