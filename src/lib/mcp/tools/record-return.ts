import { ToolError, defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { api } from "@/lib/api";

export default defineTool({
  name: "record_return",
  title: "Record a customer return",
  description:
    "Record a normal customer return in the SODFA Google Sheet. The quantity is added back to the destination warehouse stock.",
  inputSchema: {
    product: z.string().describe("Product id or barcode being returned."),
    qty: z.number().int().describe("Quantity returned (must be at least 1)."),
    warehouse: z.string().optional().describe("Destination warehouse the stock returns to."),
    return_reason: z.string().optional().describe("Reason for the return."),
    notes: z.string().optional().describe("Free-text notes."),
  },
  annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: true },
  handler: async ({ product, qty, warehouse, return_reason, notes }) => {
    if (!Number.isFinite(qty) || qty < 1) throw new ToolError("qty must be at least 1");
    const key = product.trim().toLowerCase();
    const found = (await api.inventory()).find(
      (p) => p.product_id.toLowerCase() === key || p.barcode.toLowerCase() === key,
    );
    if (!found) throw new ToolError(`No product found for "${product}"`);
    const res = await api.recordReturn({
      product_id: found.product_id,
      qty,
      warehouse: warehouse ?? found.warehouse,
      return_reason: return_reason ?? "",
      notes: notes ?? "",
    });
    return {
      content: [
        {
          type: "text",
          text: `Recorded return of ${qty} x ${found.product_name} (${res.return_id ?? "saved"}).`,
        },
      ],
      structuredContent: { return_id: res.return_id, product_id: found.product_id, qty },
    };
  },
});