import { createServerFn } from "@tanstack/react-start";
import { neon } from "@neondatabase/serverless";
import { z } from "zod";
import { requireCompanyAccess } from "./company-access.server";

const Request = z.object({
  token: z.string().min(16).max(8192),
  brand: z.enum(["homey", "sodfa"]),
});

type SocialAccount = {
  brand: "homey" | "sodfa";
  platform: "facebook" | "instagram";
  provider: string;
  handle: string;
  connectionState: string;
  canReadMetrics: boolean;
  canPublish: boolean;
  lastVerifiedAt: string | null;
};

/** Only reports observed connectors. Publishing is NOT authorized by this endpoint. */
export const getCompanySocialStatus = createServerFn({ method: "POST" })
  .validator(Request)
  .handler(async ({ data }): Promise<{ brand: string; connected: boolean; accounts: SocialAccount[] }> => {
    await requireCompanyAccess(data.token, data.brand, "read");
    const dbUrl = process.env["CRM_CATALOG_READ_URL"];
    if (!dbUrl) return { brand: data.brand, connected: false, accounts: [] };
    const db = neon(dbUrl);
    const rows = await db`SELECT brand_id,platform,provider,display_handle,connection_state,
      can_read_metrics,can_publish,last_verified_at::text AS last_verified_at
      FROM public.crm_social_channels WHERE brand_id=${data.brand}
      AND platform IN ('facebook','instagram') ORDER BY platform`;
    return {
      brand: data.brand,
      connected: true,
      accounts: rows.map((r) => ({
        brand: String(r["brand_id"]) as "homey" | "sodfa",
        platform: String(r["platform"]) as "facebook" | "instagram",
        provider: String(r["provider"]),
        handle: String(r["display_handle"]),
        connectionState: String(r["connection_state"]),
        canReadMetrics: r["can_read_metrics"] === true,
        canPublish: r["can_publish"] === true,
        lastVerifiedAt: r["last_verified_at"] == null ? null : String(r["last_verified_at"]),
      })),
    };
  });
