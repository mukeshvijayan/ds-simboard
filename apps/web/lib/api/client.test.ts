import { api, ApiError } from "./client";

function mockFetchOnce(status: number, body?: unknown) {
  global.fetch = jest.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    statusText: "Error",
    json: async () => body,
  }) as unknown as typeof fetch;
}

describe("api client — request plumbing", () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("always sends credentials so the cross-origin session cookie flows (ADR 0029)", async () => {
    mockFetchOnce(200, {
      id: "u1",
      email: "a@b.com",
      displayName: null,
      createdAt: "now",
    });
    await api.me();

    const [, init] = (global.fetch as jest.Mock).mock.calls[0];
    expect(init.credentials).toBe("include");
  });

  it("resolves with the parsed JSON body on success", async () => {
    const project = {
      id: "p1",
      ownerId: "u1",
      labType: "breadboard",
      name: "Test",
      visibility: "private",
      createdAt: "now",
      updatedAt: "now",
    };
    mockFetchOnce(201, project);
    const result = await api.createProject({ name: "Test" });
    expect(result).toEqual(project);
  });

  it("sends labType=breadboard on every createProject call (unified canvas legacy label, ADR 0029)", async () => {
    mockFetchOnce(201, {});
    await api.createProject({ name: "Test" });

    const [, init] = (global.fetch as jest.Mock).mock.calls[0];
    expect(JSON.parse(init.body)).toMatchObject({ name: "Test", labType: "breadboard" });
  });

  it("resolves undefined for a 204 response with no body", async () => {
    mockFetchOnce(204);
    const result = await api.logout();
    expect(result).toBeUndefined();
  });

  it("throws ApiError with the server's error message on a non-2xx response", async () => {
    mockFetchOnce(400, { error: "Project name cannot be empty" });
    await expect(api.createProject({ name: "" })).rejects.toThrow(
      "Project name cannot be empty"
    );
  });

  it("throws ApiError carrying the real status code, e.g. 401", async () => {
    mockFetchOnce(401, { error: "Not authenticated" });
    try {
      await api.me();
      throw new Error("expected api.me() to throw");
    } catch (err) {
      expect(err).toBeInstanceOf(ApiError);
      expect((err as ApiError).status).toBe(401);
    }
  });

  it("falls back to statusText when the error response has no JSON body", async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 500,
      statusText: "Internal Server Error",
      json: async () => {
        throw new Error("not json");
      },
    }) as unknown as typeof fetch;

    await expect(api.me()).rejects.toThrow("Internal Server Error");
  });
});
