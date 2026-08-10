import { useEffect, useState } from "react";
import JsBarcode from "jsbarcode";
import { Minus, Plus } from "lucide-react";
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
import { Input } from "@/components/ui/input";
import { BarcodeView } from "@/components/BarcodeView";
import { useI18n } from "@/lib/i18n";
import {
  LABEL_SIZES,
  findLabelSize,
  getLabelSize,
  setLabelSize,
  type LabelSizeKey,
} from "@/lib/labels";
import type { Product } from "@/lib/api";

function barcodeDataUrl(value: string): string {
  const canvas = document.createElement("canvas");
  try {
    JsBarcode(canvas, String(value), {
      format: "CODE128",
      height: 70,
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
  const { t } = useI18n();
  const [count, setCount] = useState(1);
  const [size, setSize] = useState<LabelSizeKey>("50x30");

  useEffect(() => {
    if (open) setSize(getLabelSize());
  }, [open]);

  if (!product) return null;

  const handlePrint = () => {
    const value = product.barcode || product.product_id;
    const img = barcodeDataUrl(value);
    const win = window.open("", "_blank", "width=900,height=700");
    if (!win) {
      toast.error(t("err_print"));
      return;
    }
    const dim = findLabelSize(size);
    // The printable label contains ONLY the barcode — no name, price or branding.
    const label = `<div class="label">${
      img ? `<img src="${img}" alt="barcode" />` : `<span>${escapeHtml(value)}</span>`
    }</div>`;
    win.document.write(`<!doctype html><html><head><meta charset="utf-8" />
      <title>${escapeHtml(value)}</title>
      <style>
        @page { size: ${dim.width}mm ${dim.height}mm; margin: 0; }
        body { margin:0; padding:0; font-family: system-ui, sans-serif; }
        .label { width:${dim.width}mm; height:${dim.height}mm; display:flex;
                 align-items:center; justify-content:center; overflow:hidden;
                 page-break-after:always; break-after:page; }
        .label:last-child { page-break-after:auto; break-after:auto; }
        img { max-width:${dim.width - 4}mm; max-height:${dim.height - 3}mm;
              width:auto; height:auto; object-fit:contain; }
      </style></head><body>${label.repeat(Math.max(1, count))}
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
          <div className="flex justify-center rounded-lg border border-border bg-card p-4">
            <BarcodeView value={product.barcode || product.product_id} />
          </div>
          <p className="text-xs text-muted-foreground">{t("barcode_only_note")}</p>

          <div>
            <Label className="mb-2 block">{t("label_size")}</Label>
            <div className="flex flex-wrap gap-2">
              {LABEL_SIZES.map((s) => (
                <Button
                  key={s.key}
                  type="button"
                  size="sm"
                  variant={size === s.key ? "default" : "outline"}
                  onClick={() => {
                    setSize(s.key);
                    setLabelSize(s.key);
                  }}
                >
                  {s.label}
                </Button>
              ))}
            </div>
          </div>

          <div>
            <Label className="mb-2 block">{t("labels_qty")}</Label>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                size="icon"
                variant="outline"
                onClick={() => setCount((c) => Math.max(1, c - 1))}
                aria-label="-"
              >
                <Minus className="h-4 w-4" />
              </Button>
              <Input
                type="number"
                min="1"
                max="500"
                value={count}
                onChange={(e) => setCount(Math.max(1, Math.min(500, Number(e.target.value) || 1)))}
                className="w-24 text-center"
              />
              <Button
                type="button"
                size="icon"
                variant="outline"
                onClick={() => setCount((c) => Math.min(500, c + 1))}
                aria-label="+"
              >
                <Plus className="h-4 w-4" />
              </Button>
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