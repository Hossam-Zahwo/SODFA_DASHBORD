import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import {
  AlertTriangle,
  BarChart3,
  Boxes,
  CircleDollarSign,
  Layers,
  Package,
  PackageCheck,
  PackageX,
  RotateCcw,
  ShoppingCart,
  TrendingDown,
  TrendingUp,
  Wallet,
} from "lucide-react";

import { AppShell } from "@/components/AppShell";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import {
  ALL_WAREHOUSES,
  WarehouseSelect,
} from "@/components/WarehouseSelect";

import {
  useDamagedReturns,
  useInventory,
  useReturns,
  useSales,
  useWarehouses,
} from "@/hooks/useSodfa";

import { useI18n, type TKey } from "@/lib/i18n";

import {
  fmtMoney,
  inRange,
  type RangeKey,
} from "@/lib/dates";

/* ============================================================
   ROUTE
   ============================================================ */

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      {
        title: "Dashboard — SODFA صدفه",
      },
      {
        name: "description",
        content:
          "Live SODFA overview: inventory, sales, returns and damaged returns.",
      },
      {
        property: "og:title",
        content: "Dashboard — SODFA صدفه",
      },
      {
        property: "og:description",
        content:
          "Inventory, sales and returns at a glance.",
      },
    ],
  }),

  component: Dashboard,
});

/* ============================================================
   RANGE FILTERS
   ============================================================ */

const RANGES: {
  key: RangeKey;
  label: TKey;
}[] = [
  {
    key: "today",
    label: "today",
  },
  {
    key: "week",
    label: "this_week",
  },
  {
    key: "month",
    label: "this_month",
  },
  {
    key: "year",
    label: "this_year",
  },
  {
    key: "all",
    label: "all_time",
  },
  {
    key: "custom",
    label: "custom_range",
  },
];

/* ============================================================
   ENGLISH NUMBERS
   ============================================================ */

function enDigits(value: unknown) {
  return String(value ?? "")
    .replace(/[٠-٩]/g, (digit) =>
      String(
        "٠١٢٣٤٥٦٧٨٩".indexOf(
          digit,
        ),
      ),
    )
    .replace(/[۰-۹]/g, (digit) =>
      String(
        "۰۱۲۳۴۵۶۷۸۹".indexOf(
          digit,
        ),
      ),
    );
}

function numberEn(
  value: number | string,
) {
  return enDigits(
    Number(value || 0).toLocaleString(
      "en-US",
    ),
  );
}

function moneyEn(
  value: number,
  lang: string,
) {
  return enDigits(
    fmtMoney(
      value,
      lang as any,
    ),
  );
}

/* ============================================================
   DATE HELPERS
   ============================================================ */

function dateLabel(value: unknown) {
  if (!value) {
    return "—";
  }

  const date = new Date(
    String(value),
  );

  if (
    Number.isNaN(
      date.getTime(),
    )
  ) {
    return enDigits(
      String(value),
    );
  }

  return date.toLocaleDateString(
    "en-US",
    {
      month: "short",
      day: "numeric",
    },
  );
}

/* ============================================================
   DASHBOARD
   ============================================================ */

