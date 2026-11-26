import { createNeonAuth } from "@neon/auth/next/server";

export function getNeonAuth() {
  const baseUrl = process.env.NEON_AUTH_BASE_URL;
  const secret = process.env.NEON_AUTH_COOKIE_SECRET;
  if (!baseUrl || !secret) return null;
  return createNeonAuth({ baseUrl, cookies: { secret } });
}
