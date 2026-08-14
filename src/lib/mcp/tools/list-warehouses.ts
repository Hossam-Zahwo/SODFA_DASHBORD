import { defineTool } from "@lovable.dev/mcp-js";
import { api } from "@/lib/api";

export default defineTool({
  name: "list_warehouses",
  title: "List warehouses",
  description: "List all SODFA warehouses stored in the Google Sheet.",
  inputSchema: {},
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: true },
  handler: async () => {
    const warehouses = await api.warehouses();
    return {
      content: [{ type: "text", text: JSON.stringify(warehouses, null, 2) }],
      structuredContent: { count: warehouses.length, warehouses },
    };
  },
});