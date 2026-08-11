import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Plus } from "lucide-react";
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
import { useApiMutation, useDamagedReturns, useInventory, useWarehouses } from "@/hooks/useSodfa";
import { api, type DamagedStatus, type Product } from "@/lib/api";
import { errorMessage, useI18n } from "@/lib/i18n";
import { fmtDate } from "@/lib/dates";
import { warehouseName } from "@/lib/warehouse";

export const Route = createFileRoute("/damaged-returns")({
  head: () => ({
    meta: [
      { title: "Damaged Returns — SODFA صدفة" },
      {
        name: "description",
        content: "Track damaged shipments with three images and Pending/Accepted/Rejected status.",
      },
      { property: "og:title", content: "Damaged Returns — SODFA صدفة" },
      { property: "og:description", content: "Damaged returns never re-enter sellable stock." },
    ],
  }),
  component: DamagedPage,
});

const STATUSES: DamagedStatus[] = ["Pending", "Accepted", "Rejected"];

function DamagedPage() {
  const { t, lang } = useI18n();
  const damaged = useDamagedReturns();
  const inventory = useInventory();
  const warehouses = useWarehouses();
  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [listSearch, setListSearch] = useState("");
  const [detail, setDetail] = useState<string | null>(null);
  const [product, setProduct] = useState<Product | null>(null);
  const [shipment, setShipment] = useState("");
  const [qty, setQty] = useState("1");
  const [reason, setReason] = useState("");
  const [details, setDetails] = useState("");
  const [img1, setImg1] = useState("");
  const [img2, setImg2] = useState("");
  const [img3, setImg3] = useState("");

  const save = useApiMutation(() =>
    api.recordDamagedReturn({
      product_id: product!.product_id,
      shipment_code: shipment,
      qty: Number(qty),
      warehouse: product!.warehouse,
      damage_reason: reason,
      damage_details: details,
      status: "Pending",
      policy_image: img1,
      product_image: img2,
      policy_product_image: img3,
    }),
  );
  const setStatus = useApiMutation((p: { id: string; status: DamagedStatus }) =>
    api.updateDamagedStatus(p.id, p.status),
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

  const term = listSearch.trim().toLowerCase();
  const list = (damaged.data ?? [])
    .filter((d) => filter === "all" || d.status === filter)
    .filter(
      (d) =>
        !term ||
        [d.damaged_return_id, d.product_name, d.product_id, d.shipment_code, d.barcode].some((v) =>
          String(v ?? "").toLowerCase().includes(term),
        ),
    );
  const detailRow = (damaged.data ?? []).find((d) => d.damaged_return_id === detail) ?? null;

  const reset = () => {
    setProduct(null);
    setSearch("");
    setShipment("");
    setQty("1");
    setReason("");
    setDetails("");
    setImg1("");
    setImg2("");
    setImg3("");
  };

  const statusLabel = (s: DamagedStatus) =>
    s === "Accepted" ? t("accepted") : s === "Rejected" ? t("rejected") : t("pending");

  return (
    <AppShell title={t("damaged_returns")}>
      <div className="space-y-5">
        <Card className="flex flex-wrap items-center gap-3 p-4">
          <p className="text-sm text-muted-foreground">{t("damaged_no_stock_note")}</p>
          <Input
            value={listSearch}
            onChange={(e) => setListSearch(e.target.value)}
            placeholder={t("search_placeholder")}
            className="w-full sm:max-w-xs"
          />
          <Select value={filter} onValueChange={setFilter}>
            <SelectTrigger className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("all_statuses")}</SelectItem>
              {STATUSES.map((s) => (
                <SelectItem key={s} value={s}>
                  {statusLabel(s)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button className="ms-auto" onClick={() => setOpen(true)}>
            <Plus className="me-1 h-4 w-4" />
            {t("add_damaged_return")}
          </Button>
        </Card>

        {damaged.isLoading ? (
          <Blocks.Loading label={t("loading_returns")} />
        ) : damaged.isError ? (
          <Blocks.Error label={errorMessage(damaged.error, lang)} />
        ) : list.length === 0 ? (
          <Blocks.Empty label={t("no_results")} />
        ) : (
          <div className="grid gap-4 lg:grid-cols-2">
            {list.map((d) => (
              <Card key={d.damaged_return_id} className="space-y-3 p-4">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h2 className="font-bold">{d.product_name}</h2>
                    <p className="text-xs text-muted-foreground">
                      {d.damaged_return_id} • {t("shipment_code")}: {d.shipment_code || "—"}
                    </p>
                  </div>
                  <Badge
                    variant={
                      d.status === "Accepted"
                        ? "default"
                        : d.status === "Rejected"
                          ? "destructive"
                          : "secondary"
                    }
                  >
                    {statusLabel(d.status)}
                  </Badge>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <ProductImage url={d.policy_image} alt={t("policy_image")} className="h-28 w-full" />
                  <ProductImage url={d.product_image} alt={t("product_image")} className="h-28 w-full" />
                  <ProductImage
                    url={d.policy_product_image}
                    alt={t("policy_product_image")}
                    className="h-28 w-full"
                  />
                </div>
                <p className="text-sm">
                  {t("quantity")}: {d.qty} • {warehouseName(warehouses.data, d.warehouse)} •{" "}
                  {fmtDate(d.return_date, lang)}
                </p>
                {d.damage_reason && <p className="text-sm">{d.damage_reason}</p>}
                {d.damage_details && (
                  <p className="text-xs text-muted-foreground">{d.damage_details}</p>
                )}
                <div className="flex flex-wrap gap-2">
                  <Button size="sm" variant="secondary" onClick={() => setDetail(d.damaged_return_id)}>
                    {t("view")}
                  </Button>
                  {STATUSES.map((s) => (
                    <Button
                      key={s}
                      size="sm"
                      variant={d.status === s ? "default" : "outline"}
                      disabled={setStatus.isPending || d.status === s}
                      onClick={() =>
                        setStatus.mutate(
                          { id: d.damaged_return_id, status: s },
                          {
                            onSuccess: () => toast.success(t("saved")),
                            onError: (e) => toast.error(errorMessage(e, lang)),
                          },
                        )
                      }
                    >
                      {statusLabel(s)}
                    </Button>
                  ))}
                </div>
              </Card>
            ))}
          </div>
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
            <DialogTitle>{t("add_damaged_return")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>{t("select_product")}</Label>
              {product ? (
                <div className="mt-2 flex items-center gap-3 rounded-lg border border-border p-2">
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
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder={t("search_placeholder")}
                  />
                  <div className="mt-2 space-y-1">
                    {matches.map((p) => (
                      <button
                        key={p.product_id}
                        type="button"
                        onClick={() => setProduct(p)}
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
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="d-ship">{t("shipment_code")}</Label>
                <Input id="d-ship" value={shipment} onChange={(e) => setShipment(e.target.value)} />
              </div>
              <div>
                <Label htmlFor="d-qty">{t("quantity")}</Label>
                <Input
                  id="d-qty"
                  type="number"
                  min="1"
                  value={qty}
                  onChange={(e) => setQty(e.target.value)}
                />
              </div>
            </div>
            <div>
              <Label htmlFor="d-reason">{t("damage_reason")}</Label>
              <Input id="d-reason" value={reason} onChange={(e) => setReason(e.target.value)} />
            </div>
            <div>
              <Label htmlFor="d-details">{t("damage_details")}</Label>
              <Textarea
                id="d-details"
                value={details}
                onChange={(e) => setDetails(e.target.value)}
              />
            </div>
            <ImageDropzone label={t("policy_image")} value={img1} onChange={setImg1} />
            <ImageDropzone label={t("product_image")} value={img2} onChange={setImg2} />
            <ImageDropzone label={t("policy_product_image")} value={img3} onChange={setImg3} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)} disabled={save.isPending}>
              {t("cancel")}
            </Button>
            <Button
              disabled={save.isPending}
              onClick={() => {
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
                    toast.success(t("damaged_recorded"));
                    setOpen(false);
                    reset();
                  },
                  onError: (e) => toast.error(errorMessage(e, lang)),
                });
              }}
            >
              {save.isPending ? t("saving") : t("save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={detailRow !== null} onOpenChange={(v) => !v && setDetail(null)}>
        <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t("details")}</DialogTitle>
          </DialogHeader>
          {detailRow && (
            <div className="space-y-3">
              <p className="font-mono text-xs text-muted-foreground">
                {detailRow.damaged_return_id}
              </p>
              <p className="text-lg font-bold">{detailRow.product_name}</p>
              <p className="text-sm">
                {detailRow.product_id} • {t("shipment_code")}: {detailRow.shipment_code || "—"}
              </p>
              <p className="text-sm">
                {t("warehouse")}: {warehouseName(warehouses.data, detailRow.warehouse)} •{" "}
                {t("quantity")}: {detailRow.qty} • {statusLabel(detailRow.status)}
              </p>
              {detailRow.damage_reason && <p className="text-sm">{detailRow.damage_reason}</p>}
              {detailRow.damage_details && (
                <p className="text-sm text-muted-foreground">{detailRow.damage_details}</p>
              )}
              <div className="grid gap-3 sm:grid-cols-3">
                <div>
                  <p className="mb-1 text-xs text-muted-foreground">{t("policy_image")}</p>
                  <ProductImage url={detailRow.policy_image} alt="" className="h-48 w-full" />
                </div>
                <div>
                  <p className="mb-1 text-xs text-muted-foreground">{t("product_image")}</p>
                  <ProductImage url={detailRow.product_image} alt="" className="h-48 w-full" />
                </div>
                <div>
                  <p className="mb-1 text-xs text-muted-foreground">{t("policy_product_image")}</p>
                  <ProductImage
                    url={detailRow.policy_product_image}
                    alt=""
                    className="h-48 w-full"
                  />
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                {fmtDate(detailRow.return_date, lang)} {detailRow.return_time}
              </p>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}