import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { api } from "@/lib/api";

export default defineTool({
  name: "list_sales",
  title: "List sales",
  description: "List recorded SODFA sales, newest last, with an optional row limit.",
  inputSchema: {
    limit: z.number().int().optional().describe("Max rows to return (default 50)."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: true },
  handler: async ({ limit }) => {
    const all = await api.sales();
    const n = limit && limit > 0 ? limit : 50;
    const rows = all.slice(-n);
    const revenue = rows.reduce((sum, s) => sum + s.total, 0);
    return {
      content: [{ type: "text", text: JSON.stringify(rows, null, 2) }],
      structuredContent: { count: rows.length, revenue, sales: rows },
    };
  },
});