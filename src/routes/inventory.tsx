import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import {
  Eye,
  Plus,
  Printer,
  Pencil,
  Trash2,
  RefreshCw,
  Package,
  ShoppingCart,
  Boxes,
  AlertTriangle,
  BarChart3,
  TrendingUp,
  Warehouse,
} from "lucide-react";
import { toast } from "sonner";

import { AppShell } from "@/components/AppShell";
import { Blocks } from "@/components/blocks-export";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ProductImage } from "@/components/ProductImage";
import { ProductFormDialog } from "@/components/ProductFormDialog";
import { PrintBarcodeDialog } from "@/components/PrintBarcodeDialog";
import { ProductDetailsDialog } from "@/components/ProductDetailsDialog";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import {
  ALL_WAREHOUSES,
  WarehouseSelect,
} from "@/components/WarehouseSelect";

import {
  useApiMutation,
  useInventory,
  useWarehouses,
} from "@/hooks/useSodfa";

import { api, type Product } from "@/lib/api";
import { errorMessage, useI18n } from "@/lib/i18n";
import { fmtMoney } from "@/lib/dates";
import { warehouseName } from "@/lib/warehouse";

/* ============================================================
   SODFA BRAND COLORS
   ============================================================ */

const BRAND = {
  purple: "#9B4BA8",
  purpleDark: "#7B2C8E",
  purpleLight: "#C084CC",

  // خلفية الصفحة — ليست بيضاء
  background: "#F3E5F5",
  backgroundSoft: "#FAF5FC",

  // الكروت تظل بيضاء
  card: "#FFFFFF",
  cardHover: "#FAF5FC",

  // Borders
  border: "#D8B4E2",
  borderPurple: "#C084CC",

  white: "#FFFFFF",
  whiteSoft: "#FAF5FC",

  muted: "#6B5A70",
  mutedDark: "#8A7890",

  danger: "#DC2626",
  warning: "#D97706",

  purpleGradient:
    "linear-gradient(135deg, #7B2C8E 0%, #9B4BA8 50%, #C084CC 100%)",

  cardGradient:
    "linear-gradient(135deg, #FFFFFF 0%, #FAF5FC 55%, #F3E5F5 100%)",

  softGradient:
    "linear-gradient(135deg, #F3E5F5 0%, #FAF5FC 50%, #FFFFFF 100%)",
};

/* ============================================================
   ROUTE
   ============================================================ */

export const Route = createFileRoute("/inventory")({
  head: () => ({
    meta: [
      {
        title: "Inventory — SODFA صدفة",
      },
      {
        name: "description",
        content:
          "Manage SODFA products, stock, prices, images and printable barcodes.",
      },
      {
        property: "og:title",
        content: "Inventory — SODFA صدفة",
      },
      {
        property: "og:description",
        content: "Products, stock levels and barcode printing.",
      },
    ],
  }),
  component: InventoryPage,
});

/* ============================================================
   INVENTORY PAGE
   ============================================================ */

