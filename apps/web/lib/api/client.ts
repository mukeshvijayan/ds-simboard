import type {
  CircuitSnapshot,
  Project,
  ProjectVisibility,
  User,
} from "@ds-simboard/shared-types";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

/** A non-2xx response from `apps/api` — `status` lets callers distinguish
 * e.g. 401 (not signed in) from 429 (rate limited) from 400 (validation). */
export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string
  ) {
    super(message);
    this.name = "ApiError";
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    // The session cookie (docs/architecture/0010-*.md) is httpOnly and
    // cross-origin (apps/web and apps/api are separate Vercel projects,
    // ADR 0015) — it only flows at all with credentials explicitly
    // included, paired with apps/api's CORS middleware (ADR 0029).
    credentials: "include",
    headers: { "Content-Type": "application/json", ...init?.headers },
  });

  if (!res.ok) {
    let message = res.statusText;
    try {
      const body = (await res.json()) as { error?: string };
      if (body.error) message = body.error;
    } catch {
      // Not every error response has a JSON body (e.g. a raw 500 from
      // somewhere below the app) — fall back to statusText already set.
    }
    throw new ApiError(res.status, message);
  }

  if (res.status === 204) {
    return undefined as T;
  }
  return res.json() as Promise<T>;
}

export const api = {
  signup: (email: string, password: string, displayName?: string) =>
    request<User>("/auth/signup", {
      method: "POST",
      body: JSON.stringify({ email, password, displayName }),
    }),

  login: (email: string, password: string) =>
    request<User>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    }),

  logout: () => request<void>("/auth/logout", { method: "POST" }),

  me: () => request<User>("/auth/me"),

  listProjects: () => request<Project[]>("/projects"),

  createProject: (input: { name: string; visibility?: ProjectVisibility }) =>
    request<Project>("/projects", {
      method: "POST",
      // labType is a holdover from the pre-unified-canvas three-lab model
      // (see docs/architecture/0029-*.md) — always "breadboard" here.
      body: JSON.stringify({ ...input, labType: "breadboard" }),
    }),

  getProject: (id: string) => request<Project>(`/projects/${id}`),

  updateProject: (id: string, patch: { name?: string; visibility?: ProjectVisibility }) =>
    request<Project>(`/projects/${id}`, {
      method: "PATCH",
      body: JSON.stringify(patch),
    }),

  deleteProject: (id: string) => request<void>(`/projects/${id}`, { method: "DELETE" }),

  createSnapshot: (projectId: string, graph: unknown) =>
    request<CircuitSnapshot>(`/projects/${projectId}/snapshots`, {
      method: "POST",
      body: JSON.stringify({ graph }),
    }),

  listSnapshots: (projectId: string) =>
    request<CircuitSnapshot[]>(`/projects/${projectId}/snapshots`),

  getLatestSnapshot: (projectId: string) =>
    request<CircuitSnapshot>(`/projects/${projectId}/snapshots/latest`),
};
