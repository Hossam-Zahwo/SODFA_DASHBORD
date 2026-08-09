import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ImageDropzone } from "@/components/ImageDropzone";
import { WarehouseSelect } from "@/components/WarehouseSelect";
import { api, type Product, type Warehouse } from "@/lib/api";
import { errorMessage, useI18n } from "@/lib/i18n";
import { useApiMutation } from "@/hooks/useSodfa";

export function ProductFormDialog({
  open,
  onOpenChange,
  product,
  warehouses,
  defaultWarehouse,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  product: Product | null;
  warehouses: Warehouse[];
  defaultWarehouse?: string;
}) {
  const { t, lang } = useI18n();
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [stock, setStock] = useState("");
  const [warehouse, setWarehouse] = useState("");
  const [image, setImage] = useState("");

  useEffect(() => {
    if (!open) return;
    setName(product?.product_name ?? "");
    setPrice(product ? String(product.price) : "");
    setStock(product ? String(product.stock_qty) : "");
    setWarehouse(product?.warehouse || defaultWarehouse || warehouses[0]?.warehouse_id || "");
    setImage(product?.image_url ?? "");
  }, [open, product, defaultWarehouse, warehouses]);

  const save = useApiMutation(async () => {
    if (product) {
      return api.updateProduct({
        product_id: product.product_id,
        product_name: name.trim(),
        price: Number(price),
        stock_qty: Number(stock),
        warehouse,
        image_url: image,
      });
    }
    return api.saveProduct({
      product_name: name.trim(),
      price: Number(price),
      stock_qty: Number(stock),
      warehouse,
      image_url: image,
    });
  });

  const submit = () => {
    if (!name.trim() || price === "" || stock === "" || !warehouse) {
      toast.error(t("err_required"));
      return;
    }
    if (Number(price) < 0 || Number(stock) < 0) {
      toast.error(t("invalid_qty"));
      return;
    }
    save.mutate(undefined as never, {
      onSuccess: (res) => {
        const created = res as { product_id?: string; barcode?: string } | undefined;
        toast.success(
          created?.product_id
            ? `${t("saved")} — ${created.product_id}`
            : t("saved"),
        );
        onOpenChange(false);
      },
      onError: (e) => toast.error(errorMessage(e, lang)),
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{product ? t("edit") : t("add_product")}</DialogTitle>
          <DialogDescription>
            {product
              ? `${t("product_id")}: ${product.product_id} • ${t("barcode")}: ${product.barcode}`
              : `${t("product_id")} + ${t("barcode")} — auto`}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label htmlFor="p-name">{t("product_name")}</Label>
            <Input id="p-name" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="p-price">{t("price")}</Label>
              <Input
                id="p-price"
                type="number"
                min="0"
                step="0.01"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="p-stock">{t("stock_qty")}</Label>
              <Input
                id="p-stock"
                type="number"
                min="0"
                value={stock}
                onChange={(e) => setStock(e.target.value)}
              />
            </div>
          </div>
          <div>
            <Label className="mb-1 block">{t("warehouse")}</Label>
            <WarehouseSelect value={warehouse} onChange={setWarehouse} warehouses={warehouses} />
          </div>
          <ImageDropzone label={t("product_image")} value={image} onChange={setImage} />

          {product && (
            <div className="grid grid-cols-3 gap-2 rounded-lg bg-surface p-3 text-center text-sm">
              <div>
                <p className="text-xs text-muted-foreground">{t("total_stock")}</p>
                <p className="font-bold">{product.stock_qty}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">{t("sold")}</p>
                <p className="font-bold">{product.sold_qty}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">{t("remaining")}</p>
                <p className="font-bold">{product.remaining_qty}</p>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={save.isPending}>
            {t("cancel")}
          </Button>
          <Button onClick={submit} disabled={save.isPending}>
            {save.isPending ? t("saving") : t("save")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}