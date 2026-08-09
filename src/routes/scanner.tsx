import { useCallback, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { CameraScanner } from "@/components/CameraScanner";
import { ProductImage } from "@/components/ProductImage";
import { BarcodeView } from "@/components/BarcodeView";
import { useInventory } from "@/hooks/useSodfa";
import { useUsbScanner } from "@/hooks/useUsbScanner";
import { useI18n } from "@/lib/i18n";
import { fmtMoney } from "@/lib/dates";
import type { Product } from "@/lib/api";

export const Route = createFileRoute("/scanner")({
  head: () => ({
    meta: [
      { title: "Scanner — SODFA صدفة" },
      { name: "description", content: "Look up SODFA products with a USB scanner or phone camera." },
      { property: "og:title", content: "Scanner — SODFA صدفة" },
      { property: "og:description", content: "USB and camera barcode lookup." },
    ],
  }),
  component: ScannerPage,
});

function ScannerPage() {
  const { t, lang } = useI18n();
  const inventory = useInventory();
  const [found, setFound] = useState<Product | null>(null);
  const [miss, setMiss] = useState("");
  const [camera, setCamera] = useState(false);

  const lookup = useCallback(
    (code: string) => {
      const clean = code.trim().toLowerCase();
      const p = (inventory.data ?? []).find(
        (x) => x.barcode.toLowerCase() === clean || x.product_id.toLowerCase() === clean,
      );
      setFound(p ?? null);
      setMiss(p ? "" : code);
    },
    [inventory.data],
  );

  useUsbScanner(lookup);

  return (
    <AppShell title={t("scanner")}>
      <div className="grid gap-5 lg:grid-cols-2">
        <Card className="space-y-3 p-4">
          <p className="text-sm text-muted-foreground">{t("usb_hint")}</p>
          <Input
            data-scanner-input="true"
            autoFocus
            placeholder={t("search_placeholder")}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                lookup(e.currentTarget.value);
                e.currentTarget.value = "";
              }
            }}
          />
          <Button variant="outline" onClick={() => setCamera((v) => !v)}>
            {camera ? t("close_camera") : t("open_camera")}
          </Button>
          {camera && <CameraScanner onDetected={lookup} />}
        </Card>

        <Card className="space-y-3 p-4">
          {found ? (
            <>
              <ProductImage
                url={found.image_url}
                alt={found.product_name}
                className="h-56 w-full"
              />
              <h2 className="text-lg font-bold">{found.product_name}</h2>
              <p className="text-sm text-muted-foreground">{found.product_id}</p>
              <p className="text-lg font-bold text-primary">{fmtMoney(found.price, lang)}</p>
              <p className="text-sm">
                {t("remaining")}: {found.remaining_qty} • {t("sold")}: {found.sold_qty}
              </p>
              <BarcodeView value={found.barcode || found.product_id} />
            </>
          ) : (
            <p className="py-10 text-center text-sm text-muted-foreground">
              {miss ? `${t("not_found_barcode")} (${miss})` : t("usb_hint")}
            </p>
          )}
        </Card>
      </div>
    </AppShell>
  );
}