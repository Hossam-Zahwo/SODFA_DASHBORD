import { createServerFn } from "@tanstack/react-start";
import { generateText } from "ai";
import { z } from "zod";
import { requireCompanyAccess } from "./company-access.server";
import { COMPANIES } from "./company";

const input = z.object({
  token: z.string().min(16).max(8192),
  query: z.string().trim().min(1).max(100),
  explain: z.boolean(),
});
const limit = 25;

export const searchCompanyInventory = createServerFn({ method: "POST" })
  .validator(input)
  .handler(async ({ data }) => {
    const { client } = await requireCompanyAccess(data.token, "sodfa", "read");
    const { data: warehouses, error: warehouseError } = await client
      .from("warehouses")
      .select("warehouse_id,warehouse_name")
      .eq("business_id", COMPANIES[0].id);
    if (warehouseError) throw new Error("INVENTORY_SOURCE_UNAVAILABLE");

    const names = new Map<string, string>(
      (warehouses ?? []).map((row) => [String(row.warehouse_id), String(row.warehouse_name)]),
    );
    if (!names.size) {
      return {
        state: "no_warehouses" as const,
        rows: [],
        truncated: false,
        advice: null,
        ai: "off" as const,
      };
    }

    const escaped = data.query.replaceAll("\\", "\\\\").replace(/[%_*]/g, "\\$&");
    const { data: matches, error: inventoryError } = await client
      .from("inventory")
      .select("product_id,product_name,warehouse,remaining_qty")
      .in("warehouse", [...names.keys()])
      .ilike("product_name", `%${escaped}%`)
      .order("product_name")
      .order("product_id")
      .order("warehouse")
      .limit(limit + 1);
    if (inventoryError) throw new Error("INVENTORY_SOURCE_UNAVAILABLE");

    const rows = (matches ?? []).slice(0, limit).map((row) => ({
      id: String(row.product_id),
      name: String(row.product_name),
      warehouse: names.get(String(row.warehouse)) ?? String(row.warehouse),
      available:
        row.remaining_qty == null || !Number.isFinite(Number(row.remaining_qty))
          ? null
          : Number(row.remaining_qty),
    }));
    const truncated = (matches?.length ?? 0) > limit;
    let advice: string | null = null;
    let ai: "off" | "unconfigured" | "answered" | "unavailable" = "off";
    const model = process.env["AI_GATEWAY_MODEL"];
    if (data.explain && rows.length) {
      ai = "unconfigured";
      if (model) {
        try {
          // Send aggregate counts only, without search text or product names.
          const { text } = await generateText({
            model,
            system:
              "أنت مساعد مخزون. اكتب بالعربية اقتراح مراجعة مختصرًا. استخدم الأرقام المعطاة فقط. لا تعتبر الرصيد المجهول صفرًا أو العينة كامل المخزون. لا تدّع تنفيذ أي إجراء.",
            prompt: JSON.stringify({
              matchingRowsShown: rows.length,
              truncated,
              rowsWithUnknownQuantity: rows.filter((row) => row.available === null).length,
              rowsWithNonpositiveQuantity: rows.filter(
                (row) => row.available !== null && row.available <= 0,
              ).length,
            }),
            maxOutputTokens: 220,
            maxRetries: 0,
            abortSignal: AbortSignal.timeout(8_000),
          });
          advice = text.trim() || null;
          ai = advice ? "answered" : "unavailable";
        } catch {
          ai = "unavailable";
        }
      }
    }
    return { state: "available" as const, rows, truncated, advice, ai };
  });
