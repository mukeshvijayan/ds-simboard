import {
  buildClearedSessionCookie,
  buildSessionCookie,
  readSessionCookie,
  sessionExpiryFromNow,
  signSessionId,
  verifySignedSessionId,
} from "./sessionCookie";

const SECRET = "test-secret";

describe("signSessionId / verifySignedSessionId", () => {
  it("round-trips a session id", () => {
    const signed = signSessionId("session-123", SECRET);
    expect(verifySignedSessionId(signed, SECRET)).toBe("session-123");
  });

  it("rejects a tampered signature of the same length", () => {
    const signed = signSessionId("session-123", SECRET);
    const [id, signature] = signed.split(".");
    const tamperedChar = signature[0] === "a" ? "b" : "a";
    const tampered = `${id}.${tamperedChar}${signature.slice(1)}`;
    expect(verifySignedSessionId(tampered, SECRET)).toBeNull();
  });

  it("rejects a signature of a different length", () => {
    const signed = signSessionId("session-123", SECRET);
    expect(verifySignedSessionId(`${signed}extra`, SECRET)).toBeNull();
  });

  it("rejects a value with no signature separator at all", () => {
    expect(verifySignedSessionId("no-dot-here", SECRET)).toBeNull();
  });

  it("rejects an undefined cookie value", () => {
    expect(verifySignedSessionId(undefined, SECRET)).toBeNull();
  });

  it("rejects a signature produced with a different secret", () => {
    const signed = signSessionId("session-123", SECRET);
    expect(verifySignedSessionId(signed, "a-different-secret")).toBeNull();
  });
});

describe("readSessionCookie", () => {
  it("reads the session cookie out of a Cookie header", () => {
    const signed = signSessionId("session-123", SECRET);
    expect(readSessionCookie(`ds_simboard_session=${signed}`)).toBe(signed);
  });

  it("returns undefined when there's no Cookie header", () => {
    expect(readSessionCookie(undefined)).toBeUndefined();
  });

  it("returns undefined when the header doesn't include our cookie", () => {
    expect(readSessionCookie("some_other_cookie=value")).toBeUndefined();
  });
});

describe("buildSessionCookie / buildClearedSessionCookie", () => {
  it("builds a Set-Cookie value carrying the signed session id", () => {
    const cookie = buildSessionCookie(
      "session-123",
      SECRET,
      new Date(Date.now() + 1000),
      false
    );
    expect(cookie).toMatch(/^ds_simboard_session=/);
    expect(cookie).toMatch(/HttpOnly/);
    expect(cookie).not.toMatch(/Secure/);
  });

  it("marks the cookie Secure in production", () => {
    const cookie = buildSessionCookie(
      "session-123",
      SECRET,
      new Date(Date.now() + 1000),
      true
    );
    expect(cookie).toMatch(/Secure/);
  });

  it("clears the cookie with a zero max-age", () => {
    const cookie = buildClearedSessionCookie(false);
    expect(cookie).toMatch(/^ds_simboard_session=;/);
  });
});

describe("sessionExpiryFromNow", () => {
  it("returns a date roughly 7 days in the future", () => {
    const expiry = sessionExpiryFromNow();
    const diffMs = expiry.getTime() - Date.now();
    const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;
    expect(diffMs).toBeGreaterThan(sevenDaysMs - 5000);
    expect(diffMs).toBeLessThanOrEqual(sevenDaysMs);
  });
});
