import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ProductImage } from "@/components/ProductImage";
import { BarcodeView } from "@/components/BarcodeView";
import { useI18n } from "@/lib/i18n";
import { fmtMoney } from "@/lib/dates";
import { warehouseName } from "@/lib/warehouse";
import type { Product, Warehouse } from "@/lib/api";

export function ProductDetailsDialog({
  product,
  warehouses,
  open,
  onOpenChange,
}: {
  product: Product | null;
  warehouses: Warehouse[];
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const { t, lang } = useI18n();
  if (!product) return null;

  const rows: [string, string][] = [
    [t("product_id"), product.product_id],
    [t("barcode"), product.barcode || product.product_id],
    [t("price"), fmtMoney(product.price, lang)],
    [t("warehouse"), warehouseName(warehouses, product.warehouse)],
    [t("total_stock"), String(product.stock_qty)],
    [t("sold"), String(product.sold_qty)],
    [t("remaining"), String(product.remaining_qty)],
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{product.product_name}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <ProductImage
            url={product.image_url}
            alt={product.product_name}
            className="h-72 w-full border border-border"
          />
          <dl className="grid gap-2 sm:grid-cols-2">
            {rows.map(([k, v]) => (
              <div key={k} className="flex justify-between rounded-lg bg-surface px-3 py-2 text-sm">
                <dt className="text-muted-foreground">{k}</dt>
                <dd className="font-semibold">{v}</dd>
              </div>
            ))}
          </dl>
          <div className="flex justify-center rounded-lg border border-border bg-card p-4">
            <BarcodeView value={product.barcode || product.product_id} />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}