import type { User } from "@ds-simboard/shared-types";
import type { UsersRepository } from "../repositories/usersRepository";
import { NotFoundError, ValidationError } from "./errors";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function toUserDto(row: {
  id: string;
  email: string;
  displayName: string | null;
  createdAt: Date;
}): User {
  return {
    id: row.id,
    email: row.email,
    displayName: row.displayName,
    createdAt: row.createdAt.toISOString(),
  };
}

/**
 * Pure account-record CRUD — no password, no session, no login. Spec
 * Phase 9 ("Auth & accounts") decides how authentication actually works;
 * this just gives it a `users` table and repository to build on, per
 * docs/architecture/0009-*.md.
 */
export function createUsersService(usersRepository: UsersRepository) {
  return {
    async createUser(input: {
      email: string;
      displayName?: string | null;
    }): Promise<User> {
      const email = input.email.trim().toLowerCase();
      if (!EMAIL_PATTERN.test(email)) {
        throw new ValidationError(`"${input.email}" is not a valid email address`);
      }
      const existing = await usersRepository.findByEmail(email);
      if (existing) {
        throw new ValidationError(`An account with email "${email}" already exists`);
      }
      const row = await usersRepository.create({
        email,
        displayName: input.displayName ?? null,
      });
      return toUserDto(row);
    },

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
