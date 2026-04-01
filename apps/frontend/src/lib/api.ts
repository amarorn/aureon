export const API_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001/api/v1";

/** @deprecated Preferir tenant da sessão JWT */
export const TENANT_ID =
  process.env.NEXT_PUBLIC_TENANT_ID || "291686ec-369b-46ef-8083-226ae6eeafb7";

const IMPERSONATE_KEY = "aureon_impersonate_tenant_id";

export function getImpersonatedTenantId(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(IMPERSONATE_KEY);
}

export function setImpersonatedTenantId(tenantId: string | null) {
  if (typeof window === "undefined") return;
  if (tenantId) localStorage.setItem(IMPERSONATE_KEY, tenantId);
  else localStorage.removeItem(IMPERSONATE_KEY);
}

/**
 * Cabeçalhos para a API. Com login: Authorization Bearer.
 * Usuários internos podem definir tenant via impersonação ou NEXT_PUBLIC_TENANT_ID.
 */
export function getApiHeaders(): Record<string, string> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (typeof window === "undefined") {
    headers["X-Tenant-Id"] = TENANT_ID;
    return headers;
  }
  try {
    const raw = localStorage.getItem("aureon_auth");
    if (raw) {
      const s = JSON.parse(raw) as {
        accessToken?: string;
        user?: { isPlatformUser?: boolean };
      };
      if (s.accessToken) {
        headers.Authorization = `Bearer ${s.accessToken}`;
      }
      if (s.user?.isPlatformUser) {
        const imp = getImpersonatedTenantId();
        if (imp) headers["X-Tenant-Id"] = imp;
        else if (process.env.NEXT_PUBLIC_TENANT_ID) {
          headers["X-Tenant-Id"] = TENANT_ID;
        }
      }
      return headers;
    }
  } catch {
    /* ignore */
  }
  if (process.env.NEXT_PUBLIC_TENANT_ID) {
    headers["X-Tenant-Id"] = TENANT_ID;
  }
  return headers;
}
