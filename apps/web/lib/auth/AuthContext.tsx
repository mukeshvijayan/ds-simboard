"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import type { User } from "@ds-simboard/shared-types";
import { api } from "../api/client";

interface AuthContextValue {
  user: User | null;
  /** True only while the initial `GET /auth/me` check is in flight — lets
   * callers avoid flashing a "signed out" state before that resolves. */
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, password: string, displayName?: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

/**
 * The unified canvas's only auth surface (P2-5, closing ADR 0029) — no
 * dedicated `/login` route exists; site nav stays fixed to Home/Docs/
 * Open Simulator (P2-1), so this lives as a provider around the
 * simulator page itself, not a new top-level destination.
 */
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    api
      .me()
      .then((u) => {
        if (!cancelled) setUser(u);
      })
      .catch(() => {
        if (!cancelled) setUser(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    setUser(await api.login(email, password));
  }, []);

  const signup = useCallback(
    async (email: string, password: string, displayName?: string) => {
      setUser(await api.signup(email, password, displayName));
    },
    []
  );

  const logout = useCallback(async () => {
    await api.logout();
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, login, signup, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return ctx;
}
