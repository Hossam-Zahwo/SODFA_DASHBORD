import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { api } from "@/lib/api";

export default defineTool({
  name: "list_returns",
  title: "List returns",
  description:
    "List SODFA returns. Use kind 'normal' for customer returns that restock inventory, or 'damaged' for damaged returns with their status.",
  inputSchema: {
    kind: z.enum(["normal", "damaged"]).optional().describe("Which return log to read (default normal)."),
    limit: z.number().int().optional().describe("Max rows to return (default 50)."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: true },
  handler: async ({ kind, limit }) => {
    const n = limit && limit > 0 ? limit : 50;
    const rows =
      kind === "damaged" ? (await api.damagedReturns()).slice(-n) : (await api.returns()).slice(-n);
    return {
      content: [{ type: "text", text: JSON.stringify(rows, null, 2) }],
      structuredContent: { kind: kind ?? "normal", count: rows.length, returns: rows },
    };
  },
});