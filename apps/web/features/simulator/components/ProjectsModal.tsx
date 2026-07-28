"use client";

import { useEffect, useState } from "react";
import type { Project, ProjectVisibility } from "@ds-simboard/shared-types";
import { api, ApiError } from "@/lib/api/client";
import { deserializeCanvas, type CanvasSnapshot } from "../model/persistence";

const VISIBILITIES: ProjectVisibility[] = ["private", "unlisted", "public"];

/**
 * "My Projects" (P2-5, closing ADR 0029): list, open, rename, delete,
 * and toggle visibility for the signed-in user's own projects, plus
 * creating a new one. Opening a project loads its *latest* snapshot
 * (there's no "current save point" concept beyond that — every save is
 * a new row, newest first, so this is simply the most recent one).
 */
export function ProjectsModal({
  onClose,
  onOpenProject,
  currentProjectId,
}: {
  onClose: () => void;
  onOpenProject: (project: Project, snapshot: CanvasSnapshot | null) => void;
  currentProjectId: string | null;
}) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [newProjectName, setNewProjectName] = useState("");
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => {
    api
      .listProjects()
      .then(setProjects)
      .catch((err) =>
        setError(err instanceof ApiError ? err.message : "Couldn't load projects.")
      )
      .finally(() => setLoading(false));
  }, []);

  async function handleCreate(event: React.FormEvent) {
    event.preventDefault();
    const name = newProjectName.trim();
    if (!name) return;
    try {
      const project = await api.createProject({ name });
      setProjects((prev) => [project, ...prev]);
      setNewProjectName("");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't create the project.");
    }
  }

  async function handleOpen(project: Project) {
    setBusyId(project.id);
    setError(null);
    try {
      const latest = await api.getLatestSnapshot(project.id);
      const result = deserializeCanvas(latest.graph);
      if (result.status === "error") {
        setError(result.message);
        return;
      }
      onOpenProject(project, result.snapshot);
      onClose();
    } catch (err) {
      if (err instanceof ApiError && err.status === 404) {
        // A brand-new project with no saved snapshot yet — open it as a
        // blank canvas rather than treating "nothing saved yet" as an error.
        onOpenProject(project, null);
        onClose();
        return;
      }
      setError(err instanceof ApiError ? err.message : "Couldn't open the project.");
    } finally {
      setBusyId(null);
    }
  }

  async function handleRenameSubmit(project: Project) {
    const name = renameValue.trim();
    setRenamingId(null);
    if (!name || name === project.name) return;
    try {
      const updated = await api.updateProject(project.id, { name });
      setProjects((prev) => prev.map((p) => (p.id === project.id ? updated : p)));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't rename the project.");
    }
  }

  async function handleVisibilityChange(project: Project, visibility: ProjectVisibility) {
    try {
      const updated = await api.updateProject(project.id, { visibility });
      setProjects((prev) => prev.map((p) => (p.id === project.id ? updated : p)));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't change visibility.");
    }
  }

  async function handleDelete(project: Project) {
    try {
      await api.deleteProject(project.id);
      setProjects((prev) => prev.filter((p) => p.id !== project.id));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't delete the project.");
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-charcoal/40">
      <div
        role="dialog"
        aria-modal="true"
        aria-label="My Projects"
        className="flex max-h-[80vh] w-[480px] flex-col gap-3 rounded-sm bg-ivory p-6 shadow-lg"
      >
        <div className="flex items-center justify-between">
          <h2 className="text-[15px] font-medium text-charcoal">My Projects</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="text-charcoal-muted hover:text-charcoal"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleCreate} className="flex gap-2">
          <input
            type="text"
            placeholder="New project name"
            value={newProjectName}
            onChange={(e) => setNewProjectName(e.target.value)}
            className="flex-1 rounded-sm border border-hairline px-2 py-1.5 text-[13px]"
          />
          <button
            type="submit"
            className="rounded-sm border border-navy bg-navy px-3 py-1.5 text-[13px] text-ivory"
          >
            Create
          </button>
        </form>

        {error && <p className="text-[12px] text-[#8a3b3b]">{error}</p>}

        <div className="flex-1 overflow-y-auto">
          {loading && <p className="text-[13px] text-charcoal-muted">Loading…</p>}
          {!loading && projects.length === 0 && (
            <p className="text-[13px] text-charcoal-muted">
              No projects yet — create one above.
            </p>
          )}
          <ul className="flex flex-col gap-2">
            {projects.map((project) => (
              <li
                key={project.id}
                className={`flex flex-col gap-1.5 rounded-sm border px-3 py-2 ${
                  project.id === currentProjectId
                    ? "border-navy bg-navy/5"
                    : "border-hairline bg-white"
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  {renamingId === project.id ? (
                    <input
                      autoFocus
                      value={renameValue}
                      onChange={(e) => setRenameValue(e.target.value)}
                      onBlur={() => handleRenameSubmit(project)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleRenameSubmit(project);
                        if (e.key === "Escape") setRenamingId(null);
                      }}
                      className="flex-1 rounded-sm border border-hairline px-1.5 py-1 text-[13px]"
                    />
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        setRenamingId(project.id);
                        setRenameValue(project.name);
                      }}
                      className="text-left text-[13.5px] text-charcoal hover:underline"
                      title="Click to rename"
                    >
                      {project.name}
                    </button>
                  )}
                  <select
                    value={project.visibility}
                    onChange={(e) =>
                      handleVisibilityChange(project, e.target.value as ProjectVisibility)
                    }
                    className="rounded-sm border border-hairline bg-white px-1.5 py-1 text-[12px]"
                    aria-label={`${project.name} visibility`}
                  >
                    {VISIBILITIES.map((v) => (
                      <option key={v} value={v}>
                        {v}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => handleOpen(project)}
                    disabled={busyId === project.id}
                    className="rounded-sm border border-hairline px-2 py-1 text-[12px] text-charcoal hover:border-charcoal/25 disabled:opacity-50"
                  >
                    {busyId === project.id ? "Opening…" : "Open"}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(project)}
                    className="rounded-sm border border-hairline px-2 py-1 text-[12px] text-charcoal-muted hover:border-charcoal/25 hover:text-charcoal"
                  >
                    Delete
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