function Dashboard() {
  const { t, lang } = useI18n();

  const inventory =
    useInventory();

  const sales =
    useSales();

  const returns =
    useReturns();

  const damaged =
    useDamagedReturns();

  const warehouses =
    useWarehouses();

  /* ----------------------------------------------------------
     FILTER STATE
     ---------------------------------------------------------- */

  const [range, setRange] =
    useState<RangeKey>(
      "month",
    );

  const [from, setFrom] =
    useState("");

  const [to, setTo] =
    useState("");

  const [wh, setWh] =
    useState(
      ALL_WAREHOUSES,
    );

  /* ==========================================================
     FILTER INVENTORY
     ========================================================== */

  const filteredInventory =
    useMemo(() => {
      const rows =
        inventory.data ?? [];

      if (
        wh ===
        ALL_WAREHOUSES
      ) {
        return rows;
      }

      return rows.filter(
        (row) =>
          row.warehouse ===
          wh,
      );
    }, [
      inventory.data,
      wh,
    ]);

  /* ==========================================================
     FILTER SALES
     ========================================================== */

  const filteredSales =
    useMemo(() => {
      const rows =
        sales.data ?? [];

      return rows
        .filter(
          (row) =>
            wh ===
              ALL_WAREHOUSES ||
            row.warehouse ===
              wh,
        )
        .filter((row) =>
          inRange(
            row.sale_date,
            range,
            from,
            to,
          ),
        );
    }, [
      sales.data,
      wh,
      range,
      from,
      to,
    ]);

  /* ==========================================================
     FILTER RETURNS
     ========================================================== */

  const filteredReturns =
    useMemo(() => {
      const rows =
        returns.data ?? [];

      return rows
        .filter(
          (row) =>
            wh ===
              ALL_WAREHOUSES ||
            row.warehouse ===
              wh,
        )
        .filter((row) =>
          inRange(
            row.return_date,
            range,
            from,
            to,
          ),
        );
    }, [
      returns.data,
      wh,
      range,
      from,
      to,
    ]);

  /* ==========================================================
     FILTER DAMAGED
     ========================================================== */

  const filteredDamaged =
    useMemo(() => {
      const rows =
        damaged.data ?? [];

      return rows
        .filter(
          (row) =>
            wh ===
              ALL_WAREHOUSES ||
            row.warehouse ===
              wh,
        )
        .filter((row) =>
          inRange(
            row.return_date,
            range,
            from,
            to,
          ),
        );
    }, [
      damaged.data,
      wh,
      range,
      from,
      to,
    ]);

  /* ==========================================================
     MAIN STATS
     ========================================================== */

  const stats =
    useMemo(() => {
      const products =
        filteredInventory;

      /* INVENTORY */

      const stock =
        products.reduce(
          (sum, product) =>
            sum +
            Number(
              product.stock_qty ||
                0,
            ),
          0,
        );

      const sold =
        products.reduce(
          (sum, product) =>
            sum +
            Number(
              product.sold_qty ||
                0,
            ),
          0,
        );

      const remaining =
        products.reduce(
          (sum, product) =>
            sum +
            Number(
              product.remaining_qty ||
                0,
            ),
          0,
        );

      const inventoryValue =
        products.reduce(
          (sum, product) =>
            sum +
            Number(
              product.price ||
                0,
            ) *
              Number(
                product.remaining_qty ||
                  0,
              ),
          0,
        );

      /* SALES */

      const salesTotal =
        filteredSales.reduce(
          (sum, sale) =>
            sum +
            Number(
              sale.total || 0,
            ),
          0,
        );

      const salesCount =
        filteredSales.reduce(
          (sum, sale) =>
            sum +
            Number(
              sale.qty || 0,
            ),
          0,
        );

      /* RETURNS */

      const returnsCount =
        filteredReturns.reduce(
          (sum, item) =>
            sum +
            Number(
              item.qty || 0,
            ),
          0,
        );

      const returnsValue =
        filteredReturns.reduce(
          (sum, item) =>
            sum +
            Number(
              item.return_total ||
                0,
            ),
          0,
        );

      /* DAMAGED */

      const damagedCount =
        filteredDamaged.reduce(
          (sum, item) =>
            sum +
            Number(
              item.qty || 0,
            ),
          0,
        );

      /* PRODUCTS */

      const availableProducts =
        products.filter(
          (product) =>
            Number(
              product.remaining_qty ||
                0,
            ) > 5,
        );

      const lowStockProducts =
        products.filter(
          (product) => {
            const qty =
              Number(
                product.remaining_qty ||
                  0,
              );

            return (
              qty > 0 &&
              qty <= 5
            );
          },
        );

      const outOfStockProducts =
        products.filter(
          (product) =>
            Number(
              product.remaining_qty ||
                0,
            ) <= 0,
        );

      return {
        products:
          products.length,

        stock,

        sold,

        remaining,

        inventoryValue,

        salesTotal,

        salesCount,

        returnsCount,

        returnsValue,

        damagedCount,

        availableProducts,

        lowStockProducts,

        outOfStockProducts,
      };
    }, [
      filteredInventory,
      filteredSales,
      filteredReturns,
      filteredDamaged,
    ]);

  /* ==========================================================
     SALES CHART
     ========================================================== */

  const chartData =
    useMemo(() => {
      const map =
        new Map<
          string,
          {
            label: string;
            sales: number;
            units: number;
          }
        >();

      filteredSales.forEach(
        (sale) => {
          if (
            !sale.sale_date
          ) {
            return;
          }

          const date =
            new Date(
              String(
                sale.sale_date,
              ),
            );

          if (
            Number.isNaN(
              date.getTime(),
            )
          ) {
            return;
          }

          const key =
            date
              .toISOString()
              .slice(
                0,
                10,
              );

          const existing =
            map.get(
              key,
            ) ?? {
              label:
                dateLabel(
                  date,
                ),
              sales: 0,
              units: 0,
            };

          existing.sales +=
            Number(
              sale.total ||
                0,
            );

          existing.units +=
            Number(
              sale.qty || 0,
            );

          map.set(
            key,
            existing,
          );
        },
      );

      return Array.from(
        map.entries(),
      )
        .sort(
          ([a], [b]) =>
            a.localeCompare(b),
        )
        .slice(-7)
        .map(
          ([, value]) =>
            value,
        );
    }, [
      filteredSales,
    ]);

  /* ==========================================================
     INVENTORY STATUS
     ========================================================== */

  const inventoryStatus =
    useMemo(() => {
      const available =
        stats
          .availableProducts
          .length;

      const low =
        stats
          .lowStockProducts
          .length;

      const out =
        stats
          .outOfStockProducts
          .length;

      const total =
        available +
        low +
        out;

      return {
        available,
        low,
        out,
        total,
      };
    }, [stats]);

  /* ==========================================================
     PERCENTAGES
     ========================================================== */

  const stockSoldPercentage =
    stats.stock > 0
      ? Math.round(
          (stats.sold /
            stats.stock) *
            100,
        )
      : 0;

  const stockRemainingPercentage =
    stats.stock > 0
      ? Math.round(
          (stats.remaining /
            stats.stock) *
            100,
        )
      : 0;

  const returnPercentage =
    stats.salesCount > 0
      ? Math.round(
          (stats.returnsCount /
            stats.salesCount) *
            100,
        )
      : 0;

  const damagedPercentage =
    stats.returnsCount > 0
      ? Math.round(
          (stats.damagedCount /
            stats.returnsCount) *
            100,
        )
      : 0;

  /* ==========================================================
     UI
     ========================================================== */

  return (
    <AppShell
      title={t(
        "dashboard",
      )}
    >
      <div className="space-y-2.5 pb-2">

        {/* ====================================================
           FILTER BAR
           ==================================================== */}

        <DashboardTopBar
          range={range}
          setRange={setRange}
          from={from}
          setFrom={setFrom}
          to={to}
          setTo={setTo}
          wh={wh}
          setWh={setWh}
          warehouses={
            warehouses.data ??
            []
          }
          t={t}
        />

        {/* ====================================================
           KPI
           ==================================================== */}

        <DashboardOverview
          stats={stats}
          lang={lang}
        />

        {/* ====================================================
           CHARTS
           ==================================================== */}

        <div className="grid gap-2.5 xl:grid-cols-[1.7fr_1fr]">

          <SalesChart
            data={chartData}
            total={
              stats.salesTotal
            }
            units={
              stats.salesCount
            }
            lang={lang}
          />

          <InventoryDonut
            available={
              inventoryStatus.available
            }
            low={
              inventoryStatus.low
            }
            out={
              inventoryStatus.out
            }
            total={
              inventoryStatus.total
            }
          />

        </div>

        {/* ====================================================
           DETAILED ANALYTICS
           ==================================================== */}

        <div className="grid gap-2.5 xl:grid-cols-3">

          {/* INVENTORY */}
          <InventoryDetails
            stats={stats}
            soldPercentage={
              stockSoldPercentage
            }
            remainingPercentage={
              stockRemainingPercentage
            }
            lang={lang}
          />

          {/* RETURNS */}
          <ReturnsDetails
            stats={stats}
            percentage={
              returnPercentage
            }
            lang={lang}
          />

          {/* DAMAGED */}
          <DamagedDetails
            stats={stats}
            percentage={
              damagedPercentage
            }
          />

        </div>

      </div>
    </AppShell>
  );
}

