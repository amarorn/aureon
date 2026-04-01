"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { API_URL, getApiHeaders, getImpersonatedTenantId } from "@/lib/api";

const STORAGE_KEY = "aureon_auth";

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: string;
  status: string;
  tenantId: string | null;
  isPlatformUser: boolean;
}

export interface AuthTenant {
  id: string;
  name: string;
  slug: string;
  approvalStatus: string;
  operationalStatus: string;
  currentPackageCode: string | null;
}

type SessionPayload = {
  accessToken: string;
  refreshToken: string;
  user: AuthUser;
  tenant: AuthTenant | null;
  features: string[];
};

type AuthContextValue = {
  user: AuthUser | null;
  tenant: AuthTenant | null;
  features: string[];
  accessToken: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshSession: () => Promise<void>;
  hasFeature: (code: string) => boolean;
};

const AuthContext = createContext<AuthContextValue | null>(null);

function loadStoredSession(): SessionPayload | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as SessionPayload;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<SessionPayload | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const persist = useCallback((s: SessionPayload | null) => {
    setSession(s);
    if (typeof window === "undefined") return;
    if (s) localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
    else localStorage.removeItem(STORAGE_KEY);
  }, []);

  const refreshSession = useCallback(async () => {
    const s = loadStoredSession();
    if (!s?.accessToken) {
      setIsLoading(false);
      return;
    }
    setSession(s);
    try {
      const res = await fetch(`${API_URL}/auth/me`, {
        headers: getApiHeaders(),
      });
      if (!res.ok) {
        if (res.status === 401 && s.refreshToken) {
          const r2 = await fetch(`${API_URL}/auth/refresh`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ refreshToken: s.refreshToken }),
          });
          if (r2.ok) {
            const t = (await r2.json()) as {
              accessToken: string;
              refreshToken: string;
            };
            const next: SessionPayload = {
              ...s,
              accessToken: t.accessToken,
              refreshToken: t.refreshToken,
            };
            persist(next);
            const r3 = await fetch(`${API_URL}/auth/me`, {
              headers: getApiHeaders(),
            });
            if (r3.ok) {
              const me = (await r3.json()) as {
                user: AuthUser;
                tenant: AuthTenant | null;
                features: string[];
              };
              persist({
                accessToken: next.accessToken,
                refreshToken: next.refreshToken,
                user: me.user,
                tenant: me.tenant,
                features: me.features,
              });
            }
          } else {
            persist(null);
          }
        } else {
          persist(null);
        }
        setIsLoading(false);
        return;
      }
      const me = (await res.json()) as {
        user: AuthUser;
        tenant: AuthTenant | null;
        features: string[];
      };
      persist({
        accessToken: s.accessToken,
        refreshToken: s.refreshToken,
        user: me.user,
        tenant: me.tenant,
        features: me.features,
      });
    } catch {
      persist(null);
    } finally {
      setIsLoading(false);
    }
  }, [persist]);

  useEffect(() => {
    void refreshSession();
  }, [refreshSession]);

  useEffect(() => {
    let t: ReturnType<typeof setTimeout> | undefined;
    const onVis = () => {
      if (document.visibilityState !== "visible") return;
      if (t) clearTimeout(t);
      t = setTimeout(() => {
        void refreshSession();
      }, 500);
    };
    document.addEventListener("visibilitychange", onVis);
    return () => {
      document.removeEventListener("visibilitychange", onVis);
      if (t) clearTimeout(t);
    };
  }, [refreshSession]);

  const login = useCallback(
    async (email: string, password: string) => {
      const res = await fetch(`${API_URL}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const err = new Error(
          typeof data.message === "string" ? data.message : "Falha no login",
        ) as Error & { code?: string; status?: number };
        err.code = data.code;
        err.status = res.status;
        throw err;
      }
      const payload = data as SessionPayload & { tenant?: AuthTenant | null };
      persist({
        accessToken: payload.accessToken,
        refreshToken: payload.refreshToken,
        user: payload.user,
        tenant: payload.tenant ?? null,
        features: payload.features ?? [],
      });
    },
    [persist],
  );

  const logout = useCallback(async () => {
    const s = loadStoredSession();
    if (s?.refreshToken) {
      await fetch(`${API_URL}/auth/logout`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refreshToken: s.refreshToken }),
      }).catch(() => undefined);
    }
    persist(null);
  }, [persist]);

  const hasFeature = useCallback(
    (code: string) => {
      const u = session?.user;
      if (!u) return false;
      if (u.isPlatformUser) {
        if (typeof window !== "undefined" && getImpersonatedTenantId()) {
          return (session?.features ?? []).includes(code);
        }
        return true;
      }
      return (session?.features ?? []).includes(code);
    },
    [session],
  );

  const value = useMemo<AuthContextValue>(
    () => ({
      user: session?.user ?? null,
      tenant: session?.tenant ?? null,
      features: session?.features ?? [],
      accessToken: session?.accessToken ?? null,
      isLoading,
      isAuthenticated: Boolean(session?.accessToken),
      login,
      logout,
      refreshSession,
      hasFeature,
    }),
    [session, isLoading, login, logout, refreshSession, hasFeature],
  );

  return (
    <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return ctx;
}
