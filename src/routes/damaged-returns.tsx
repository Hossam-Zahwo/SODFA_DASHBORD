import { useCallback, useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import {
  Plus,
  BarChart3,
  CheckCircle2,
  XCircle,
  Clock3,
  Trash2,
  Wallet,
  AlertTriangle,
} from "lucide-react";
import { toast } from "sonner";

import { AppShell } from "@/components/AppShell";
import { Blocks } from "@/components/blocks-export";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { ImageDropzone } from "@/components/ImageDropzone";
import { ProductImage } from "@/components/ProductImage";
import { WarehouseSelect } from "@/components/WarehouseSelect";

import {
  useApiMutation,
  useDamagedReturns,
  useInventory,
  useWarehouses,
} from "@/hooks/useSodfa";

import {
  api,
  type DamagedStatus,
  type Product,
} from "@/lib/api";

import { errorMessage, useI18n } from "@/lib/i18n";
import { fmtDate } from "@/lib/dates";
import { warehouseName } from "@/lib/warehouse";

export const Route = createFileRoute("/damaged-returns")({
  head: () => ({
    meta: [
      {
        title: "Damaged Returns — SODFA صدفة",
      },
      {
        name: "description",
        content:
          "Track damaged shipments with three images and Pending/Accepted/Rejected status.",
      },
      {
        property: "og:title",
        content: "Damaged Returns — SODFA صدفة",
      },
      {
        property: "og:description",
        content:
          "Damaged returns never re-enter sellable stock.",
      },
    ],
  }),

  component: DamagedPage,
});

const STATUSES: DamagedStatus[] = [
  "Pending",
  "Accepted",
  "Rejected",
];

function DamagedPage() {
  const { t, lang } = useI18n();

  const damaged = useDamagedReturns();
  const inventory = useInventory();
  const warehouses = useWarehouses();

  const [open, setOpen] = useState(false);

  const [filter, setFilter] = useState<string>("all");

  const [search, setSearch] = useState("");

  const [listSearch, setListSearch] = useState("");

  const [detail, setDetail] = useState<string | null>(
    null,
  );

  const [product, setProduct] =
    useState<Product | null>(null);

  const [shipment, setShipment] = useState("");

  const [qty, setQty] = useState("1");

  const [reason, setReason] = useState("");

  const [details, setDetails] = useState("");

  const [destination, setDestination] =
    useState("");

  const [img1, setImg1] = useState("");

  const [img2, setImg2] = useState("");

  const [img3, setImg3] = useState("");

  /*
   * =========================================================
   * DELETE STATE
   * =========================================================
   */

  const [selectedDelete, setSelectedDelete] =
    useState("");

  const [deleteId, setDeleteId] =
    useState<string | null>(null);

  /*
   * =========================================================
   * CREATE DAMAGED RETURN
   * =========================================================
   */

  const save = useApiMutation(() =>
    api.recordDamagedReturn({
      product_id: product!.product_id,

      shipment_code: shipment,

      qty: Number(qty),

      /*
       * مهم:
       * نحفظ سعر المنتج وقت إنشاء المرتجع.
       *
       * استخدمنا cast حتى لا يكسر TypeScript
       * لو الـ Product type الحالي عندك لا يحتوي
       * price بشكل صريح.
       */
      unit_price: Number(
        (product as Product & {
          price?: number;
          unit_price?: number;
        })?.unit_price ??
          (product as Product & {
            price?: number;
          })?.price ??
          0,
      ),

      warehouse: destination,

      damage_reason: reason,

      damage_details: details,

      status: "Pending",

      policy_image: img1,

      product_image: img2,

      policy_product_image: img3,
    }),
  );

  /*
   * =========================================================
   * UPDATE STATUS
   * =========================================================
   */

  const setStatus = useApiMutation(
    (p: {
      id: string;
      status: DamagedStatus;
    }) =>
      api.updateDamagedStatus(
        p.id,
        p.status,
      ),
  );

  /*
   * =========================================================
   * DELETE DAMAGED RETURN
   * =========================================================
   */

  const deleteDamaged = useApiMutation(
    (id: string) =>
      api.deleteDamagedReturn(id),
  );

  /*
   * =========================================================
   * PRODUCT SEARCH
   * =========================================================
   */

  const matches = useMemo(() => {
    const term = search.trim().toLowerCase();

    if (!term) return [];

    return (inventory.data ?? [])
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
      .slice(0, 6);
  }, [search, inventory.data]);

  const pickProduct = useCallback(
    (p: Product) => {
      setProduct(p);

      setDestination(
        (currentWarehouse) => {
          return (
            currentWarehouse ||
            p.warehouse ||
            ""
          );
        },
      );
    },
    [],
  );

  /*
   * =========================================================
   * LIST FILTER
   * =========================================================
   */

  const term = listSearch
    .trim()
    .toLowerCase();

  const list = (damaged.data ?? [])
    .filter(
      (d) =>
        filter === "all" ||
        d.status === filter,
    )
    .filter(
      (d) =>
        !term ||
        [
          d.damaged_return_id,
          d.product_name,
          d.product_id,
          d.shipment_code,
          d.barcode,
        ].some((v) =>
          String(v ?? "")
            .toLowerCase()
            .includes(term),
        ),
    );

  /*
   * =========================================================
   * STATUS STATISTICS
   * =========================================================
   */

  const statusStats = useMemo(() => {
    const data = damaged.data ?? [];

    const accepted = data.filter(
      (item) =>
        item.status === "Accepted",
    ).length;

    const rejected = data.filter(
      (item) =>
        item.status === "Rejected",
    ).length;

    const pending = data.filter(
      (item) =>
        item.status === "Pending",
    ).length;

    const total =
      accepted +
      rejected +
      pending;

    const getPercentage = (
      value: number,
    ) =>
      total > 0
        ? Math.round(
            (value / total) * 100,
          )
        : 0;

    return {
      accepted,
      rejected,
      pending,
      total,

      acceptedPercentage:
        getPercentage(accepted),

      rejectedPercentage:
        getPercentage(rejected),

      pendingPercentage:
        getPercentage(pending),
    };
  }, [damaged.data]);

  /*
   * =========================================================
   * FINANCIAL STATISTICS
   * =========================================================
   *
   * قيمة المرتجع:
   *
   * unit_price × qty
   *
   * نحسب:
   * - Total
   * - Accepted
   * - Rejected
   * - Pending
   */

  const getDamagedValue = useCallback(
    (item: any) => {
      const unitPrice = Number(
        item?.unit_price ?? 0,
      );

      const quantity = Number(
        item?.qty ?? 0,
      );

      return (
        unitPrice * quantity
      );
    },
    [],
  );

  const financialStats = useMemo(() => {
    const data = damaged.data ?? [];

    const total = data.reduce(
      (sum, item) =>
        sum +
        getDamagedValue(item),
      0,
    );

    const accepted = data
      .filter(
        (item) =>
          item.status ===
          "Accepted",
      )
      .reduce(
        (sum, item) =>
          sum +
          getDamagedValue(item),
        0,
      );

    const rejected = data
      .filter(
        (item) =>
          item.status ===
          "Rejected",
      )
      .reduce(
        (sum, item) =>
          sum +
          getDamagedValue(item),
        0,
      );

    const pending = data
      .filter(
        (item) =>
          item.status ===
          "Pending",
      )
      .reduce(
        (sum, item) =>
          sum +
          getDamagedValue(item),
        0,
      );

    return {
      total,
      accepted,
      rejected,
      pending,
    };
  }, [
    damaged.data,
    getDamagedValue,
  ]);

  /*
   * =========================================================
   * CURRENCY FORMAT
   * =========================================================
   */

  const formatMoney = (
    value: number,
  ) => {
    return `${value.toLocaleString(
      "en-US",
      {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      },
    )} EGP`;
  };

  /*
   * =========================================================
   * DONUT
   * =========================================================
   */

  const chartBackground =
    useMemo(() => {
      const {
        acceptedPercentage,
        rejectedPercentage,
        pendingPercentage,
      } = statusStats;

      const acceptedEnd =
        acceptedPercentage;

      const rejectedEnd =
        acceptedPercentage +
        rejectedPercentage;

      return `conic-gradient(
        #22c55e 0% ${acceptedEnd}%,
        #ef4444 ${acceptedEnd}% ${rejectedEnd}%,
        #f59e0b ${rejectedEnd}% ${
          rejectedEnd +
          pendingPercentage
        }%,
        #7B2C8E ${
          rejectedEnd +
          pendingPercentage
        }% 100%
      )`;
    }, [statusStats]);

  /*
   * =========================================================
   * DETAIL ROW
   * =========================================================
   */

  const detailRow =
    (damaged.data ?? []).find(
      (d) =>
        d.damaged_return_id ===
        detail,
    ) ?? null;

  /*
   * =========================================================
   * DELETE ROW
   * =========================================================
   */

  const deleteRow =
    (damaged.data ?? []).find(
      (d) =>
        d.damaged_return_id ===
        deleteId,
    ) ?? null;

  /*
   * =========================================================
   * RESET
   * =========================================================
   */

  const reset = () => {
    setProduct(null);

    setSearch("");

    setShipment("");

    setQty("1");

    setReason("");

    setDetails("");

    setDestination("");

    setImg1("");

    setImg2("");

    setImg3("");
  };

  /*
   * =========================================================
   * STATUS LABEL
   * =========================================================
   */

  const statusLabel = (
    s: DamagedStatus,
  ) =>
    s === "Accepted"
      ? t("accepted")
      : s === "Rejected"
        ? t("rejected")
        : t("pending");

  /*
   * =========================================================
   * SUBMIT
   * =========================================================
   */

  const submitDamagedReturn = () => {
    if (!product) {
      toast.error(
        t("err_no_product"),
      );

      return;
    }

    const quantity =
      Number(qty);

    if (
      !Number.isFinite(
        quantity,
      ) ||
      quantity <= 0
    ) {
      toast.error(
        t("invalid_qty"),
      );

      return;
    }

    if (!destination) {
      toast.error(
        t("select_warehouse"),
      );

      return;
    }

    save.mutate(
      undefined as never,
      {
        onSuccess: () => {
          toast.success(
            t(
              "damaged_recorded",
            ),
          );

          setOpen(false);

          reset();

          damaged.refetch();
        },

        onError: (e) =>
          toast.error(
            errorMessage(
              e,
              lang,
            ),
          ),
      },
    );
  };

  /*
   * =========================================================
   * DELETE HANDLER
   * =========================================================
   */

  const confirmDelete = () => {
    if (!deleteId) {
      return;
    }

    deleteDamaged.mutate(
      deleteId,
      {
        onSuccess: () => {
          toast.success(
            "تم حذف المرتجع بنجاح",
          );

          setDeleteId(null);

          setSelectedDelete("");

          damaged.refetch();
        },

        onError: (e) => {
          toast.error(
            errorMessage(
              e,
              lang,
            ),
          );
        },
      },
    );
  };

  /*
   * =========================================================
   * UI
   * =========================================================
   */

  return (
    <AppShell
      title={t(
        "damaged_returns",
      )}
    >
      <div className="space-y-6">

        {/* =====================================================
            HEADER
        ====================================================== */}

        <Card
          className="
            overflow-hidden
            border-[#9B4BA8]/40
            bg-gradient-to-r
            from-[#7B2C8E]
            via-[#9B4BA8]
            to-[#C084CC]
            p-5
            text-white
            shadow-lg
            shadow-[#7B2C8E]/20
          "
        >
          <div className="flex flex-col gap-4 xl:flex-row xl:items-center">

            <div className="flex-1">

              <h1 className="text-xl font-bold">
                {t(
                  "damaged_returns",
                )}
              </h1>

              <p className="mt-1 text-sm text-white/80">
                {t(
                  "damaged_no_stock_note",
                )}
              </p>

            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">

              {/* SEARCH */}

              <Input
                value={listSearch}
                onChange={(e) =>
                  setListSearch(
                    e.target.value,
                  )
                }
                placeholder={t(
                  "search_placeholder",
                )}
                className="
                  w-full
                  border-white/20
                  bg-white/10
                  text-white
                  placeholder:text-white/60
                  backdrop-blur-md
                  focus-visible:ring-white/50
                  sm:w-64
                "
              />

              {/* STATUS FILTER */}

              <Select
                value={filter}
                onValueChange={
                  setFilter
                }
              >
                <SelectTrigger
                  className="
                    w-full
                    border-white/20
                    bg-white/10
                    text-white
                    backdrop-blur-md
                    sm:w-48
                  "
                >
                  <SelectValue />
                </SelectTrigger>

                <SelectContent
                  className="
                    border-[#9B4BA8]/40
                    bg-[#24102A]
                    text-white
                  "
                >
                  <SelectItem value="all">
                    {t(
                      "all_statuses",
                    )}
                  </SelectItem>

                  {STATUSES.map(
                    (s) => (
                      <SelectItem
                        key={s}
                        value={s}
                      >
                        {statusLabel(
                          s,
                        )}
                      </SelectItem>
                    ),
                  )}
                </SelectContent>
              </Select>

              {/* DELETE SELECT */}

              <Select
                value={
                  selectedDelete
                }
                onValueChange={
                  setSelectedDelete
                }
              >
                <SelectTrigger
                  className="
                    w-full
                    border-red-300/30
                    bg-red-500/10
                    text-white
                    backdrop-blur-md
                    sm:w-64
                  "
                >
                  <SelectValue placeholder="اختر مرتجع للحذف" />
                </SelectTrigger>

                <SelectContent
                  className="
                    border-[#9B4BA8]/40
                    bg-[#24102A]
                    text-white
                  "
                >
                  {(damaged.data ??
                    []).length ===
                  0 ? (
                    <SelectItem
                      value="none"
                      disabled
                    >
                      لا توجد مرتجعات
                    </SelectItem>
                  ) : (
                    (
                      damaged.data ??
                      []
                    ).map((d) => (
                      <SelectItem
                        key={
                          d.damaged_return_id
                        }
                        value={
                          d.damaged_return_id
                        }
                      >
                        {d.product_name}{" "}
                        —{" "}
                        {
                          d.damaged_return_id
                        }
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>

              {/* DELETE BUTTON */}

              <Button
                disabled={
                  !selectedDelete ||
                  selectedDelete ===
                    "none" ||
                  deleteDamaged.isPending
                }
                onClick={() => {
                  if (
                    !selectedDelete ||
                    selectedDelete ===
                      "none"
                  ) {
                    return;
                  }

                  setDeleteId(
                    selectedDelete,
                  );
                }}
                variant="destructive"
                className="
                  bg-red-600
                  text-white
                  shadow-md
                  hover:bg-red-700
                "
              >
                <Trash2 className="me-1 h-4 w-4" />

                {deleteDamaged.isPending
                  ? "جاري الحذف..."
                  : "حذف المرتجع"}
              </Button>

              {/* ADD */}

              <Button
                onClick={() =>
                  setOpen(true)
                }
                className="
                  border-0
                  bg-white
                  text-[#7B2C8E]
                  shadow-md
                  hover:bg-[#F5E8F7]
                  hover:text-[#7B2C8E]
                "
              >
                <Plus className="me-1 h-4 w-4" />

                {t(
                  "add_damaged_return",
                )}
              </Button>

            </div>
          </div>
        </Card>

        {/* =====================================================
            FINANCIAL ANALYTICS
        ====================================================== */}

        <section className="space-y-4">

          <div className="flex items-center gap-3">

            <div
              className="
                flex
                h-11
                w-11
                items-center
                justify-center
                rounded-xl
                bg-gradient-to-br
                from-[#7B2C8E]
                to-[#C084CC]
                text-white
                shadow-md
              "
            >
              <Wallet className="h-5 w-5" />
            </div>

            <div>

              <h2 className="text-xl font-bold text-[#7B2C8E]">
                القيمة المالية للمرتجعات
              </h2>

              <p className="text-sm text-muted-foreground">
                إجمالي قيمة المرتجعات حسب حالة كل مرتجع.
              </p>

            </div>

          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">

            {/* TOTAL */}

            <Card
              className="
                overflow-hidden
                border-[#9B4BA8]/40
                bg-gradient-to-br
                from-[#7B2C8E]
                via-[#9B4BA8]
                to-[#C084CC]
                p-5
                text-white
                shadow-lg
                shadow-[#7B2C8E]/15
              "
            >
              <div className="flex items-start justify-between">

                <div>

                  <p className="text-sm text-white/75">
                    إجمالي قيمة المرتجعات
                  </p>

                  <p className="mt-2 text-3xl font-bold">
                    {formatMoney(
                      financialStats.total,
                    )}
                  </p>

                  <p className="mt-1 text-xs text-white/70">
                    جميع المرتجعات
                  </p>

                </div>

                <Wallet className="h-6 w-6 text-white/70" />

              </div>
            </Card>

            {/* ACCEPTED */}

            <Card
              className="
                border-green-500/20
                bg-green-500/5
                p-5
                shadow-sm
              "
            >
              <div className="flex items-start justify-between">

                <div>

                  <p className="text-sm text-muted-foreground">
                    قيمة المقبول
                  </p>

                  <p className="mt-2 text-3xl font-bold text-green-600">
                    {formatMoney(
                      financialStats.accepted,
                    )}
                  </p>

                  <p className="mt-1 text-xs text-muted-foreground">
                    المرتجعات المقبولة
                  </p>

                </div>

                <CheckCircle2 className="h-6 w-6 text-green-500" />

              </div>
            </Card>

            {/* REJECTED */}

            <Card
              className="
                border-red-500/20
                bg-red-500/5
                p-5
                shadow-sm
              "
            >
              <div className="flex items-start justify-between">

                <div>

                  <p className="text-sm text-muted-foreground">
                    قيمة المرفوض
                  </p>

                  <p className="mt-2 text-3xl font-bold text-red-600">
                    {formatMoney(
                      financialStats.rejected,
                    )}
                  </p>

                  <p className="mt-1 text-xs text-muted-foreground">
                    المرتجعات المرفوضة
                  </p>

                </div>

                <XCircle className="h-6 w-6 text-red-500" />

              </div>
            </Card>

            {/* PENDING */}

            <Card
              className="
                border-amber-500/20
                bg-amber-500/5
                p-5
                shadow-sm
              "
            >
              <div className="flex items-start justify-between">

                <div>

                  <p className="text-sm text-muted-foreground">
                    قيمة قيد المراجعة
                  </p>

                  <p className="mt-2 text-3xl font-bold text-amber-600">
                    {formatMoney(
                      financialStats.pending,
                    )}
                  </p>

                  <p className="mt-1 text-xs text-muted-foreground">
                    المرتجعات المعلقة
                  </p>

                </div>

                <Clock3 className="h-6 w-6 text-amber-500" />

              </div>
            </Card>

          </div>
        </section>

        {/* =====================================================
            STATUS ANALYTICS
        ====================================================== */}

        <section className="space-y-4">

          <div className="flex items-center gap-3">

            <div
              className="
                flex
                h-11
                w-11
                items-center
                justify-center
                rounded-xl
                bg-gradient-to-br
                from-[#7B2C8E]
                to-[#C084CC]
                text-white
                shadow-md
              "
            >
              <BarChart3 className="h-5 w-5" />
            </div>

            <div>

              <h2 className="text-xl font-bold text-[#7B2C8E]">
                تحليل حالات المرتجعات التالفة
              </h2>

              <p className="text-sm text-muted-foreground">
                نسبة المرتجعات المقبولة والمرفوضة والتي ما زالت قيد المراجعة.
              </p>

            </div>

          </div>

          <Card
            className="
              overflow-hidden
              border-[#9B4BA8]/30
              bg-gradient-to-br
              from-[#F8EFF9]
              via-[#F3E5F5]
              to-[#EAD4ED]
              p-5
              shadow-md
              shadow-[#9B4BA8]/10
              dark:from-[#29152F]
              dark:via-[#24102A]
              dark:to-[#301536]
            "
          >

            <div className="grid gap-8 lg:grid-cols-[280px_1fr] lg:items-center">

              {/* DONUT */}

              <div className="flex justify-center">

                <div className="relative h-60 w-60">

                  <div
                    className="
                      h-full
                      w-full
                      rounded-full
                      shadow-xl
                      shadow-[#7B2C8E]/20
                    "
                    style={{
                      background:
                        chartBackground,
                    }}
                  />

                  <div
                    className="
                      absolute
                      inset-5
                      flex
                      items-center
                      justify-center
                      rounded-full
                      border
                      border-[#C084CC]/30
                      bg-[#F8EFF9]
                      shadow-inner
                      dark:bg-[#24102A]
                    "
                  >

                    <div className="text-center">

                      <span className="block text-4xl font-bold text-[#7B2C8E] dark:text-[#C084CC]">
                        {
                          statusStats.total
                        }
                      </span>

                      <span className="text-xs text-muted-foreground">
                        إجمالي المرتجعات
                      </span>

                    </div>

                  </div>

                </div>

              </div>

              {/* STATISTICS */}

              <div className="space-y-3">

                {/* ACCEPTED */}

                <div
                  className="
                    rounded-2xl
                    border
                    border-green-500/20
                    bg-green-500/5
                    p-4
                    transition-all
                    hover:border-green-500/40
                    hover:bg-green-500/10
                  "
                >

                  <div className="flex items-center justify-between gap-4">

                    <div className="flex items-center gap-3">

                      <div
                        className="
                          flex
                          h-11
                          w-11
                          items-center
                          justify-center
                          rounded-xl
                          bg-green-500/10
                        "
                      >
                        <CheckCircle2 className="h-5 w-5 text-green-500" />
                      </div>

                      <div>

                        <p className="font-semibold">
                          {t(
                            "accepted",
                          )}
                        </p>

                        <p className="text-xs text-muted-foreground">
                          المرتجعات التي تم قبولها
                        </p>

                      </div>

                    </div>

                    <div className="text-end">

                      <p className="text-xl font-bold text-green-600">
                        {
                          statusStats.accepted
                        }
                      </p>

                      <p className="text-xs text-muted-foreground">
                        {
                          statusStats.acceptedPercentage
                        }
                        %
                      </p>

                    </div>

                  </div>

                  <div className="mt-3 h-2 overflow-hidden rounded-full bg-green-500/10">

                    <div
                      className="h-full rounded-full bg-green-500 transition-all duration-700"
                      style={{
                        width: `${statusStats.acceptedPercentage}%`,
                      }}
                    />

                  </div>

                </div>

                {/* REJECTED */}

                <div
                  className="
                    rounded-2xl
                    border
                    border-red-500/20
                    bg-red-500/5
                    p-4
                    transition-all
                    hover:border-red-500/40
                    hover:bg-red-500/10
                  "
                >

                  <div className="flex items-center justify-between gap-4">

                    <div className="flex items-center gap-3">

                      <div
                        className="
                          flex
                          h-11
                          w-11
                          items-center
                          justify-center
                          rounded-xl
                          bg-red-500/10
                        "
                      >
                        <XCircle className="h-5 w-5 text-red-500" />
                      </div>

                      <div>

                        <p className="font-semibold">
                          {t(
                            "rejected",
                          )}
                        </p>

                        <p className="text-xs text-muted-foreground">
                          المرتجعات التي تم رفضها
                        </p>

                      </div>

                    </div>

                    <div className="text-end">

                      <p className="text-xl font-bold text-red-600">
                        {
                          statusStats.rejected
                        }
                      </p>

                      <p className="text-xs text-muted-foreground">
                        {
                          statusStats.rejectedPercentage
                        }
                        %
                      </p>

                    </div>

                  </div>

                  <div className="mt-3 h-2 overflow-hidden rounded-full bg-red-500/10">

                    <div
                      className="h-full rounded-full bg-red-500 transition-all duration-700"
                      style={{
                        width: `${statusStats.rejectedPercentage}%`,
                      }}
                    />

                  </div>

                </div>

                {/* PENDING */}

                <div
                  className="
                    rounded-2xl
                    border
                    border-amber-500/20
                    bg-amber-500/5
                    p-4
                    transition-all
                    hover:border-amber-500/40
                    hover:bg-amber-500/10
                  "
                >

                  <div className="flex items-center justify-between gap-4">

                    <div className="flex items-center gap-3">

                      <div
                        className="
                          flex
                          h-11
                          w-11
                          items-center
                          justify-center
                          rounded-xl
                          bg-amber-500/10
                        "
                      >
                        <Clock3 className="h-5 w-5 text-amber-500" />
                      </div>

                      <div>

                        <p className="font-semibold">
                          {t(
                            "pending",
                          )}
                        </p>

                        <p className="text-xs text-muted-foreground">
                          المرتجعات قيد المراجعة
                        </p>

                      </div>

                    </div>

                    <div className="text-end">

                      <p className="text-xl font-bold text-amber-600">
                        {
                          statusStats.pending
                        }
                      </p>

                      <p className="text-xs text-muted-foreground">
                        {
                          statusStats.pendingPercentage
                        }
                        %
                      </p>

                    </div>

                  </div>

                  <div className="mt-3 h-2 overflow-hidden rounded-full bg-amber-500/10">

                    <div
                      className="h-full rounded-full bg-amber-500 transition-all duration-700"
                      style={{
                        width: `${statusStats.pendingPercentage}%`,
                      }}
                    />

                  </div>

                </div>

              </div>

            </div>

          </Card>

        </section>

        {/* =====================================================
            LIST
        ====================================================== */}

        {damaged.isLoading ? (
          <Blocks.Loading
            label={t(
              "loading_returns",
            )}
          />
        ) : damaged.isError ? (
          <Blocks.Error
            label={errorMessage(
              damaged.error,
              lang,
            )}
          />
        ) : list.length === 0 ? (
          <Blocks.Empty
            label={t(
              "no_results",
            )}
          />
        ) : (
          <div className="grid gap-5 xl:grid-cols-2">

            {list.map((d) => {

              const damagedValue =
                getDamagedValue(d);

              return (
                <Card
                  key={
                    d.damaged_return_id
                  }
                  className="
                    group
                    overflow-hidden
                    border-[#9B4BA8]/25
                    bg-gradient-to-br
                    from-[#FBF5FC]
                    via-[#F5EAF7]
                    to-[#EBD8EF]
                    p-0
                    shadow-md
                    shadow-[#7B2C8E]/5
                    transition-all
                    duration-300
                    hover:-translate-y-1
                    hover:border-[#9B4BA8]/50
                    hover:shadow-xl
                    hover:shadow-[#7B2C8E]/15
                    dark:from-[#29152F]
                    dark:via-[#24102A]
                    dark:to-[#301536]
                  "
                >

                  {/* CARD HEADER */}

                  <div
                    className="
                      border-b
                      border-white/10
                      bg-gradient-to-r
                      from-[#7B2C8E]
                      via-[#9B4BA8]
                      to-[#C084CC]
                      p-4
                      text-white
                    "
                  >

                    <div className="flex items-start justify-between gap-3">

                      <div className="min-w-0">

                        <h2 className="truncate font-bold">
                          {
                            d.product_name
                          }
                        </h2>

                        <p className="mt-1 text-xs text-white/70">
                          {
                            d.damaged_return_id
                          }
                          {" • "}
                          {t(
                            "shipment_code",
                          )}
                          :{" "}
                          {d.shipment_code ||
                            "—"}
                        </p>

                      </div>

                      <Badge
                        className={`
                          shrink-0
                          border
                          ${
                            d.status ===
                            "Accepted"
                              ? "border-green-300/30 bg-green-500/20 text-green-100"
                              : d.status ===
                                  "Rejected"
                                ? "border-red-300/30 bg-red-500/20 text-red-100"
                                : "border-amber-300/30 bg-amber-500/20 text-amber-100"
                          }
                        `}
                      >
                        {statusLabel(
                          d.status,
                        )}
                      </Badge>

                    </div>

                  </div>

                  <div className="space-y-4 p-4">

                    {/* IMAGES */}

                    <div className="grid grid-cols-3 gap-2">

                      <div
                        className="
                          overflow-hidden
                          rounded-xl
                          border
                          border-[#C084CC]/20
                          bg-[#7B2C8E]/5
                        "
                      >

                        <ProductImage
                          url={
                            d.policy_image
                          }
                          alt={t(
                            "policy_image",
                          )}
                          className="h-32 w-full transition-transform duration-300 group-hover:scale-[1.02]"
                        />

                      </div>

                      <div
                        className="
                          overflow-hidden
                          rounded-xl
                          border
                          border-[#C084CC]/20
                          bg-[#7B2C8E]/5
                        "
                      >

                        <ProductImage
                          url={
                            d.product_image
                          }
                          alt={t(
                            "product_image",
                          )}
                          className="h-32 w-full transition-transform duration-300 group-hover:scale-[1.02]"
                        />

                      </div>

                      <div
                        className="
                          overflow-hidden
                          rounded-xl
                          border
                          border-[#C084CC]/20
                          bg-[#7B2C8E]/5
                        "
                      >

                        <ProductImage
                          url={
                            d.policy_product_image
                          }
                          alt={t(
                            "policy_product_image",
                          )}
                          className="h-32 w-full transition-transform duration-300 group-hover:scale-[1.02]"
                        />

                      </div>

                    </div>

                    {/* INFORMATION */}

                    <div
                      className="
                        rounded-xl
                        border
                        border-[#C084CC]/20
                        bg-[#9B4BA8]/5
                        p-3
                      "
                    >

                      <div className="flex flex-wrap gap-x-4 gap-y-2 text-sm">

                        <span>
                          {t(
                            "quantity",
                          )}
                          :{" "}
                          <strong>
                            {d.qty}
                          </strong>
                        </span>

                        <span>
                          {warehouseName(
                            warehouses.data,
                            d.warehouse,
                          )}
                        </span>

                        <span>
                          {fmtDate(
                            d.return_date,
                            lang,
                          )}
                        </span>

                      </div>

                    </div>

                    {/* FINANCIAL VALUE */}

                    <div
                      className={`
                        rounded-xl
                        border
                        p-4
                        ${
                          d.status ===
                          "Accepted"
                            ? "border-green-500/20 bg-green-500/5"
                            : d.status ===
                                "Rejected"
                              ? "border-red-500/20 bg-red-500/5"
                              : "border-amber-500/20 bg-amber-500/5"
                        }
                      `}
                    >

                      <div className="flex items-center justify-between gap-3">

                        <div className="flex items-center gap-3">

                          <div
                            className={`
                              flex
                              h-10
                              w-10
                              items-center
                              justify-center
                              rounded-xl
                              ${
                                d.status ===
                                "Accepted"
                                  ? "bg-green-500/10"
                                  : d.status ===
                                      "Rejected"
                                    ? "bg-red-500/10"
                                    : "bg-amber-500/10"
                              }
                            `}
                          >

                            <Wallet
                              className={`
                                h-5
                                w-5
                                ${
                                  d.status ===
                                  "Accepted"
                                    ? "text-green-500"
                                    : d.status ===
                                        "Rejected"
                                      ? "text-red-500"
                                      : "text-amber-500"
                                }
                              `}
                            />

                          </div>

                          <div>

                            <p className="text-xs text-muted-foreground">
                              القيمة المالية للمرتجع
                            </p>

                            <p className="mt-1 text-xs text-muted-foreground">
                              السعر × الكمية
                            </p>

                          </div>

                        </div>

                        <div className="text-end">

                          <p
                            className={`
                              text-xl
                              font-bold
                              ${
                                d.status ===
                                "Accepted"
                                  ? "text-green-600"
                                  : d.status ===
                                      "Rejected"
                                    ? "text-red-600"
                                    : "text-amber-600"
                              }
                            `}
                          >
                            {formatMoney(
                              damagedValue,
                            )}
                          </p>

                          <p className="text-xs text-muted-foreground">
                            {Number(
                              d.unit_price ??
                                0,
                            ).toLocaleString(
                              "en-US",
                              {
                                minimumFractionDigits: 2,
                              },
                            )}{" "}
                            ×{" "}
                            {d.qty}
                          </p>

                        </div>

                      </div>

                    </div>

                    {d.damage_reason && (
                      <div
                        className="
                          rounded-xl
                          border
                          border-[#C084CC]/20
                          bg-[#C084CC]/10
                          p-3
                        "
                      >

                        <p className="text-sm font-semibold text-[#7B2C8E] dark:text-[#C084CC]">
                          {
                            d.damage_reason
                          }
                        </p>

                      </div>
                    )}

                    {d.damage_details && (
                      <p className="rounded-xl bg-[#7B2C8E]/5 p-3 text-xs text-muted-foreground">
                        {
                          d.damage_details
                        }
                      </p>
                    )}

                    {/* ACTIONS */}

                    <div className="flex flex-wrap gap-2">

                      <Button
                        size="sm"
                        onClick={() =>
                          setDetail(
                            d.damaged_return_id,
                          )
                        }
                        className="
                          bg-[#7B2C8E]
                          text-white
                          hover:bg-[#9B4BA8]
                        "
                      >
                        {t("view")}
                      </Button>

                      {STATUSES.map(
                        (s) => (
                          <Button
                            key={s}
                            size="sm"
                            disabled={
                              setStatus.isPending ||
                              d.status ===
                                s
                            }
                            onClick={() =>
                              setStatus.mutate(
                                {
                                  id: d.damaged_return_id,
                                  status: s,
                                },
                                {
                                  onSuccess:
                                    () => {
                                      toast.success(
                                        t(
                                          "saved",
                                        ),
                                      );

                                      damaged.refetch();
                                    },

                                  onError:
                                    (e) =>
                                      toast.error(
                                        errorMessage(
                                          e,
                                          lang,
                                        ),
                                      ),
                                },
                              )
                            }
                            className={`
                              border
                              ${
                                d.status ===
                                s
                                  ? "border-[#7B2C8E] bg-[#9B4BA8] text-white"
                                  : "border-[#9B4BA8]/30 bg-[#9B4BA8]/5 text-[#7B2C8E] hover:border-[#9B4BA8] hover:bg-[#9B4BA8]/15 dark:text-[#C084CC]"
                              }
                            `}
                          >
                            {statusLabel(
                              s,
                            )}
                          </Button>
                        ),
                      )}

                      {/* DIRECT DELETE */}

                      <Button
                        size="sm"
                        variant="destructive"
                        disabled={
                          deleteDamaged.isPending
                        }
                        onClick={() =>
                          setDeleteId(
                            d.damaged_return_id,
                          )
                        }
                        className="
                          ms-auto
                          bg-red-600
                          text-white
                          hover:bg-red-700
                        "
                      >
                        <Trash2 className="me-1 h-4 w-4" />
                        حذف
                      </Button>

                    </div>

                  </div>
                </Card>
              );
            })}

          </div>
        )}

        {/* =====================================================
            ADD DAMAGED RETURN DIALOG
        ====================================================== */}

        <Dialog
          open={open}
          onOpenChange={(v) => {
            setOpen(v);

            if (!v) {
              reset();
            }
          }}
        >

          <DialogContent
            className="
              max-h-[90vh]
              max-w-lg
              overflow-y-auto
              border-[#9B4BA8]/40
              bg-gradient-to-br
              from-[#FBF5FC]
              via-[#F5EAF7]
              to-[#EBD8EF]
              shadow-2xl
              shadow-[#7B2C8E]/20
              dark:from-[#29152F]
              dark:via-[#24102A]
              dark:to-[#301536]
            "
          >

            <DialogHeader
              className="
                -mx-6
                -mt-6
                mb-4
                rounded-t-lg
                bg-gradient-to-r
                from-[#7B2C8E]
                via-[#9B4BA8]
                to-[#C084CC]
                p-5
                text-white
              "
            >

              <DialogTitle>
                {t(
                  "add_damaged_return",
                )}
              </DialogTitle>

            </DialogHeader>

            <div className="space-y-4">

              {/* PRODUCT */}

              <div>

                <Label>
                  {t(
                    "select_product",
                  )}
                </Label>

                {product ? (
                  <div
                    className="
                      mt-2
                      flex
                      items-center
                      gap-3
                      rounded-xl
                      border
                      border-[#C084CC]/30
                      bg-[#9B4BA8]/5
                      p-3
                    "
                  >

                    <ProductImage
                      url={
                        product.image_url
                      }
                      alt={
                        product.product_name
                      }
                      className="h-12 w-12 rounded-lg"
                    />

                    <span className="flex-1 truncate text-sm font-semibold">
                      {
                        product.product_name
                      }
                    </span>

                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        setProduct(
                          null,
                        );

                        setDestination(
                          "",
                        );
                      }}
                      className="
                        text-[#7B2C8E]
                        hover:bg-[#9B4BA8]/10
                        hover:text-[#7B2C8E]
                        dark:text-[#C084CC]
                      "
                    >
                      {t("edit")}
                    </Button>

                  </div>
                ) : (
                  <>
                    <Input
                      className="
                        mt-2
                        border-[#9B4BA8]/30
                        bg-[#9B4BA8]/5
                        focus-visible:border-[#9B4BA8]
                        focus-visible:ring-[#9B4BA8]/30
                      "
                      value={search}
                      onChange={(e) =>
                        setSearch(
                          e.target.value,
                        )
                      }
                      placeholder={t(
                        "search_placeholder",
                      )}
                    />

                    <div className="mt-2 space-y-1">

                      {matches.map(
                        (p) => (
                          <button
                            key={
                              p.product_id
                            }
                            type="button"
                            onClick={() =>
                              pickProduct(
                                p,
                              )
                            }
                            className="
                              flex
                              w-full
                              items-center
                              gap-2
                              rounded-xl
                              border
                              border-[#9B4BA8]/20
                              bg-[#9B4BA8]/5
                              p-3
                              text-start
                              text-sm
                              transition-all
                              hover:border-[#9B4BA8]/50
                              hover:bg-[#9B4BA8]/15
                            "
                          >

                            <span className="flex-1 truncate">
                              {
                                p.product_name
                              }
                            </span>

                            <span className="text-xs text-[#7B2C8E]/70 dark:text-[#C084CC]/70">
                              {
                                p.product_id
                              }
                            </span>

                          </button>
                        ),
                      )}

                    </div>
                  </>
                )}

              </div>

              {/* WAREHOUSE */}

              <div>

                <Label>
                  {t(
                    "destination_warehouse",
                  )}
                </Label>

                <WarehouseSelect
                  value={
                    destination
                  }
                  onChange={
                    setDestination
                  }
                  warehouses={
                    warehouses.data ??
                    []
                  }
                  className="
                    mt-2
                    w-full
                    border-[#9B4BA8]/30
                  "
                />

              </div>

              {/* SHIPMENT + QUANTITY */}

              <div className="grid grid-cols-2 gap-3">

                <div>

                  <Label htmlFor="d-ship">
                    {t(
                      "shipment_code",
                    )}
                  </Label>

                  <Input
                    id="d-ship"
                    value={
                      shipment
                    }
                    onChange={(e) =>
                      setShipment(
                        e.target.value,
                      )
                    }
                    className="
                      border-[#9B4BA8]/30
                      bg-[#9B4BA8]/5
                      focus-visible:border-[#9B4BA8]
                      focus-visible:ring-[#9B4BA8]/30
                    "
                  />

                </div>

                <div>

                  <Label htmlFor="d-qty">
                    {t(
                      "quantity",
                    )}
                  </Label>

                  <Input
                    id="d-qty"
                    type="number"
                    min="1"
                    value={qty}
                    onChange={(e) =>
                      setQty(
                        e.target.value,
                      )
                    }
                    className="
                      border-[#9B4BA8]/30
                      bg-[#9B4BA8]/5
                      focus-visible:border-[#9B4BA8]
                      focus-visible:ring-[#9B4BA8]/30
                    "
                  />

                </div>

              </div>

              {/* PRICE PREVIEW */}

              {product && (
                <div
                  className="
                    rounded-xl
                    border
                    border-[#C084CC]/25
                    bg-[#9B4BA8]/5
                    p-3
                  "
                >

                  <div className="flex items-center justify-between">

                    <span className="text-sm text-muted-foreground">
                      سعر الوحدة
                    </span>

                    <strong className="text-[#7B2C8E] dark:text-[#C084CC]">
                      {formatMoney(
                        Number(
                          (
                            product as Product &
                              {
                                price?: number;
                                unit_price?: number;
                              }
                          )
                            ?.unit_price ??
                            (
                              product as Product &
                                {
                                  price?: number;
                                }
                            )?.price ??
                            0,
                        ),
                      )}
                    </strong>

                  </div>

                  <div className="mt-2 flex items-center justify-between border-t border-[#C084CC]/20 pt-2">

                    <span className="text-sm text-muted-foreground">
                      القيمة الإجمالية
                    </span>

                    <strong className="text-lg text-[#7B2C8E] dark:text-[#C084CC]">
                      {formatMoney(
                        Number(
                          (
                            product as Product &
                              {
                                price?: number;
                                unit_price?: number;
                              }
                          )
                            ?.unit_price ??
                            (
                              product as Product &
                                {
                                  price?: number;
                                }
                            )?.price ??
                            0,
                        ) *
                          Number(
                            qty || 0,
                          ),
                      )}
                    </strong>

                  </div>

                </div>
              )}

              {/* DAMAGE REASON */}

              <div>

                <Label htmlFor="d-reason">
                  {t(
                    "damage_reason",
                  )}
                </Label>

                <Input
                  id="d-reason"
                  value={reason}
                  onChange={(e) =>
                    setReason(
                      e.target.value,
                    )
                  }
                  className="
                    border-[#9B4BA8]/30
                    bg-[#9B4BA8]/5
                    focus-visible:border-[#9B4BA8]
                    focus-visible:ring-[#9B4BA8]/30
                  "
                />

              </div>

              {/* DAMAGE DETAILS */}

              <div>

                <Label htmlFor="d-details">
                  {t(
                    "damage_details",
                  )}
                </Label>

                <Textarea
                  id="d-details"
                  value={details}
                  onChange={(e) =>
                    setDetails(
                      e.target.value,
                    )
                  }
                  className="
                    border-[#9B4BA8]/30
                    bg-[#9B4BA8]/5
                    focus-visible:border-[#9B4BA8]
                    focus-visible:ring-[#9B4BA8]/30
                  "
                />

              </div>

              {/* IMAGES */}

              <div className="grid gap-3">

                <ImageDropzone
                  label={t(
                    "policy_image",
                  )}
                  value={img1}
                  onChange={setImg1}
                />

                <ImageDropzone
                  label={t(
                    "product_image",
                  )}
                  value={img2}
                  onChange={setImg2}
                />

                <ImageDropzone
                  label={t(
                    "policy_product_image",
                  )}
                  value={img3}
                  onChange={setImg3}
                />

              </div>

            </div>

            <DialogFooter
              className="
                mt-5
                border-t
                border-[#C084CC]/20
                pt-4
              "
            >

              <Button
                variant="outline"
                onClick={() =>
                  setOpen(false)
                }
                disabled={
                  save.isPending
                }
                className="
                  border-[#9B4BA8]/30
                  bg-[#9B4BA8]/5
                  text-[#7B2C8E]
                  hover:bg-[#9B4BA8]/15
                  hover:text-[#7B2C8E]
                  dark:text-[#C084CC]
                "
              >
                {t("cancel")}
              </Button>

              <Button
                disabled={
                  save.isPending
                }
                onClick={
                  submitDamagedReturn
                }
                className="
                  bg-gradient-to-r
                  from-[#7B2C8E]
                  via-[#9B4BA8]
                  to-[#C084CC]
                  text-white
                  shadow-md
                  shadow-[#7B2C8E]/20
                  hover:opacity-90
                "
              >
                {save.isPending
                  ? t("saving")
                  : t("save")}
              </Button>

            </DialogFooter>

          </DialogContent>

        </Dialog>

        {/* =====================================================
            DETAILS DIALOG
        ====================================================== */}

        <Dialog
          open={
            detailRow !== null
          }
          onOpenChange={(v) =>
            !v &&
            setDetail(null)
          }
        >

          <DialogContent
            className="
              max-h-[90vh]
              max-w-2xl
              overflow-y-auto
              border-[#9B4BA8]/40
              bg-gradient-to-br
              from-[#FBF5FC]
              via-[#F5EAF7]
              to-[#EBD8EF]
              shadow-2xl
              shadow-[#7B2C8E]/20
              dark:from-[#29152F]
              dark:via-[#24102A]
              dark:to-[#301536]
            "
          >

            <DialogHeader
              className="
                -mx-6
                -mt-6
                mb-4
                rounded-t-lg
                bg-gradient-to-r
                from-[#7B2C8E]
                via-[#9B4BA8]
                to-[#C084CC]
                p-5
                text-white
              "
            >

              <DialogTitle>
                {t("details")}
              </DialogTitle>

            </DialogHeader>

            {detailRow && (
              <div className="space-y-4">

                <div>

                  <p className="font-mono text-xs text-[#7B2C8E]/70 dark:text-[#C084CC]/70">
                    {
                      detailRow.damaged_return_id
                    }
                  </p>

                  <p className="mt-1 text-xl font-bold text-[#7B2C8E] dark:text-[#C084CC]">
                    {
                      detailRow.product_name
                    }
                  </p>

                  <p className="mt-1 text-sm text-muted-foreground">
                    {
                      detailRow.product_id
                    }{" "}
                    •{" "}
                    {t(
                      "shipment_code",
                    )}
                    :{" "}
                    {
                      detailRow.shipment_code ||
                      "—"
                    }
                  </p>

                </div>

                {/* WAREHOUSE */}

                <div
                  className="
                    rounded-xl
                    border
                    border-[#C084CC]/25
                    bg-[#9B4BA8]/5
                    p-4
                  "
                >

                  <p className="text-xs text-muted-foreground">
                    {t(
                      "warehouse",
                    )}
                  </p>

                  <p className="mt-1 font-semibold text-[#7B2C8E] dark:text-[#C084CC]">
                    {warehouseName(
                      warehouses.data,
                      detailRow.warehouse,
                    )}
                  </p>

                </div>

                {/* QUANTITY / STATUS */}

                <div
                  className="
                    flex
                    flex-wrap
                    gap-2
                    rounded-xl
                    border
                    border-[#C084CC]/25
                    bg-[#9B4BA8]/5
                    p-4
                  "
                >

                  <Badge
                    className="
                      border-[#9B4BA8]/30
                      bg-[#9B4BA8]/10
                      text-[#7B2C8E]
                      dark:text-[#C084CC]
                    "
                  >
                    {t(
                      "quantity",
                    )}
                    :{" "}
                    {detailRow.qty}
                  </Badge>

                  <Badge
                    className="
                      border-[#9B4BA8]/30
                      bg-[#9B4BA8]/10
                      text-[#7B2C8E]
                      dark:text-[#C084CC]
                    "
                  >
                    {statusLabel(
                      detailRow.status,
                    )}
                  </Badge>

                </div>

                {/* FINANCIAL VALUE */}

                <div
                  className="
                    rounded-xl
                    border
                    border-[#C084CC]/25
                    bg-gradient-to-r
                    from-[#7B2C8E]/10
                    via-[#9B4BA8]/10
                    to-[#C084CC]/10
                    p-4
                  "
                >

                  <div className="flex items-center justify-between">

                    <div className="flex items-center gap-3">

                      <div
                        className="
                          flex
                          h-11
                          w-11
                          items-center
                          justify-center
                          rounded-xl
                          bg-[#7B2C8E]/10
                        "
                      >
                        <Wallet className="h-5 w-5 text-[#7B2C8E] dark:text-[#C084CC]" />
                      </div>

                      <div>

                        <p className="text-sm font-semibold">
                          القيمة المالية
                        </p>

                        <p className="text-xs text-muted-foreground">
                          سعر الوحدة × الكمية
                        </p>

                      </div>

                    </div>

                    <p className="text-2xl font-bold text-[#7B2C8E] dark:text-[#C084CC]">
                      {formatMoney(
                        getDamagedValue(
                          detailRow,
                        ),
                      )}
                    </p>

                  </div>

                </div>

                {detailRow.damage_reason && (
                  <div
                    className="
                      rounded-xl
                      border
                      border-[#C084CC]/25
                      bg-[#C084CC]/10
                      p-4
                    "
                  >

                    <p className="font-semibold text-[#7B2C8E] dark:text-[#C084CC]">
                      {
                        detailRow.damage_reason
                      }
                    </p>

                  </div>
                )}

                {detailRow.damage_details && (
                  <div
                    className="
                      rounded-xl
                      border
                      border-[#C084CC]/20
                      bg-[#9B4BA8]/5
                      p-4
                    "
                  >

                    <p className="text-sm text-muted-foreground">
                      {
                        detailRow.damage_details
                      }
                    </p>

                  </div>
                )}

                {/* IMAGES */}

                <div className="grid gap-4 sm:grid-cols-3">

                  <div
                    className="
                      overflow-hidden
                      rounded-xl
                      border
                      border-[#C084CC]/25
                      bg-[#9B4BA8]/5
                    "
                  >

                    <p
                      className="
                        border-b
                        border-[#C084CC]/20
                        px-3
                        py-2
                        text-xs
                        font-medium
                        text-[#7B2C8E]
                        dark:text-[#C084CC]
                      "
                    >
                      {t(
                        "policy_image",
                      )}
                    </p>

                    <ProductImage
                      url={
                        detailRow.policy_image
                      }
                      alt=""
                      className="h-48 w-full"
                    />

                  </div>

                  <div
                    className="
                      overflow-hidden
                      rounded-xl
                      border
                      border-[#C084CC]/25
                      bg-[#9B4BA8]/5
                    "
                  >

                    <p
                      className="
                        border-b
                        border-[#C084CC]/20
                        px-3
                        py-2
                        text-xs
                        font-medium
                        text-[#7B2C8E]
                        dark:text-[#C084CC]
                      "
                    >
                      {t(
                        "product_image",
                      )}
                    </p>

                    <ProductImage
                      url={
                        detailRow.product_image
                      }
                      alt=""
                      className="h-48 w-full"
                    />

                  </div>

                  <div
                    className="
                      overflow-hidden
                      rounded-xl
                      border
                      border-[#C084CC]/25
                      bg-[#9B4BA8]/5
                    "
                  >

                    <p
                      className="
                        border-b
                        border-[#C084CC]/20
                        px-3
                        py-2
                        text-xs
                        font-medium
                        text-[#7B2C8E]
                        dark:text-[#C084CC]
                      "
                    >
                      {t(
                        "policy_product_image",
                      )}
                    </p>

                    <ProductImage
                      url={
                        detailRow.policy_product_image
                      }
                      alt=""
                      className="h-48 w-full"
                    />

                  </div>

                </div>

                <div
                  className="
                    rounded-xl
                    border
                    border-[#C084CC]/20
                    bg-[#9B4BA8]/5
                    p-3
                  "
                >

                  <p className="text-xs text-muted-foreground">
                    {fmtDate(
                      detailRow.return_date,
                      lang,
                    )}{" "}
                    {
                      detailRow.return_time
                    }
                  </p>

                </div>

              </div>
            )}

          </DialogContent>

        </Dialog>

        {/* =====================================================
            DELETE CONFIRMATION DIALOG
        ====================================================== */}

        <Dialog
          open={
            deleteId !== null
          }
          onOpenChange={(v) => {
            if (
              !v &&
              !deleteDamaged.isPending
            ) {
              setDeleteId(null);
            }
          }}
        >

          <DialogContent
            className="
              max-w-md
              border-red-500/30
              bg-gradient-to-br
              from-[#FBF5FC]
              via-[#F5EAF7]
              to-[#EBD8EF]
              shadow-2xl
              dark:from-[#29152F]
              dark:via-[#24102A]
              dark:to-[#301536]
            "
          >

            <DialogHeader>

              <DialogTitle className="flex items-center gap-2 text-red-600">

                <AlertTriangle className="h-5 w-5" />

                تأكيد حذف المرتجع

              </DialogTitle>

            </DialogHeader>

            <div className="space-y-4">

              <p className="text-sm text-muted-foreground">
                هل أنت متأكد أنك تريد حذف هذا المرتجع؟
              </p>

              {deleteRow && (
                <div
                  className="
                    rounded-xl
                    border
                    border-red-500/20
                    bg-red-500/5
                    p-4
                  "
                >

                  <p className="font-semibold">
                    {
                      deleteRow.product_name
                    }
                  </p>

                  <p className="mt-1 text-xs text-muted-foreground">
                    ID:{" "}
                    {
                      deleteRow.damaged_return_id
                    }
                  </p>

                  <div className="mt-3 grid grid-cols-2 gap-3">

                    <div>

                      <p className="text-xs text-muted-foreground">
                        الكمية
                      </p>

                      <p className="font-semibold">
                        {
                          deleteRow.qty
                        }
                      </p>

                    </div>

                    <div>

                      <p className="text-xs text-muted-foreground">
                        القيمة
                      </p>

                      <p className="font-semibold text-red-600">
                        {formatMoney(
                          getDamagedValue(
                            deleteRow,
                          ),
                        )}
                      </p>

                    </div>

                  </div>

                </div>
              )}

              <div
                className="
                  flex
                  items-start
                  gap-2
                  rounded-xl
                  border
                  border-red-500/20
                  bg-red-500/5
                  p-3
                "
              >

                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-red-500" />

                <p className="text-xs text-red-600">
                  تحذير: لا يمكن التراجع عن عملية الحذف بعد تنفيذها.
                </p>

              </div>

            </div>

            <DialogFooter className="mt-4">

              <Button
                variant="outline"
                disabled={
                  deleteDamaged.isPending
                }
                onClick={() =>
                  setDeleteId(
                    null,
                  )
                }
              >
                إلغاء
              </Button>

              <Button
                variant="destructive"
                disabled={
                  deleteDamaged.isPending
                }
                onClick={
                  confirmDelete
                }
                className="
                  bg-red-600
                  hover:bg-red-700
                "
              >

                <Trash2 className="me-1 h-4 w-4" />

                {deleteDamaged.isPending
                  ? "جاري الحذف..."
                  : "تأكيد الحذف"}

              </Button>

            </DialogFooter>

          </DialogContent>

        </Dialog>

      </div>
    </AppShell>
  );
}