/* ============================================================
   TOP FILTER BAR
   ============================================================ */

function DashboardTopBar({
  range,
  setRange,
  from,
  setFrom,
  to,
  setTo,
  wh,
  setWh,
  warehouses,
  t,
}: any) {
  return (
    <Card className="rounded-xl border bg-white px-3 py-2 shadow-sm">

      <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">

        <div className="flex items-center gap-2">

          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#0B2A52]/10 text-[#0B2A52]">
            <BarChart3 className="h-4 w-4" />
          </div>

          <div>
            <h1 className="text-sm font-bold text-[#0B2A52]">
              لوحة التحكم
            </h1>

            <p className="text-[10px] text-muted-foreground">
              نظرة سريعة على أداء المتجر
            </p>
          </div>

        </div>

        <div className="flex flex-wrap items-center gap-1.5">

          {/* PERIOD */}

          <select
            value={range}
            onChange={(event) =>
              setRange(
                event.target
                  .value as RangeKey,
              )
            }
            className="h-8 min-w-[125px] rounded-lg border bg-white px-3 text-xs font-medium outline-none focus:border-[#0B2A52]"
          >
            {RANGES.map(
              (item) => (
                <option
                  key={
                    item.key
                  }
                  value={
                    item.key
                  }
                >
                  {t(
                    item.label,
                  )}
                </option>
              ),
            )}
          </select>

          {/* WAREHOUSE */}

          <WarehouseSelect
            value={wh}
            onChange={setWh}
            warehouses={
              warehouses
            }
            includeAll
            className="h-8 w-[150px] text-xs"
          />

          {/* CUSTOM DATE */}

          {range ===
            "custom" && (
            <>
              <div className="flex items-center gap-1">

                <Label
                  htmlFor="dashboard-from"
                  className="text-[10px]"
                >
                  من
                </Label>

                <Input
                  id="dashboard-from"
                  type="date"
                  value={from}
                  onChange={(event) =>
                    setFrom(
                      event.target
                        .value,
                    )
                  }
                  className="h-8 w-[125px] text-xs"
                />

              </div>

              <div className="flex items-center gap-1">

                <Label
                  htmlFor="dashboard-to"
                  className="text-[10px]"
                >
                  إلى
                </Label>

                <Input
                  id="dashboard-to"
                  type="date"
                  value={to}
                  onChange={(event) =>
                    setTo(
                      event.target
                        .value,
                    )
                  }
                  className="h-8 w-[125px] text-xs"
                />

              </div>
            </>
          )}

        </div>

      </div>
    </Card>
  );
}

