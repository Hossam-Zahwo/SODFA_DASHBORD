import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Boxes, PackageX, RotateCcw, ShoppingCart, Wallet } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  useDamagedReturns,
  useInventory,
  useReturns,
  useSales,
} from "@/hooks/useSodfa";
import { useI18n, type TKey } from "@/lib/i18n";
import { fmtMoney, inRange, type RangeKey } from "@/lib/dates";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Dashboard — SODFA صدفة" },
      {
        name: "description",
        content: "Live SODFA overview: inventory value, sales, returns and damaged returns.",
      },
      { property: "og:title", content: "Dashboard — SODFA صدفة" },
      { property: "og:description", content: "Inventory, sales and returns at a glance." },
    ],
  }),
  component: Dashboard,
});

const RANGES: { key: RangeKey; label: TKey }[] = [
  { key: "today", label: "today" },
  { key: "week", label: "this_week" },
  { key: "month", label: "this_month" },
  { key: "year", label: "this_year" },
  { key: "all", label: "all_time" },
];

function Dashboard() {
  const { t, lang } = useI18n();
  const inventory = useInventory();
  const sales = useSales();
  const returns = useReturns();
  const damaged = useDamagedReturns();
  const [range, setRange] = useState<RangeKey>("month");

  const stats = useMemo(() => {
    const products = inventory.data ?? [];
    const s = (sales.data ?? []).filter((x) => inRange(x.sale_date, range));
    const r = (returns.data ?? []).filter((x) => inRange(x.return_date, range));
    const d = (damaged.data ?? []).filter((x) => inRange(x.return_date, range));
    return {
      products: products.length,
      value: products.reduce((sum, p) => sum + p.price * p.remaining_qty, 0),
      salesTotal: s.reduce((sum, x) => sum + x.total, 0),
      salesCount: s.reduce((sum, x) => sum + x.qty, 0),
      returnsCount: r.reduce((sum, x) => sum + x.qty, 0),
      damagedCount: d.reduce((sum, x) => sum + x.qty, 0),
    };
  }, [inventory.data, sales.data, returns.data, damaged.data, range]);

  const cards = [
    { label: t("total_products"), value: String(stats.products), icon: Boxes },
    { label: t("inventory_value"), value: fmtMoney(stats.value, lang), icon: Wallet },
    {
      label: t("total_sales"),
      value: `${fmtMoney(stats.salesTotal, lang)} • ${stats.salesCount}`,
      icon: ShoppingCart,
    },
    { label: t("total_returns"), value: String(stats.returnsCount), icon: RotateCcw },
    { label: t("total_damaged"), value: String(stats.damagedCount), icon: PackageX },
  ];

  return (
    <AppShell title={t("dashboard")}>
      <div className="space-y-5">
        <div className="flex flex-wrap gap-2">
          {RANGES.map((r) => (
            <Button
              key={r.key}
              size="sm"
              variant={range === r.key ? "default" : "outline"}
              onClick={() => setRange(r.key)}
            >
              {t(r.label)}
            </Button>
          ))}
        </div>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {cards.map(({ label, value, icon: Icon }) => (
            <Card key={label} className="flex items-center gap-4 p-5">
              <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-surface text-primary">
                <Icon className="h-6 w-6" />
              </span>
              <span className="min-w-0">
                <span className="block text-xs text-muted-foreground">{label}</span>
                <span className="block truncate text-xl font-bold">{value}</span>
              </span>
            </Card>
          ))}
        </div>
      </div>
    </AppShell>
  );
}
