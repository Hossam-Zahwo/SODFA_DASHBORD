import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Eye, Plus, Printer, Pencil, Trash2, RefreshCw } from "lucide-react";
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
import { ALL_WAREHOUSES, WarehouseSelect } from "@/components/WarehouseSelect";
import { useApiMutation, useInventory, useWarehouses } from "@/hooks/useSodfa";
import { api, type Product } from "@/lib/api";
import { errorMessage, useI18n } from "@/lib/i18n";
import { fmtMoney } from "@/lib/dates";
import { warehouseName } from "@/lib/warehouse";

export const Route = createFileRoute("/inventory")({
  head: () => ({
    meta: [
      { title: "Inventory — SODFA صدفة" },
      {
        name: "description",
        content: "Manage SODFA products, stock, prices, images and printable barcodes.",
      },
      { property: "og:title", content: "Inventory — SODFA صدفة" },
      { property: "og:description", content: "Products, stock levels and barcode printing." },
    ],
  }),
  component: InventoryPage,
});

function InventoryPage() {
  const { t, lang } = useI18n();
  const inventory = useInventory();
  const warehouses = useWarehouses();
  const [q, setQ] = useState("");
  const [wh, setWh] = useState(ALL_WAREHOUSES);
  const [editing, setEditing] = useState<Product | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [printing, setPrinting] = useState<Product | null>(null);
  const [viewing, setViewing] = useState<Product | null>(null);
  const [toDelete, setToDelete] = useState<Product | null>(null);

  const del = useApiMutation((id: string) => api.deleteProduct(id));

  const list = useMemo(() => {
    const term = q.trim().toLowerCase();
    return (inventory.data ?? []).filter((p) => {
      const okWh = wh === ALL_WAREHOUSES || p.warehouse === wh;
      const okQ =
        !term ||
        p.product_name.toLowerCase().includes(term) ||
        p.product_id.toLowerCase().includes(term) ||
        p.barcode.toLowerCase().includes(term);
      return okWh && okQ;
    });
  }, [inventory.data, q, wh]);

  return (
    <AppShell title={t("inventory")}>
      <div className="space-y-5">
        <div className="flex flex-wrap items-center gap-3">
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={t("search_placeholder")}
            className="w-full sm:max-w-xs"
          />
          <WarehouseSelect
            value={wh}
            onChange={setWh}
            warehouses={warehouses.data ?? []}
            includeAll
            className="w-full sm:w-56"
          />
          <Button variant="outline" size="icon" onClick={() => void inventory.refetch()}>
            <RefreshCw className={inventory.isFetching ? "h-4 w-4 animate-spin" : "h-4 w-4"} />
          </Button>
          <Button
            className="ms-auto"
            onClick={() => {
              setEditing(null);
              setFormOpen(true);
            }}
          >
            <Plus className="me-1 h-4 w-4" />
            {t("add_product")}
          </Button>
        </div>

        {inventory.isLoading ? (
          <Blocks.Loading label={t("loading_inventory")} />
        ) : inventory.isError ? (
          <Blocks.Error label={errorMessage(inventory.error, lang)} />
        ) : list.length === 0 ? (
          <Blocks.Empty label={t("no_results")} />
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
            {list.map((p) => (
              <Card key={p.product_id} className="overflow-hidden p-0">
                <ProductImage
                  url={p.image_url}
                  alt={p.product_name}
                  className="h-56 w-full rounded-none border-b border-border"
                />
                <div className="space-y-3 p-4">
                  <div className="flex items-start justify-between gap-2">
                    <h2 className="text-base font-bold leading-tight">{p.product_name}</h2>
                    <Badge variant={p.remaining_qty > 0 ? "secondary" : "destructive"}>
                      {p.remaining_qty > 0 ? t("remaining") : t("insufficient_stock")}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {p.product_id} • {warehouseName(warehouses.data, p.warehouse)}
                  </p>
                  <p className="text-lg font-bold text-primary">{fmtMoney(p.price, lang)}</p>
                  <div className="grid grid-cols-3 gap-2 rounded-lg bg-surface p-2 text-center text-sm">
                    <div>
                      <p className="text-[11px] text-muted-foreground">{t("total_stock")}</p>
                      <p className="font-semibold">{p.stock_qty}</p>
                    </div>
                    <div>
                      <p className="text-[11px] text-muted-foreground">{t("sold")}</p>
                      <p className="font-semibold">{p.sold_qty}</p>
                    </div>
                    <div>
                      <p className="text-[11px] text-muted-foreground">{t("remaining")}</p>
                      <p className="font-semibold">{p.remaining_qty}</p>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button size="sm" variant="outline" onClick={() => setViewing(p)}>
                      <Eye className="me-1 h-4 w-4" />
                      {t("view_details")}
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => setPrinting(p)}>
                      <Printer className="me-1 h-4 w-4" />
                      {t("print_barcode")}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setEditing(p);
                        setFormOpen(true);
                      }}
                    >
                      <Pencil className="me-1 h-4 w-4" />
                      {t("edit")}
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => setToDelete(p)}>
                      <Trash2 className="me-1 h-4 w-4 text-destructive" />
                      {t("delete")}
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      <ProductFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        product={editing}
        warehouses={warehouses.data ?? []}
        {...(wh !== ALL_WAREHOUSES ? { defaultWarehouse: wh } : {})}
      />
      <PrintBarcodeDialog
        product={printing}
        open={printing !== null}
        onOpenChange={(v) => !v && setPrinting(null)}
      />
      <ProductDetailsDialog
        product={viewing}
        warehouses={warehouses.data ?? []}
        open={viewing !== null}
        onOpenChange={(v) => !v && setViewing(null)}
      />
      <ConfirmDialog
        open={toDelete !== null}
        onOpenChange={(v) => !v && setToDelete(null)}
        title={t("confirm_delete_product")}
        busy={del.isPending}
        onConfirm={() => {
          if (!toDelete) return;
          del.mutate(toDelete.product_id, {
            onSuccess: () => {
              toast.success(t("deleted"));
              setToDelete(null);
            },
            onError: (e) => toast.error(errorMessage(e, lang)),
          });
        }}
      />
    </AppShell>
  );
}