/* ============================================================
   KPI CARDS
   ============================================================ */

function DashboardOverview({
  stats,
  lang,
}: any) {
  const cards = [
    {
      label: "إجمالي المنتجات",
      value:
        numberEn(
          stats.products,
        ),
      icon: Package,
      type: "navy",
    },
    {
      label: "إجمالي الوحدات",
      value:
        numberEn(
          stats.stock,
        ),
      icon: Boxes,
      type: "blue",
    },
    {
      label: "قيمة المخزون",
      value:
        moneyEn(
          stats.inventoryValue,
          lang,
        ),
      icon: Wallet,
      type: "green",
    },
    {
      label: "إجمالي المبيعات",
      value:
        moneyEn(
          stats.salesTotal,
          lang,
        ),
      icon: CircleDollarSign,
      type: "purple",
    },
    {
      label: "المرتجعات",
      value:
        numberEn(
          stats.returnsCount,
        ),
      icon: RotateCcw,
      type: "orange",
    },
    {
      label: "التالف",
      value:
        numberEn(
          stats.damagedCount,
        ),
      icon: PackageX,
      type: "red",
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-6">

      {cards.map(
        (card) => {
          const Icon =
            card.icon;

          return (
            <Card
              key={
                card.label
              }
              className="rounded-xl border bg-white px-3 py-2.5 shadow-sm"
            >

              <div className="flex items-center gap-2.5">

                <div
                  className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${getIconBg(
                    card.type,
                  )}`}
                >
                  <Icon className="h-4 w-4" />
                </div>

                <div className="min-w-0">

                  <p className="truncate text-[10px] text-muted-foreground">
                    {
                      card.label
                    }
                  </p>

                  <p
                    dir="ltr"
                    className="mt-0.5 truncate text-sm font-bold text-[#172B4D]"
                  >
                    {
                      card.value
                    }
                  </p>

                </div>

              </div>

            </Card>
          );
        },
      )}

    </div>
  );
}

/* ============================================================
   SALES CHART
   ============================================================ */

function SalesChart({
  data,
  total,
  units,
  lang,
}: any) {
  const width = 700;
  const height = 230;

  const paddingLeft = 48;
  const paddingRight = 18;
  const paddingTop = 22;
  const paddingBottom = 35;

  const chartWidth =
    width -
    paddingLeft -
    paddingRight;

  const chartHeight =
    height -
    paddingTop -
    paddingBottom;

  const maxValue =
    Math.max(
      ...data.map(
        (item: any) =>
          Number(
            item.sales ||
              0,
          ),
      ),
      1,
    );

  const points =
    data.map(
      (
        item: any,
        index: number,
      ) => {
        const x =
          data.length ===
          1
            ? width / 2
            : paddingLeft +
              (index /
                Math.max(
                  data.length -
                    1,
                  1,
                )) *
                chartWidth;

        const y =
          paddingTop +
          chartHeight -
          (Number(
            item.sales ||
              0,
          ) /
            maxValue) *
            chartHeight;

        return {
          x,
          y,
          ...item,
        };
      },
    );

  const linePath =
    points.length
      ? points
          .map(
            (
              point: any,
              index: number,
            ) =>
              `${
                index ===
                0
                  ? "M"
                  : "L"
              } ${point.x} ${point.y}`,
          )
          .join(" ")
      : "";

  const areaPath =
    points.length
      ? `${linePath} L ${
          points[
            points.length -
              1
          ].x
        } ${
          paddingTop +
          chartHeight
        } L ${
          points[0].x
        } ${
          paddingTop +
          chartHeight
        } Z`
      : "";

  return (
    <Card className="overflow-hidden rounded-xl border bg-white shadow-sm">

      <div className="flex items-center justify-between border-b px-3 py-2.5">

        <div>
          <h2 className="text-xs font-bold text-[#172B4D]">
            المبيعات
          </h2>

          <p className="text-[10px] text-muted-foreground">
            حركة المبيعات خلال الفترة
          </p>
        </div>

        <div className="text-end">

          <p
            dir="ltr"
            className="text-sm font-bold text-[#0B2A52]"
          >
            {moneyEn(
              total,
              lang,
            )}
          </p>

          <p
            dir="ltr"
            className="text-[9px] text-muted-foreground"
          >
            {numberEn(
              units,
            )}{" "}
            وحدة
          </p>

        </div>

      </div>

      <div className="px-2 pb-1 pt-2">

        {data.length ===
        0 ? (
          <div className="flex h-[220px] items-center justify-center text-xs text-muted-foreground">
            لا توجد مبيعات في الفترة المحددة
          </div>
        ) : (
          <svg
            viewBox={`0 0 ${width} ${height}`}
            className="h-[220px] w-full"
            preserveAspectRatio="none"
          >

            {[0, 1, 2, 3].map(
              (line) => {
                const y =
                  paddingTop +
                  (chartHeight /
                    3) *
                    line;

                return (
                  <line
                    key={line}
                    x1={
                      paddingLeft
                    }
                    x2={
                      width -
                      paddingRight
                    }
                    y1={y}
                    y2={y}
                    stroke="#E8EEF5"
                    strokeWidth="1"
                  />
                );
              },
            )}

            <path
              d={areaPath}
              fill="#0B2A52"
              fillOpacity="0.07"
            />

            <path
              d={linePath}
              fill="none"
              stroke="#0B2A52"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
            />

            {points.map(
              (
                point: any,
                index: number,
              ) => (
                <g
                  key={
                    index
                  }
                >

                  <circle
                    cx={
                      point.x
                    }
                    cy={
                      point.y
                    }
                    r="5"
                    fill="#fff"
                    stroke="#0B2A52"
                    strokeWidth="2.5"
                  />

                  <title>
                    {`${point.label}: ${moneyEn(
                      point.sales,
                      lang,
                    )}`}
                  </title>

                </g>
              ),
            )}

            {points.map(
              (
                point: any,
                index: number,
              ) => (
                <text
                  key={`label-${index}`}
                  x={
                    point.x
                  }
                  y={
                    height -
                    10
                  }
                  textAnchor="middle"
                  fontSize="11"
                  fill="#7B8794"
                >
                  {
                    point.label
                  }
                </text>
              ),
            )}

          </svg>
        )}

      </div>
    </Card>
  );
}

/* ============================================================
   INVENTORY DONUT
   ============================================================ */

function InventoryDonut({
  available,
  low,
  out,
  total,
}: {
  available: number;
  low: number;
  out: number;
  total: number;
}) {
  const radius = 72;

  const circumference =
    2 *
    Math.PI *
    radius;

  const availableLength =
    total > 0
      ? (available /
          total) *
        circumference
      : 0;

  const lowLength =
    total > 0
      ? (low / total) *
        circumference
      : 0;

  const outLength =
    total > 0
      ? (out / total) *
        circumference
      : 0;

  return (
    <Card className="overflow-hidden rounded-xl border bg-white shadow-sm">

      <div className="border-b px-3 py-2.5">

        <h2 className="text-xs font-bold text-[#172B4D]">
          حالة المخزون
        </h2>

        <p className="text-[10px] text-muted-foreground">
          توزيع المنتجات حسب الكمية المتبقية
        </p>

      </div>

      <div className="flex min-h-[240px] items-center justify-center gap-5 px-4 py-3">

        <div className="relative h-[170px] w-[170px] shrink-0">

          <svg
            viewBox="0 0 200 200"
            className="h-full w-full -rotate-90"
          >

            <circle
              cx="100"
              cy="100"
              r={radius}
              fill="none"
              stroke="#EEF2F7"
              strokeWidth="25"
            />

            {availableLength >
              0 && (
              <circle
                cx="100"
                cy="100"
                r={radius}
                fill="none"
                stroke="#16A34A"
                strokeWidth="25"
                strokeDasharray={`${availableLength} ${circumference}`}
                strokeDashoffset="0"
              />
            )}

            {lowLength >
              0 && (
              <circle
                cx="100"
                cy="100"
                r={radius}
                fill="none"
                stroke="#F59E0B"
                strokeWidth="25"
                strokeDasharray={`${lowLength} ${circumference}`}
                strokeDashoffset={`-${availableLength}`}
              />
            )}

            {outLength >
              0 && (
              <circle
                cx="100"
                cy="100"
                r={radius}
                fill="none"
                stroke="#EF4444"
                strokeWidth="25"
                strokeDasharray={`${outLength} ${circumference}`}
                strokeDashoffset={`-${
                  availableLength +
                  lowLength
                }`}
              />
            )}

          </svg>

          <div className="absolute inset-0 flex flex-col items-center justify-center">

            <span
              dir="ltr"
              className="text-2xl font-bold text-[#172B4D]"
            >
              {numberEn(
                total,
              )}
            </span>

            <span className="text-[10px] text-muted-foreground">
              منتج
            </span>

          </div>

        </div>

        <div className="min-w-[125px] space-y-3">

          <LegendItem
            color="bg-green-600"
            label="متوفر"
            value={
              available
            }
            total={total}
          />

          <LegendItem
            color="bg-amber-500"
            label="منخفض"
            value={low}
            total={total}
          />

          <LegendItem
            color="bg-red-500"
            label="نفد"
            value={out}
            total={total}
          />

        </div>

      </div>
    </Card>
  );
}

/* ============================================================
   LEGEND
   ============================================================ */

function LegendItem({
  color,
  label,
  value,
  total,
}: {
  color: string;
  label: string;
  value: number;
  total: number;
}) {
  const percentage =
    total > 0
      ? Math.round(
          (value / total) *
            100,
        )
      : 0;

  return (
    <div className="flex items-center justify-between gap-3">

      <div className="flex items-center gap-2">

        <span
          className={`h-2.5 w-2.5 rounded-full ${color}`}
        />

        <span className="text-[11px] text-muted-foreground">
          {label}
        </span>

      </div>

      <div
        dir="ltr"
        className="text-end"
      >

        <span className="text-xs font-bold text-[#172B4D]">
          {numberEn(
            value,
          )}
        </span>

        <span className="ms-1 text-[9px] text-muted-foreground">
          (
          {numberEn(
            percentage,
          )}
          %)
        </span>

      </div>

    </div>
  );
}

/* ============================================================
   INVENTORY DETAILS
   ============================================================ */

function InventoryDetails({
  stats,
  soldPercentage,
  remainingPercentage,
  lang,
}: any) {
  return (
    <Card className="overflow-hidden rounded-xl border bg-white shadow-sm">

      <SectionHeader
        icon={Boxes}
        title="تفاصيل المخزون"
        description="حالة الوحدات وقيمة المخزون الحالية"
      />

      <div className="p-3">

        {/* MAIN NUMBER */}

        <div className="rounded-xl bg-[#0B2A52]/5 p-3">

          <div className="flex items-center justify-between">

            <div>

              <p className="text-[10px] text-muted-foreground">
                الوحدات المتبقية
              </p>

              <p
                dir="ltr"
                className="mt-0.5 text-2xl font-bold text-[#0B2A52]"
              >
                {numberEn(
                  stats.remaining,
                )}
              </p>

            </div>

            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#0B2A52]/10 text-[#0B2A52]">
              <Layers className="h-4 w-4" />
            </div>

          </div>

          <p className="mt-1 text-[9px] text-muted-foreground">
            من إجمالي{" "}
            <span dir="ltr">
              {numberEn(
                stats.stock,
              )}
            </span>{" "}
            وحدة
          </p>

        </div>

        {/* STATS */}

        <div className="mt-2 grid grid-cols-3 gap-1.5">

          <SmallMetric
            label="إجمالي"
            value={numberEn(
              stats.stock,
            )}
          />

          <SmallMetric
            label="مباع"
            value={numberEn(
              stats.sold,
            )}
          />

          <SmallMetric
            label="متبقي"
            value={numberEn(
              stats.remaining,
            )}
          />

        </div>

        {/* PROGRESS */}

        <div className="mt-3 space-y-2.5">

          <ProgressRow
            label="تم البيع"
            value={numberEn(
              stats.sold,
            )}
            percentage={
              soldPercentage
            }
          />

          <ProgressRow
            label="المتبقي"
            value={numberEn(
              stats.remaining,
            )}
            percentage={
              remainingPercentage
            }
          />

        </div>

        {/* VALUE */}

        <div className="mt-3 flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2">

          <div className="flex items-center gap-2">

            <Wallet className="h-3.5 w-3.5 text-[#0B2A52]" />

            <span className="text-[10px] font-medium">
              قيمة المخزون
            </span>

          </div>

          <span
            dir="ltr"
            className="text-xs font-bold text-[#0B2A52]"
          >
            {moneyEn(
              stats.inventoryValue,
              lang,
            )}
          </span>

        </div>

        {/* QUICK STATUS */}

        <div className="mt-2 grid grid-cols-3 gap-1.5">

          <StatusBox
            label="متوفر"
            value={
              stats
                .availableProducts
                .length
            }
            type="green"
          />

          <StatusBox
            label="منخفض"
            value={
              stats
                .lowStockProducts
                .length
            }
            type="orange"
          />

          <StatusBox
            label="نفد"
            value={
              stats
                .outOfStockProducts
                .length
            }
            type="red"
          />

        </div>

      </div>
    </Card>
  );
}

/* ============================================================
   RETURNS DETAILS
   ============================================================ */

function ReturnsDetails({
  stats,
  percentage,
  lang,
}: any) {
  return (
    <Card className="overflow-hidden rounded-xl border bg-white shadow-sm">

      <SectionHeader
        icon={RotateCcw}
        title="تفاصيل المرتجعات"
        description="حجم وقيمة المنتجات المرتجعة"
      />

      <div className="p-3">

        {/* MAIN */}

        <div className="rounded-xl bg-orange-500/5 p-3">

          <div className="flex items-center justify-between">

            <div>

              <p className="text-[10px] text-muted-foreground">
                الوحدات المرتجعة
              </p>

              <p
                dir="ltr"
                className="mt-0.5 text-2xl font-bold text-orange-600"
              >
                {numberEn(
                  stats.returnsCount,
                )}
              </p>

            </div>

            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-orange-500/10 text-orange-600">
              <RotateCcw className="h-4 w-4" />
            </div>

          </div>

          <p className="mt-1 text-[9px] text-muted-foreground">
            مقارنة بحركة البيع في الفترة المحددة
          </p>

        </div>

        {/* STATS */}

        <div className="mt-2 grid grid-cols-2 gap-1.5">

          <SmallMetric
            label="الوحدات"
            value={numberEn(
              stats.returnsCount,
            )}
          />

          <SmallMetric
            label="قيمة المرتجعات"
            value={moneyEn(
              stats.returnsValue,
              lang,
            )}
          />

        </div>

        {/* RETURN RATE */}

        <div className="mt-3">

          <ProgressRow
            label="نسبة المرتجعات"
            value={`${numberEn(
              stats.returnsCount,
            )} وحدة`}
            percentage={
              percentage
            }
            allowOver100
          />

        </div>

        {/* EXTRA INFO */}

        <div className="mt-3 grid grid-cols-2 gap-1.5">

          <InfoBox
            icon={ShoppingCart}
            label="الوحدات المباعة"
            value={numberEn(
              stats.salesCount,
            )}
          />

          <InfoBox
            icon={CircleDollarSign}
            label="قيمة المبيعات"
            value={moneyEn(
              stats.salesTotal,
              lang,
            )}
          />

        </div>

        {/* EXPLANATION */}

        <div className="mt-2 rounded-lg bg-slate-50 px-3 py-2">

          <p className="text-[9px] leading-4 text-muted-foreground">

            <span className="font-bold text-[#172B4D]">
              قراءة:
            </span>{" "}

            ارتفاع المرتجعات قد يشير إلى
            الحاجة لمراجعة جودة المنتج
            أو الوصف أو التغليف أو الشحن.

          </p>

        </div>

      </div>
    </Card>
  );
}

/* ============================================================
   DAMAGED DETAILS
   ============================================================ */

function DamagedDetails({
  stats,
  percentage,
}: any) {
  return (
    <Card className="overflow-hidden rounded-xl border bg-white shadow-sm">

      <SectionHeader
        icon={PackageX}
        title="تفاصيل التالف"
        description="متابعة الوحدات التالفة من المرتجعات"
        danger
      />

      <div className="p-3">

        {/* MAIN */}

        <div className="rounded-xl bg-red-500/5 p-3">

          <div className="flex items-center justify-between">

            <div>

              <p className="text-[10px] text-muted-foreground">
                الوحدات التالفة
              </p>

              <p
                dir="ltr"
                className="mt-0.5 text-2xl font-bold text-red-600"
              >
                {numberEn(
                  stats.damagedCount,
                )}
              </p>

            </div>

            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-red-500/10 text-red-600">
              <AlertTriangle className="h-4 w-4" />
            </div>

          </div>

          <p className="mt-1 text-[9px] text-muted-foreground">
            من إجمالي الوحدات المرتجعة
          </p>

        </div>

        {/* STATS */}

        <div className="mt-2 grid grid-cols-2 gap-1.5">

          <SmallMetric
            label="المرتجعات"
            value={numberEn(
              stats.returnsCount,
            )}
          />

          <SmallMetric
            label="التالف"
            value={numberEn(
              stats.damagedCount,
            )}
          />

        </div>

        {/* RATE */}

        <div className="mt-3">

          <ProgressRow
            label="نسبة التالف"
            value={`${numberEn(
              stats.damagedCount,
            )} وحدة`}
            percentage={
              percentage
            }
          />

        </div>

        {/* STATUS */}

        <div className="mt-3 grid grid-cols-2 gap-1.5">

          <InfoBox
            icon={PackageX}
            label="وحدات تالفة"
            value={numberEn(
              stats.damagedCount,
            )}
            danger
          />

          <InfoBox
            icon={PackageCheck}
            label="مرتجعات غير تالفة"
            value={numberEn(
              Math.max(
                0,
                stats.returnsCount -
                  stats.damagedCount,
              ),
            )}
          />

        </div>

        {/* EXPLANATION */}

        <div className="mt-2 rounded-lg bg-slate-50 px-3 py-2">

          <p className="text-[9px] leading-4 text-muted-foreground">

            <span className="font-bold text-[#172B4D]">
              قراءة:
            </span>{" "}

            {stats.damagedCount ===
            0
              ? "لا توجد وحدات تالفة مسجلة في الفترة المحددة."
              : "ارتفاع نسبة التالف يستدعي مراجعة أسباب التلف والتغليف والشحن."}

          </p>

        </div>

      </div>
    </Card>
  );
}

/* ============================================================
   SECTION HEADER
   ============================================================ */

function SectionHeader({
  icon: Icon,
  title,
  description,
  danger,
}: {
  icon: any;
  title: string;
  description: string;
  danger?: boolean;
}) {
  return (
    <div className="flex items-center gap-2 border-b px-3 py-2.5">

      <div
        className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${
          danger
            ? "bg-red-500/10 text-red-600"
            : "bg-[#0B2A52]/10 text-[#0B2A52]"
        }`}
      >
        <Icon className="h-3.5 w-3.5" />
      </div>

      <div className="min-w-0">

        <h2 className="truncate text-xs font-bold text-[#172B4D]">
          {title}
        </h2>

        <p className="truncate text-[9px] text-muted-foreground">
          {description}
        </p>

      </div>

    </div>
  );
}

/* ============================================================
   SMALL METRIC
   ============================================================ */

function SmallMetric({
  label,
  value,
}: {
  label: string;
  value: any;
}) {
  return (
    <div className="rounded-lg bg-slate-50 px-2 py-2 text-center">

      <p className="truncate text-[9px] text-muted-foreground">
        {label}
      </p>

      <p
        dir="ltr"
        className="mt-0.5 truncate text-xs font-bold text-[#172B4D]"
      >
        {value}
      </p>

    </div>
  );
}

/* ============================================================
   STATUS BOX
   ============================================================ */

function StatusBox({
  label,
  value,
  type,
}: {
  label: string;
  value: number;
  type:
    | "green"
    | "orange"
    | "red";
}) {
  const classes = {
    green:
      "bg-green-50 text-green-700",
    orange:
      "bg-orange-50 text-orange-700",
    red:
      "bg-red-50 text-red-700",
  };

  return (
    <div
      className={`rounded-lg px-2 py-1.5 text-center ${classes[type]}`}
    >

      <p className="text-[8px]">
        {label}
      </p>

      <p
        dir="ltr"
        className="mt-0.5 text-xs font-bold"
      >
        {numberEn(value)}
      </p>

    </div>
  );
}

/* ============================================================
   INFO BOX
   ============================================================ */

function InfoBox({
  icon: Icon,
  label,
  value,
  danger,
}: {
  icon: any;
  label: string;
  value: any;
  danger?: boolean;
}) {
  return (
    <div className="flex items-center gap-2 rounded-lg bg-slate-50 px-2.5 py-2">

      <div
        className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${
          danger
            ? "bg-red-500/10 text-red-600"
            : "bg-[#0B2A52]/10 text-[#0B2A52]"
        }`}
      >
        <Icon className="h-3.5 w-3.5" />
      </div>

      <div className="min-w-0">

        <p className="truncate text-[8px] text-muted-foreground">
          {label}
        </p>

        <p
          dir="ltr"
          className={`truncate text-xs font-bold ${
            danger
              ? "text-red-600"
              : "text-[#172B4D]"
          }`}
        >
          {value}
        </p>

      </div>

    </div>
  );
}

/* ============================================================
   PROGRESS ROW
   ============================================================ */

function ProgressRow({
  label,
  value,
  percentage,
  allowOver100 = false,
}: {
  label: string;
  value: string;
  percentage: number;
  allowOver100?: boolean;
}) {
  const raw =
    Number(
      percentage,
    ) || 0;

  const visualPercentage =
    Math.min(
      100,
      Math.max(
        0,
        raw,
      ),
    );

  return (
    <div className="space-y-1.5">

      <div className="flex items-center justify-between gap-2">

        <span className="truncate text-[10px] font-medium text-[#172B4D]">
          {label}
        </span>

        <span
          dir="ltr"
          className="shrink-0 text-[10px] font-bold text-[#172B4D]"
        >
          {value}
          <span className="ms-1 text-muted-foreground">
            (
            {numberEn(
              raw,
            )}
            %)
          </span>
        </span>

      </div>

      <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">

        <div
          className="h-full rounded-full bg-[#0B2A52] transition-all duration-500"
          style={{
            width: `${visualPercentage}%`,
          }}
        />

      </div>

      {allowOver100 &&
        raw > 100 && (
          <p className="text-[8px] text-orange-600">
            النسبة أعلى من 100% لأن المقارنة
            تتم مع مبيعات الفترة المحددة فقط.
          </p>
        )}

    </div>
  );
}

/* ============================================================
   ICON BACKGROUND
   ============================================================ */

function getIconBg(
  type: string,
) {
  switch (type) {
    case "green":
      return "bg-green-500/10 text-green-600";

    case "blue":
      return "bg-blue-500/10 text-blue-600";

    case "purple":
      return "bg-violet-500/10 text-violet-600";

    case "orange":
      return "bg-orange-500/10 text-orange-600";

    case "red":
      return "bg-red-500/10 text-red-600";

    default:
      return "bg-[#0B2A52]/10 text-[#0B2A52]";
  }
}