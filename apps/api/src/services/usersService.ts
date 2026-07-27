import type { User } from "@ds-simboard/shared-types";
import type { UsersRepository } from "../repositories/usersRepository";
import { NotFoundError } from "./errors";
import { toUserDto } from "./mappers";

/**
 * Read-only account lookups. Account *creation* lives in `authService`
 * (spec Phase 9) since every account now requires a password — there's no
 * such thing as creating a `users` row without one. See
 * docs/architecture/0010-*.md.
 */
export function createUsersService(usersRepository: UsersRepository) {
  return {
    async getUser(id: string): Promise<User> {
      const row = await usersRepository.findById(id);
      if (!row) {
        throw new NotFoundError(`No user with id "${id}"`);
      }
      return toUserDto(row);
    },
  };
}

export type UsersService = ReturnType<typeof createUsersService>;
