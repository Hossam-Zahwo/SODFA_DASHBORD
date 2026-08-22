import { useCallback, useMemo, useState } from "react";

import { createFileRoute } from "@tanstack/react-router";

import {
  ArrowDownToLine,
  CalendarDays,
  Camera,
  Check,
  ClipboardList,
  Eye,
  FileText,
  Hash,
  Package,
  Plus,
  Trash2,
  Warehouse,
  X,
} from "lucide-react";

import { toast } from "sonner";

import { AppShell } from "@/components/AppShell";
import { Blocks } from "@/components/blocks-export";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
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

import { ImageDropzone } from "@/components/ImageDropzone";
import { ProductImage } from "@/components/ProductImage";
import { CameraScanner } from "@/components/CameraScanner";
import { WarehouseSelect } from "@/components/WarehouseSelect";

import { useUsbScanner } from "@/hooks/useUsbScanner";

import {
  useApiMutation,
  useInventory,
  useReturns,
  useWarehouses,
} from "@/hooks/useSodfa";

import {
  api,
  type Product,
  type ReturnRecord,
} from "@/lib/api";

import { errorMessage, useI18n } from "@/lib/i18n";
import { fmtDate, fmtMoney } from "@/lib/dates";
import { warehouseName } from "@/lib/warehouse";

export const Route = createFileRoute("/returns")({
  head: () => ({
    meta: [
      {
        title: "المرتجعات العادية — SODFA صدفة",
      },
      {
        name: "description",
        content: "إدارة مرتجعات العملاء وإعادة الكميات إلى المخزون.",
      },
    ],
  }),

  component: ReturnsPage,
});

type PeriodFilter =
  | "today"
  | "week"
  | "month"
  | "year"
  | "all"
  | "custom";

