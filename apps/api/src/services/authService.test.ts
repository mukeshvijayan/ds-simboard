import { createAuthService } from "./authService";
import type { SessionsRepository } from "../repositories/sessionsRepository";
import type { UsersRepository } from "../repositories/usersRepository";

describe("authService.getUserForSession — expiry", () => {
  it("returns null for a session that exists but has expired", async () => {
    // sessionExpiryFromNow() only ever produces a 7-days-future date, so
    // an expired session can't be produced through the real signup/login
    // flow within a test's lifetime — a fake repository is the only way
    // to exercise this branch.
    const sessionsRepository = {
      findById: () =>
        Promise.resolve({
          id: "session-1",
          userId: "user-1",
          expiresAt: new Date(Date.now() - 1000),
          createdAt: new Date(),
        }),
    } as unknown as SessionsRepository;
    const usersRepository = {} as UsersRepository;

    const authService = createAuthService(usersRepository, sessionsRepository);
    const user = await authService.getUserForSession("session-1");

    expect(user).toBeNull();
  });
});
