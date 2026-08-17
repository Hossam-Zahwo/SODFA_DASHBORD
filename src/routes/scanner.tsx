import { useCallback, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import {
  Camera,
  ScanBarcode,
  Search,
  Package,
  CircleCheck,
} from "lucide-react";

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
      {
        title: "Scanner — SODFA صدفة",
      },
      {
        name: "description",
        content:
          "Look up SODFA products with a USB scanner or phone camera.",
      },
      {
        property: "og:title",
        content: "Scanner — SODFA صدفة",
      },
      {
        property: "og:description",
        content: "USB and camera barcode lookup.",
      },
    ],
  }),

  component: ScannerPage,
});

function ScannerPage() {
  const { t, lang } = useI18n();

  const inventory = useInventory();

  const [found, setFound] =
    useState<Product | null>(null);

  const [miss, setMiss] =
    useState("");

  const [camera, setCamera] =
    useState(false);

  const lookup = useCallback(
    (code: string) => {
      const clean =
        code.trim().toLowerCase();

      const p = (
        inventory.data ?? []
      ).find(
        (x) =>
          x.barcode
            .toLowerCase() === clean ||
          x.product_id
            .toLowerCase() === clean,
      );

      setFound(p ?? null);
      setMiss(p ? "" : code);
    },
    [inventory.data],
  );

  useUsbScanner(lookup);

  return (
    <AppShell title={t("scanner")}>

      <div className="space-y-6">

        {/* =====================================================
            HEADER
        ====================================================== */}

        <Card
          className="
            relative
            overflow-hidden
            border-0
            bg-gradient-to-r
            from-[#7B2C8E]
            via-[#9B4BA8]
            to-[#C084CC]
            p-0
            shadow-lg
          "
        >

          <div className="absolute inset-0 bg-white/5" />

          <div className="relative p-6">

            <div className="flex items-center gap-4">

              <div
                className="
                  flex
                  h-12
                  w-12
                  shrink-0
                  items-center
                  justify-center
                  rounded-2xl
                  bg-white/20
                  backdrop-blur-sm
                  ring-1
                  ring-white/30
                "
              >
                <ScanBarcode
                  className="h-6 w-6 text-white"
                />
              </div>

              <div>

                <h1
                  className="
                    text-xl
                    font-bold
                    text-white
                  "
                >
                  {t("scanner")}
                </h1>

                <p
                  className="
                    mt-1
                    text-sm
                    text-white/80
                  "
                >
                  البحث عن المنتجات باستخدام
                  الباركود أو كاميرا الهاتف
                </p>

              </div>

            </div>

          </div>
        </Card>

        {/* =====================================================
            MAIN CONTENT
        ====================================================== */}

        <div
          className="
            grid
            gap-5
            lg:grid-cols-[0.9fr_1.1fr]
          "
        >

          {/* ===================================================
              SCANNER CARD
          ==================================================== */}

          <Card
            className="
              relative
              overflow-hidden
              border
              border-[#C084CC]/40
              bg-gradient-to-br
              from-white
              via-white
              to-[#F8ECFA]
              p-0
              shadow-sm
              transition-all
              duration-300
              hover:border-[#9B4BA8]/60
              hover:shadow-lg
              hover:shadow-[#9B4BA8]/10
            "
          >

            {/* Top gradient */}

            <div
              className="
                h-1
                w-full
                bg-gradient-to-r
                from-[#7B2C8E]
                via-[#9B4BA8]
                to-[#C084CC]
              "
            />

            <div className="space-y-5 p-5">

              {/* Scanner Header */}

              <div className="flex items-center gap-3">

                <div
                  className="
                    flex
                    h-10
                    w-10
                    items-center
                    justify-center
                    rounded-xl
                    bg-[#9B4BA8]/10
                    ring-1
                    ring-[#C084CC]/30
                  "
                >
                  <Search
                    className="
                      h-5
                      w-5
                      text-[#9B4BA8]
                    "
                  />
                </div>

                <div>

                  <h2
                    className="
                      font-bold
                      text-gray-900
                    "
                  >
                    البحث عن منتج
                  </h2>

                  <p
                    className="
                      text-xs
                      text-gray-500
                    "
                  >
                    {t("usb_hint")}
                  </p>

                </div>

              </div>

              {/* Input */}

              <div className="space-y-2">

                <label
                  className="
                    text-sm
                    font-semibold
                    text-gray-800
                  "
                >
                  الباركود أو كود المنتج
                </label>

                <div className="relative">

                  <ScanBarcode
                    className="
                      pointer-events-none
                      absolute
                      start-3
                      top-1/2
                      h-5
                      w-5
                      -translate-y-1/2
                      text-[#9B4BA8]
                    "
                  />

                  <Input
                    data-scanner-input="true"
                    autoFocus
                    placeholder={t(
                      "search_placeholder",
                    )}
                    onKeyDown={(e) => {
                      if (
                        e.key === "Enter"
                      ) {
                        lookup(
                          e.currentTarget.value,
                        );

                        e.currentTarget.value =
                          "";
                      }
                    }}
                    className="
                      h-12
                      border
                      border-[#C084CC]/50
                      bg-white
                      ps-10
                      text-gray-900
                      shadow-sm
                      placeholder:text-gray-400
                      transition-all
                      focus:border-[#9B4BA8]
                      focus:ring-2
                      focus:ring-[#9B4BA8]/20
                    "
                  />

                </div>

              </div>

              {/* Scanner Info */}

              <div
                className="
                  rounded-xl
                  border
                  border-[#C084CC]/30
                  bg-[#F8ECFA]
                  p-4
                "
              >

                <div className="flex gap-3">

                  <div
                    className="
                      flex
                      h-9
                      w-9
                      shrink-0
                      items-center
                      justify-center
                      rounded-lg
                      bg-white
                      shadow-sm
                      ring-1
                      ring-[#C084CC]/30
                    "
                  >
                    <ScanBarcode
                      className="
                        h-4
                        w-4
                        text-[#7B2C8E]
                      "
                    />
                  </div>

                  <div>

                    <p
                      className="
                        text-sm
                        font-semibold
                        text-[#7B2C8E]
                      "
                    >
                      USB Scanner
                    </p>

                    <p
                      className="
                        mt-1
                        text-xs
                        leading-5
                        text-gray-600
                      "
                    >
                      {t("usb_hint")}
                    </p>

                  </div>

                </div>

              </div>

              {/* Camera Button */}

              <Button
                onClick={() =>
                  setCamera(
                    (v) => !v,
                  )
                }
                className="
                  h-11
                  w-full
                  border
                  border-[#9B4BA8]
                  bg-gradient-to-r
                  from-[#7B2C8E]
                  to-[#9B4BA8]
                  font-semibold
                  text-white
                  shadow-sm
                  transition-all
                  hover:from-[#9B4BA8]
                  hover:to-[#C084CC]
                  hover:shadow-md
                  hover:shadow-[#9B4BA8]/20
                "
              >

                <Camera
                  className="
                    me-2
                    h-4
                    w-4
                  "
                />

                {camera
                  ? t("close_camera")
                  : t("open_camera")}

              </Button>

              {/* Camera */}

              {camera && (
                <div
                  className="
                    overflow-hidden
                    rounded-2xl
                    border
                    border-[#C084CC]/50
                    bg-white
                    p-2
                    shadow-sm
                  "
                >
                  <CameraScanner
                    onDetected={lookup}
                  />
                </div>
              )}

            </div>
          </Card>

          {/* ===================================================
              RESULT CARD
          ==================================================== */}

          <Card
            className="
              relative
              overflow-hidden
              border
              border-[#C084CC]/40
              bg-gradient-to-br
              from-white
              via-white
              to-[#F8ECFA]
              p-0
              shadow-sm
              transition-all
              duration-300
              hover:border-[#9B4BA8]/60
              hover:shadow-lg
              hover:shadow-[#9B4BA8]/10
            "
          >

            {/* Top gradient */}

            <div
              className="
                h-1
                w-full
                bg-gradient-to-r
                from-[#7B2C8E]
                via-[#9B4BA8]
                to-[#C084CC]
              "
            />

            {found ? (
              <div className="space-y-5 p-5">

                {/* Result Header */}

                <div
                  className="
                    flex
                    items-center
                    justify-between
                    gap-3
                  "
                >

                  <div className="flex items-center gap-3">

                    <div
                      className="
                        flex
                        h-10
                        w-10
                        items-center
                        justify-center
                        rounded-xl
                        bg-green-500/10
                        ring-1
                        ring-green-500/20
                      "
                    >
                      <CircleCheck
                        className="
                          h-5
                          w-5
                          text-green-600
                        "
                      />
                    </div>

                    <div>

                      <p
                        className="
                          font-bold
                          text-gray-900
                        "
                      >
                        تم العثور على المنتج
                      </p>

                      <p
                        className="
                          text-xs
                          text-gray-500
                        "
                      >
                        Product Found
                      </p>

                    </div>

                  </div>

                  <span
                    className="
                      rounded-full
                      bg-[#9B4BA8]/10
                      px-3
                      py-1
                      text-xs
                      font-semibold
                      text-[#7B2C8E]
                      ring-1
                      ring-[#C084CC]/30
                    "
                  >
                    SODFA
                  </span>

                </div>

                {/* Product Image */}

                <div
                  className="
                    overflow-hidden
                    rounded-2xl
                    border
                    border-[#C084CC]/40
                    bg-[#F8ECFA]
                    p-2
                  "
                >

                  <ProductImage
                    url={found.image_url}
                    alt={
                      found.product_name
                    }
                    className="
                      h-64
                      w-full
                      rounded-xl
                    "
                  />

                </div>

                {/* Product Information */}

                <div className="space-y-4">

                  <div>

                    <p
                      className="
                        text-lg
                        font-bold
                        text-gray-900
                      "
                    >
                      {found.product_name}
                    </p>

                    <p
                      className="
                        mt-1
                        text-sm
                        text-gray-500
                      "
                    >
                      {found.product_id}
                    </p>

                  </div>

                  {/* Price */}

                  <div
                    className="
                      rounded-xl
                      border
                      border-[#C084CC]/30
                      bg-gradient-to-r
                      from-[#F8ECFA]
                      to-white
                      p-4
                    "
                  >

                    <p
                      className="
                        text-xs
                        font-medium
                        text-gray-500
                      "
                    >
                      السعر
                    </p>

                    <p
                      className="
                        mt-1
                        text-2xl
                        font-bold
                        text-[#7B2C8E]
                      "
                    >
                      {fmtMoney(
                        found.price,
                        lang,
                      )}
                    </p>

                  </div>

                  {/* Stock Stats */}

                  <div
                    className="
                      grid
                      grid-cols-2
                      gap-3
                    "
                  >

                    <div
                      className="
                        rounded-xl
                        border
                        border-[#C084CC]/30
                        bg-white
                        p-4
                        shadow-sm
                      "
                    >

                      <p
                        className="
                          text-xs
                          text-gray-500
                        "
                      >
                        {t("remaining")}
                      </p>

                      <p
                        className="
                          mt-1
                          text-xl
                          font-bold
                          text-[#9B4BA8]
                        "
                      >
                        {found.remaining_qty}
                      </p>

                    </div>

                    <div
                      className="
                        rounded-xl
                        border
                        border-[#C084CC]/30
                        bg-white
                        p-4
                        shadow-sm
                      "
                    >

                      <p
                        className="
                          text-xs
                          text-gray-500
                        "
                      >
                        {t("sold")}
                      </p>

                      <p
                        className="
                          mt-1
                          text-xl
                          font-bold
                          text-[#7B2C8E]
                        "
                      >
                        {found.sold_qty}
                      </p>

                    </div>

                  </div>

                  {/* Barcode */}

                  <div
                    className="
                      rounded-2xl
                      border
                      border-[#C084CC]/40
                      bg-white
                      p-4
                      shadow-sm
                    "
                  >

                    <div className="mb-3 flex items-center gap-2">

                      <Package
                        className="
                          h-4
                          w-4
                          text-[#9B4BA8]
                        "
                      />

                      <p
                        className="
                          text-sm
                          font-semibold
                          text-gray-800
                        "
                      >
                        Barcode
                      </p>

                    </div>

                    <div
                      className="
                        flex
                        justify-center
                        overflow-hidden
                        rounded-xl
                        bg-white
                        p-3
                      "
                    >
                      <BarcodeView
                        value={
                          found.barcode ||
                          found.product_id
                        }
                      />
                    </div>

                  </div>

                </div>

              </div>
            ) : (
              /* =================================================
                 EMPTY / NOT FOUND
              ================================================== */

              <div
                className="
                  flex
                  min-h-[520px]
                  flex-col
                  items-center
                  justify-center
                  p-8
                  text-center
                "
              >

                <div
                  className="
                    flex
                    h-20
                    w-20
                    items-center
                    justify-center
                    rounded-3xl
                    bg-gradient-to-br
                    from-[#7B2C8E]/10
                    to-[#C084CC]/20
                    ring-1
                    ring-[#C084CC]/40
                  "
                >
                  <ScanBarcode
                    className="
                      h-9
                      w-9
                      text-[#9B4BA8]
                    "
                  />
                </div>

                <h2
                  className="
                    mt-5
                    text-lg
                    font-bold
                    text-gray-900
                  "
                >
                  {miss
                    ? t("not_found_barcode")
                    : "جاهز لفحص المنتج"}
                </h2>

                <p
                  className="
                    mt-2
                    max-w-sm
                    text-sm
                    leading-6
                    text-gray-500
                  "
                >
                  {miss
                    ? `${t(
                        "not_found_barcode",
                      )} (${miss})`
                    : t("usb_hint")}
                </p>

                {!miss && (
                  <div
                    className="
                      mt-6
                      rounded-xl
                      border
                      border-[#C084CC]/30
                      bg-[#F8ECFA]
                      px-5
                      py-3
                    "
                  >
                    <p
                      className="
                        text-xs
                        font-medium
                        text-[#7B2C8E]
                      "
                    >
                      استخدم قارئ الباركود أو
                      افتح الكاميرا للبدء
                    </p>
                  </div>
                )}

              </div>
            )}

          </Card>

        </div>
      </div>
    </AppShell>
  );
}