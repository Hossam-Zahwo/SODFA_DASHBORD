import { useCallback, useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Camera, Minus, Plus, ScanLine, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
import { Blocks } from "@/components/blocks-export";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import { useApiMutation, useInventory, useSales, useWarehouses } from "@/hooks/useSodfa";
import { useUsbScanner } from "@/hooks/useUsbScanner";
import { api, type Product } from "@/lib/api";
import { errorMessage, useI18n } from "@/lib/i18n";
import { fmtDate, fmtMoney, fmtTime } from "@/lib/dates";
import { warehouseName } from "@/lib/warehouse";

export const Route = createFileRoute("/sales")({
  head: () => ({
    meta: [
      { title: "Sales — SODFA صدفة" },
      {
        name: "description",
        content: "Sell products by USB scanner, phone camera or manual search, and track history.",
      },
      { property: "og:title", content: "Sales — SODFA صدفة" },
      { property: "og:description", content: "Barcode selling and full sales history." },
    ],
  }),
  component: SalesPage,
});

interface CartLine {
  product: Product;
  qty: number;
}

function SalesPage() {
  const { t, lang } = useI18n();
  const inventory = useInventory();
  const warehouses = useWarehouses();
  const sales = useSales();
  const [cart, setCart] = useState<CartLine[]>([]);
  const [manual, setManual] = useState("");
  const [camera, setCamera] = useState(false);

  const record = useApiMutation((p: { product_id: string; qty: number; warehouse: string }) =>
    api.recordSale(p),
  );

  const addToCart = useCallback(
    (product: Product) => {
      setCart((prev) => {
        const existing = prev.find((l) => l.product.product_id === product.product_id);
        const nextQty = (existing?.qty ?? 0) + 1;
        if (nextQty > product.remaining_qty) {
          toast.error(t("insufficient_stock"));
          return prev;
        }
        return existing
          ? prev.map((l) =>
              l.product.product_id === product.product_id ? { ...l, qty: nextQty } : l,
            )
          : [...prev, { product, qty: 1 }];
      });
    },
    [t],
  );

  const handleCode = useCallback(
    (code: string) => {
      const clean = code.trim().toLowerCase();
      const found = (inventory.data ?? []).find(
        (p) =>
          p.barcode.toLowerCase() === clean ||
          p.product_id.toLowerCase() === clean,
      );
      if (!found) {
        toast.error(t("not_found_barcode"));
        return;
      }
      addToCart(found);
      toast.success(found.product_name);
    },
    [inventory.data, addToCart, t],
  );

  useUsbScanner(handleCode);

  const matches = useMemo(() => {
    const term = manual.trim().toLowerCase();
    if (!term) return [];
    return (inventory.data ?? [])
      .filter(
        (p) =>
          p.product_name.toLowerCase().includes(term) ||
          p.product_id.toLowerCase().includes(term) ||
          p.barcode.toLowerCase().includes(term),
      )
      .slice(0, 8);
  }, [manual, inventory.data]);

  const total = cart.reduce((sum, l) => sum + l.qty * l.product.price, 0);

  const setQty = (id: string, qty: number) =>
    setCart((prev) =>
      prev.flatMap((l) => {
        if (l.product.product_id !== id) return [l];
        if (qty <= 0) return [];
        if (qty > l.product.remaining_qty) {
          toast.error(t("insufficient_stock"));
          return [l];
        }
        return [{ ...l, qty }];
      }),
    );

  const completeSale = async () => {
    if (cart.length === 0) return;
    try {
      for (const line of cart) {
        await record.mutateAsync({
          product_id: line.product.product_id,
          qty: line.qty,
          warehouse: line.product.warehouse,
        });
      }
      toast.success(t("sale_recorded"));
      setCart([]);
    } catch (e) {
      toast.error(errorMessage(e, lang));
    }
  };

  return (
    <AppShell title={t("sales")}>
      <div className="grid gap-6 xl:grid-cols-[1.1fr_1fr]">
        <div className="space-y-4">
          <Card className="space-y-4 p-4">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <ScanLine className="h-5 w-5 text-primary" />
              {t("usb_scanner")}
            </div>
            <p className="text-xs text-muted-foreground">{t("usb_hint")}</p>
            <Input
              data-scanner-input="true"
              placeholder={t("usb_hint")}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  handleCode(e.currentTarget.value);
                  e.currentTarget.value = "";
                }
              }}
            />
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" onClick={() => setCamera((v) => !v)}>
                {camera ? <X className="me-1 h-4 w-4" /> : <Camera className="me-1 h-4 w-4" />}
                {camera ? t("close_camera") : t("open_camera")}
              </Button>
            </div>
            {camera && <CameraScanner onDetected={handleCode} />}
          </Card>

          <Card className="space-y-3 p-4">
            <Label>{t("manual_search")}</Label>
            <Input
              value={manual}
              onChange={(e) => setManual(e.target.value)}
              placeholder={t("search_placeholder")}
            />
            <div className="space-y-2">
              {matches.map((p) => (
                <button
                  key={p.product_id}
                  type="button"
                  onClick={() => addToCart(p)}
                  className="flex w-full items-center gap-3 rounded-lg border border-border p-2 text-start transition-colors hover:bg-accent"
                >
                  <ProductImage url={p.image_url} alt={p.product_name} className="h-14 w-14" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold">{p.product_name}</span>
                    <span className="block text-xs text-muted-foreground">
                      {p.product_id} • {t("remaining")}: {p.remaining_qty}
                    </span>
                  </span>
                  <span className="text-sm font-bold text-primary">{fmtMoney(p.price, lang)}</span>
                </button>
              ))}
            </div>
          </Card>
        </div>

        <Card className="space-y-4 p-4">
          <h2 className="text-base font-bold">{t("cart")}</h2>
          {cart.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">{t("cart_empty")}</p>
          ) : (
            <div className="space-y-3">
              {cart.map((l) => (
                <div
                  key={l.product.product_id}
                  className="flex items-center gap-3 rounded-lg border border-border p-2"
                >
                  <ProductImage
                    url={l.product.image_url}
                    alt={l.product.product_name}
                    className="h-14 w-14"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">{l.product.product_name}</p>
                    <p className="text-xs text-muted-foreground">
                      {fmtMoney(l.product.price, lang)} • {warehouseName(warehouses.data, l.product.warehouse)}
                    </p>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      size="icon"
                      variant="outline"
                      className="h-8 w-8"
                      onClick={() => setQty(l.product.product_id, l.qty - 1)}
                    >
                      <Minus className="h-4 w-4" />
                    </Button>
                    <span className="w-8 text-center text-sm font-bold">{l.qty}</span>
                    <Button
                      size="icon"
                      variant="outline"
                      className="h-8 w-8"
                      onClick={() => setQty(l.product.product_id, l.qty + 1)}
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8"
                      onClick={() => setQty(l.product.product_id, 0)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              ))}
              <div className="flex items-center justify-between border-t border-border pt-3">
                <span className="font-semibold">{t("total")}</span>
                <span className="text-lg font-bold text-primary">{fmtMoney(total, lang)}</span>
              </div>
              <Button
                className="w-full"
                size="lg"
                onClick={() => void completeSale()}
                disabled={record.isPending}
              >
                {record.isPending ? t("saving") : t("complete_sale")}
              </Button>
            </div>
          )}
        </Card>
      </div>

      <div className="mt-6">
        <Tabs defaultValue="history">
          <TabsList>
            <TabsTrigger value="history">{t("sales_history")}</TabsTrigger>
          </TabsList>
          <TabsContent value="history">
            {sales.isLoading ? (
              <Blocks.Loading label={t("loading_sales")} />
            ) : sales.isError ? (
              <Blocks.Error label={errorMessage(sales.error, lang)} />
            ) : (sales.data ?? []).length === 0 ? (
              <Blocks.Empty label={t("no_results")} />
            ) : (
              <Card className="overflow-x-auto p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t("sale_id")}</TableHead>
                      <TableHead>{t("product")}</TableHead>
                      <TableHead>{t("warehouse")}</TableHead>
                      <TableHead>{t("quantity")}</TableHead>
                      <TableHead>{t("price")}</TableHead>
                      <TableHead>{t("total")}</TableHead>
                      <TableHead>{t("date")}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {[...(sales.data ?? [])].reverse().map((s) => (
                      <TableRow key={s.sale_id}>
                        <TableCell className="font-mono text-xs">{s.sale_id}</TableCell>
                        <TableCell>{s.product_name}</TableCell>
                        <TableCell>{warehouseName(warehouses.data, s.warehouse)}</TableCell>
                        <TableCell>{s.qty}</TableCell>
                        <TableCell>{fmtMoney(s.price, lang)}</TableCell>
                        <TableCell className="font-semibold">{fmtMoney(s.total, lang)}</TableCell>
                        <TableCell className="whitespace-nowrap text-xs">
                          {fmtDate(s.sale_date, lang)}{" "}
                          {s.sale_time ? fmtTime(s.sale_time, lang) : ""}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </AppShell>
  );
}