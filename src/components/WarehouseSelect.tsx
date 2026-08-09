import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useI18n } from "@/lib/i18n";
import type { Warehouse } from "@/lib/api";

export const ALL_WAREHOUSES = "__all__";

export function WarehouseSelect({
  value,
  onChange,
  warehouses,
  includeAll,
  className,
}: {
  value: string;
  onChange: (v: string) => void;
  warehouses: Warehouse[];
  includeAll?: boolean;
  className?: string;
}) {
  const { t } = useI18n();
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className={className}>
        <SelectValue placeholder={t("select_warehouse")} />
      </SelectTrigger>
      <SelectContent>
        {includeAll && <SelectItem value={ALL_WAREHOUSES}>{t("all_warehouses")}</SelectItem>}
        {warehouses.map((w) => (
          <SelectItem key={w.warehouse_id} value={w.warehouse_id}>
            {w.warehouse_name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}