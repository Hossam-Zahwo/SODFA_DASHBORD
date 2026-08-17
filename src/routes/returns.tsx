import { useCallback, useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import {
  Camera,
  Plus,
  X,
  Package,
  Warehouse,
  Hash,
  CalendarDays,
  ArrowDownToLine,
  FileText,
  Eye,
  ClipboardList,
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
        title: "Normal Returns — SODFA صدفة",
      },
      {
        name: "description",
        content:
          "Record customer returns with images; stock is restored automatically.",
      },
      {
        property: "og:title",
        content: "Normal Returns — SODFA صدفة",
      },
      {
        property: "og:description",
        content: "Returns that restock sellable inventory.",
      },
    ],
  }),

  component: ReturnsPage,
});

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

  const [product, setProduct] =
    useState<Product | null>(null);

  const [destination, setDestination] = useState("");
  const [qty, setQty] = useState("1");
  const [reason, setReason] = useState("");
  const [notes, setNotes] = useState("");

  const [img1, setImg1] = useState("");
  const [img2, setImg2] = useState("");
  const [img3, setImg3] = useState("");

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

  const pickProduct = useCallback((p: Product) => {
    setProduct(p);
    setDestination((d) => d || p.warehouse);
  }, []);

  const handleCode = useCallback(
    (code: string) => {
      if (!open) return;

      const c = code.trim().toLowerCase();

      const found = (inventory.data ?? []).find(
        (p) =>
          p.barcode.toLowerCase() === c ||
          p.product_id.toLowerCase() === c,
      );

      if (!found) {
        toast.error(t("not_found_barcode"));
        return;
      }

      pickProduct(found);

      toast.success(found.product_name);
    },
    [
      inventory.data,
      open,
      pickProduct,
      t,
    ],
  );

  useUsbScanner(handleCode, open);

  const history = useMemo(() => {
    const term = listSearch.trim().toLowerCase();

    const rows = [...(returns.data ?? [])].reverse();

    if (!term) return rows;

    return rows.filter((r) =>
      [
        r.return_id,
        r.product_name,
        r.product_id,
        r.barcode,
      ].some((v) =>
        String(v ?? "")
          .toLowerCase()
          .includes(term),
      ),
    );
  }, [returns.data, listSearch]);

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

  const submit = () => {
    if (!product) {
      toast.error(t("err_no_product"));
      return;
    }

    if (Number(qty) <= 0) {
      toast.error(t("invalid_qty"));
      return;
    }

    if (!destination) {
      toast.error(t("select_warehouse"));
      return;
    }

    save.mutate(undefined as never, {
      onSuccess: () => {
        toast.success(t("return_recorded"));
        setOpen(false);
        reset();
      },

      onError: (e) =>
        toast.error(errorMessage(e, lang)),
    });
  };

  return (
    <AppShell title={t("normal_returns")}>

      <div className="space-y-6">

        {/* =====================================================
            TOP HEADER
        ===================================================== */}

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

          <div className="relative flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">

            <div>
              <div className="mb-1 flex items-center gap-2 text-white/80">
                <ArrowDownToLine className="h-5 w-5" />

                <span className="text-sm font-medium">
                  SODFA
                </span>
              </div>

              <h1 className="text-2xl font-bold text-white">
                {t("normal_returns")}
              </h1>

              <p className="mt-1 text-sm text-white/75">
                Manage returned products and restore inventory
                automatically.
              </p>
            </div>

            <Button
              onClick={() => setOpen(true)}
              className="
                h-11 rounded-xl
                bg-white
                px-5
                font-semibold
                text-[#7B2C8E]
                shadow-lg
                hover:bg-white/90
              "
            >
              <Plus className="me-2 h-5 w-5" />

              {t("add_return")}
            </Button>
          </div>
        </div>

        {/* =====================================================
            SEARCH
        ===================================================== */}

        <div
          className="
            rounded-2xl
            border border-[#C084CC]/15
            bg-[#7B2C8E]/5
            p-4
          "
        >
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">

            <div>
              <h2 className="font-semibold text-[#7B2C8E] dark:text-[#C084CC]">
                Return History
              </h2>

              <p className="text-xs text-muted-foreground">
                Search through recorded customer returns
              </p>
            </div>

            <Input
              value={listSearch}
              onChange={(e) =>
                setListSearch(e.target.value)
              }
              placeholder={t("search_placeholder")}
              className="
                w-full
                border-[#C084CC]/30
                bg-white
                focus-visible:ring-[#9B4BA8]
                md:max-w-sm
              "
            />
          </div>
        </div>

        {/* =====================================================
            LOADING / ERROR / EMPTY
        ===================================================== */}

        {returns.isLoading ? (

          <div
            className="
              rounded-2xl
              border border-[#C084CC]/20
              bg-[#7B2C8E]/5
              p-8
            "
          >
            <Blocks.Loading
              label={t("loading_returns")}
            />
          </div>

        ) : returns.isError ? (

          <div
            className="
              rounded-2xl
              border border-red-300/30
              bg-white
              p-8
            "
          >
            <Blocks.Error
              label={errorMessage(
                returns.error,
                lang,
              )}
            />
          </div>

        ) : history.length === 0 ? (

          <div
            className="
              rounded-2xl
              border border-[#C084CC]/20
              bg-white
              p-8
            "
          >
            <Blocks.Empty
              label={t("no_results")}
            />
          </div>

        ) : (

          /* =====================================================
             RETURNS CARDS
          ===================================================== */

          <div className="grid gap-5 xl:grid-cols-2">

            {history.map((r) => (

              <Card
                key={r.return_id}
                className="
                  group
                  overflow-hidden
                  border border-[#C084CC]/20
                  bg-white
                  shadow-sm
                  transition-all
                  duration-300
                  hover:-translate-y-1
                  hover:border-[#9B4BA8]/50
                  hover:shadow-xl
                "
              >

                {/* CARD HEADER */}

                <div
                  className="
                    flex items-center justify-between
                    border-b border-[#C084CC]/15
                    bg-white
                    px-5 py-4
                  "
                >

                  <div className="flex items-center gap-3">

                    <div
                      className="
                        flex h-11 w-11
                        items-center justify-center
                        rounded-xl
                        bg-gradient-to-br
                        from-[#7B2C8E]
                        to-[#C084CC]
                        text-white
                        shadow-md
                      "
                    >
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

                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setDetail(r)}
                    className="
                      border-[#9B4BA8]/30
                      text-[#7B2C8E]
                      hover:bg-[#7B2C8E]
                      hover:text-white
                      dark:text-[#C084CC]
                    "
                  >
                    <Eye className="me-1 h-4 w-4" />

                    {t("view")}
                  </Button>

                </div>

                {/* CARD BODY */}

                <div className="bg-white p-5">

                  <div className="grid gap-4 sm:grid-cols-[110px_1fr]">

                    {/* IMAGE */}

                    <div
                      className="
                        flex h-[110px]
                        items-center justify-center
                        overflow-hidden
                        rounded-xl
                        border border-[#C084CC]/20
                        bg-white
                      "
                    >
                      {r.product_image ? (
                        <ProductImage
                          url={r.product_image}
                          alt={r.product_name}
                          className="h-full w-full"
                        />
                      ) : (
                        <Package
                          className="
                            h-9 w-9
                            text-[#9B4BA8]
                          "
                        />
                      )}
                    </div>

                    {/* INFO */}

                    <div className="space-y-3">

                      <div className="grid grid-cols-2 gap-3">

                        <div
                          className="
                            rounded-xl
                            border border-[#C084CC]/15
                            bg-white
                            p-3
                          "
                        >
                          <div className="mb-1 flex items-center gap-1.5 text-xs text-muted-foreground">
                            <Hash className="h-3.5 w-3.5 text-[#9B4BA8]" />

                            Product ID
                          </div>

                          <p className="truncate text-sm font-semibold">
                            {r.product_id}
                          </p>
                        </div>

                        <div
                          className="
                            rounded-xl
                            border border-[#C084CC]/15
                            bg-white
                            p-3
                          "
                        >
                          <div className="mb-1 flex items-center gap-1.5 text-xs text-muted-foreground">
                            <Package className="h-3.5 w-3.5 text-[#9B4BA8]" />

                            {t("quantity")}
                          </div>

                          <p className="text-sm font-bold text-[#7B2C8E] dark:text-[#C084CC]">
                            {r.qty}
                          </p>
                        </div>

                      </div>

                      <div
                        className="
                          flex items-center gap-2
                          rounded-xl
                          border border-[#C084CC]/15
                          bg-white
                          px-3 py-2.5
                        "
                      >
                        <Warehouse
                          className="
                            h-4 w-4
                            text-[#9B4BA8]
                          "
                        />

                        <span className="text-xs text-muted-foreground">
                          {t("warehouse")}
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

                  {/* BOTTOM INFO */}

                  <div
                    className="
                      mt-5
                      grid gap-3
                      sm:grid-cols-3
                    "
                  >

                    <div
                      className="
                        rounded-xl
                        border border-[#C084CC]/15
                        bg-white
                        p-3
                      "
                    >
                      <p className="text-xs text-muted-foreground">
                        {t("total")}
                      </p>

                      <p className="mt-1 font-bold text-[#7B2C8E] dark:text-[#C084CC]">
                        {fmtMoney(
                          r.return_total,
                          lang,
                        )}
                      </p>
                    </div>

                    <div
                      className="
                        rounded-xl
                        border border-[#C084CC]/15
                        bg-white
                        p-3
                      "
                    >
                      <p className="text-xs text-muted-foreground">
                        {t("reason")}
                      </p>

                      <p className="mt-1 truncate text-sm font-medium">
                        {r.return_reason || "—"}
                      </p>
                    </div>

                    <div
                      className="
                        rounded-xl
                        border border-[#C084CC]/15
                        bg-white
                        p-3
                      "
                    >
                      <p className="text-xs text-muted-foreground">
                        {t("date")}
                      </p>

                      <div className="mt-1 flex items-center gap-1.5 text-sm font-medium">
                        <CalendarDays
                          className="
                            h-3.5 w-3.5
                            text-[#9B4BA8]
                          "
                        />

                        {fmtDate(
                          r.return_date,
                          lang,
                        )}
                      </div>
                    </div>

                  </div>

                  {/* IMAGES */}

                  {[
                    r.product_image,
                    r.invoice_image,
                    r.delivery_note_image,
                  ].filter(Boolean).length > 0 && (

                    <div
                      className="
                        mt-4
                        flex gap-2
                        border-t border-[#C084CC]/15
                        bg-white
                        pt-4
                      "
                    >

                      {[
                        r.product_image,
                        r.invoice_image,
                        r.delivery_note_image,
                      ]
                        .filter(Boolean)
                        .map((u, i) => (
                          <ProductImage
                            key={i}
                            url={u}
                            alt=""
                            className="
                              h-12 w-12
                              rounded-lg
                              border border-[#C084CC]/20
                            "
                          />
                        ))}

                    </div>
                  )}

                </div>

              </Card>
            ))}

          </div>
        )}

      </div>

      {/* =====================================================
          ADD RETURN DIALOG
      ===================================================== */}

      <Dialog
        open={open}
        onOpenChange={(v) => {
          setOpen(v);

          if (!v) reset();
        }}
      >

        <DialogContent
          className="
            max-h-[90vh]
            max-w-lg
            overflow-y-auto
            border-[#C084CC]/30
            bg-white
            shadow-2xl
          "
        >

          <DialogHeader>

            <DialogTitle
              className="
                flex items-center gap-2
                text-xl
                text-[#7B2C8E]
                dark:text-[#C084CC]
              "
            >
              <div
                className="
                  flex h-9 w-9
                  items-center justify-center
                  rounded-lg
                  bg-gradient-to-br
                  from-[#7B2C8E]
                  to-[#C084CC]
                  text-white
                "
              >
                <ArrowDownToLine className="h-5 w-5" />
              </div>

              {t("add_return")}
            </DialogTitle>

          </DialogHeader>

          <div className="space-y-5">

            {/* PRODUCT */}

            <div
              className="
                rounded-xl
                border border-[#C084CC]/20
                bg-white
                p-4
              "
            >

              <Label>
                {t("select_product")}
              </Label>

              {product ? (

                <div
                  className="
                    mt-3
                    flex items-center gap-3
                    rounded-xl
                    border border-[#C084CC]/20
                    bg-white
                    p-3
                  "
                >

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
                    className="
                      text-[#7B2C8E]
                      hover:bg-[#7B2C8E]/10
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
                      border-[#C084CC]/30
                      bg-white
                      focus-visible:ring-[#9B4BA8]
                    "
                    data-scanner-input="true"
                    placeholder={t("usb_hint")}
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
                    className="
                      mt-2
                      border-[#9B4BA8]/40
                      bg-white
                      text-[#7B2C8E]
                      hover:bg-[#7B2C8E]
                      hover:text-white
                    "
                    onClick={() =>
                      setCamera((v) => !v)
                    }
                  >

                    {camera ? (
                      <X className="me-1 h-4 w-4" />
                    ) : (
                      <Camera className="me-1 h-4 w-4" />
                    )}

                    {camera
                      ? t("close_camera")
                      : t("open_camera")}

                  </Button>

                  {camera && (
                    <div className="mt-3 overflow-hidden rounded-xl border border-[#C084CC]/20 bg-white">
                      <CameraScanner
                        onDetected={handleCode}
                      />
                    </div>
                  )}

                  <Input
                    className="
                      mt-3
                      border-[#C084CC]/30
                      bg-white
                      focus-visible:ring-[#9B4BA8]
                    "
                    value={search}
                    onChange={(e) =>
                      setSearch(e.target.value)
                    }
                    placeholder={t(
                      "search_placeholder",
                    )}
                  />

                  <div className="mt-2 space-y-1">

                    {matches.map((p) => (

                      <button
                        key={p.product_id}
                        type="button"
                        onClick={() =>
                          pickProduct(p)
                        }
                        className="
                          flex w-full
                          items-center gap-2
                          rounded-lg
                          border border-[#C084CC]/20
                          bg-white
                          p-3
                          text-start
                          text-sm
                          transition
                          hover:border-[#9B4BA8]/50
                          hover:bg-[#7B2C8E]/10
                        "
                      >

                        <Package
                          className="
                            h-4 w-4
                            text-[#9B4BA8]
                          "
                        />

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

            {/* WAREHOUSE */}

            <div>

              <Label>
                {t("destination_warehouse")}
              </Label>

              <WarehouseSelect
                value={destination}
                onChange={setDestination}
                warehouses={
                  warehouses.data ?? []
                }
                className="
                  mt-2 w-full
                  border-[#C084CC]/30
                  bg-white
                "
              />

            </div>

            {/* QUANTITY */}

            <div>

              <Label htmlFor="r-qty">
                {t("quantity")}
              </Label>

              <Input
                id="r-qty"
                type="number"
                min="1"
                value={qty}
                onChange={(e) =>
                  setQty(e.target.value)
                }
                className="
                  mt-2
                  border-[#C084CC]/30
                  bg-white
                  focus-visible:ring-[#9B4BA8]
                "
              />

            </div>

            {/* REASON */}

            <div>

              <Label htmlFor="r-reason">
                {t("return_reason")}
              </Label>

              <Input
                id="r-reason"
                value={reason}
                onChange={(e) =>
                  setReason(e.target.value)
                }
                className="
                  mt-2
                  border-[#C084CC]/30
                  bg-white
                  focus-visible:ring-[#9B4BA8]
                "
              />

            </div>

            {/* NOTES */}

            <div>

              <Label htmlFor="r-notes">
                {t("notes")}
              </Label>

              <Textarea
                id="r-notes"
                value={notes}
                onChange={(e) =>
                  setNotes(e.target.value)
                }
                className="
                  mt-2
                  min-h-24
                  border-[#C084CC]/30
                  bg-white
                  focus-visible:ring-[#9B4BA8]
                "
              />

            </div>

            {/* IMAGES */}

            <div
              className="
                space-y-3
                rounded-xl
                border border-[#C084CC]/20
                bg-white
                p-4
              "
            >

              <div className="flex items-center gap-2">

                <FileText
                  className="
                    h-4 w-4
                    text-[#9B4BA8]
                  "
                />

                <span className="text-sm font-semibold">
                  Return Documents
                </span>

              </div>

              <ImageDropzone
                label={t("product_image")}
                value={img1}
                onChange={setImg1}
              />

              <ImageDropzone
                label={t("invoice_image")}
                value={img2}
                onChange={setImg2}
              />

              <ImageDropzone
                label={t("delivery_note_image")}
                value={img3}
                onChange={setImg3}
              />

            </div>

          </div>

          <DialogFooter className="mt-2">

            <Button
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={save.isPending}
              className="
                border-[#C084CC]/30
                bg-white
                hover:bg-[#7B2C8E]/10
              "
            >
              {t("cancel")}
            </Button>

            <Button
              onClick={submit}
              disabled={save.isPending}
              className="
                bg-gradient-to-r
                from-[#7B2C8E]
                via-[#9B4BA8]
                to-[#C084CC]
                text-white
                shadow-md
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
          RETURN DETAILS
      ===================================================== */}

      <Dialog
        open={detail !== null}
        onOpenChange={(v) =>
          !v && setDetail(null)
        }
      >

        <DialogContent
          className="
            max-h-[90vh]
            max-w-lg
            overflow-y-auto
            border-[#C084CC]/30
            bg-white
            shadow-2xl
          "
        >

          <DialogHeader>

            <DialogTitle
              className="
                flex items-center gap-2
                text-[#7B2C8E]
                dark:text-[#C084CC]
              "
            >

              <div
                className="
                  flex h-9 w-9
                  items-center justify-center
                  rounded-lg
                  bg-gradient-to-br
                  from-[#7B2C8E]
                  to-[#C084CC]
                  text-white
                "
              >
                <ClipboardList className="h-5 w-5" />
              </div>

              {t("return_details")}

            </DialogTitle>

          </DialogHeader>

          {detail && (

            <div className="space-y-4">

              <div
                className="
                  rounded-xl
                  bg-white
                  border border-[#C084CC]/15
                  p-4
                "
              >

                <p className="font-mono text-xs text-muted-foreground">
                  {detail.return_id}
                </p>

                <p className="mt-1 text-lg font-bold">
                  {detail.product_name}
                </p>

              </div>

              <div className="grid gap-3 sm:grid-cols-2">

                <div
                  className="
                    rounded-xl
                    border border-[#C084CC]/15
                    bg-white
                    p-3
                  "
                >

                  <p className="text-xs text-muted-foreground">
                    Product ID
                  </p>

                  <p className="mt-1 text-sm font-semibold">
                    {detail.product_id}
                  </p>

                </div>

                <div
                  className="
                    rounded-xl
                    border border-[#C084CC]/15
                    bg-white
                    p-3
                  "
                >

                  <p className="text-xs text-muted-foreground">
                    Barcode
                  </p>

                  <p className="mt-1 text-sm font-semibold">
                    {detail.barcode}
                  </p>

                </div>

                <div
                  className="
                    rounded-xl
                    border border-[#C084CC]/15
                    bg-white
                    p-3
                  "
                >

                  <p className="text-xs text-muted-foreground">
                    {t("warehouse")}
                  </p>

                  <p className="mt-1 text-sm font-semibold">
                    {warehouseName(
                      warehouses.data,
                      detail.warehouse,
                    )}
                  </p>

                </div>

                <div
                  className="
                    rounded-xl
                    border border-[#C084CC]/15
                    bg-white
                    p-3
                  "
                >

                  <p className="text-xs text-muted-foreground">
                    {t("quantity")}
                  </p>

                  <p className="mt-1 text-sm font-bold text-[#7B2C8E] dark:text-[#C084CC]">
                    {detail.qty}
                  </p>

                </div>

              </div>

              <div
                className="
                  rounded-xl
                  border border-[#C084CC]/20
                  bg-white
                  p-4
                "
              >

                <p className="text-xs text-muted-foreground">
                  {t("total")}
                </p>

                <p className="mt-1 text-xl font-bold text-[#7B2C8E] dark:text-[#C084CC]">
                  {fmtMoney(
                    detail.return_total,
                    lang,
                  )}
                </p>

              </div>

              <div
                className="
                  rounded-xl
                  border border-[#C084CC]/15
                  bg-white
                  p-4
                "
              >

                <p className="text-xs text-muted-foreground">
                  {t("return_reason")}
                </p>

                <p className="mt-1 text-sm font-medium">
                  {detail.return_reason || "—"}
                </p>

              </div>

              {detail.notes && (

                <div
                  className="
                    rounded-xl
                    border border-[#C084CC]/15
                    bg-white
                    p-4
                  "
                >

                  <p className="text-xs text-muted-foreground">
                    {t("notes")}
                  </p>

                  <p className="mt-1 text-sm">
                    {detail.notes}
                  </p>

                </div>

              )}

              <div
                className="
                  grid gap-3
                  sm:grid-cols-3
                "
              >

                {[
                  detail.product_image,
                  detail.invoice_image,
                  detail.delivery_note_image,
                ]
                  .filter(Boolean)
                  .map((u, i) => (

                    <div
                      key={i}
                      className="
                        overflow-hidden
                        rounded-xl
                        border border-[#C084CC]/20
                        bg-white
                      "
                    >

                      <ProductImage
                        url={u}
                        alt=""
                        className="h-40 w-full"
                      />

                    </div>

                  ))}

              </div>

              <div
                className="
                  flex items-center gap-2
                  border-t border-[#C084CC]/15
                  bg-white
                  pt-4
                  text-xs
                  text-muted-foreground
                "
              >

                <CalendarDays
                  className="
                    h-4 w-4
                    text-[#9B4BA8]
                  "
                />

                {fmtDate(
                  detail.return_date,
                  lang,
                )}

                {detail.return_time && (
                  <span>
                    {detail.return_time}
                  </span>
                )}

              </div>

            </div>
          )}

        </DialogContent>

      </Dialog>

    </AppShell>
  );
}