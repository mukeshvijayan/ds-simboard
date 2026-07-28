"use client";

import { useState } from "react";
import { useAuth } from "@/lib/auth/AuthContext";
import { ApiError } from "@/lib/api/client";

export function AuthModal({ onClose }: { onClose: () => void }) {
  const { login, signup } = useAuth();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      if (mode === "login") {
        await login(email, password);
      } else {
        await signup(email, password, displayName.trim() || undefined);
      }
      onClose();
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "Something went wrong. Try again."
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-charcoal/40">
      <div
        role="dialog"
        aria-modal="true"
        aria-label={mode === "login" ? "Sign in" : "Create an account"}
        className="w-[360px] rounded-sm bg-ivory p-6 shadow-lg"
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-[15px] font-medium text-charcoal">
            {mode === "login" ? "Sign in" : "Create an account"}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="text-charcoal-muted hover:text-charcoal"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <label className="flex flex-col gap-1 text-[13px] text-charcoal">
            Email
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="rounded-sm border border-hairline px-2 py-1.5 text-[13px]"
            />
          </label>
          <label className="flex flex-col gap-1 text-[13px] text-charcoal">
            Password
            <input
              type="password"
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="rounded-sm border border-hairline px-2 py-1.5 text-[13px]"
            />
          </label>
          {mode === "signup" && (
            <label className="flex flex-col gap-1 text-[13px] text-charcoal">
              Display name (optional)
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="rounded-sm border border-hairline px-2 py-1.5 text-[13px]"
              />
            </label>
          )}
          {error && <p className="text-[12px] text-[#8a3b3b]">{error}</p>}
          <button
            type="submit"
            disabled={submitting}
            className="rounded-sm border border-navy bg-navy px-3 py-2 text-[13.5px] text-ivory disabled:opacity-50"
          >
            {submitting
              ? "Please wait…"
              : mode === "login"
                ? "Sign in"
                : "Create account"}
          </button>
        </form>

        <button
          type="button"
          onClick={() => {
            setMode(mode === "login" ? "signup" : "login");
            setError(null);
          }}
          className="mt-3 text-[12px] text-charcoal-muted hover:text-charcoal"
        >
          {mode === "login"
            ? "Need an account? Sign up"
            : "Already have an account? Sign in"}
        </button>
      </div>
    </div>
  );
}
