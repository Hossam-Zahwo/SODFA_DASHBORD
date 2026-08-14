import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { api } from "@/lib/api";

export default defineTool({
  name: "list_inventory",
  title: "List inventory",
  description:
    "List SODFA products from the Google Sheets inventory, optionally filtered by search text (name, product id or barcode) or warehouse.",
  inputSchema: {
    search: z.string().optional().describe("Filter by product name, product id or barcode."),
    warehouse: z.string().optional().describe("Filter by warehouse id or name."),
    limit: z.number().int().optional().describe("Max rows to return (default 50)."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: true },
  handler: async ({ search, warehouse, limit }) => {
    const all = await api.inventory();
    const q = (search ?? "").trim().toLowerCase();
    const w = (warehouse ?? "").trim().toLowerCase();
    const rows = all
      .filter(
        (p) =>
          (!q ||
            p.product_name.toLowerCase().includes(q) ||
            p.product_id.toLowerCase().includes(q) ||
            p.barcode.toLowerCase().includes(q)) &&
          (!w || p.warehouse.toLowerCase().includes(w)),
      )
      .slice(0, limit && limit > 0 ? limit : 50);
    return {
      content: [{ type: "text", text: JSON.stringify(rows, null, 2) }],
      structuredContent: { count: rows.length, products: rows },
    };
  },
});