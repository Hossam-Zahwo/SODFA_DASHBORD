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
import { Plus } from "lucide-react";
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
  const [sellingPrice, setSellingPrice] = useState("");
  const [stock, setStock] = useState("");
  const [soldQty, setSoldQty] = useState("0");
  const [warehouse, setWarehouse] = useState("");
  const [image, setImage] = useState("");
  const [newWh, setNewWh] = useState("");
  const [showNewWh, setShowNewWh] = useState(false);

  useEffect(() => {
    if (!open) return;
    setName(product?.product_name ?? "");
    setPrice(product ? String(product.price ?? "") : "");
    setSellingPrice(
      product?.selling_price !== undefined && product?.selling_price !== null
        ? String(product.selling_price)
        : "",
    );
    setStock(product ? String(product.stock_qty ?? "") : "");
    setSoldQty(product ? String(product.sold_qty ?? "0") : "0");
    setWarehouse(
      product?.warehouse || defaultWarehouse || warehouses[0]?.warehouse_id || "",
    );
    setImage(product?.image_url ?? "");
    setNewWh("");
    setShowNewWh(false);
  }, [open, product, defaultWarehouse, warehouses]);

  const stockNum = Number(stock || 0);
  const soldNum = Number(soldQty || 0);
  const sellingPriceNum = sellingPrice.trim() === "" ? null : Number(sellingPrice);
  const remaining = stockNum - soldNum;

  const addWarehouse = useApiMutation((n: string) => api.saveWarehouse(n));

  const save = useApiMutation(async () => {
    const data = {
      product_name: name.trim(),
      price: Number(price),
      selling_price: sellingPriceNum,
      stock_qty: stockNum,
      sold_qty: soldNum,
      warehouse,
      image_url: image,
    };

    if (product) {
      return api.updateProduct({
        product_id: product.product_id,
        ...data,
      });
    }
    return api.saveProduct(data);
  });

  const submit = () => {
    if (!name.trim() || price === "" || stock === "" || !warehouse) {
      toast.error(t("err_required"));
      return;
    }
    if (!Number.isFinite(Number(price)) || Number(price) < 0 || stockNum < 0 || soldNum < 0 || soldNum > stockNum) {
      toast.error(t("invalid_qty"));
      return;
    }
    if (sellingPrice !== "" && (!Number.isFinite(sellingPriceNum as number) || (sellingPriceNum as number) < 0)) {
      toast.error("سعر البيع غير صحيح");
      return;
    }

    save.mutate(undefined as never, {
      onSuccess: (res) => {
        const created = res as { product_id?: string } | undefined;
        toast.success(created?.product_id ? `${t("saved")} — ${created.product_id}` : t("saved"));
        onOpenChange(false);
      },
      onError: (e) => toast.error(errorMessage(e, lang)),
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent dir="rtl" className="max-h-[92vh] w-[calc(100%-1rem)] max-w-lg overflow-y-auto p-4 sm:p-6">
        <DialogHeader className="text-right">
          <DialogTitle>{product ? t("edit") : t("add_product")}</DialogTitle>
          <DialogDescription>
            {product
              ? `${t("product_id")}: ${product.product_id} • ${t("barcode")}: ${product.barcode}`
              : `${t("product_id")} + ${t("barcode")} — auto`}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="p-name">{t("product_name")}</Label>
            <Input id="p-name" value={name} onChange={(e) => setName(e.target.value)} className="h-10 sm:h-11" />
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="p-price">السعر العادي</Label>
              <Input id="p-price" type="number" min="0" step="0.01" inputMode="decimal" value={price} onChange={(e) => setPrice(e.target.value)} className="h-10 sm:h-11" placeholder="0.00" />
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between gap-2">
                <Label htmlFor="p-selling-price">سعر البيع</Label>
                <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] text-muted-foreground">اختياري</span>
              </div>
              <Input id="p-selling-price" type="number" min="0" step="0.01" inputMode="decimal" value={sellingPrice} onChange={(e) => setSellingPrice(e.target.value)} className="h-10 sm:h-11" placeholder="اتركه فارغًا" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="p-stock">{t("stock_qty")}</Label>
              <Input id="p-stock" type="number" min="0" inputMode="numeric" value={stock} onChange={(e) => setStock(e.target.value)} className="h-10 sm:h-11" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="p-sold">{t("sold_qty")}</Label>
              <Input id="p-sold" type="number" min="0" inputMode="numeric" value={soldQty} onChange={(e) => setSoldQty(e.target.value)} className="h-10 sm:h-11" />
            </div>
            <div className="col-span-2 space-y-1.5">
              <Label>{t("remaining")}</Label>
              <div className="flex h-10 items-center rounded-md bg-surface px-3 text-sm font-bold sm:h-11">{Number.isFinite(remaining) ? remaining : 0}</div>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="block">{t("warehouse")}</Label>
            <WarehouseSelect value={warehouse} onChange={setWarehouse} warehouses={warehouses} />

            {showNewWh ? (
              <div className="mt-2 flex flex-col gap-2 sm:flex-row">
                <Input value={newWh} onChange={(e) => setNewWh(e.target.value)} placeholder={t("warehouse_name")} className="flex-1" />
                <div className="flex gap-2">
                  <Button
                    type="button"
                    disabled={addWarehouse.isPending}
                    onClick={() => {
                      const n = newWh.trim();
                      if (!n) return toast.error(t("err_required"));
                      addWarehouse.mutate(n, {
                        onSuccess: (res) => {
                          const id = (res as { warehouse_id?: string } | undefined)?.warehouse_id;
                          if (id) setWarehouse(id);
                          setNewWh("");
                          setShowNewWh(false);
                          toast.success(t("saved"));
                        },
                        onError: (e) => toast.error(errorMessage(e, lang)),
                      });
                    }}
                  >{addWarehouse.isPending ? t("saving") : t("save")}</Button>
                  <Button type="button" variant="outline" onClick={() => setShowNewWh(false)}>{t("cancel")}</Button>
                </div>
              </div>
            ) : (
              <Button type="button" size="sm" variant="outline" className="mt-1 w-full sm:w-auto" onClick={() => setShowNewWh(true)}>
                <Plus className="me-1 h-4 w-4" />
                {t("add_warehouse")}
              </Button>
            )}
          </div>

          <ImageDropzone label={t("product_image")} value={image} onChange={setImage} />
        </div>

        <DialogFooter className="flex flex-col-reverse gap-2 sm:flex-row">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={save.isPending} className="w-full sm:w-auto">{t("cancel")}</Button>
          <Button onClick={submit} disabled={save.isPending} className="w-full sm:w-auto">{save.isPending ? t("saving") : t("save")}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
