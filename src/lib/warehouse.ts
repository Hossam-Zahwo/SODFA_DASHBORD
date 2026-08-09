import type { Warehouse } from "@/lib/api";

export function warehouseName(list: Warehouse[] | undefined, id: string): string {
  if (!id) return "—";
  const found = (list ?? []).find((w) => w.warehouse_id === id || w.warehouse_name === id);
  return found ? found.warehouse_name : id;
}