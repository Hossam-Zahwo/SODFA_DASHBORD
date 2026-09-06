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

type VariantItem = {
  id?: string;
  name?: string;
  value?: string;
  color?: string;
  model?: string;
  size?: string;
  quantity?: number | string;
  stock_qty?: number | string;
  remaining_qty?: number | string;
  is_primary?: boolean;
  is_default?: boolean;
  primary?: boolean;
};

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

  /*
   * ============================================================
   * PRODUCT DATA
   * ============================================================
   */

  const productData = product as Product &
    Record<string, unknown>;

  /*
   * ============================================================
   * BASIC VARIANT DETAILS
   * ============================================================
   */

  const color =
    productData.color ??
    productData.product_color ??
    productData.variant_color ??
    null;

  const model =
    productData.model ??
    productData.product_model ??
    productData.variant_model ??
    null;

  const size =
    productData.size ??
    productData.product_size ??
    productData.variant_size ??
    null;

  const quantity =
    productData.quantity ??
    productData.qty ??
    productData.variant_quantity ??
    productData.variant_qty ??
    null;

  /*
   * ============================================================
   * VARIANT BASE
   * ============================================================
   */

  const variantBase =
    productData.variant_base ??
    productData.variantBase ??
    productData.primary_variant ??
    productData.primaryVariant ??
    productData.variant_type ??
    null;

  /*
   * ============================================================
   * PRIMARY VARIANT VALUE
   * ============================================================
   */

  const primaryVariantValue =
    productData.primary_variant_value ??
    productData.primaryVariantValue ??
    productData.variant_value ??
    productData.selected_variant ??
    null;

  /*
   * ============================================================
   * VARIANTS LIST
   * ============================================================
   */

  const rawVariants =
    productData.variants ??
    productData.product_variants ??
    productData.variant_items ??
    [];

  const variants: VariantItem[] = Array.isArray(rawVariants)
    ? (rawVariants as VariantItem[])
    : [];

  /*
   * ============================================================
   * TRANSLATE VARIANT BASE
   * ============================================================
   */

  const variantBaseLabel = (() => {
    if (!variantBase) return null;

    const value = String(
      variantBase
    ).toLowerCase();

    if (
      value === "color" ||
      value === "colour"
    ) {
      return "اللون";
    }

    if (value === "model") {
      return "الموديل";
    }

    if (value === "size") {
      return "الحجم";
    }

    if (
      value === "quantity" ||
      value === "qty"
    ) {
      return "العدد";
    }

    return String(variantBase);
  })();

  /*
   * ============================================================
   * BASIC PRODUCT DETAILS
   * ============================================================
   */

  const rows: [string, string][] = [
    [
      t("product_id"),
      product.product_id,
    ],
    [
      t("barcode"),
      product.barcode ||
        product.product_id,
    ],
    [
      t("price"),
      fmtMoney(product.price, lang),
    ],
    [
      "سعر البيع",
      product.selling_price !== null &&
      product.selling_price !== undefined
        ? fmtMoney(
            product.selling_price,
            lang
          )
        : "غير محدد",
    ],
    [
      t("warehouse"),
      warehouseName(
        warehouses,
        product.warehouse
      ),
    ],
    [
      t("total_stock"),
      String(product.stock_qty),
    ],
    [
      t("sold"),
      String(product.sold_qty),
    ],
    [
      t("remaining"),
      String(product.remaining_qty),
    ],
  ];

  /*
   * ============================================================
   * PRODUCT OPTIONS
   * ============================================================
   */

  const productOptions = [
    {
      label: "اللون",
      value: color,
    },
    {
      label: "الموديل",
      value: model,
    },
    {
      label: "الحجم",
      value: size,
    },
    {
      label: "العدد",
      value: quantity,
    },
  ].filter(
    (item) =>
      item.value !== null &&
      item.value !== undefined &&
      String(item.value).trim() !== ""
  );

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
    >
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {product.product_name}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5">

          {/* PRODUCT IMAGE */}

          <ProductImage
            url={product.image_url}
            alt={product.product_name}
            className="h-72 w-full border border-border"
          />

          {/* BASIC DETAILS */}

          <dl className="grid gap-2 sm:grid-cols-2">
            {rows.map(([k, v]) => (
              <div
                key={k}
                className="flex justify-between rounded-lg bg-surface px-3 py-2 text-sm"
              >
                <dt className="text-muted-foreground">
                  {k}
                </dt>

                <dd className="font-semibold">
                  {v}
                </dd>
              </div>
            ))}
          </dl>

          {/* PRODUCT OPTIONS */}

          {productOptions.length > 0 && (
            <div className="space-y-3 rounded-xl border border-border bg-card p-4">
              <div>
                <h3 className="text-base font-bold">
                  تفاصيل المنتج
                </h3>

                <p className="mt-1 text-xs text-muted-foreground">
                  الخصائص والاختيارات المحددة لهذا المنتج.
                </p>
              </div>

              <div className="grid gap-2 sm:grid-cols-2">
                {productOptions.map(
                  (item) => (
                    <div
                      key={item.label}
                      className="flex items-center justify-between rounded-lg bg-surface px-3 py-2 text-sm"
                    >
                      <span className="text-muted-foreground">
                        {item.label}
                      </span>

                      <span className="font-semibold">
                        {String(item.value)}
                      </span>
                    </div>
                  )
                )}
              </div>
            </div>
          )}

          {/* VARIANT BASE */}

          {(variantBaseLabel ||
            primaryVariantValue) && (
            <div className="space-y-3 rounded-xl border border-border bg-card p-4">
              <div>
                <h3 className="text-base font-bold">
                  أساس التفريعة
                </h3>

                <p className="mt-1 text-xs text-muted-foreground">
                  الخاصية الرئيسية التي تعتمد عليها تفريعات المنتج.
                </p>
              </div>

              <div className="grid gap-2 sm:grid-cols-2">

                {variantBaseLabel && (
                  <div className="rounded-lg bg-surface px-3 py-2">
                    <p className="text-xs text-muted-foreground">
                      أساس التفريعة
                    </p>

                    <p className="mt-1 font-semibold">
                      {variantBaseLabel}
                    </p>
                  </div>
                )}

                {primaryVariantValue !== null &&
                  primaryVariantValue !== undefined && (
                    <div className="rounded-lg bg-surface px-3 py-2">
                      <p className="text-xs text-muted-foreground">
                        القيمة الأساسية
                      </p>

                      <p className="mt-1 font-semibold">
                        {String(
                          primaryVariantValue
                        )}
                      </p>
                    </div>
                  )}

              </div>
            </div>
          )}

          {/* VARIANTS */}

          {variants.length > 0 && (
            <div className="space-y-3 rounded-xl border border-border bg-card p-4">
              <div>
                <h3 className="text-base font-bold">
                  تفريعات المنتج
                </h3>

                <p className="mt-1 text-xs text-muted-foreground">
                  جميع التفريعات والاختيارات المرتبطة بهذا المنتج.
                </p>
              </div>

              <div className="space-y-2">
                {variants.map(
                  (variant, index) => {
                    const isPrimary =
                      variant.is_primary === true ||
                      variant.is_default === true ||
                      variant.primary === true;

                    return (
                      <div
                        key={
                          variant.id ??
                          `${index}-${variant.name ?? "variant"}`
                        }
                        className="rounded-xl border border-border bg-surface p-3"
                      >
                        <div className="flex flex-wrap items-start justify-between gap-3">

                          <div className="space-y-1">

                            <p className="font-semibold">
                              {variant.name ??
                                `تفريعة ${index + 1}`}
                            </p>

                            {variant.value && (
                              <p className="text-sm text-muted-foreground">
                                القيمة:{" "}
                                {variant.value}
                              </p>
                            )}

                            {variant.color && (
                              <p className="text-sm text-muted-foreground">
                                اللون:{" "}
                                {variant.color}
                              </p>
                            )}

                            {variant.model && (
                              <p className="text-sm text-muted-foreground">
                                الموديل:{" "}
                                {variant.model}
                              </p>
                            )}

                            {variant.size && (
                              <p className="text-sm text-muted-foreground">
                                الحجم:{" "}
                                {variant.size}
                              </p>
                            )}

                            {(variant.quantity !==
                              undefined ||
                              variant.stock_qty !==
                                undefined ||
                              variant.remaining_qty !==
                                undefined) && (
                              <div className="flex flex-wrap gap-3 pt-1 text-sm">

                                {variant.quantity !==
                                  undefined && (
                                    <span>
                                      العدد:{" "}
                                      <strong>
                                        {variant.quantity}
                                      </strong>
                                    </span>
                                  )}

                                {variant.stock_qty !==
                                  undefined && (
                                    <span>
                                      المخزون:{" "}
                                      <strong>
                                        {variant.stock_qty}
                                      </strong>
                                    </span>
                                  )}

                                {variant.remaining_qty !==
                                  undefined && (
                                    <span>
                                      المتبقي:{" "}
                                      <strong>
                                        {variant.remaining_qty}
                                      </strong>
                                    </span>
                                  )}

                              </div>
                            )}

                          </div>

                          {isPrimary && (
                            <span className="rounded-full bg-primary px-3 py-1 text-xs font-semibold text-primary-foreground">
                              التفريعة الأساسية
                            </span>
                          )}

                        </div>
                      </div>
                    );
                  }
                )}
              </div>
            </div>
          )}

          {/* BARCODE */}

          <div className="flex justify-center rounded-lg border border-border bg-card p-4">
            <BarcodeView
              value={
                product.barcode ||
                product.product_id
              }
            />
          </div>

        </div>
      </DialogContent>
    </Dialog>
  );
}