import { useState } from "react";
import JsBarcode from "jsbarcode";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { BarcodeView } from "@/components/BarcodeView";
import { useI18n } from "@/lib/i18n";
import { fmtMoney } from "@/lib/dates";
import type { Product } from "@/lib/api";

const QTY_OPTIONS = [1, 2, 5, 10, 20, 50];

function barcodeDataUrl(value: string): string {
  const canvas = document.createElement("canvas");
  try {
    JsBarcode(canvas, String(value), {
      format: "CODE128",
      height: 60,
      width: 2,
      fontSize: 14,
      margin: 6,
      displayValue: true,
    });
    return canvas.toDataURL("image/png");
  } catch {
    return "";
  }
}

export function PrintBarcodeDialog({
  product,
  open,
  onOpenChange,
}: {
  product: Product | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const { t, lang } = useI18n();
  const [count, setCount] = useState(1);

  if (!product) return null;

  const handlePrint = () => {
    const img = barcodeDataUrl(product.barcode || product.product_id);
    const win = window.open("", "_blank", "width=900,height=700");
    if (!win) {
      toast.error(t("err_print"));
      return;
    }
    const label = `
      <div class="label">
        <div class="brand"><span>SODFA</span><span>صدفة</span></div>
        <div class="name">${escapeHtml(product.product_name)}</div>
        <div class="price">${escapeHtml(fmtMoney(product.price, lang))}</div>
        ${img ? `<img src="${img}" alt="barcode" />` : `<div>${escapeHtml(product.barcode)}</div>`}
        <div class="pid">${escapeHtml(product.product_id)}</div>
      </div>`;
    win.document.write(`<!doctype html><html><head><meta charset="utf-8" />
      <title>SODFA — ${escapeHtml(product.product_id)}</title>
      <style>
        @page { margin: 8mm; }
        body { font-family: system-ui, "Segoe UI", Tahoma, sans-serif; margin:0; padding:8px;
               display:flex; flex-wrap:wrap; gap:6px; }
        .label { width: 58mm; border:1px solid #d5dae3; border-radius:6px; padding:6px;
                 text-align:center; break-inside:avoid; }
        .brand { display:flex; justify-content:space-between; font-weight:700; font-size:11px;
                 color:#1e2a4a; letter-spacing:.5px; }
        .name { font-size:12px; margin:3px 0; font-weight:600; color:#111827;
                overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
        .price { font-size:13px; font-weight:700; color:#1e2a4a; }
        img { width:100%; height:auto; }
        .pid { font-size:10px; color:#4b5563; }
      </style></head><body>${label.repeat(count)}
      <script>window.onload=function(){window.focus();window.print();}<\/script>
      </body></html>`);
    win.document.close();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{t("print_barcode")}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="rounded-lg border border-border bg-card p-4 text-center">
            <div className="flex justify-between text-xs font-bold text-primary">
              <span>SODFA</span>
              <span>صدفة</span>
            </div>
            <p className="mt-1 truncate text-sm font-semibold">{product.product_name}</p>
            <p className="text-sm font-bold text-primary">{fmtMoney(product.price, lang)}</p>
            <div className="flex justify-center">
              <BarcodeView value={product.barcode || product.product_id} />
            </div>
            <p className="text-xs text-muted-foreground">{product.product_id}</p>
          </div>
          <div>
            <Label className="mb-2 block">{t("labels_qty")}</Label>
            <div className="flex flex-wrap gap-2">
              {QTY_OPTIONS.map((q) => (
                <Button
                  key={q}
                  type="button"
                  size="sm"
                  variant={count === q ? "default" : "outline"}
                  onClick={() => setCount(q)}
                >
                  {q}
                </Button>
              ))}
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t("cancel")}
          </Button>
          <Button onClick={handlePrint}>{t("print")}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function escapeHtml(str: string): string {
  return String(str ?? "").replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c] as string,
  );
}