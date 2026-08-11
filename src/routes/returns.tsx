import { useCallback, useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Camera, Plus, X } from "lucide-react";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ImageDropzone } from "@/components/ImageDropzone";
import { ProductImage } from "@/components/ProductImage";
import { CameraScanner } from "@/components/CameraScanner";
import { ALL_WAREHOUSES, WarehouseSelect } from "@/components/WarehouseSelect";
import { useUsbScanner } from "@/hooks/useUsbScanner";
import { useApiMutation, useInventory, useReturns, useWarehouses } from "@/hooks/useSodfa";
import { api, type Product, type ReturnRecord } from "@/lib/api";
import { errorMessage, useI18n } from "@/lib/i18n";
import { fmtDate, fmtMoney } from "@/lib/dates";
import { warehouseName } from "@/lib/warehouse";

export const Route = createFileRoute("/returns")({
  head: () => ({
    meta: [
      { title: "Normal Returns — SODFA صدفة" },
      {
        name: "description",
        content: "Record customer returns with images; stock is restored automatically.",
      },
      { property: "og:title", content: "Normal Returns — SODFA صدفة" },
      { property: "og:description", content: "Returns that restock sellable inventory." },
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
  const [detail, setDetail] = useState<ReturnRecord | null>(null);
  const [product, setProduct] = useState<Product | null>(null);
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
          p.product_name.toLowerCase().includes(term) ||
          p.product_id.toLowerCase().includes(term) ||
          p.barcode.toLowerCase().includes(term),
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
        (p) => p.barcode.toLowerCase() === c || p.product_id.toLowerCase() === c,
      );
      if (!found) {
        toast.error(t("not_found_barcode"));
        return;
      }
      pickProduct(found);
      toast.success(found.product_name);
    },
    [inventory.data, open, pickProduct, t],
  );

  useUsbScanner(handleCode, open);

  const history = useMemo(() => {
    const term = listSearch.trim().toLowerCase();
    const rows = [...(returns.data ?? [])].reverse();
    if (!term) return rows;
    return rows.filter((r) =>
      [r.return_id, r.product_name, r.product_id, r.barcode].some((v) =>
        String(v ?? "").toLowerCase().includes(term),
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
    save.mutate(undefined as never, {
      onSuccess: () => {
        toast.success(t("return_recorded"));
        setOpen(false);
        reset();
      },
      onError: (e) => toast.error(errorMessage(e, lang)),
    });
  };

  return (
    <AppShell title={t("normal_returns")}>
      <div className="space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Input
            value={listSearch}
            onChange={(e) => setListSearch(e.target.value)}
            placeholder={t("search_placeholder")}
            className="w-full sm:max-w-xs"
          />
          <Button onClick={() => setOpen(true)}>
            <Plus className="me-1 h-4 w-4" />
            {t("add_return")}
          </Button>
        </div>

        {returns.isLoading ? (
          <Blocks.Loading label={t("loading_returns")} />
        ) : returns.isError ? (
          <Blocks.Error label={errorMessage(returns.error, lang)} />
        ) : history.length === 0 ? (
          <Blocks.Empty label={t("no_results")} />
        ) : (
          <Card className="overflow-x-auto p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("return_id")}</TableHead>
                  <TableHead>{t("product")}</TableHead>
                  <TableHead>{t("warehouse")}</TableHead>
                  <TableHead>{t("quantity")}</TableHead>
                  <TableHead>{t("total")}</TableHead>
                  <TableHead>{t("reason")}</TableHead>
                  <TableHead>{t("image")}</TableHead>
                  <TableHead>{t("date")}</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {history.map((r) => (
                  <TableRow key={r.return_id}>
                    <TableCell className="font-mono text-xs">{r.return_id}</TableCell>
                    <TableCell>{r.product_name}</TableCell>
                    <TableCell>{warehouseName(warehouses.data, r.warehouse)}</TableCell>
                    <TableCell>{r.qty}</TableCell>
                    <TableCell>{fmtMoney(r.return_total, lang)}</TableCell>
                    <TableCell className="max-w-40 truncate">{r.return_reason || "—"}</TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        {[r.product_image, r.invoice_image, r.delivery_note_image]
                          .filter(Boolean)
                          .map((u, i) => (
                            <ProductImage key={i} url={u} alt="" className="h-10 w-10" />
                          ))}
                      </div>
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-xs">
                      {fmtDate(r.return_date, lang)}
                    </TableCell>
                    <TableCell>
                      <Button size="sm" variant="outline" onClick={() => setDetail(r)}>
                        {t("view")}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        )}
      </div>

      <Dialog
        open={open}
        onOpenChange={(v) => {
          setOpen(v);
          if (!v) reset();
        }}
      >
        <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t("add_return")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>{t("select_product")}</Label>
              {product ? (
                <div className="mt-2 flex items-center gap-3 rounded-lg border border-border p-2">
                  <ProductImage
                    url={product.image_url}
                    alt={product.product_name}
                    className="h-12 w-12"
                  />
                  <span className="flex-1 truncate text-sm font-semibold">
                    {product.product_name}
                  </span>
                  <Button size="sm" variant="ghost" onClick={() => setProduct(null)}>
                    {t("edit")}
                  </Button>
                </div>
              ) : (
                <>
                  <Input
                    className="mt-2"
                    data-scanner-input="true"
                    placeholder={t("usb_hint")}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        handleCode(e.currentTarget.value);
                        e.currentTarget.value = "";
                      }
                    }}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="mt-2"
                    onClick={() => setCamera((v) => !v)}
                  >
                    {camera ? <X className="me-1 h-4 w-4" /> : <Camera className="me-1 h-4 w-4" />}
                    {camera ? t("close_camera") : t("open_camera")}
                  </Button>
                  {camera && (
                    <div className="mt-2">
                      <CameraScanner onDetected={handleCode} />
                    </div>
                  )}
                  <Input
                    className="mt-2"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder={t("search_placeholder")}
                  />
                  <div className="mt-2 space-y-1">
                    {matches.map((p) => (
                      <button
                        key={p.product_id}
                        type="button"
                        onClick={() => pickProduct(p)}
                        className="flex w-full items-center gap-2 rounded-md border border-border p-2 text-start text-sm hover:bg-accent"
                      >
                        <span className="flex-1 truncate">{p.product_name}</span>
                        <span className="text-xs text-muted-foreground">{p.product_id}</span>
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
            <div>
              <Label>{t("destination_warehouse")}</Label>
              <WarehouseSelect
                value={destination}
                onChange={setDestination}
                warehouses={warehouses.data ?? []}
                className="mt-2 w-full"
              />
            </div>
            <div>
              <Label htmlFor="r-qty">{t("quantity")}</Label>
              <Input
                id="r-qty"
                type="number"
                min="1"
                value={qty}
                onChange={(e) => setQty(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="r-reason">{t("return_reason")}</Label>
              <Input id="r-reason" value={reason} onChange={(e) => setReason(e.target.value)} />
            </div>
            <div>
              <Label htmlFor="r-notes">{t("notes")}</Label>
              <Textarea id="r-notes" value={notes} onChange={(e) => setNotes(e.target.value)} />
            </div>
            <ImageDropzone label={t("product_image")} value={img1} onChange={setImg1} />
            <ImageDropzone label={t("invoice_image")} value={img2} onChange={setImg2} />
            <ImageDropzone label={t("delivery_note_image")} value={img3} onChange={setImg3} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)} disabled={save.isPending}>
              {t("cancel")}
            </Button>
            <Button onClick={submit} disabled={save.isPending}>
              {save.isPending ? t("saving") : t("save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={detail !== null} onOpenChange={(v) => !v && setDetail(null)}>
        <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t("return_details")}</DialogTitle>
          </DialogHeader>
          {detail && (
            <div className="space-y-3">
              <p className="font-mono text-xs text-muted-foreground">{detail.return_id}</p>
              <p className="text-lg font-bold">{detail.product_name}</p>
              <p className="text-sm">
                {detail.product_id} • {detail.barcode}
              </p>
              <p className="text-sm">
                {t("warehouse")}: {warehouseName(warehouses.data, detail.warehouse)} •{" "}
                {t("quantity")}: {detail.qty} • {fmtMoney(detail.return_total, lang)}
              </p>
              <p className="text-sm">
                {t("return_reason")}: {detail.return_reason || "—"}
              </p>
              {detail.notes && <p className="text-sm text-muted-foreground">{detail.notes}</p>}
              <div className="grid gap-3 sm:grid-cols-3">
                {[detail.product_image, detail.invoice_image, detail.delivery_note_image]
                  .filter(Boolean)
                  .map((u, i) => (
                    <ProductImage key={i} url={u} alt="" className="h-40 w-full" />
                  ))}
              </div>
              <p className="text-xs text-muted-foreground">
                {fmtDate(detail.return_date, lang)} {detail.return_time}
              </p>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}