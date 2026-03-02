export const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001/api/v1";
export const TENANT_ID = process.env.NEXT_PUBLIC_TENANT_ID || "291686ec-369b-46ef-8083-226ae6eeafb7";

export const apiHeaders = {
  "Content-Type": "application/json",
  "X-Tenant-Id": TENANT_ID,
};
