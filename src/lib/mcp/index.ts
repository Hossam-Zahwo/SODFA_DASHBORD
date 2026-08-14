import { defineMcp } from "@lovable.dev/mcp-js";

type McpTools = Parameters<typeof defineMcp>[0]["tools"];
import listInventory from "./tools/list-inventory";
import listWarehouses from "./tools/list-warehouses";
import listSales from "./tools/list-sales";
import listReturns from "./tools/list-returns";
import recordSale from "./tools/record-sale";
import recordReturn from "./tools/record-return";

export default defineMcp({
  name: "sodfa-inventory-master",
  title: "SODFA Inventory Master",
  version: "0.1.0",
  instructions:
    "Tools for the SODFA (صدفة) inventory system, backed by Google Sheets. Read inventory, warehouses, sales and returns, and record new sales or customer returns. Products are addressed by product id or barcode.",
  tools: [
    listInventory,
    listWarehouses,
    listSales,
    listReturns,
    recordSale,
    recordReturn,
  ] as unknown as McpTools,
});