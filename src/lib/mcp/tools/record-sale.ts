import { ToolError, defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { api } from "@/lib/api";

export default defineTool({
  name: "record_sale",
  title: "Record a sale",
  description:
    "Record a sale of a product in the SODFA Google Sheet. Accepts a product id or barcode; stock is decremented in the Inventory sheet.",
  inputSchema: {
    product: z.string().describe("Product id or barcode of the item being sold."),
    qty: z.number().int().describe("Quantity sold (must be at least 1)."),
    warehouse: z.string().optional().describe("Warehouse the sale is taken from."),
  },
  annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: true },
  handler: async ({ product, qty, warehouse }) => {
    if (!Number.isFinite(qty) || qty < 1) throw new ToolError("qty must be at least 1");
    const key = product.trim().toLowerCase();
    const found = (await api.inventory()).find(
      (p) => p.product_id.toLowerCase() === key || p.barcode.toLowerCase() === key,
    );
    if (!found) throw new ToolError(`No product found for "${product}"`);
    if (found.remaining_qty < qty)
      throw new ToolError(`Only ${found.remaining_qty} units remaining for ${found.product_name}`);
    const res = await api.recordSale({
      product_id: found.product_id,
      qty,
      warehouse: warehouse ?? found.warehouse,
    });
    return {
      content: [
        {
          type: "text",
          text: `Recorded sale of ${qty} x ${found.product_name} (${res.sale_id ?? "saved"}).`,
        },
      ],
      structuredContent: { sale_id: res.sale_id, product_id: found.product_id, qty },
    };
  },
});