function ReturnsPage() {
  const { t, lang } = useI18n();

  const returns = useReturns();
  const inventory = useInventory();
  const warehouses = useWarehouses();

  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [listSearch, setListSearch] = useState("");
  const [camera, setCamera] = useState(false);

  const [detail, setDetail] =
    useState<ReturnRecord | null>(null);

  const [deleteTarget, setDeleteTarget] =
    useState<ReturnRecord | null>(null);

  const [product, setProduct] =
    useState<Product | null>(null);

  const [destination, setDestination] = useState("");
  const [qty, setQty] = useState("1");
  const [reason, setReason] = useState("");
  const [notes, setNotes] = useState("");

  const [img1, setImg1] = useState("");
  const [img2, setImg2] = useState("");
  const [img3, setImg3] = useState("");

  const [period, setPeriod] =
    useState<PeriodFilter>("all");

  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");

  /* ================= حفظ المرتجع ================= */

  const save = useApiMutation(() =>
    api.recordReturn({
      product_id: product!.product_id,
      qty: Number(qty),
      warehouse: destination || product!.warehouse,
      return_reason: reason,
      notes,
      product_image: img1,
      invoice_image: img2,
      delivery_note_image: img3,
    }),
  );

  /* ================= حذف المرتجع ================= */

  const deleteReturn = useApiMutation(
    (returnId: string) => api.deleteReturn(returnId),
  );

  /* ================= البحث عن منتج ================= */

  const matches = useMemo(() => {
    const term = search.trim().toLowerCase();

    if (!term) return [];

    return (inventory.data ?? [])
      .filter((p) => {
        const productName = String(
          p.product_name ?? "",
        ).toLowerCase();

        const productId = String(
          p.product_id ?? "",
        ).toLowerCase();

        const barcode = String(
          p.barcode ?? "",
        ).toLowerCase();

        return (
          productName.includes(term) ||
          productId.includes(term) ||
          barcode.includes(term)
        );
      })
      .slice(0, 6);
  }, [search, inventory.data]);

  /* ================= اختيار المنتج ================= */

  const pickProduct = useCallback((p: Product) => {
    setProduct(p);
    setDestination((d) => d || p.warehouse || "");
    setSearch("");
    setCamera(false);
  }, []);

  /* ================= الباركود والكاميرا ================= */

  const handleCode = useCallback(
    (code: string) => {
      if (!open) return;

      const c = code.trim().toLowerCase();

      if (!c) return;

      const found = (inventory.data ?? []).find((p) => {
        const barcode = String(
          p.barcode ?? "",
        ).toLowerCase();

        const productId = String(
          p.product_id ?? "",
        ).toLowerCase();

        return barcode === c || productId === c;
      });

      if (!found) {
        toast.error("لم يتم العثور على المنتج");
        return;
      }

      pickProduct(found);

      toast.success(
        `تم اختيار المنتج: ${found.product_name}`,
      );
    },
    [
      inventory.data,
      open,
      pickProduct,
    ],
  );

  useUsbScanner(handleCode, open);

  /* ================= مساعد التاريخ ================= */

  const getDateOnly = (
    value: string | Date | null | undefined,
  ) => {
    if (!value) return "";

    if (value instanceof Date) {
      const year = value.getFullYear();
      const month = String(
        value.getMonth() + 1,
      ).padStart(2, "0");

      const day = String(
        value.getDate(),
      ).padStart(2, "0");

      return `${year}-${month}-${day}`;
    }

    return String(value).slice(0, 10);
  };

  const today = useMemo(
    () => getDateOnly(new Date()),
    [],
  );

  /* ================= نطاق الفترة ================= */

  const periodRange = useMemo(() => {
    const now = new Date();

    const todayDate = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
    );

    if (period === "today") {
      const value = getDateOnly(todayDate);

      return {
        from: value,
        to: value,
      };
    }

    if (period === "week") {
      const day = todayDate.getDay();

      const mondayOffset =
        day === 0 ? -6 : 1 - day;

      const monday = new Date(todayDate);

      monday.setDate(
        todayDate.getDate() + mondayOffset,
      );

      const sunday = new Date(monday);

      sunday.setDate(
        monday.getDate() + 6,
      );

      return {
        from: getDateOnly(monday),
        to: getDateOnly(sunday),
      };
    }

    if (period === "month") {
      const firstDay = new Date(
        now.getFullYear(),
        now.getMonth(),
        1,
      );

      const lastDay = new Date(
        now.getFullYear(),
        now.getMonth() + 1,
        0,
      );

      return {
        from: getDateOnly(firstDay),
        to: getDateOnly(lastDay),
      };
    }

    if (period === "year") {
      const firstDay = new Date(
        now.getFullYear(),
        0,
        1,
      );

      const lastDay = new Date(
        now.getFullYear(),
        11,
        31,
      );

      return {
        from: getDateOnly(firstDay),
        to: getDateOnly(lastDay),
      };
    }

    if (period === "custom") {
      return {
        from: customFrom,
        to: customTo,
      };
    }

    return {
      from: "",
      to: "",
    };
  }, [
    period,
    customFrom,
    customTo,
  ]);

  /* ================= فلترة المرتجعات ================= */

  const periodReturns = useMemo(() => {
    const rows = returns.data ?? [];

    if (period === "all") {
      return rows;
    }

    const { from, to } = periodRange;

    if (!from || !to) {
      return rows;
    }

    return rows.filter((r) => {
      const date = getDateOnly(
        r.return_date,
      );

      return date >= from && date <= to;
    });
  }, [
    returns.data,
    period,
    periodRange,
  ]);

  /* ================= البحث في السجل ================= */

  const history = useMemo(() => {
    const term =
      listSearch.trim().toLowerCase();

    const rows = [
      ...periodReturns,
    ].reverse();

    if (!term) return rows;

    return rows.filter((r) =>
      [
        r.return_id,
        r.product_name,
        r.product_id,
        r.barcode,
        r.return_reason,
        r.notes,
      ].some((v) =>
        String(v ?? "")
          .toLowerCase()
          .includes(term),
      ),
    );
  }, [
    periodReturns,
    listSearch,
  ]);

  /* ================= الإحصائيات ================= */

  const statistics = useMemo(() => {
    const rows = periodReturns;

    return {
      count: rows.length,

      quantity: rows.reduce(
        (sum, r) =>
          sum + Number(r.qty || 0),
        0,
      ),

      total: rows.reduce(
        (sum, r) =>
          sum +
          Number(
            r.return_total || 0,
          ),
        0,
      ),
    };
  }, [periodReturns]);

  /* ================= إعادة ضبط النموذج ================= */

  const reset = () => {
    setProduct(null);
    setSearch("");
    setDestination("");
    setCamera(false);
    setQty("1");
    setReason("");
    setNotes("");
    setImg1("");
    setImg2("");
    setImg3("");
  };

  /* ================= تسجيل المرتجع ================= */

  const submit = () => {
    if (!product) {
      toast.error("يرجى اختيار منتج");
      return;
    }

    const quantity = Number(qty);

    if (
      !Number.isFinite(quantity) ||
      quantity <= 0
    ) {
      toast.error("يرجى إدخال كمية صحيحة");
      return;
    }

    if (!destination) {
      toast.error("يرجى اختيار المخزن");
      return;
    }

    save.mutate(undefined as never, {
      onSuccess: () => {
        toast.success(
          "تم تسجيل المرتجع بنجاح وإضافة الكمية إلى المخزون",
        );

        setOpen(false);
        reset();
        void returns.refetch();
        void inventory.refetch();
      },

      onError: (e) =>
        toast.error(
          errorMessage(e, lang),
        ),
    });
  };

  /* ================= تأكيد الحذف ================= */

  const confirmDelete = () => {
    if (!deleteTarget) return;

    const deletedId =
      deleteTarget.return_id;

    deleteReturn.mutate(
      deletedId,
      {
        onSuccess: () => {
          toast.success(
            "تم حذف المرتجع بنجاح",
          );

          setDeleteTarget(null);

          if (
            detail?.return_id ===
            deletedId
          ) {
            setDetail(null);
          }

          void returns.refetch();
          void inventory.refetch();

          /*
           * useApiMutation يجب أن يقوم
           * بتحديث بيانات المرتجعات والمخزون
           * بعد نجاح العملية.
           */
        },

        onError: (e) => {
          toast.error(
            errorMessage(e, lang),
          );
        },
      },
    );
  };

  /* ================= اسم الفترة ================= */

  const periodLabel = useMemo(() => {
    if (period === "today")
      return "اليوم";

    if (period === "week")
      return "هذا الأسبوع";

    if (period === "month")
      return "هذا الشهر";

    if (period === "year")
      return "هذا العام";

    if (period === "custom") {
      if (
        periodRange.from &&
        periodRange.to
      ) {
        return `${periodRange.from} إلى ${periodRange.to}`;
      }

      return "فترة مخصصة";
    }

    return "كل المرتجعات";
  }, [
    period,
    periodRange,
  ]);

  return (
    <AppShell title="المرتجعات العادية">
      <div
        className="space-y-6"
        dir="rtl"
      >
        {/* ================= العنوان ================= */}

        <div
          className="
            relative overflow-hidden rounded-2xl
            border border-[#C084CC]/20
            bg-gradient-to-br
            from-[#7B2C8E]
            via-[#9B4BA8]
            to-[#C084CC]
            p-5 shadow-xl
          "
        >
          <div className="absolute -right-16 -top-16 h-40 w-40 rounded-full bg-white/10 blur-2xl" />

          <div className="absolute -bottom-20 -left-10 h-44 w-44 rounded-full bg-white/10 blur-3xl" />

          <div
            className="
              relative flex flex-col gap-4
              lg:flex-row lg:items-center
              lg:justify-between
            "
          >
            <div>
              <div className="mb-1 flex items-center gap-2 text-white/80">
                <ArrowDownToLine className="h-5 w-5" />

                <span className="text-sm font-medium">
                  SODFA
                </span>
              </div>

              <h1 className="text-2xl font-bold text-white">
                المرتجعات العادية
              </h1>

              <p className="mt-1 text-sm text-white/75">
                إدارة المنتجات المرتجعة وإعادة الكميات إلى المخزون تلقائيًا.
              </p>
            </div>

            <Button
              onClick={() => setOpen(true)}
              className="
                h-11 rounded-xl bg-white px-5
                font-semibold text-[#7B2C8E]
                shadow-lg hover:bg-white/90
              "
            >
              <Plus className="ms-2 h-5 w-5" />

              إضافة مرتجع
            </Button>
          </div>
        </div>

        {/* ================= الفترة ================= */}

        <div className="rounded-2xl border border-[#C084CC]/20 bg-white p-4 shadow-sm">
          <div className="mb-4 flex items-center gap-2">
            <CalendarDays className="h-5 w-5 text-[#9B4BA8]" />

            <div>
              <h2 className="font-semibold text-[#7B2C8E]">
                فترة المرتجعات
              </h2>

              <p className="text-xs text-muted-foreground">
                عرض الكميات وقيمة المرتجعات خلال فترة محددة
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            {(
              [
                ["today", "اليوم"],
                ["week", "هذا الأسبوع"],
                ["month", "هذا الشهر"],
                ["year", "هذا العام"],
                ["all", "الكل"],
                ["custom", "فترة مخصصة"],
              ] as const
            ).map(([value, label]) => (
              <Button
                key={value}
                type="button"
                variant={
                  period === value
                    ? "default"
                    : "outline"
                }
                onClick={() =>
                  setPeriod(value)
                }
                className={
                  period === value
                    ? "bg-gradient-to-r from-[#7B2C8E] via-[#9B4BA8] to-[#C084CC] text-white"
                    : "border-[#C084CC]/30 text-[#7B2C8E] hover:bg-[#7B2C8E]/10"
                }
              >
                {period === value && (
                  <Check className="ms-1 h-4 w-4" />
                )}

                {label}
              </Button>
            ))}
          </div>

          {period === "custom" && (
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <div>
                <Label htmlFor="returns-from">
                  من
                </Label>

                <Input
                  id="returns-from"
                  type="date"
                  value={customFrom}
                  max={customTo || today}
                  onChange={(e) =>
                    setCustomFrom(
                      e.target.value,
                    )
                  }
                  className="mt-2 border-[#C084CC]/30"
                />
              </div>

              <div>
                <Label htmlFor="returns-to">
                  إلى
                </Label>

                <Input
                  id="returns-to"
                  type="date"
                  value={customTo}
                  min={customFrom || undefined}
                  max={today}
                  onChange={(e) =>
                    setCustomTo(
                      e.target.value,
                    )
                  }
                  className="mt-2 border-[#C084CC]/30"
                />
              </div>
            </div>
          )}
        </div>

        {/* ================= الإحصائيات ================= */}

        <div className="grid gap-4 md:grid-cols-3">
          <Card className="border-[#C084CC]/20 bg-white shadow-sm">
            <div className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-muted-foreground">
                    عدد عمليات المرتجع
                  </p>

                  <p className="mt-2 text-3xl font-bold text-[#7B2C8E]">
                    {statistics.count}
                  </p>
                </div>

                <ClipboardList className="h-7 w-7 text-[#7B2C8E]" />
              </div>

              <p className="mt-2 text-xs text-muted-foreground">
                {periodLabel}
              </p>
            </div>
          </Card>

          <Card className="border-[#C084CC]/20 bg-white shadow-sm">
            <div className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-muted-foreground">
                    إجمالي الكمية المرتجعة
                  </p>

                  <p className="mt-2 text-3xl font-bold text-[#7B2C8E]">
                    {statistics.quantity}
                  </p>
                </div>

                <Package className="h-7 w-7 text-[#9B4BA8]" />
              </div>

              <p className="mt-2 text-xs text-muted-foreground">
                إجمالي الوحدات المرتجعة
              </p>
            </div>
          </Card>

          <Card className="border-[#C084CC]/20 bg-[#7B2C8E]/5 shadow-sm">
            <div className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-muted-foreground">
                    إجمالي قيمة المرتجعات
                  </p>

                  <p className="mt-2 text-2xl font-bold text-[#7B2C8E]">
                    {fmtMoney(
                      statistics.total,
                      lang,
                    )}
                  </p>
                </div>

                <ArrowDownToLine className="h-7 w-7 text-[#7B2C8E]" />
              </div>

              <p className="mt-2 text-xs text-muted-foreground">
                {periodLabel}
              </p>
            </div>
          </Card>
        </div>

        {/* ================= البحث ================= */}

        <div className="rounded-2xl border border-[#C084CC]/15 bg-[#7B2C8E]/5 p-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="font-semibold text-[#7B2C8E]">
                سجل المرتجعات
              </h2>

              <p className="text-xs text-muted-foreground">
                عرض {history.length} مرتجع — {periodLabel}
              </p>
            </div>

            <Input
              value={listSearch}
              onChange={(e) =>
                setListSearch(
                  e.target.value,
                )
              }
              placeholder="ابحث باسم المنتج أو الكود أو الباركود"
              className="w-full border-[#C084CC]/30 bg-white md:max-w-sm"
            />
          </div>
        </div>

        {/* ================= الحالات ================= */}

        {returns.isLoading ? (
          <Blocks.Loading label="جاري تحميل المرتجعات..." />
        ) : returns.isError ? (
          <Blocks.Error
            label={errorMessage(
              returns.error,
              lang,
            )}
          />
        ) : history.length === 0 ? (
          <Blocks.Empty
            label={
              listSearch
                ? "لا توجد نتائج"
                : "لا توجد مرتجعات في هذه الفترة"
            }
          />
        ) : (
          <div className="grid gap-5 xl:grid-cols-2">
            {history.map((r) => (
              <Card
                key={r.return_id}
                className="overflow-hidden border border-[#C084CC]/20 bg-white shadow-sm"
              >
                <div className="flex items-center justify-between border-b border-[#C084CC]/15 px-5 py-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-[#7B2C8E] to-[#C084CC] text-white">
                      <Package className="h-5 w-5" />
                    </div>

                    <div>
                      <p className="font-semibold">
                        {r.product_name}
                      </p>

                      <p className="font-mono text-xs text-muted-foreground">
                        {r.return_id}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() =>
                        setDetail(r)
                      }
                    >
                      <Eye className="ms-1 h-4 w-4" />
                      عرض
                    </Button>

                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() =>
                        setDeleteTarget(r)
                      }
                      className="border-red-300 text-red-600 hover:bg-red-600 hover:text-white"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                <div className="p-5">
                  <div className="grid gap-4 sm:grid-cols-[110px_1fr]">
                    <div className="flex h-[110px] items-center justify-center overflow-hidden rounded-xl border border-[#C084CC]/20">
                      {r.product_image ? (
                        <ProductImage
                          url={r.product_image}
                          alt={r.product_name}
                          className="h-full w-full"
                        />
                      ) : (
                        <Package className="h-9 w-9 text-[#9B4BA8]" />
                      )}
                    </div>

                    <div className="space-y-3">
                      <div className="grid grid-cols-2 gap-3">
                        <div className="rounded-xl border border-[#C084CC]/15 p-3">
                          <div className="mb-1 flex items-center gap-1 text-xs text-muted-foreground">
                            <Hash className="h-3.5 w-3.5" />
                            كود المنتج
                          </div>

                          <p className="truncate text-sm font-semibold">
                            {r.product_id}
                          </p>
                        </div>

                        <div className="rounded-xl border border-[#C084CC]/15 p-3">
                          <p className="text-xs text-muted-foreground">
                            الكمية
                          </p>

                          <p className="mt-1 text-sm font-bold text-[#7B2C8E]">
                            {r.qty}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 rounded-xl border border-[#C084CC]/15 px-3 py-2.5">
                        <Warehouse className="h-4 w-4 text-[#9B4BA8]" />

                        <span className="text-xs text-muted-foreground">
                          المخزن
                        </span>

                        <span className="ms-auto text-sm font-semibold">
                          {warehouseName(
                            warehouses.data,
                            r.warehouse,
                          )}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-5 grid gap-3 sm:grid-cols-3">
                    <div className="rounded-xl border border-[#C084CC]/15 p-3">
                      <p className="text-xs text-muted-foreground">
                        الإجمالي
                      </p>

                      <p className="mt-1 font-bold text-[#7B2C8E]">
                        {fmtMoney(
                          r.return_total,
                          lang,
                        )}
                      </p>
                    </div>

                    <div className="rounded-xl border border-[#C084CC]/15 p-3">
                      <p className="text-xs text-muted-foreground">
                        سبب المرتجع
                      </p>

                      <p className="mt-1 truncate text-sm font-medium">
                        {r.return_reason || "—"}
                      </p>
                    </div>

                    <div className="rounded-xl border border-[#C084CC]/15 p-3">
                      <p className="text-xs text-muted-foreground">
                        التاريخ
                      </p>

                      <p className="mt-1 text-sm font-medium">
                        {fmtDate(
                          r.return_date,
                          lang,
                        )}
                      </p>
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* ================= إضافة مرتجع ================= */}

      <Dialog
        open={open}
        onOpenChange={(v) => {
          setOpen(v);

          if (!v) reset();
        }}
      >
        <DialogContent
          className="max-h-[90vh] max-w-lg overflow-y-auto"
          dir="rtl"
        >
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl text-[#7B2C8E]">
              <ArrowDownToLine className="h-5 w-5" />
              إضافة مرتجع
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-5">
            <div>
              <Label>
                اختيار المنتج
              </Label>

              {product ? (
                <div className="mt-3 flex items-center gap-3 rounded-xl border p-3">
                  <ProductImage
                    url={product.image_url}
                    alt={product.product_name}
                    className="h-14 w-14 rounded-lg"
                  />

                  <span className="flex-1 truncate text-sm font-semibold">
                    {product.product_name}
                  </span>

                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() =>
                      setProduct(null)
                    }
                  >
                    تغيير
                  </Button>
                </div>
              ) : (
                <>
                  <Input
                    className="mt-2"
                    data-scanner-input="true"
                    placeholder="امسح الباركود بجهاز USB"
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        handleCode(
                          e.currentTarget.value,
                        );

                        e.currentTarget.value = "";
                      }
                    }}
                  />

                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="mt-2"
                    onClick={() =>
                      setCamera((v) => !v)
                    }
                  >
                    {camera ? (
                      <X className="ms-1 h-4 w-4" />
                    ) : (
                      <Camera className="ms-1 h-4 w-4" />
                    )}

                    {camera
                      ? "إغلاق الكاميرا"
                      : "فتح الكاميرا"}
                  </Button>

                  {camera && (
                    <div className="mt-3 overflow-hidden rounded-xl border">
                      <CameraScanner
                        onDetected={handleCode}
                      />
                    </div>
                  )}

                  <Input
                    className="mt-3"
                    value={search}
                    onChange={(e) =>
                      setSearch(e.target.value)
                    }
                    placeholder="ابحث باسم المنتج أو الكود أو الباركود"
                  />

                  <div className="mt-2 space-y-1">
                    {matches.map((p) => (
                      <button
                        key={p.product_id}
                        type="button"
                        onClick={() =>
                          pickProduct(p)
                        }
                        className="flex w-full items-center gap-2 rounded-lg border p-3 text-right text-sm hover:bg-[#7B2C8E]/10"
                      >
                        <Package className="h-4 w-4 text-[#9B4BA8]" />

                        <span className="flex-1 truncate">
                          {p.product_name}
                        </span>

                        <span className="text-xs text-muted-foreground">
                          {p.product_id}
                        </span>
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>

            <div>
              <Label>
                مخزن الإضافة
              </Label>

              <WarehouseSelect
                value={destination}
                onChange={setDestination}
                warehouses={
                  warehouses.data ?? []
                }
                className="mt-2 w-full"
              />
            </div>

            <div>
              <Label htmlFor="r-qty">
                الكمية
              </Label>

              <Input
                id="r-qty"
                type="number"
                min="1"
                value={qty}
                onChange={(e) =>
                  setQty(e.target.value)
                }
                className="mt-2"
              />
            </div>

            <div>
              <Label htmlFor="r-reason">
                سبب المرتجع
              </Label>

              <Input
                id="r-reason"
                value={reason}
                onChange={(e) =>
                  setReason(e.target.value)
                }
                className="mt-2"
              />
            </div>

            <div>
              <Label htmlFor="r-notes">
                ملاحظات
              </Label>

              <Textarea
                id="r-notes"
                value={notes}
                onChange={(e) =>
                  setNotes(e.target.value)
                }
                className="mt-2 min-h-24"
              />
            </div>

            <div className="space-y-3 rounded-xl border p-4">
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-[#9B4BA8]" />
                <span className="text-sm font-semibold">
                  صور ومستندات المرتجع
                </span>
              </div>

              <ImageDropzone
                label="صورة المنتج"
                value={img1}
                onChange={setImg1}
              />

              <ImageDropzone
                label="صورة الفاتورة"
                value={img2}
                onChange={setImg2}
              />

              <ImageDropzone
                label="صورة إذن التسليم"
                value={img3}
                onChange={setImg3}
              />
            </div>
          </div>

          <DialogFooter className="mt-2">
            <Button
              variant="outline"
              onClick={() =>
                setOpen(false)
              }
              disabled={save.isPending}
            >
              إلغاء
            </Button>

            <Button
              onClick={submit}
              disabled={save.isPending}
              className="bg-gradient-to-r from-[#7B2C8E] via-[#9B4BA8] to-[#C084CC] text-white"
            >
              {save.isPending
                ? "جاري الحفظ..."
                : "حفظ المرتجع"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ================= تفاصيل المرتجع ================= */}

      <Dialog
        open={detail !== null}
        onOpenChange={(v) =>
          !v && setDetail(null)
        }
      >
        <DialogContent
          className="max-h-[90vh] max-w-lg overflow-y-auto"
          dir="rtl"
        >
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-[#7B2C8E]">
              <ClipboardList className="h-5 w-5" />
              تفاصيل المرتجع
            </DialogTitle>
          </DialogHeader>

          {detail && (
            <div className="space-y-4">
              <div className="rounded-xl border p-4">
                <p className="font-mono text-xs text-muted-foreground">
                  {detail.return_id}
                </p>

                <p className="mt-1 text-lg font-bold">
                  {detail.product_name}
                </p>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-xl border p-3">
                  <p className="text-xs text-muted-foreground">
                    كود المنتج
                  </p>

                  <p className="mt-1 text-sm font-semibold">
                    {detail.product_id}
                  </p>
                </div>

                <div className="rounded-xl border p-3">
                  <p className="text-xs text-muted-foreground">
                    الباركود
                  </p>

                  <p className="mt-1 text-sm font-semibold">
                    {detail.barcode || "—"}
                  </p>
                </div>

                <div className="rounded-xl border p-3">
                  <p className="text-xs text-muted-foreground">
                    المخزن
                  </p>

                  <p className="mt-1 text-sm font-semibold">
                    {warehouseName(
                      warehouses.data,
                      detail.warehouse,
                    )}
                  </p>
                </div>

                <div className="rounded-xl border p-3">
                  <p className="text-xs text-muted-foreground">
                    الكمية
                  </p>

                  <p className="mt-1 text-sm font-bold text-[#7B2C8E]">
                    {detail.qty}
                  </p>
                </div>
              </div>

              <div className="rounded-xl border border-[#C084CC]/20 bg-[#7B2C8E]/5 p-4">
                <p className="text-xs text-muted-foreground">
                  قيمة المرتجع
                </p>

                <p className="mt-1 text-2xl font-bold text-[#7B2C8E]">
                  {fmtMoney(
                    detail.return_total,
                    lang,
                  )}
                </p>
              </div>

              <div className="rounded-xl border p-4">
                <p className="text-xs text-muted-foreground">
                  سبب المرتجع
                </p>

                <p className="mt-1 text-sm font-medium">
                  {detail.return_reason || "—"}
                </p>
              </div>

              {detail.notes && (
                <div className="rounded-xl border p-4">
                  <p className="text-xs text-muted-foreground">
                    ملاحظات
                  </p>

                  <p className="mt-1 text-sm">
                    {detail.notes}
                  </p>
                </div>
              )}

              {[
                detail.product_image,
                detail.invoice_image,
                detail.delivery_note_image,
              ].filter(Boolean).length > 0 && (
                <div className="grid gap-3 sm:grid-cols-3">
                  {[
                    detail.product_image,
                    detail.invoice_image,
                    detail.delivery_note_image,
                  ]
                    .filter(Boolean)
                    .map((u, i) => (
                      <div
                        key={i}
                        className="overflow-hidden rounded-xl border"
                      >
                        <ProductImage
                          url={u}
                          alt=""
                          className="h-40 w-full"
                        />
                      </div>
                    ))}
                </div>
              )}

              <div className="flex items-center gap-2 border-t pt-4 text-xs text-muted-foreground">
                <CalendarDays className="h-4 w-4" />

                <span>
                  {fmtDate(
                    detail.return_date,
                    lang,
                  )}
                </span>

                {detail.return_time && (
                  <span>
                    — {detail.return_time}
                  </span>
                )}
              </div>

              <div className="border-t border-red-200 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  className="w-full border-red-300 text-red-600 hover:bg-red-600 hover:text-white"
                  onClick={() =>
                    setDeleteTarget(detail)
                  }
                >
                  <Trash2 className="ms-2 h-4 w-4" />

                  حذف المرتجع
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ================= تأكيد الحذف ================= */}

      <Dialog
        open={deleteTarget !== null}
        onOpenChange={(v) => {
          if (
            !v &&
            !deleteReturn.isPending
          ) {
            setDeleteTarget(null);
          }
        }}
      >
        <DialogContent
          className="max-w-md border-red-200 bg-white shadow-2xl"
          dir="rtl"
        >
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3 text-red-600">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-100">
                <Trash2 className="h-5 w-5" />
              </div>

              حذف المرتجع
            </DialogTitle>
          </DialogHeader>

          {deleteTarget && (
            <div className="space-y-4">
              <div className="rounded-xl border border-red-200 bg-red-50 p-4">
                <p className="text-sm text-red-800">
                  هل أنت متأكد من حذف هذا المرتجع؟
                </p>

                <div className="mt-3 space-y-1">
                  <p className="font-semibold text-red-900">
                    {deleteTarget.product_name}
                  </p>

                  <p className="font-mono text-xs text-red-700">
                    {deleteTarget.return_id}
                  </p>

                  <p className="text-sm font-semibold text-red-800">
                    الكمية: {deleteTarget.qty}
                  </p>

                  <p className="text-sm font-semibold text-red-800">
                    القيمة:{" "}
                    {fmtMoney(
                      deleteTarget.return_total,
                      lang,
                    )}
                  </p>
                </div>
              </div>

              <p className="text-xs text-muted-foreground">
                عند تأكيد الحذف سيتم حذف سجل المرتجع، وسيقوم النظام بإلغاء تأثير هذا المرتجع على المخزون.
              </p>
            </div>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              disabled={deleteReturn.isPending}
              onClick={() =>
                setDeleteTarget(null)
              }
            >
              إلغاء
            </Button>

            <Button
              type="button"
              disabled={deleteReturn.isPending}
              onClick={confirmDelete}
              className="bg-red-600 text-white hover:bg-red-700"
            >
              <Trash2 className="ms-2 h-4 w-4" />

              {deleteReturn.isPending
                ? "جاري الحذف..."
                : "تأكيد الحذف"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}