function InventoryPage() {
  const { t, lang } = useI18n();

  const inventory = useInventory();
  const warehouses = useWarehouses();

  const [q, setQ] = useState("");
  const [wh, setWh] = useState(ALL_WAREHOUSES);

  const [editing, setEditing] =
    useState<Product | null>(null);

  const [formOpen, setFormOpen] =
    useState(false);

  const [printing, setPrinting] =
    useState<Product | null>(null);

  const [viewing, setViewing] =
    useState<Product | null>(null);

  const [toDelete, setToDelete] =
    useState<Product | null>(null);

  const del = useApiMutation((id: string) =>
    api.deleteProduct(id)
  );

  /* =========================================================
     FILTER PRODUCTS
  ========================================================= */

  const list = useMemo(() => {
    const term = q.trim().toLowerCase();

    return (inventory.data ?? []).filter((p) => {
      const okWh =
        wh === ALL_WAREHOUSES ||
        p.warehouse === wh;

      const okQ =
        !term ||
        p.product_name
          .toLowerCase()
          .includes(term) ||
        p.product_id
          .toLowerCase()
          .includes(term) ||
        p.barcode
          .toLowerCase()
          .includes(term);

      return okWh && okQ;
    });
  }, [inventory.data, q, wh]);

  /* =========================================================
     INVENTORY STATISTICS
  ========================================================= */

  const statistics = useMemo(() => {
    const totalProducts = list.length;

    const totalStock = list.reduce(
      (sum, product) =>
        sum + Number(product.stock_qty || 0),
      0
    );

    const totalSold = list.reduce(
      (sum, product) =>
        sum + Number(product.sold_qty || 0),
      0
    );

    const totalRemaining = list.reduce(
      (sum, product) =>
        sum + Number(product.remaining_qty || 0),
      0
    );

    const lowStockProducts = list.filter(
      (product) =>
        Number(product.remaining_qty || 0) > 0 &&
        Number(product.remaining_qty || 0) <= 5
    ).length;

    const outOfStockProducts = list.filter(
      (product) =>
        Number(product.remaining_qty || 0) <= 0
    ).length;

    return {
      totalProducts,
      totalStock,
      totalSold,
      totalRemaining,
      lowStockProducts,
      outOfStockProducts,
    };
  }, [list]);

  /* =========================================================
     CHART PERCENTAGES
  ========================================================= */

  const soldPercentage = useMemo(() => {
    if (statistics.totalStock <= 0) return 0;

    return Math.min(
      100,
      Math.round(
        (statistics.totalSold /
          statistics.totalStock) *
          100
      )
    );
  }, [
    statistics.totalSold,
    statistics.totalStock,
  ]);

  const remainingPercentage = useMemo(() => {
    if (statistics.totalStock <= 0) return 0;

    return Math.min(
      100,
      Math.round(
        (statistics.totalRemaining /
          statistics.totalStock) *
          100
      )
    );
  }, [
    statistics.totalRemaining,
    statistics.totalStock,
  ]);

  /* =========================================================
     PAGE
  ========================================================= */

  return (
    <AppShell title={t("inventory")}>
      <div
        className="min-h-full space-y-7 rounded-3xl p-1"
        style={{
          background:
            "linear-gradient(135deg, #F3E5F5 0%, #FAF5FC 45%, #F3E5F5 100%)",
        }}
      >
        {/* SEARCH & CONTROLS */}

        <InventoryControls
          q={q}
          setQ={setQ}
          wh={wh}
          setWh={setWh}
          warehouses={warehouses.data ?? []}
          isFetching={inventory.isFetching}
          onRefresh={() =>
            void inventory.refetch()
          }
          onAddProduct={() => {
            setEditing(null);
            setFormOpen(true);
          }}
          searchPlaceholder={t(
            "search_placeholder"
          )}
          addProductLabel={t("add_product")}
        />

        {/* LOADING / ERROR / EMPTY */}

        {inventory.isLoading ? (
          <Blocks.Loading
            label={t("loading_inventory")}
          />
        ) : inventory.isError ? (
          <Blocks.Error
            label={errorMessage(
              inventory.error,
              lang
            )}
          />
        ) : list.length === 0 ? (
          <Blocks.Empty
            label={t("no_results")}
          />
        ) : (
          <>
            <InventoryStatistics
              statistics={statistics}
            />

            <InventoryCharts
              statistics={statistics}
              soldPercentage={soldPercentage}
              remainingPercentage={
                remainingPercentage
              }
            />

            <ProductsSection
              products={list}
              warehouses={warehouses.data ?? []}
              lang={lang}
              t={t}
              onView={setViewing}
              onPrint={setPrinting}
              onEdit={(product) => {
                setEditing(product);
                setFormOpen(true);
              }}
              onDelete={setToDelete}
            />
          </>
        )}
      </div>

      {/* PRODUCT FORM */}

      <ProductFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        product={editing}
        warehouses={warehouses.data ?? []}
        {...(wh !== ALL_WAREHOUSES
          ? { defaultWarehouse: wh }
          : {})}
      />

      {/* PRINT BARCODE */}

      <PrintBarcodeDialog
        product={printing}
        open={printing !== null}
        onOpenChange={(v) =>
          !v && setPrinting(null)
        }
      />

      {/* PRODUCT DETAILS */}

      <ProductDetailsDialog
        product={viewing}
        warehouses={warehouses.data ?? []}
        open={viewing !== null}
        onOpenChange={(v) =>
          !v && setViewing(null)
        }
      />

      {/* DELETE */}

      <ConfirmDialog
        open={toDelete !== null}
        onOpenChange={(v) =>
          !v && setToDelete(null)
        }
        title={t(
          "confirm_delete_product"
        )}
        busy={del.isPending}
        onConfirm={() => {
          if (!toDelete) return;

          del.mutate(
            toDelete.product_id,
            {
              onSuccess: () => {
                toast.success(
                  t("deleted")
                );
                setToDelete(null);
              },

              onError: (e) =>
                toast.error(
                  errorMessage(e, lang)
                ),
            }
          );
        }}
      />
    </AppShell>
  );
}

