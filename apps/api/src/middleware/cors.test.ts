import type { Request, Response } from "express";
import { createCors } from "./cors";

function fakeReq(options: { origin?: string; method?: string }): Request {
  return {
    headers: options.origin ? { origin: options.origin } : {},
    method: options.method ?? "GET",
  } as unknown as Request;
}

function fakeRes() {
  const res = {
    statusCode: 0,
    ended: false,
    headers: {} as Record<string, string>,
    status(code: number) {
      res.statusCode = code;
      return res;
    },
    end() {
      res.ended = true;
      return res;
    },
    setHeader(name: string, value: string) {
      res.headers[name] = value;
      return res;
    },
  };
  return res as unknown as Response & typeof res;
}

describe("createCors", () => {
  it("echoes back an allowed origin and calls next() for a normal request", () => {
    const cors = createCors(["https://app.example.com"]);
    const next = jest.fn();
    const res = fakeRes();

    cors(fakeReq({ origin: "https://app.example.com" }), res, next);

    expect(res.headers["Access-Control-Allow-Origin"]).toBe("https://app.example.com");
    expect(res.headers["Access-Control-Allow-Credentials"]).toBe("true");
    expect(next).toHaveBeenCalledTimes(1);
    expect(res.ended).toBe(false);
  });

  it("does not set any CORS headers for an origin that isn't on the allow-list", () => {
    const cors = createCors(["https://app.example.com"]);
    const next = jest.fn();
    const res = fakeRes();

    cors(fakeReq({ origin: "https://evil.example.com" }), res, next);

    expect(res.headers["Access-Control-Allow-Origin"]).toBeUndefined();
    expect(next).toHaveBeenCalledTimes(1);
  });

  it("calls next() normally for a request with no Origin header at all (same-origin/server-to-server)", () => {
    const cors = createCors(["https://app.example.com"]);
    const next = jest.fn();
    const res = fakeRes();

    cors(fakeReq({}), res, next);

    expect(res.headers["Access-Control-Allow-Origin"]).toBeUndefined();
    expect(next).toHaveBeenCalledTimes(1);
  });

  it("answers an OPTIONS preflight directly with 204, without calling next()", () => {
    const cors = createCors(["https://app.example.com"]);
    const next = jest.fn();
    const res = fakeRes();

    cors(fakeReq({ origin: "https://app.example.com", method: "OPTIONS" }), res, next);

    expect(res.statusCode).toBe(204);
    expect(res.ended).toBe(true);
    expect(res.headers["Access-Control-Allow-Methods"]).toContain("POST");
    expect(res.headers["Access-Control-Allow-Headers"]).toContain("Content-Type");
    expect(next).not.toHaveBeenCalled();
  });

  it("keeps two configured origins independently allowed", () => {
    const cors = createCors(["https://a.example.com", "https://b.example.com"]);
    const next = jest.fn();
    const resA = fakeRes();
    const resB = fakeRes();

    cors(fakeReq({ origin: "https://a.example.com" }), resA, next);
    cors(fakeReq({ origin: "https://b.example.com" }), resB, next);

    expect(resA.headers["Access-Control-Allow-Origin"]).toBe("https://a.example.com");
    expect(resB.headers["Access-Control-Allow-Origin"]).toBe("https://b.example.com");
  });
});
