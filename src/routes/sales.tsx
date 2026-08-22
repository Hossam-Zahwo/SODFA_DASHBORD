import { useCallback, useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import {
  BarChart3,
  Boxes,
  Camera,
  Image as ImageIcon,
  Layers,
  Minus,
  Package,
  Plus,
  ScanLine,
  ShoppingCart,
  Trash2,
  TrendingUp,
  Wallet,
  X,
} from "lucide-react";
import { toast } from "sonner";

import { AppShell } from "@/components/AppShell";
import { Blocks } from "@/components/blocks-export";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";

import { ProductImage } from "@/components/ProductImage";
import { CameraScanner } from "@/components/CameraScanner";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import {
  useApiMutation,
  useInventory,
  useSales,
  useWarehouses,
} from "@/hooks/useSodfa";

import { useUsbScanner } from "@/hooks/useUsbScanner";
import { api, type Product } from "@/lib/api";

import {
  errorMessage,
  useI18n,
  type TKey,
} from "@/lib/i18n";

import {
  fmtDate,
  fmtMoney,
  fmtTime,
  inRange,
  type RangeKey,
} from "@/lib/dates";

import { warehouseName } from "@/lib/warehouse";

import {
  ALL_WAREHOUSES,
  WarehouseSelect,
} from "@/components/WarehouseSelect";

/* ============================================================
   SODFA BRAND COLORS

   Primary Purple: #9B4BA8
   Dark Purple:   #7B2C8E
   Light Purple:  #C084CC
   Black:         #050505
   White:         #FFFFFF
   ============================================================ */


/* ============================================================
   ROUTE
   ============================================================ */

export const Route = createFileRoute("/sales")({
  head: () => ({
    meta: [
      {
        title: "Sales — SODFA صدفة",
      },
      {
        name: "description",
        content:
          "Sell products by USB scanner, phone camera or manual search, and track history.",
      },
      {
        property: "og:title",
        content: "Sales — SODFA صدفة",
      },
      {
        property: "og:description",
        content: "Barcode selling and full sales history.",
      },
    ],
  }),

  component: SalesPage,
});


/* ============================================================
   TYPES
   ============================================================ */

interface CartLine {
  product: Product;
  qty: number;
}

interface SalesRange {
  key: RangeKey;
  label: TKey;
}

const RANGES: SalesRange[] = [
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
   MAIN PAGE
   ============================================================ */

function SalesPage() {
  const { t, lang } = useI18n();

  const inventory = useInventory();
  const warehouses = useWarehouses();
  const sales = useSales();

  const [cart, setCart] = useState<CartLine[]>([]);
  const [manual, setManual] = useState("");
  const [camera, setCamera] = useState(false);

  const [range, setRange] =
    useState<RangeKey>("month");

  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  const [wh, setWh] =
    useState(ALL_WAREHOUSES);


  /* ============================================================
     RECORD SALE
     ============================================================ */

  const record = useApiMutation(
    (p: {
      product_id: string;
      qty: number;
      warehouse: string;
    }) => api.recordSale(p),
  );


  /* ============================================================
     ADD PRODUCT TO CART
     ============================================================ */

  const addToCart = useCallback(
    (product: Product) => {
      setCart((prev) => {
        const existing = prev.find(
          (line) =>
            line.product.product_id ===
            product.product_id,
        );

        const nextQty =
          (existing?.qty ?? 0) + 1;

        if (
          nextQty >
          product.remaining_qty
        ) {
          toast.error(
            t("insufficient_stock"),
          );

          return prev;
        }

        return existing
          ? prev.map((line) =>
              line.product.product_id ===
              product.product_id
                ? {
                    ...line,
                    qty: nextQty,
                  }
                : line,
            )
          : [
              ...prev,
              {
                product,
                qty: 1,
              },
            ];
      });
    },
    [t],
  );


  /* ============================================================
     BARCODE HANDLER
     ============================================================ */

  const handleCode = useCallback(
    (code: string) => {
      const clean =
        code.trim().toLowerCase();

      const found = (
        inventory.data ?? []
      ).find(
        (p) =>
          p.barcode.toLowerCase() ===
            clean ||
          p.product_id.toLowerCase() ===
            clean,
      );

      if (!found) {
        toast.error(
          t("not_found_barcode"),
        );

        return;
      }

      addToCart(found);

      toast.success(
        found.product_name,
      );
    },
    [
      inventory.data,
      addToCart,
      t,
    ],
  );


  /* ============================================================
     USB SCANNER
     ============================================================ */

  useUsbScanner(handleCode);


  /* ============================================================
     MANUAL SEARCH
     ============================================================ */

  const matches = useMemo(() => {
    const term =
      manual.trim().toLowerCase();

    if (!term) return [];

    return (
      inventory.data ?? []
    )
      .filter(
        (p) =>
          p.product_name
            .toLowerCase()
            .includes(term) ||
          p.product_id
            .toLowerCase()
            .includes(term) ||
          p.barcode
            .toLowerCase()
            .includes(term),
      )
      .slice(0, 8);
  }, [
    manual,
    inventory.data,
  ]);


  /* ============================================================
     CART TOTAL
     ============================================================ */

  const total = cart.reduce(
    (sum, line) =>
      sum +
      line.qty *
        line.product.price,
    0,
  );


  /* ============================================================
     SET CART QUANTITY
     ============================================================ */

  const setQty = (
    id: string,
    qty: number,
  ) =>
    setCart((prev) =>
      prev.flatMap((line) => {
        if (
          line.product.product_id !==
          id
        ) {
          return [line];
        }

        if (qty <= 0) {
          return [];
        }

        if (
          qty >
          line.product.remaining_qty
        ) {
          toast.error(
            t("insufficient_stock"),
          );

          return [line];
        }

        return [
          {
            ...line,
            qty,
          },
        ];
      }),
    );


  /* ============================================================
     COMPLETE SALE
     ============================================================ */

  const completeSale = async () => {
    if (cart.length === 0) return;

    try {
      for (const line of cart) {
        await record.mutateAsync({
          product_id:
            line.product.product_id,

          qty: line.qty,

          warehouse:
            line.product.warehouse,
        });
      }

      toast.success(
        t("sale_recorded"),
      );

      setCart([]);

      await sales.refetch();
      await inventory.refetch();
    } catch (e) {
      toast.error(
        errorMessage(e, lang),
      );
    }
  };


  /* ============================================================
     FILTERED SALES
     ============================================================ */

  const filteredSales =
    useMemo(() => {
      return (
        sales.data ?? []
      ).filter((sale) => {
        const warehouseMatch =
          wh === ALL_WAREHOUSES ||
          sale.warehouse === wh;

        const dateMatch =
          inRange(
            sale.sale_date,
            range,
            from,
            to,
          );

        return (
          warehouseMatch &&
          dateMatch
        );
      });
    }, [
      sales.data,
      range,
      from,
      to,
      wh,
    ]);


  /* ============================================================
     SALES STATISTICS
     ============================================================ */

  const salesStats =
    useMemo(() => {
      const totalSales =
        filteredSales.reduce(
          (sum, sale) =>
            sum +
            Number(
              sale.total || 0,
            ),
          0,
        );

      const totalQty =
        filteredSales.reduce(
          (sum, sale) =>
            sum +
            Number(
              sale.qty || 0,
            ),
          0,
        );

      const transactions =
        filteredSales.length;

      const averageSale =
        transactions > 0
          ? totalSales /
            transactions
          : 0;

      return {
        totalSales,
        totalQty,
        transactions,
        averageSale,
      };
    }, [filteredSales]);


  /* ============================================================
     SOLD PRODUCTS
     ============================================================ */

  const soldProducts =
    useMemo(() => {
      const map =
        new Map<
          string,
          {
            productName: string;
            product: Product | null;
            qty: number;
            total: number;
            price: number;
          }
        >();

      for (const sale of filteredSales) {
        const name =
          sale.product_name ||
          "منتج غير معروف";

        const key = name
          .trim()
          .toLowerCase();

        const existing =
          map.get(key);

        if (existing) {
          existing.qty +=
            Number(
              sale.qty || 0,
            );

          existing.total +=
            Number(
              sale.total || 0,
            );
        } else {
          const product =
            findProductForSale(
              name,
              inventory.data ?? [],
            );

          map.set(key, {
            productName: name,
            product,
            qty: Number(
              sale.qty || 0,
            ),
            total: Number(
              sale.total || 0,
            ),
            price:
              Number(
                sale.price || 0,
              ) ||
              product?.price ||
              0,
          });
        }
      }

      return Array.from(
        map.values(),
      )
        .sort(
          (a, b) =>
            b.qty - a.qty,
        )
        .slice(0, 12);
    }, [
      filteredSales,
      inventory.data,
    ]);

  const maxProductQty =
    soldProducts.length > 0
      ? Math.max(
          ...soldProducts.map(
            (item) => item.qty,
          ),
        )
      : 0;


  /* ============================================================
     PAGE
     ============================================================ */

  return (
    <AppShell title={t("sales")}>
      <div className="space-y-10 pb-10">

        {/* HEADER */}

        <div className="relative overflow-hidden rounded-3xl border border-[#9B4BA8]/30 bg-gradient-to-br from-[#050505] via-[#151019] to-[#7B2C8E] p-6 text-white shadow-xl">

          <div className="absolute -right-16 -top-16 h-40 w-40 rounded-full bg-[#C084CC]/30 blur-3xl" />

          <div className="absolute -bottom-20 -left-10 h-40 w-40 rounded-full bg-[#7B2C8E]/30 blur-3xl" />

          <div className="relative flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">

            <div>

              <div className="mb-2 flex items-center gap-2">

                <div className="rounded-xl border border-white/10 bg-white/10 p-2 backdrop-blur">
                  <ShoppingCart className="h-5 w-5" />
                </div>

                <span className="text-sm font-medium text-[#C084CC]">
                  SODFA POS
                </span>

              </div>

              <h1 className="text-2xl font-bold sm:text-3xl">
                إدارة المبيعات
              </h1>

              <p className="mt-2 max-w-2xl text-sm leading-6 text-white/70">
                راقب أداء المبيعات ونفّذ عمليات البيع
                بسرعة باستخدام الباركود أو البحث اليدوي.
              </p>

            </div>

            <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-5 py-4 backdrop-blur">

              <div className="rounded-xl bg-[#9B4BA8]/20 p-3">
                <TrendingUp className="h-6 w-6 text-[#C084CC]" />
              </div>

              <div>

                <p className="text-xs text-white/50">
                  إجمالي الفترة
                </p>

                <p className="mt-1 text-xl font-bold">
                  {fmtMoney(
                    salesStats.totalSales,
                    lang,
                  )}
                </p>

              </div>

            </div>

          </div>
        </div>

        <SellingSection
          camera={camera}
          setCamera={setCamera}
          manual={manual}
          setManual={setManual}
          matches={matches}
          cart={cart}
          total={total}
          warehouses={
            warehouses.data ?? []
          }
          lang={lang}
          t={t}
          handleCode={handleCode}
          addToCart={addToCart}
          setQty={setQty}
          completeSale={completeSale}
          recordPending={
            record.isPending
          }
        />

        <SalesFilters
          range={range}
          setRange={setRange}
          from={from}
          setFrom={setFrom}
          to={to}
          setTo={setTo}
          wh={wh}
          setWh={setWh}
          warehouses={
            warehouses.data ?? []
          }
          t={t}
        />


        <SalesOverview
          stats={salesStats}
          lang={lang}
        />


        <SalesAnalytics
          stats={salesStats}
          lang={lang}
        />


        <SoldProductsSection
          products={soldProducts}
          maxQty={maxProductQty}
          lang={lang}
        />


        <SalesHistory
          sales={sales}
          filteredSales={filteredSales}
          warehouses={
            warehouses.data ?? []
          }
          inventory={
            inventory.data ?? []
          }
          lang={lang}
          t={t}
        />

      </div>
    </AppShell>
  );
}


/* ============================================================
   FIND PRODUCT
   ============================================================ */

function findProductForSale(
  productName: string,
  inventory: Product[],
): Product | null {
  const cleanName =
    productName
      .trim()
      .toLowerCase();

  return (
    inventory.find(
      (product) =>
        product.product_name
          .trim()
          .toLowerCase() ===
        cleanName,
    ) ?? null
  );
}


/* ============================================================
   FILTERS
   ============================================================ */

function SalesFilters({
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
}: {
  range: RangeKey;
  setRange: (
    value: RangeKey,
  ) => void;

  from: string;
  setFrom: (
    value: string,
  ) => void;

  to: string;
  setTo: (
    value: string,
  ) => void;

  wh: string;
  setWh: (
    value: string,
  ) => void;

  warehouses: any[];
  t: any;
}) {
  return (
    <Card className="overflow-hidden border-[#9B4BA8]/15 bg-white p-0 shadow-sm dark:border-[#9B4BA8]/20 dark:bg-[#0B080D]">

      <div className="border-b border-[#9B4BA8]/10 bg-[#9B4BA8]/5 p-5 dark:border-[#9B4BA8]/20 dark:bg-[#9B4BA8]/10">

        <div className="flex items-center gap-3">

          <div className="rounded-xl bg-[#9B4BA8]/10 p-2.5 dark:bg-[#9B4BA8]/20">
            <BarChart3 className="h-5 w-5 text-[#9B4BA8] dark:text-[#C084CC]" />
          </div>

          <div>

            <h2 className="font-bold text-slate-900 dark:text-white">
              تحليل المبيعات
            </h2>

            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              اختر الفترة والمخزن لعرض بيانات المبيعات.
            </p>

          </div>

        </div>

      </div>


      <div className="p-5">

        <div className="flex flex-wrap gap-2">

          {RANGES.map((item) => (

            <Button
              key={item.key}
              size="sm"
              variant={
                range === item.key
                  ? "default"
                  : "outline"
              }
              className={
                range === item.key
                  ? "bg-[#9B4BA8] text-white shadow-sm hover:bg-[#7B2C8E]"
                  : "border-slate-200 hover:border-[#9B4BA8]/40 hover:bg-[#9B4BA8]/5 dark:border-slate-700 dark:hover:border-[#9B4BA8]/50 dark:hover:bg-[#9B4BA8]/10"
              }
              onClick={() =>
                setRange(item.key)
              }
            >
              {t(item.label)}
            </Button>

          ))}


          <WarehouseSelect
            value={wh}
            onChange={setWh}
            warehouses={warehouses}
            includeAll
            className="w-full sm:w-56"
          />

        </div>


        {range === "custom" && (

          <div className="mt-5 flex flex-wrap items-end gap-4 border-t border-[#9B4BA8]/10 pt-5 dark:border-[#9B4BA8]/20">

            <div>

              <Label htmlFor="sales-from">
                {t("from")}
              </Label>

              <Input
                id="sales-from"
                type="date"
                value={from}
                onChange={(e) =>
                  setFrom(
                    e.target.value,
                  )
                }
                className="mt-1 focus-visible:ring-[#9B4BA8]"
              />

            </div>


            <div>

              <Label htmlFor="sales-to">
                {t("to")}
              </Label>

              <Input
                id="sales-to"
                type="date"
                value={to}
                onChange={(e) =>
                  setTo(
                    e.target.value,
                  )
                }
                className="mt-1 focus-visible:ring-[#9B4BA8]"
              />

            </div>

          </div>

        )}

      </div>
    </Card>
  );
}


/* ============================================================
   OVERVIEW
   ============================================================ */

function SalesOverview({
  stats,
  lang,
}: {
  stats: {
    totalSales: number;
    totalQty: number;
    transactions: number;
    averageSale: number;
  };

  lang: any;
}) {

  const cards = [

    {
      title: "إجمالي المبيعات",
      value: fmtMoney(
        stats.totalSales,
        lang,
      ),
      description:
        "إجمالي قيمة المبيعات.",
      icon: Wallet,
      box:
        "bg-[#9B4BA8]/10 text-[#9B4BA8] dark:bg-[#9B4BA8]/20 dark:text-[#C084CC]",
      accent:
        "from-[#7B2C8E] via-[#9B4BA8] to-[#C084CC]",
    },

    {
      title: "الوحدات المباعة",
      value:
        stats.totalQty.toLocaleString(),
      description:
        "إجمالي عدد الوحدات.",
      icon: ShoppingCart,
      box:
        "bg-[#9B4BA8]/10 text-[#9B4BA8] dark:bg-[#9B4BA8]/20 dark:text-[#C084CC]",
      accent:
        "from-[#9B4BA8] to-[#C084CC]",
    },

    {
      title: "عدد عمليات البيع",
      value:
        stats.transactions.toLocaleString(),
      description:
        "عدد العمليات المسجلة.",
      icon: Layers,
      box:
        "bg-[#7B2C8E]/10 text-[#7B2C8E] dark:bg-[#7B2C8E]/20 dark:text-[#C084CC]",
      accent:
        "from-[#7B2C8E] to-[#9B4BA8]",
    },

    {
      title: "متوسط عملية البيع",
      value: fmtMoney(
        stats.averageSale,
        lang,
      ),
      description:
        "متوسط قيمة العملية.",
      icon: TrendingUp,
      box:
        "bg-[#C084CC]/15 text-[#7B2C8E] dark:bg-[#C084CC]/20 dark:text-[#C084CC]",
      accent:
        "from-[#C084CC] to-[#9B4BA8]",
    },

  ];


  return (
    <section className="space-y-4">

      <SectionTitle
        icon={ShoppingCart}
        title="نظرة عامة على المبيعات"
        description="أهم أرقام المبيعات للفترة والمخزن المحددين."
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">

        {cards.map((card) => {

          const Icon =
            card.icon;

          return (

            <Card
              key={card.title}
              className="group relative overflow-hidden border-slate-200 bg-white p-5 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-[#9B4BA8]/30 hover:shadow-lg dark:border-slate-800 dark:bg-[#0B080D]"
            >

              <div
                className={`absolute inset-x-0 top-0 h-1 bg-gradient-to-r ${card.accent}`}
              />


              <div className="flex items-start gap-4">

                <div
                  className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${card.box}`}
                >
                  <Icon className="h-6 w-6" />
                </div>


                <div className="min-w-0">

                  <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                    {card.title}
                  </p>

                  <p className="mt-1 truncate text-xl font-bold text-slate-900 dark:text-white">
                    {card.value}
                  </p>

                  <p className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">
                    {card.description}
                  </p>

                </div>

              </div>

            </Card>

          );
        })}

      </div>

    </section>
  );
}


/* ============================================================
   ANALYTICS
   ============================================================ */

function SalesAnalytics({
  stats,
  lang,
}: {
  stats: {
    totalSales: number;
    totalQty: number;
    transactions: number;
    averageSale: number;
  };

  lang: any;
}) {

  return (

    <section className="space-y-4">

      <SectionTitle
        icon={BarChart3}
        title="التحليل البياني للمبيعات"
        description="نظرة سريعة على قيمة المبيعات وحركة المنتجات."
      />


      <div className="grid gap-5 lg:grid-cols-2">


        <Card className="border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-[#0B080D]">

          <div className="flex items-center gap-3">

            <div className="rounded-xl bg-[#9B4BA8]/10 p-2.5 dark:bg-[#9B4BA8]/20">

              <Wallet className="h-5 w-5 text-[#9B4BA8] dark:text-[#C084CC]" />

            </div>


            <div>

              <h3 className="font-bold text-slate-900 dark:text-white">
                قيمة المبيعات
              </h3>

              <p className="text-xs text-slate-500 dark:text-slate-400">
                إجمالي قيمة البيع خلال الفترة.
              </p>

            </div>

          </div>


          <div className="mt-7">

            <div className="mb-2 flex items-center justify-between text-sm">

              <span className="text-slate-600 dark:text-slate-300">
                إجمالي المبيعات
              </span>

              <strong className="text-slate-900 dark:text-white">
                {fmtMoney(
                  stats.totalSales,
                  lang,
                )}
              </strong>

            </div>


            <div className="h-3 overflow-hidden rounded-full bg-[#9B4BA8]/10 dark:bg-slate-800">

              <div
                className="h-full rounded-full bg-gradient-to-r from-[#7B2C8E] via-[#9B4BA8] to-[#C084CC] transition-all duration-700"
                style={{
                  width:
                    stats.totalSales > 0
                      ? "100%"
                      : "0%",
                }}
              />

            </div>

          </div>


          <Explanation>
            هذا الشريط يمثل إجمالي قيمة المبيعات للفترة
            المحددة.
          </Explanation>

        </Card>


        <Card className="border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-[#0B080D]">

          <div className="flex items-center gap-3">

            <div className="rounded-xl bg-[#9B4BA8]/10 p-2.5 dark:bg-[#9B4BA8]/20">

              <Boxes className="h-5 w-5 text-[#9B4BA8] dark:text-[#C084CC]" />

            </div>


            <div>

              <h3 className="font-bold text-slate-900 dark:text-white">
                الوحدات المباعة
              </h3>

              <p className="text-xs text-slate-500 dark:text-slate-400">
                إجمالي المنتجات التي خرجت من المخزون.
              </p>

            </div>

          </div>


          <div className="mt-7">

            <div className="mb-2 flex items-center justify-between text-sm">

              <span className="text-slate-600 dark:text-slate-300">
                عدد الوحدات
              </span>

              <strong className="text-slate-900 dark:text-white">
                {stats.totalQty.toLocaleString()}
              </strong>

            </div>


            <div className="h-3 overflow-hidden rounded-full bg-[#9B4BA8]/10 dark:bg-slate-800">

              <div
                className="h-full rounded-full bg-gradient-to-r from-[#7B2C8E] to-[#C084CC] transition-all duration-700"
                style={{
                  width:
                    stats.totalQty > 0
                      ? "100%"
                      : "0%",
                }}
              />

            </div>

          </div>


          <Explanation>
            زيادة عدد الوحدات المباعة تعني زيادة حركة
            المنتجات.
          </Explanation>

        </Card>

      </div>

    </section>
  );
}


/* ============================================================
   SOLD PRODUCTS
   ============================================================ */

function SoldProductsSection({
  products,
  maxQty,
  lang,
}: {
  products: {
    productName: string;
    product: Product | null;
    qty: number;
    total: number;
    price: number;
  }[];

  maxQty: number;
  lang: any;
}) {

  return (

    <section className="space-y-4">

      <SectionTitle
        icon={Package}
        title="المنتجات المباعة"
        description="أكثر المنتجات مبيعًا في الفترة والمخزن المحددين."
      />


      {products.length === 0 ? (

        <Card className="border-slate-200 p-10 text-center dark:border-slate-800">

          <ImageIcon className="mx-auto h-10 w-10 text-[#9B4BA8]/50" />

          <p className="mt-3 font-semibold text-slate-900 dark:text-white">
            لا توجد مبيعات في الفترة المحددة
          </p>

          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            جرّب تغيير الفترة الزمنية أو المخزن.
          </p>

        </Card>

      ) : (

        <Card className="overflow-hidden border-slate-200 p-0 shadow-sm dark:border-slate-800">

          <div className="divide-y divide-slate-100 dark:divide-slate-800">

            {products.map(
              (item, index) => {

                const percentage =
                  maxQty > 0
                    ? Math.round(
                        (item.qty /
                          maxQty) *
                          100,
                      )
                    : 0;

                return (

                  <div
                    key={`${item.productName}-${index}`}
                    className="flex flex-col gap-4 p-5 transition-colors hover:bg-[#9B4BA8]/5 sm:flex-row sm:items-center dark:hover:bg-[#9B4BA8]/10"
                  >

                    <div className="relative shrink-0">

                      {item.product ? (

                        <ProductImage
                          url={
                            item.product
                              .image_url
                          }
                          alt={
                            item.product
                              .product_name
                          }
                          className="h-20 w-20 rounded-2xl border object-cover"
                        />

                      ) : (

                        <div className="flex h-20 w-20 items-center justify-center rounded-2xl border bg-[#9B4BA8]/5 dark:bg-slate-800">

                          <ImageIcon className="h-7 w-7 text-[#9B4BA8]/50" />

                        </div>

                      )}


                      <span className="absolute -right-2 -top-2 flex h-7 w-7 items-center justify-center rounded-full bg-[#7B2C8E] text-xs font-bold text-white shadow-md">
                        {index + 1}
                      </span>

                    </div>


                    <div className="min-w-0 flex-1">

                      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">

                        <div>

                          <h3 className="font-bold text-slate-900 dark:text-white">
                            {item.productName}
                          </h3>

                          <p className="text-xs text-slate-500 dark:text-slate-400">

                            {item.product
                              ? `SKU: ${item.product.product_id}`
                              : "بيانات المنتج غير موجودة في المخزون"}

                          </p>

                        </div>


                        <p className="text-lg font-bold text-[#9B4BA8] dark:text-[#C084CC]">

                          {fmtMoney(
                            item.total,
                            lang,
                          )}

                        </p>

                      </div>


                      <div className="mt-3">

                        <div className="mb-1 flex justify-between text-xs text-slate-500">

                          <span>
                            الكمية المباعة
                          </span>

                          <span className="font-semibold text-slate-900 dark:text-white">

                            {item.qty.toLocaleString()}{" "}
                            وحدة

                          </span>

                        </div>


                        <div className="h-2.5 overflow-hidden rounded-full bg-[#9B4BA8]/10 dark:bg-slate-800">

                          <div
                            className="h-full rounded-full bg-gradient-to-r from-[#7B2C8E] via-[#9B4BA8] to-[#C084CC] transition-all duration-700"
                            style={{
                              width: `${percentage}%`,
                            }}
                          />

                        </div>

                      </div>

                    </div>


                    <div className="grid grid-cols-2 gap-2 sm:w-44">

                      <div className="rounded-xl bg-[#9B4BA8]/5 p-3 text-center dark:bg-slate-900">

                        <p className="text-[11px] text-slate-500">
                          الكمية
                        </p>

                        <p className="mt-1 font-bold text-slate-900 dark:text-white">
                          {item.qty.toLocaleString()}
                        </p>

                      </div>


                      <div className="rounded-xl bg-[#9B4BA8]/5 p-3 text-center dark:bg-slate-900">

                        <p className="text-[11px] text-slate-500">
                          سعر الوحدة
                        </p>

                        <p className="mt-1 text-sm font-bold text-slate-900 dark:text-white">
                          {fmtMoney(
                            item.price,
                            lang,
                          )}
                        </p>

                      </div>

                    </div>

                  </div>

                );
              },
            )}

          </div>


          <div className="border-t bg-[#9B4BA8]/5 p-4 dark:border-slate-800 dark:bg-slate-900">

            <p className="text-sm leading-6 text-slate-500 dark:text-slate-400">

              <strong className="text-slate-900 dark:text-white">
                شرح:
              </strong>{" "}

              المنتجات مرتبة من الأكثر مبيعًا إلى الأقل
              مبيعًا حسب عدد الوحدات.

            </p>

          </div>

        </Card>

      )}

    </section>
  );
}


/* ============================================================
   SELLING AREA
   ============================================================ */

function SellingSection({
  camera,
  setCamera,
  manual,
  setManual,
  matches,
  cart,
  total,
  warehouses,
  lang,
  t,
  handleCode,
  addToCart,
  setQty,
  completeSale,
  recordPending,
}: {
  camera: boolean;

  setCamera: (
    value: boolean,
  ) => void;

  manual: string;

  setManual: (
    value: string,
  ) => void;

  matches: Product[];

  cart: CartLine[];

  total: number;

  warehouses: any[];

  lang: any;

  t: any;

  handleCode: (
    code: string,
  ) => void;

  addToCart: (
    product: Product,
  ) => void;

  setQty: (
    id: string,
    qty: number,
  ) => void;

  completeSale: () => void;

  recordPending: boolean;
}) {

  return (

    <section className="space-y-4">

      <SectionTitle
        icon={ScanLine}
        title="تنفيذ عملية بيع"
        description="استخدم السكانر أو الكاميرا أو البحث اليدوي لإضافة المنتجات إلى السلة."
      />


      <div className="grid gap-6 xl:grid-cols-[1.1fr_1fr]">


        {/* SEARCH SIDE */}

        <div className="space-y-4">


          <Card className="border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-[#0B080D]">

            <div className="mb-4 flex items-center gap-3">

              <div className="rounded-xl bg-[#9B4BA8]/10 p-2.5 dark:bg-[#9B4BA8]/20">

                <ScanLine className="h-5 w-5 text-[#9B4BA8] dark:text-[#C084CC]" />

              </div>


              <div>

                <h2 className="font-bold text-slate-900 dark:text-white">
                  السكانر والبيع السريع
                </h2>

                <p className="text-xs text-slate-500 dark:text-slate-400">
                  USB Scanner أو كاميرا الهاتف
                </p>

              </div>

            </div>


            <Input
              data-scanner-input="true"
              placeholder={t("usb_hint")}
              className="h-12 border-[#9B4BA8]/20 bg-[#9B4BA8]/5 focus-visible:ring-[#9B4BA8] dark:border-slate-700 dark:bg-slate-900"
              onKeyDown={(e) => {

                if (
                  e.key ===
                  "Enter"
                ) {

                  handleCode(
                    e.currentTarget
                      .value,
                  );

                  e.currentTarget.value =
                    "";

                }

              }}
            />


            <Button
              variant="outline"
              className="mt-3 w-full border-[#9B4BA8]/30 text-[#7B2C8E] hover:bg-[#9B4BA8]/10 hover:text-[#7B2C8E] dark:border-[#9B4BA8]/40 dark:text-[#C084CC]"
              onClick={() =>
                setCamera(
                  !camera,
                )
              }
            >

              {camera ? (

                <X className="me-1 h-4 w-4" />

              ) : (

                <Camera className="me-1 h-4 w-4" />

              )}


              {camera
                ? t(
                    "close_camera",
                  )
                : t(
                    "open_camera",
                  )}

            </Button>


            {camera && (

              <div className="mt-4 overflow-hidden rounded-2xl border border-[#9B4BA8]/20">

                <CameraScanner
                  onDetected={
                    handleCode
                  }
                />

              </div>

            )}

          </Card>


          <Card className="border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-[#0B080D]">

            <div className="mb-4">

              <Label>
                {t(
                  "manual_search",
                )}
              </Label>

              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                ابحث بالاسم أو SKU أو الباركود.
              </p>

            </div>


            <Input
              value={manual}
              onChange={(e) =>
                setManual(
                  e.target.value,
                )
              }
              placeholder={t(
                "search_placeholder",
              )}
              className="h-12 focus-visible:ring-[#9B4BA8]"
            />


            <div className="mt-4 space-y-2">

              {matches.map(
                (product) => (

                  <button
                    key={
                      product.product_id
                    }
                    type="button"
                    onClick={() =>
                      addToCart(
                        product,
                      )
                    }
                    className="flex w-full items-center gap-3 rounded-2xl border border-slate-200 bg-white p-3 text-start transition-all hover:-translate-y-0.5 hover:border-[#9B4BA8]/50 hover:bg-[#9B4BA8]/5 hover:shadow-sm dark:border-slate-800 dark:bg-slate-950 dark:hover:border-[#9B4BA8]/60 dark:hover:bg-[#9B4BA8]/10"
                  >

                    <ProductImage
                      url={
                        product.image_url
                      }
                      alt={
                        product.product_name
                      }
                      className="h-14 w-14 shrink-0 rounded-xl object-cover"
                    />


                    <span className="min-w-0 flex-1">

                      <span className="block truncate text-sm font-semibold text-slate-900 dark:text-white">
                        {
                          product.product_name
                        }
                      </span>

                      <span className="block text-xs text-slate-500">
                        {
                          product.product_id
                        }{" "}
                        •{" "}
                        {t(
                          "remaining",
                        )}
                        :{" "}
                        {
                          product.remaining_qty
                        }
                      </span>

                    </span>


                    <span className="text-sm font-bold text-[#9B4BA8] dark:text-[#C084CC]">

                      {fmtMoney(
                        product.price,
                        lang,
                      )}

                    </span>

                  </button>

                ),
              )}

            </div>

          </Card>

        </div>


        {/* CART */}

        <Card className="border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-[#0B080D]">

          <div className="mb-5 flex items-center justify-between">

            <div>

              <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                {t("cart")}
              </h2>

              <p className="text-xs text-slate-500 dark:text-slate-400">
                المنتجات التي سيتم تسجيل بيعها.
              </p>

            </div>


            <span className="rounded-full bg-[#9B4BA8]/10 px-3 py-1 text-xs font-bold text-[#7B2C8E] dark:bg-[#9B4BA8]/20 dark:text-[#C084CC]">
              {cart.length} منتجات
            </span>

          </div>


          {cart.length === 0 ? (

            <div className="rounded-2xl border border-dashed border-[#9B4BA8]/30 bg-[#9B4BA8]/5 p-10 text-center dark:border-slate-700 dark:bg-slate-900/50">

              <ShoppingCart className="mx-auto h-10 w-10 text-[#9B4BA8]/50" />

              <p className="mt-3 text-sm font-semibold text-slate-900 dark:text-white">
                {t("cart_empty")}
              </p>

              <p className="mt-1 text-xs text-slate-500">
                امسح باركود أو اختر منتجًا من البحث.
              </p>

            </div>

          ) : (

            <div className="space-y-3">

              {cart.map((line) => (

                <div
                  key={
                    line.product
                      .product_id
                  }
                  className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-[#9B4BA8]/5 p-3 dark:border-slate-800 dark:bg-slate-900/50"
                >

                  <ProductImage
                    url={
                      line.product
                        .image_url
                    }
                    alt={
                      line.product
                        .product_name
                    }
                    className="h-14 w-14 shrink-0 rounded-xl object-cover"
                  />


                  <div className="min-w-0 flex-1">

                    <p className="truncate text-sm font-semibold text-slate-900 dark:text-white">
                      {
                        line.product
                          .product_name
                      }
                    </p>

                    <p className="text-xs text-slate-500">

                      {fmtMoney(
                        line.product
                          .price,
                        lang,
                      )}

                      {" • "}

                      {warehouseName(
                        warehouses,
                        line.product
                          .warehouse,
                      )}

                    </p>

                  </div>


                  <div className="flex items-center gap-1">

                    <Button
                      size="icon"
                      variant="outline"
                      className="h-8 w-8 hover:border-[#9B4BA8] hover:text-[#9B4BA8]"
                      onClick={() =>
                        setQty(
                          line.product
                            .product_id,
                          line.qty - 1,
                        )
                      }
                    >
                      <Minus className="h-4 w-4" />
                    </Button>


                    <span className="w-8 text-center text-sm font-bold">
                      {line.qty}
                    </span>


                    <Button
                      size="icon"
                      variant="outline"
                      className="h-8 w-8 hover:border-[#9B4BA8] hover:text-[#9B4BA8]"
                      onClick={() =>
                        setQty(
                          line.product
                            .product_id,
                          line.qty + 1,
                        )
                      }
                    >
                      <Plus className="h-4 w-4" />
                    </Button>


                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8 hover:bg-[#9B4BA8]/10"
                      onClick={() =>
                        setQty(
                          line.product
                            .product_id,
                          0,
                        )
                      }
                    >
                      <Trash2 className="h-4 w-4 text-[#7B2C8E]" />
                    </Button>

                  </div>

                </div>

              ))}


              <div className="mt-5 rounded-2xl bg-gradient-to-r from-[#050505] via-[#7B2C8E] to-[#9B4BA8] p-5 text-white shadow-lg shadow-[#9B4BA8]/20">

                <div className="flex items-center justify-between">

                  <span className="font-semibold">
                    {t("total")}
                  </span>

                  <span className="text-2xl font-bold">
                    {fmtMoney(
                      total,
                      lang,
                    )}
                  </span>

                </div>

              </div>


              <Button
                className="mt-2 h-12 w-full bg-[#9B4BA8] text-white shadow-lg shadow-[#9B4BA8]/20 hover:bg-[#7B2C8E]"
                size="lg"
                onClick={() =>
                  completeSale()
                }
                disabled={
                  recordPending
                }
              >

                {recordPending
                  ? t("saving")
                  : t(
                      "complete_sale",
                    )}

              </Button>

            </div>

          )}

        </Card>

      </div>

    </section>
  );
}


/* ============================================================
   SALES HISTORY
   ============================================================ */

function SalesHistory({
  sales,
  filteredSales,
  warehouses,
  inventory,
  lang,
  t,
}: {
  sales: any;
  filteredSales: any[];
  warehouses: any[];
  inventory: Product[];
  lang: any;
  t: any;
}) {

  return (

    <section className="space-y-4">

      <SectionTitle
        icon={Layers}
        title={t("sales_history")}
        description="سجل عمليات البيع المسجلة في النظام."
      />


      <Tabs defaultValue="history">

        <TabsList className="border border-[#9B4BA8]/20 bg-[#9B4BA8]/5 dark:border-slate-800 dark:bg-slate-900">

          <TabsTrigger
            value="history"
            className="data-[state=active]:bg-[#9B4BA8] data-[state=active]:text-white"
          >
            {t("sales_history")}
          </TabsTrigger>

        </TabsList>


        <TabsContent
          value="history"
          className="mt-4"
        >

          {sales.isLoading ? (

            <Blocks.Loading
              label={t(
                "loading_sales",
              )}
            />

          ) : sales.isError ? (

            <Blocks.Error
              label={errorMessage(
                sales.error,
                lang,
              )}
            />

          ) : filteredSales.length ===
            0 ? (

            <Blocks.Empty
              label={t(
                "no_results",
              )}
            />

          ) : (

            <Card className="overflow-x-auto border-slate-200 p-0 shadow-sm dark:border-slate-800">

              <Table>

                <TableHeader>

                  <TableRow className="bg-[#9B4BA8]/5 dark:bg-slate-900">

                    <TableHead>
                      {t("sale_id")}
                    </TableHead>

                    <TableHead>
                      {t("product")}
                    </TableHead>

                    <TableHead>
                      {t("warehouse")}
                    </TableHead>

                    <TableHead>
                      {t("quantity")}
                    </TableHead>

                    <TableHead>
                      {t("price")}
                    </TableHead>

                    <TableHead>
                      {t("total")}
                    </TableHead>

                    <TableHead>
                      {t("date")}
                    </TableHead>

                  </TableRow>

                </TableHeader>


                <TableBody>

                  {[
                    ...filteredSales,
                  ]
                    .reverse()
                    .map(
                      (sale) => (

                        <TableRow
                          key={
                            sale.sale_id
                          }
                          className="transition-colors hover:bg-[#9B4BA8]/5 dark:hover:bg-[#9B4BA8]/10"
                        >

                          <TableCell className="font-mono text-xs">
                            {
                              sale.sale_id
                            }
                          </TableCell>


                          <TableCell>

                            <div className="flex items-center gap-3">

                              <SaleHistoryImage
                                productName={
                                  sale.product_name
                                }
                                inventory={
                                  inventory
                                }
                              />


                              <div className="min-w-0">

                                <p className="font-medium text-slate-900 dark:text-white">
                                  {
                                    sale.product_name
                                  }
                                </p>


                                {findProductForSale(
                                  sale.product_name,
                                  inventory,
                                ) && (

                                  <p className="text-xs text-slate-500">

                                    SKU:{" "}

                                    {
                                      findProductForSale(
                                        sale.product_name,
                                        inventory,
                                      )!
                                        .product_id
                                    }

                                  </p>

                                )}

                              </div>

                            </div>

                          </TableCell>


                          <TableCell>

                            {warehouseName(
                              warehouses,
                              sale.warehouse,
                            )}

                          </TableCell>


                          <TableCell>
                            {sale.qty}
                          </TableCell>


                          <TableCell>

                            {fmtMoney(
                              sale.price,
                              lang,
                            )}

                          </TableCell>


                          <TableCell className="font-bold text-[#9B4BA8] dark:text-[#C084CC]">

                            {fmtMoney(
                              sale.total,
                              lang,
                            )}

                          </TableCell>


                          <TableCell className="whitespace-nowrap text-xs">

                            {fmtDate(
                              sale.sale_date,
                              lang,
                            )}

                            {" "}

                            {sale.sale_time
                              ? fmtTime(
                                  sale.sale_time,
                                  lang,
                                )
                              : ""}

                          </TableCell>

                        </TableRow>

                      ),
                    )}

                </TableBody>

              </Table>

            </Card>

          )}

        </TabsContent>

      </Tabs>

    </section>
  );
}


/* ============================================================
   SALES HISTORY IMAGE
   ============================================================ */

function SaleHistoryImage({
  productName,
  inventory,
}: {
  productName: string;
  inventory: Product[];
}) {

  const product =
    findProductForSale(
      productName,
      inventory,
    );


  if (!product) {

    return (

      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#9B4BA8]/5 dark:bg-slate-800">

        <Package className="h-5 w-5 text-[#9B4BA8]/50" />

      </div>

    );
  }


  return (

    <ProductImage
      url={product.image_url}
      alt={product.product_name}
      className="h-12 w-12 shrink-0 rounded-xl border object-cover"
    />

  );
}


/* ============================================================
   SECTION TITLE
   ============================================================ */

function SectionTitle({
  icon: Icon,
  title,
  description,
}: {
  icon: any;
  title: string;
  description: string;
}) {

  return (

    <div>

      <div className="flex items-center gap-3">

        <div className="rounded-xl bg-[#9B4BA8]/10 p-2 dark:bg-[#9B4BA8]/20">

          <Icon className="h-5 w-5 text-[#9B4BA8] dark:text-[#C084CC]" />

        </div>


        <h2 className="text-xl font-bold text-slate-900 dark:text-white">
          {title}
        </h2>

      </div>


      <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
        {description}
      </p>

    </div>
  );
}


/* ============================================================
   EXPLANATION
   ============================================================ */

function Explanation({
  children,
}: {
  children: React.ReactNode;
}) {

  return (

    <div className="mt-6 rounded-2xl border border-[#9B4BA8]/10 bg-[#9B4BA8]/5 p-4 dark:border-slate-800 dark:bg-slate-900">

      <p className="text-sm leading-6 text-slate-500 dark:text-slate-400">

        <span className="font-bold text-slate-900 dark:text-white">
          شرح:
        </span>{" "}

        {children}

      </p>

    </div>

  );
}