/* ============================================================
   INVENTORY CONTROLS
   ============================================================ */

function InventoryControls({
  q,
  setQ,
  wh,
  setWh,
  warehouses,
  isFetching,
  onRefresh,
  onAddProduct,
  searchPlaceholder,
  addProductLabel,
}: {
  q: string;
  setQ: (value: string) => void;
  wh: string;
  setWh: (value: string) => void;
  warehouses: any[];
  isFetching: boolean;
  onRefresh: () => void;
  onAddProduct: () => void;
  searchPlaceholder: string;
  addProductLabel: string;
}) {
  return (
    <Card
      className="
        overflow-hidden
        border
        p-0
        shadow-xl
      "
      style={{
        background: BRAND.cardGradient,
        borderColor: BRAND.borderPurple,
      }}
    >
      {/* Header */}

      <div
        className="p-5 text-white"
        style={{
          background: BRAND.purpleGradient,
        }}
      >
        <div className="flex items-center gap-3">
          <div
            className="
              flex
              h-11
              w-11
              items-center
              justify-center
              rounded-xl
              bg-white/15
              backdrop-blur-sm
            "
          >
            <Package className="h-5 w-5 text-white" />
          </div>

          <div>
            <h2 className="text-lg font-bold">
              البحث والتحكم في المخزون
            </h2>

            <p className="mt-0.5 text-sm text-white/80">
              ابحث عن المنتج أو اختر المخزن المطلوب لعرض البيانات.
            </p>
          </div>
        </div>
      </div>

      {/* Controls */}

      <div
        className="p-5"
        style={{
          background: BRAND.cardGradient,
        }}
      >
        <div className="flex flex-col gap-3 md:flex-row">
          <Input
            value={q}
            onChange={(e) =>
              setQ(e.target.value)
            }
            placeholder={searchPlaceholder}
            className="
              h-11
              border
              bg-white
              text-gray-900
              placeholder:text-gray-400
              shadow-sm
              focus-visible:ring-2
              focus-visible:ring-[#9B4BA8]
              focus-visible:border-[#9B4BA8]
            "
            style={{
              borderColor: BRAND.borderPurple,
            }}
          />

          <WarehouseSelect
            value={wh}
            onChange={setWh}
            warehouses={warehouses}
            includeAll
            className="
              h-11
              w-full
              md:w-56
              border-purple-300
            "
          />

          <Button
            variant="outline"
            size="icon"
            onClick={onRefresh}
            title="تحديث البيانات"
            className="
              h-11
              w-11
              border
              bg-white
              text-[#7B2C8E]
              transition-all
              hover:bg-[#F3E5F5]
              hover:text-[#7B2C8E]
            "
            style={{
              borderColor:
                BRAND.borderPurple,
            }}
          >
            <RefreshCw
              className={
                isFetching
                  ? "h-4 w-4 animate-spin"
                  : "h-4 w-4"
              }
            />
          </Button>

          <Button
            onClick={onAddProduct}
            className="
              h-11
              text-white
              shadow-md
              transition-all
              hover:-translate-y-0.5
              hover:brightness-105
              md:ms-auto
            "
            style={{
              background: BRAND.purpleGradient,
            }}
          >
            <Plus className="me-1 h-4 w-4" />
            {addProductLabel}
          </Button>
        </div>
      </div>
    </Card>
  );
}

/* ============================================================
   INVENTORY STATISTICS
   ============================================================ */

function InventoryStatistics({
  statistics,
}: {
  statistics: {
    totalProducts: number;
    totalStock: number;
    totalSold: number;
    totalRemaining: number;
    lowStockProducts: number;
    outOfStockProducts: number;
  };
}) {
  const cards = [
    {
      title: "إجمالي المنتجات",
      value: statistics.totalProducts,
      description: "عدد المنتجات الموجودة",
      icon: Package,
    },
    {
      title: "إجمالي المخزون",
      value: statistics.totalStock,
      description: "كل الوحدات المسجلة",
      icon: Boxes,
    },
    {
      title: "تم بيعها",
      value: statistics.totalSold,
      description: "إجمالي الوحدات المباعة",
      icon: ShoppingCart,
    },
    {
      title: "المتبقي",
      value: statistics.totalRemaining,
      description: "الوحدات المتاحة للبيع",
      icon: Warehouse,
    },
    {
      title: "مخزون منخفض",
      value: statistics.lowStockProducts,
      description: "منتجات تحتاج متابعة",
      icon: AlertTriangle,
    },
    {
      title: "نفد المخزون",
      value: statistics.outOfStockProducts,
      description: "منتجات غير متاحة حاليًا",
      icon: AlertTriangle,
    },
  ];

  return (
    <section className="space-y-4">
      <div
        className="
          rounded-2xl
          border
          p-5
          shadow-sm
        "
        style={{
          background: BRAND.purpleGradient,
          borderColor: BRAND.purpleLight,
        }}
      >
        <div className="flex items-center gap-3">
          <BarChart3 className="h-6 w-6 text-white" />

          <div>
            <h2 className="text-xl font-bold text-white">
              ملخص المخزون
            </h2>

            <p className="mt-1 text-sm text-white/80">
              نظرة سريعة على حالة المخزون الحالية.
            </p>
          </div>
        </div>
      </div>

      <div
        className="
          grid
          gap-4
          sm:grid-cols-2
          lg:grid-cols-3
          xl:grid-cols-6
        "
      >
        {cards.map((item) => {
          const Icon = item.icon;

          return (
            <Card
              key={item.title}
              className="
                border
                p-4
                transition-all
                duration-300
                hover:-translate-y-1
                hover:border-[#9B4BA8]
                hover:shadow-[0_12px_30px_rgba(155,75,168,0.18)]
              "
              style={{
                background:
                  BRAND.cardGradient,
                borderColor:
                  BRAND.borderPurple,
              }}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-medium text-[#6B5A70]">
                    {item.title}
                  </p>

                  <p className="mt-2 text-2xl font-bold text-[#7B2C8E]">
                    {item.value.toLocaleString()}
                  </p>

                  <p className="mt-1 text-xs text-[#8A7890]">
                    {item.description}
                  </p>
                </div>

                <div
                  className="
                    rounded-xl
                    p-2.5
                  "
                  style={{
                    background:
                      "linear-gradient(135deg, #F3E5F5, #E8CBEA)",
                  }}
                >
                  <Icon
                    className="h-5 w-5"
                    style={{
                      color: BRAND.purpleDark,
                    }}
                  />
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
   INVENTORY CHARTS
   ============================================================ */

function InventoryCharts({
  statistics,
  soldPercentage,
  remainingPercentage,
}: {
  statistics: {
    totalStock: number;
    totalSold: number;
    totalRemaining: number;
    lowStockProducts: number;
    outOfStockProducts: number;
  };
  soldPercentage: number;
  remainingPercentage: number;
}) {
  return (
    <section className="space-y-4">
      <div
        className="
          rounded-2xl
          border
          p-5
          shadow-sm
        "
        style={{
          background: BRAND.purpleGradient,
          borderColor: BRAND.purpleLight,
        }}
      >
        <div className="flex items-center gap-3">
          <BarChart3 className="h-6 w-6 text-white" />

          <div>
            <h2 className="text-xl font-bold text-white">
              تحليل المخزون
            </h2>

            <p className="text-sm text-white/80">
              الرسوم التالية توضح حالة المخزون بشكل مبسط.
            </p>
          </div>
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        {/* CHART 1 */}

        <Card
          className="
            border
            p-5
            transition-all
            duration-300
            hover:border-[#9B4BA8]
            hover:shadow-[0_12px_35px_rgba(155,75,168,0.15)]
          "
          style={{
            background:
              BRAND.cardGradient,
            borderColor:
              BRAND.borderPurple,
          }}
        >
          <div className="mb-6 flex items-center gap-3">
            <div
              className="rounded-xl p-2.5"
              style={{
                background:
                  "linear-gradient(135deg, #F3E5F5, #E8CBEA)",
              }}
            >
              <TrendingUp
                className="h-5 w-5"
                style={{
                  color:
                    BRAND.purpleDark,
                }}
              />
            </div>

            <div>
              <h3 className="font-bold text-[#7B2C8E]">
                المباع مقابل المتبقي
              </h3>

              <p className="text-xs text-[#8A7890]">
                يوضح نسبة الوحدات التي تم بيعها مقارنة بالوحدات المتبقية.
              </p>
            </div>
          </div>

          <div className="space-y-6">
            <ChartBar
              label="تم البيع"
              value={statistics.totalSold}
              percentage={soldPercentage}
            />

            <ChartBar
              label="المتبقي"
              value={statistics.totalRemaining}
              percentage={remainingPercentage}
            />
          </div>

          <div
            className="
              mt-6
              rounded-xl
              border
              p-3
              text-sm
              text-[#6B5A70]
            "
            style={{
              background:
                "linear-gradient(135deg, #F3E5F5, #FAF5FC)",
              borderColor:
                BRAND.borderPurple,
            }}
          >
            <strong className="text-[#7B2C8E]">
              شرح الرسم:
            </strong>{" "}
            كلما ارتفعت نسبة البيع، فهذا يعني أن المنتجات
            تتحرك بشكل أسرع. أما ارتفاع نسبة المتبقي فيعني
            وجود كمية أكبر ما زالت في المخزون.
          </div>
        </Card>

        {/* CHART 2 */}

        <Card
          className="
            border
            p-5
            transition-all
            duration-300
            hover:border-[#9B4BA8]
            hover:shadow-[0_12px_35px_rgba(155,75,168,0.15)]
          "
          style={{
            background:
              BRAND.cardGradient,
            borderColor:
              BRAND.borderPurple,
          }}
        >
          <div className="mb-6 flex items-center gap-3">
            <div
              className="rounded-xl p-2.5"
              style={{
                background:
                  "linear-gradient(135deg, #F3E5F5, #E8CBEA)",
              }}
            >
              <AlertTriangle
                className="h-5 w-5"
                style={{
                  color:
                    BRAND.purpleDark,
                }}
              />
            </div>

            <div>
              <h3 className="font-bold text-[#7B2C8E]">
                حالة المنتجات
              </h3>

              <p className="text-xs text-[#8A7890]">
                توزيع المنتجات حسب حالة المخزون.
              </p>
            </div>
          </div>

          <div className="space-y-6">
            <StatusChartBar
              label="متوفر"
              value={Math.max(
                0,
                statistics.totalRemaining -
                  statistics.lowStockProducts -
                  statistics.outOfStockProducts
              )}
              total={Math.max(
                1,
                statistics.totalRemaining
              )}
            />

            <StatusChartBar
              label="مخزون منخفض"
              value={
                statistics.lowStockProducts
              }
              total={Math.max(
                1,
                statistics.lowStockProducts +
                  statistics.outOfStockProducts +
                  1
              )}
            />

            <StatusChartBar
              label="نفد المخزون"
              value={
                statistics.outOfStockProducts
              }
              total={Math.max(
                1,
                statistics.outOfStockProducts +
                  statistics.lowStockProducts +
                  1
              )}
            />
          </div>

          <div
            className="
              mt-6
              rounded-xl
              border
              p-3
              text-sm
              text-[#6B5A70]
            "
            style={{
              background:
                "linear-gradient(135deg, #F3E5F5, #FAF5FC)",
              borderColor:
                BRAND.borderPurple,
            }}
          >
            <strong className="text-[#7B2C8E]">
              شرح الرسم:
            </strong>{" "}
            المنتجات ذات المخزون المنخفض تحتاج إعادة توريد
            قريبًا، بينما المنتجات التي نفد مخزونها تحتاج
            إعادة تخزين قبل استقبال مبيعات جديدة.
          </div>
        </Card>
      </div>
    </section>
  );
}

/* ============================================================
   SIMPLE BAR CHART
   ============================================================ */

function ChartBar({
  label,
  value,
  percentage,
}: {
  label: string;
  value: number;
  percentage: number;
}) {
  return (
    <div className="space-y-2.5">
      <div className="flex items-center justify-between text-sm">
        <span className="font-medium text-[#6B5A70]">
          {label}
        </span>

        <span className="font-bold text-[#7B2C8E]">
          {value.toLocaleString()} وحدة

          <span className="ms-2 text-[#8A7890]">
            ({percentage}%)
          </span>
        </span>
      </div>

      <div
        className="
          h-3
          overflow-hidden
          rounded-full
        "
        style={{
          backgroundColor: "#EADCF0",
        }}
      >
        <div
          className="
            h-full
            rounded-full
            transition-all
            duration-500
          "
          style={{
            width: `${percentage}%`,
            background:
              BRAND.purpleGradient,
            boxShadow:
              "0 0 12px rgba(155,75,168,0.30)",
          }}
        />
      </div>
    </div>
  );
}

/* ============================================================
   STATUS BAR
   ============================================================ */

function StatusChartBar({
  label,
  value,
  total,
}: {
  label: string;
  value: number;
  total: number;
}) {
  const percentage = Math.min(
    100,
    Math.round((value / total) * 100)
  );

  return (
    <div className="space-y-2.5">
      <div className="flex items-center justify-between text-sm">
        <span className="font-medium text-[#6B5A70]">
          {label}
        </span>

        <span className="font-bold text-[#7B2C8E]">
          {value.toLocaleString()}
        </span>
      </div>

      <div
        className="
          h-3
          overflow-hidden
          rounded-full
        "
        style={{
          backgroundColor: "#EADCF0",
        }}
      >
        <div
          className="
            h-full
            rounded-full
            transition-all
            duration-500
          "
          style={{
            width: `${percentage}%`,
            background:
              "linear-gradient(90deg, #9B4BA8, #C084CC)",
            boxShadow:
              "0 0 10px rgba(155,75,168,0.25)",
          }}
        />
      </div>
    </div>
  );
}

/* ============================================================
   PRODUCTS
   ============================================================ */

function ProductsSection({
  products,
  warehouses,
  lang,
  t,
  onView,
  onPrint,
  onEdit,
  onDelete,
}: {
  products: Product[];
  warehouses: any[];
  lang: any;
  t: any;
  onView: (product: Product) => void;
  onPrint: (product: Product) => void;
  onEdit: (product: Product) => void;
  onDelete: (product: Product) => void;
}) {
  return (
    <section className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div
          className="
            rounded-2xl
            border
            p-5
            shadow-sm
          "
          style={{
            background:
              BRAND.purpleGradient,
            borderColor:
              BRAND.purpleLight,
          }}
        >
          <h2 className="text-xl font-bold text-white">
            المنتجات
          </h2>

          <p className="mt-1 text-sm text-white/80">
            جميع المنتجات المطابقة للبحث والمخزن المحدد.
          </p>
        </div>

        <Badge
          className="
            w-fit
            border
            px-4
            py-2
            text-white
          "
          style={{
            background:
              BRAND.purpleGradient,
            borderColor:
              BRAND.purpleLight,
          }}
        >
          {products.length.toLocaleString()} منتج
        </Badge>
      </div>

      <div
        className="
          grid
          gap-5
          sm:grid-cols-2
          xl:grid-cols-3
          2xl:grid-cols-4
        "
      >
        {products.map((product) => (
          <ProductCard
            key={product.product_id}
            product={product}
            warehouses={warehouses}
            lang={lang}
            t={t}
            onView={onView}
            onPrint={onPrint}
            onEdit={onEdit}
            onDelete={onDelete}
          />
        ))}
      </div>
    </section>
  );
}

/* ============================================================
   PRODUCT CARD
   ============================================================ */

function ProductCard({
  product,
  warehouses,
  lang,
  t,
  onView,
  onPrint,
  onEdit,
  onDelete,
}: {
  product: Product;
  warehouses: any[];
  lang: any;
  t: any;
  onView: (product: Product) => void;
  onPrint: (product: Product) => void;
  onEdit: (product: Product) => void;
  onDelete: (product: Product) => void;
}) {
  const stockPercentage =
    product.stock_qty > 0
      ? Math.min(
          100,
          Math.round(
            (product.remaining_qty /
              product.stock_qty) *
              100
          )
        )
      : 0;

  return (
    <Card
      className="
        group
        overflow-hidden
        border
        p-0
        transition-all
        duration-300
        hover:-translate-y-1
        hover:border-[#9B4BA8]
        hover:shadow-[0_18px_40px_rgba(155,75,168,0.20)]
      "
      style={{
        background:
          BRAND.cardGradient,
        borderColor:
          BRAND.borderPurple,
      }}
    >
      {/* PRODUCT IMAGE */}

      <div className="relative">
        <ProductImage
          url={product.image_url}
          alt={product.product_name}
          className="
            h-56
            w-full
            rounded-none
            border-b
            border-[#D8B4E2]
          "
        />

        <div
          className="
            pointer-events-none
            absolute
            inset-0
            opacity-0
            transition-opacity
            duration-300
            group-hover:opacity-100
          "
          style={{
            background:
              "linear-gradient(to top, rgba(155,75,168,0.18), transparent 45%)",
          }}
        />

        <div className="absolute right-3 top-3">
          <Badge
            className="border shadow-lg"
            style={
              product.remaining_qty > 0
                ? {
                    backgroundColor:
                      "#F3E5F5",
                    color:
                      BRAND.purpleDark,
                    borderColor:
                      BRAND.borderPurple,
                  }
                : {
                    backgroundColor:
                      "#FEE2E2",
                    color:
                      "#B91C1C",
                    borderColor:
                      "#FCA5A5",
                  }
            }
          >
            {product.remaining_qty > 0
              ? t("remaining")
              : t(
                  "insufficient_stock"
                )}
          </Badge>
        </div>
      </div>

      {/* PRODUCT INFO */}

      <div className="space-y-4 p-4">
        <div>
          <h2
            className="
              line-clamp-2
              text-base
              font-bold
              leading-tight
              text-[#4B3150]
            "
          >
            {product.product_name}
          </h2>

          <p className="mt-1 text-xs text-[#8A7890]">
            {product.product_id} •{" "}
            {warehouseName(
              warehouses,
              product.warehouse
            )}
          </p>
        </div>

        {/* PRICE */}

        <p
          className="text-lg font-bold"
          style={{
            color: BRAND.purpleDark,
          }}
        >
          {fmtMoney(
            product.price,
            lang
          )}
        </p>

        {/* STOCK NUMBERS */}

        <div
          className="
            grid
            grid-cols-3
            gap-2
            rounded-xl
            border
            p-2
            text-center
          "
          style={{
            background:
              "linear-gradient(135deg, #F3E5F5, #FAF5FC)",
            borderColor:
              BRAND.borderPurple,
          }}
        >
          <div>
            <p className="text-[11px] text-[#8A7890]">
              إجمالي
            </p>

            <p className="font-semibold text-[#7B2C8E]">
              {product.stock_qty}
            </p>
          </div>

          <div
            className="
              border-x
              border-[#D8B4E2]
            "
          >
            <p className="text-[11px] text-[#8A7890]">
              مباع
            </p>

            <p className="font-semibold text-[#7B2C8E]">
              {product.sold_qty}
            </p>
          </div>

          <div>
            <p className="text-[11px] text-[#8A7890]">
              متبقي
            </p>

            <p
              className="font-semibold"
              style={{
                color:
                  product.remaining_qty > 0
                    ? BRAND.purple
                    : "#DC2626",
              }}
            >
              {product.remaining_qty}
            </p>
          </div>
        </div>

        {/* MINI CHART */}

        <div className="space-y-1.5">
          <div className="flex justify-between text-[11px]">
            <span className="text-[#8A7890]">
              نسبة المتبقي
            </span>

            <span className="font-medium text-[#6B5A70]">
              {stockPercentage}%
            </span>
          </div>

          <div
            className="
              h-2
              overflow-hidden
              rounded-full
            "
            style={{
              backgroundColor:
                "#EADCF0",
            }}
          >
            <div
              className="
                h-full
                rounded-full
                transition-all
                duration-500
              "
              style={{
                width: `${stockPercentage}%`,
                background:
                  BRAND.purpleGradient,
              }}
            />
          </div>
        </div>

        {/* ACTIONS */}

        <div className="flex flex-wrap gap-2">
          {/* VIEW */}

          <Button
            size="sm"
            variant="outline"
            onClick={() =>
              onView(product)
            }
            className="
              border
              bg-white
              text-[#7B2C8E]
              transition-all
              hover:border-[#9B4BA8]
              hover:bg-[#F3E5F5]
              hover:text-[#7B2C8E]
            "
            style={{
              borderColor:
                BRAND.borderPurple,
            }}
          >
            <Eye className="me-1 h-4 w-4" />
            {t("view_details")}
          </Button>

          {/* PRINT */}

          <Button
            size="sm"
            variant="outline"
            onClick={() =>
              onPrint(product)
            }
            className="
              border
              bg-white
              text-[#7B2C8E]
              transition-all
              hover:border-[#9B4BA8]
              hover:bg-[#F3E5F5]
              hover:text-[#7B2C8E]
            "
            style={{
              borderColor:
                BRAND.borderPurple,
            }}
          >
            <Printer className="me-1 h-4 w-4" />
            {t("print_barcode")}
          </Button>

          {/* EDIT */}

          <Button
            size="sm"
            variant="outline"
            onClick={() =>
              onEdit(product)
            }
            className="
              border
              bg-white
              text-[#7B2C8E]
              transition-all
              hover:border-[#9B4BA8]
              hover:bg-[#F3E5F5]
              hover:text-[#7B2C8E]
            "
            style={{
              borderColor:
                BRAND.borderPurple,
            }}
          >
            <Pencil className="me-1 h-4 w-4" />
            {t("edit")}
          </Button>

          {/* DELETE */}

          <Button
            size="sm"
            variant="ghost"
            onClick={() =>
              onDelete(product)
            }
            className="
              text-[#8A7890]
              transition-all
              hover:bg-red-50
              hover:text-red-600
            "
          >
            <Trash2 className="me-1 h-4 w-4" />
            {t("delete")}
          </Button>
        </div>
      </div>
    </Card>
  );
}