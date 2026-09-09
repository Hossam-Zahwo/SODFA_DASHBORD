import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import {
  ChevronDown,
  ChevronUp,
  ImagePlus,
  Plus,
  Star,
  Trash2,
  X,
} from "lucide-react";

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

import {
  api,
  type Product,
  type ProductCategory,
  type ProductVariant,
  type Warehouse,
} from "@/lib/api";

import { errorMessage, useI18n } from "@/lib/i18n";
import { useApiMutation } from "@/hooks/useSodfa";

/* =========================================================
   TYPES
========================================================= */

interface ProductAttributes {
  color: string;
  model: string;
  size: string;
  pack_quantity: string;
}

interface ProductSnapshot {
  name_ar: string;
  name_en: string;
  description: string;
  keywords: string[];
  category_name: string;
  attributes: ProductAttributes;
}

interface VariantOverrides {
  name_ar: string;
  name_en: string;
  description: string;
  keywords: string;
  category_name: string;
}

interface VariantDraft {
  variant_id?: string;
  sku?: string;

  base_variant_id?: string;
  base_variant_name?: string;

  variant_name: string;
  kind: string;

  color: string;
  model: string;
  size: string;
  pack_quantity: string;

  price: string;
  selling_price: string;
  purchase_price: string;

  stock_qty: string;

  image_url: string;
  image_urls: string[];
  primary_image_index: number;

  inherited: ProductSnapshot;
  overrides: VariantOverrides;

  isCollapsed?: boolean;
}

/* =========================================================
   HELPERS
========================================================= */

const emptyOverrides = (): VariantOverrides => ({
  name_ar: "",
  name_en: "",
  description: "",
  keywords: "",
  category_name: "",
});

const createProductSnapshot = (
  nameAr: string,
  nameEn: string,
  description: string,
  keywords: string,
  categoryName: string,
  attributes?: Partial<ProductAttributes>,
): ProductSnapshot => ({
  name_ar: nameAr.trim(),
  name_en: nameEn.trim(),
  description: description.trim(),

  keywords: keywords
    .split(/[؛;\n,،]+/)
    .map((item) => item.trim())
    .filter(Boolean),

  category_name: categoryName.trim(),

  attributes: {
    color: attributes?.color?.trim() ?? "",
    model: attributes?.model?.trim() ?? "",
    size: attributes?.size?.trim() ?? "",
    pack_quantity: attributes?.pack_quantity?.trim() ?? "",
  },
});

const generateSKU = (
  variantName: string,
  color: string,
  size: string,
) => {
  const prefix =
    variantName.slice(0, 3).toUpperCase() || "VAR";

  const colorPart = color
    ? `-${color.slice(0, 2).toUpperCase()}`
    : "";

  const sizePart = size
    ? `-${size.toUpperCase()}`
    : "";

  const random = Math.floor(1000 + Math.random() * 9000);

  return `${prefix}${colorPart}${sizePart}-${random}`;
};

const emptyVariant = (
  kind = "model",
  defaults?: {
    price?: string;
    selling_price?: string;
  },
  inherited?: ProductSnapshot,
  base?: {
    variant_id?: string;
    variant_name?: string;
  },
  attributes?: {
    color?: string;
    model?: string;
    size?: string;
    pack_quantity?: string;
  },
): VariantDraft => ({
  base_variant_id: base?.variant_id,
  base_variant_name: base?.variant_name,

  variant_name: "",
  kind,

  color: attributes?.color ?? "",
  model: attributes?.model ?? "",
  size: attributes?.size ?? "",
  pack_quantity: attributes?.pack_quantity ?? "",

  price: defaults?.price ?? "",
  selling_price: defaults?.selling_price ?? "",
  purchase_price: "",

  stock_qty: "0",

  image_url: "",
  image_urls: [],
  primary_image_index: 0,

  inherited:
    inherited ?? {
      name_ar: "",
      name_en: "",
      description: "",
      keywords: [],
      category_name: "",
      attributes: {
        color: "",
        model: "",
        size: "",
        pack_quantity: "",
      },
    },

  overrides: emptyOverrides(),

  isCollapsed: false,
});

/* =========================================================
   API → UI VARIANT
========================================================= */

function variantFromApi(v: ProductVariant): VariantDraft {
  const details = (v.details ?? {}) as Record<string, any>;

  const inheritedFromApi =
    details.inherited_from_product ?? {};

  const attributes =
    details.attributes ??
    details.variant_attributes ??
    {};

  const savedVariantImages = Array.isArray(
    details.image_urls,
  )
    ? details.image_urls
        .filter(Boolean)
        .map(String)
    : Array.isArray(details.images)
      ? details.images
          .filter(Boolean)
          .map(String)
      : v.image_url
        ? [String(v.image_url)]
        : [];

  const rawPrimaryIndex = Number(
    details.primary_image_index ?? 0,
  );

  const primaryVariantImageIndex =
    Number.isInteger(rawPrimaryIndex)
      ? Math.max(
          0,
          Math.min(
            rawPrimaryIndex,
            Math.max(savedVariantImages.length - 1, 0),
          ),
        )
      : 0;

  return {
    variant_id: v.variant_id,

    sku:
      (v as any).sku ??
      details.sku ??
      "",

    base_variant_id: details.base_variant_id
      ? String(details.base_variant_id)
      : undefined,

    base_variant_name: details.base_variant_name
      ? String(details.base_variant_name)
      : undefined,

    variant_name: v.variant_name,

    kind: String(
      details.kind ??
        details.type ??
        "model",
    ),

    color: String(attributes.color ?? ""),
    model: String(attributes.model ?? ""),
    size: String(attributes.size ?? ""),

    pack_quantity: String(
      attributes.pack_quantity ??
        attributes.quantity ??
        "",
    ),

    price: String(
      details.price ??
        (v as any).price ??
        "",
    ),

    selling_price:
      details.selling_price == null
        ? (v as any).selling_price == null
          ? ""
          : String((v as any).selling_price)
        : String(details.selling_price),

    purchase_price: String(
      details.purchase_price ??
        (v as any).purchase_price ??
        "",
    ),

    stock_qty: String(
      details.stock_qty ??
        (v as any).stock_qty ??
        "0",
    ),

    image_url:
      v.image_url ??
      savedVariantImages[
        primaryVariantImageIndex
      ] ??
      savedVariantImages[0] ??
      "",

    image_urls: savedVariantImages,

    primary_image_index:
      primaryVariantImageIndex,

    inherited: {
      name_ar: String(
        inheritedFromApi.name_ar ?? "",
      ),

      name_en: String(
        inheritedFromApi.name_en ?? "",
      ),

      description: String(
        inheritedFromApi.description ?? "",
      ),

      keywords: Array.isArray(
        inheritedFromApi.keywords,
      )
        ? inheritedFromApi.keywords
        : [],

      category_name: String(
        inheritedFromApi.category_name ?? "",
      ),

      attributes: {
        color: String(
          inheritedFromApi.attributes?.color ??
            "",
        ),

        model: String(
          inheritedFromApi.attributes?.model ??
            "",
        ),

        size: String(
          inheritedFromApi.attributes?.size ??
            "",
        ),

        pack_quantity: String(
          inheritedFromApi.attributes
            ?.pack_quantity ?? "",
        ),
      },
    },

    overrides: {
      name_ar: String(
        details.overrides?.name_ar ?? "",
      ),

      name_en: String(
        details.overrides?.name_en ?? "",
      ),

      description: String(
        details.overrides?.description ?? "",
      ),

      keywords: Array.isArray(
        details.overrides?.keywords,
      )
        ? details.overrides.keywords.join("؛ ")
        : String(
            details.overrides?.keywords ?? "",
          ),

      category_name: String(
        details.overrides?.category_name ?? "",
      ),
    },

    isCollapsed: true,
  };
}

/* =========================================================
   COMPONENT
========================================================= */

export function ProductFormDialog({
  open,
  onOpenChange,
  product,
  warehouses,
  defaultWarehouse,
}: {
  open: boolean;
  onOpenChange: (value: boolean) => void;
  product: Product | null;
  warehouses: Warehouse[];
  defaultWarehouse?: string;
}) {
  const { lang } = useI18n();

  /* =======================================================
     PRODUCT DATA
  ======================================================= */

  const [nameAr, setNameAr] = useState("");
  const [nameEn, setNameEn] = useState("");
  const [description, setDescription] =
    useState("");
  const [keywords, setKeywords] = useState("");
  const [categoryName, setCategoryName] =
    useState("");

  const [productColor, setProductColor] =
    useState("");
  const [productModel, setProductModel] =
    useState("");
  const [productSize, setProductSize] =
    useState("");
  const [productPackQuantity, setProductPackQuantity] =
    useState("");

  const [categories, setCategories] =
    useState<ProductCategory[]>([]);

  const [categorySuggestions, setCategorySuggestions] =
    useState<{ id: string; name: string; score: number }[]>([]);
  const [categoryTouched, setCategoryTouched] =
    useState(false);

  /* =======================================================
     PRICE / STOCK
  ======================================================= */

  const [price, setPrice] = useState("");
  const [sellingPrice, setSellingPrice] =
    useState("");
  const [stock, setStock] = useState("");
  const [soldQty, setSoldQty] = useState("0");
  const [warehouse, setWarehouse] =
    useState("");

  /* =======================================================
     PRODUCT IMAGES
  ======================================================= */

  const [images, setImages] = useState<string[]>(
    [],
  );

  const [primaryImageIndex, setPrimaryImageIndex] =
    useState(0);

  /* =======================================================
     VARIANTS
  ======================================================= */

  const [hasVariants, setHasVariants] =
    useState(false);

  const [variantType, setVariantType] =
    useState("model");

  const [variantNameInput, setVariantNameInput] =
    useState("");

  const [variantColorInput, setVariantColorInput] =
    useState("");

  const [variantModelInput, setVariantModelInput] =
    useState("");

  const [variantSizeInput, setVariantSizeInput] =
    useState("");

  const [
    variantPackQuantityInput,
    setVariantPackQuantityInput,
  ] = useState("");

  const [variantBaseId, setVariantBaseId] =
    useState("");

  const [variants, setVariants] = useState<
    VariantDraft[]
  >([]);

  const [
    editingVariantImagesIndex,
    setEditingVariantImagesIndex,
  ] = useState<number | null>(null);

  /* =======================================================
     CATEGORIES
  ======================================================= */

  const loadCategories = async () => {
    try {
      const result = await api.categories();
      setCategories(result);
    } catch (e) {
      toast.error(
        errorMessage(e, lang),
      );
    }
  };

  /* =======================================================
     SMART CATEGORY SUGGESTIONS
     Source of truth: product_categories + Supabase RPC.
  ======================================================= */

  useEffect(() => {
    if (!open) return;

    const title = `${nameAr} ${nameEn}`.trim();
    if (title.length < 3) {
      setCategorySuggestions([]);
      return;
    }

    let cancelled = false;
    const timer = window.setTimeout(() => {
      void api
        .suggestCategories(title, 5)
        .then((suggestions) => {
          if (cancelled) return;
          setCategorySuggestions(suggestions);

          // Auto-fill only a strong match and never overwrite a manual choice
          // or an already saved category while editing.
          if (
            !categoryTouched &&
            !categoryName.trim() &&
            suggestions[0] &&
            suggestions[0].score >= 4
          ) {
            setCategoryName(suggestions[0].name);
          }
        })
        .catch(() => {
          if (!cancelled) setCategorySuggestions([]);
        });
    }, 350);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [open, nameAr, nameEn, categoryName, categoryTouched]);

  /* =======================================================
     PARENT SNAPSHOT
  ======================================================= */

  const parentSnapshot = useMemo(
    () =>
      createProductSnapshot(
        nameAr,
        nameEn,
        description,
        keywords,
        categoryName,
        {
          color: productColor,
          model: productModel,
          size: productSize,
          pack_quantity:
            productPackQuantity,
        },
      ),
    [
      nameAr,
      nameEn,
      description,
      keywords,
      categoryName,
      productColor,
      productModel,
      productSize,
      productPackQuantity,
    ],
  );

  /* =======================================================
     LOAD PRODUCT WHEN DIALOG OPENS
  ======================================================= */

  useEffect(() => {
    if (!open) return;

    void loadCategories();
    setCategorySuggestions([]);
    setCategoryTouched(false);

    // عند تعديل منتج قد يكون العنوان الأساسي محفوظًا في product_name فقط.
    // استخدمه تلقائيًا كعنوان احتياطي بدل إجبار المستخدم على كتابته مرة أخرى.
    const existingProductTitle =
      String(product?.product_name ?? "").trim();

    setNameAr(
      String(product?.name_ar ?? "").trim() ||
        existingProductTitle,
    );

    setNameEn(
      String(product?.name_en ?? "").trim() ||
        existingProductTitle,
    );

    setDescription(
      product?.description ?? "",
    );

    setKeywords(
      (product?.keywords ?? []).join("؛ "),
    );

    setCategoryName(
      product?.category_name ?? "",
    );

    const productDetails =
      ((product as any)?.details ??
        {}) as Record<string, any>;

    const savedProductAttributes =
      productDetails.attributes ??
      productDetails.product_attributes ??
      {};

    setProductColor(
      String(
        savedProductAttributes.color ??
          (product as any)?.color ??
          "",
      ),
    );

    setProductModel(
      String(
        savedProductAttributes.model ??
          (product as any)?.model ??
          "",
      ),
    );

    setProductSize(
      String(
        savedProductAttributes.size ??
          (product as any)?.size ??
          "",
      ),
    );

    setProductPackQuantity(
      String(
        savedProductAttributes.pack_quantity ??
          savedProductAttributes.quantity ??
          (product as any)?.pack_quantity ??
          "",
      ),
    );

    setPrice(
      product
        ? String(product.price ?? "")
        : "",
    );

    setSellingPrice(
      product?.selling_price == null
        ? ""
        : String(product.selling_price),
    );

    setStock(
      product
        ? String(product.stock_qty ?? "")
        : "",
    );

    /* =====================================================
       الكمية المباعة سابقًا
    ===================================================== */

    setSoldQty(
      product
        ? String(product.sold_qty ?? "0")
        : "0",
    );

    setWarehouse(
      product?.warehouse ||
        defaultWarehouse ||
        warehouses[0]?.warehouse_id ||
        "",
    );

    /* PRODUCT IMAGES */

    const productWithImages = product as
      | (Product & {
          image_urls?: string[] | null;
          primary_image_url?: string | null;
        })
      | null;

    const savedImages = Array.isArray(
      productWithImages?.image_urls,
    )
      ? productWithImages.image_urls.filter(
          Boolean,
        )
      : [];

    const fallbackImages =
      savedImages.length > 0
        ? savedImages
        : product?.image_url
          ? [product.image_url]
          : [];

    const uniqueImages = Array.from(
      new Set(fallbackImages),
    );

    const savedPrimary =
      productWithImages?.primary_image_url ||
      product?.image_url ||
      "";

    const foundPrimaryIndex =
      uniqueImages.findIndex(
        (url) => url === savedPrimary,
      );

    setImages(uniqueImages);

    setPrimaryImageIndex(
      foundPrimaryIndex >= 0
        ? foundPrimaryIndex
        : 0,
    );

    /* VARIANTS */

    setHasVariants(
      product?.has_variants === true,
    );

    setVariantType("model");

    setVariantNameInput("");
    setVariantColorInput("");
    setVariantModelInput("");
    setVariantSizeInput("");
    setVariantPackQuantityInput("");
    setVariantBaseId("");

    setVariants([]);

    if (product?.product_id) {
      void api
        .productVariants(product.product_id)
        .then((items) =>
          setVariants(
            items.map(variantFromApi),
          ),
        )
        .catch(() =>
          setVariants([]),
        );
    }
  }, [
    open,
    product,
    defaultWarehouse,
    warehouses,
  ]);

  /* =======================================================
     VARIANT HELPERS
  ======================================================= */

  const updateVariant = (
    index: number,
    patch: Partial<VariantDraft>,
  ) => {
    setVariants((current) =>
      current.map((variant, i) =>
        i === index
          ? {
              ...variant,
              ...patch,
            }
          : variant,
      ),
    );
  };

  const getVariantBase = () => {
    if (!variantBaseId) return null;

    if (
      variantBaseId.startsWith("draft:")
    ) {
      const index = Number(
        variantBaseId.slice(6),
      );

      return Number.isInteger(index)
        ? variants[index] ?? null
        : null;
    }

    return (
      variants.find(
        (v) =>
          v.variant_id ===
          variantBaseId,
      ) ?? null
    );
  };

  const getVariantEffectiveData = (
    variant: VariantDraft,
  ) => {
    const customKeywords =
      variant.overrides.keywords
        .split(/[؛;\n,،]+/)
        .map((item) => item.trim())
        .filter(Boolean);

    return {
      name_ar:
        variant.overrides.name_ar.trim() ||
        variant.inherited.name_ar,

      name_en:
        variant.overrides.name_en.trim() ||
        variant.inherited.name_en,

      description:
        variant.overrides.description.trim() ||
        variant.inherited.description,

      keywords:
        customKeywords.length > 0
          ? customKeywords
          : variant.inherited.keywords,

      category_name:
        variant.overrides.category_name.trim() ||
        variant.inherited.category_name,
    };
  };

  const getVariantBaseSnapshot = (
    baseVariant: VariantDraft,
  ): ProductSnapshot => {
    const effective =
      getVariantEffectiveData(
        baseVariant,
      );

    return {
      name_ar:
        effective.name_ar.trim(),

      name_en:
        effective.name_en.trim(),

      description:
        effective.description.trim(),

      keywords: [
        ...effective.keywords,
      ],

      category_name:
        effective.category_name.trim(),

      attributes: {
        color:
          baseVariant.color ?? "",

        model:
          baseVariant.model ?? "",

        size:
          baseVariant.size ?? "",

        pack_quantity:
          baseVariant.pack_quantity ?? "",
      },
    };
  };

  /* =======================================================
     ADD VARIANT
  ======================================================= */

  const addVariant = () => {
    const cleanName =
      variantNameInput.trim();

    const baseVariant =
      getVariantBase();

    const cleanColor =
      variantColorInput.trim() ||
      baseVariant?.color.trim() ||
      productColor.trim();

    const cleanModel =
      variantModelInput.trim() ||
      baseVariant?.model.trim() ||
      productModel.trim();

    const cleanSize =
      variantSizeInput.trim() ||
      baseVariant?.size.trim() ||
      productSize.trim();

    const cleanPackQuantity =
      variantPackQuantityInput.trim() ||
      baseVariant?.pack_quantity.trim() ||
      productPackQuantity.trim();

    if (
      !cleanName &&
      !cleanColor &&
      !cleanModel &&
      !cleanSize &&
      !cleanPackQuantity
    ) {
      toast.error(
        "أدخل بيانات الـ Variant أولاً",
      );
      return;
    }

    const displayName =
      cleanName ||
      [
        cleanColor &&
          `لون: ${cleanColor}`,

        cleanModel &&
          `موديل: ${cleanModel}`,

        cleanSize &&
          `حجم: ${cleanSize}`,

        cleanPackQuantity &&
          `كمية: ${cleanPackQuantity}`,
      ]
        .filter(Boolean)
        .join(" · ");

    const duplicate =
      variants.some(
        (v) =>
          v.variant_name
            .trim()
            .toLowerCase() ===
          displayName
            .toLowerCase(),
      );

    if (duplicate) {
      toast.error(
        "هذه التفريعة موجودة بالفعل",
      );
      return;
    }

    const inheritedSnapshot =
      baseVariant
        ? getVariantBaseSnapshot(
            baseVariant,
          )
        : {
            ...parentSnapshot,
            keywords: [
              ...parentSnapshot.keywords,
            ],
          };

    const newVariant = emptyVariant(
      variantType,
      {
        price:
          baseVariant?.price ??
          price,

        selling_price:
          baseVariant?.selling_price ??
          sellingPrice,
      },
      inheritedSnapshot,
      baseVariant
        ? {
            variant_id:
              baseVariant.variant_id,

            variant_name:
              baseVariant.variant_name,
          }
        : undefined,
      {
        color: cleanColor,
        model: cleanModel,
        size: cleanSize,
        pack_quantity:
          cleanPackQuantity,
      },
    );

    newVariant.variant_name =
      displayName;

    newVariant.sku = generateSKU(
      displayName,
      cleanColor,
      cleanSize,
    );

    setVariants((current) => [
      ...current,
      newVariant,
    ]);

    setVariantNameInput("");
    setVariantColorInput("");
    setVariantModelInput("");
    setVariantSizeInput("");
    setVariantPackQuantityInput("");
    setVariantBaseId("");
  };

  const removeVariant = (
    index: number,
  ) => {
    setVariants((current) =>
      current.filter(
        (_, i) => i !== index,
      ),
    );
  };

  /* =======================================================
     PRODUCT IMAGE HELPERS
  ======================================================= */

  const addProductImage = (
    url: string,
  ) => {
    const cleanUrl = url.trim();

    if (!cleanUrl) return;

    setImages((current) =>
      current.includes(cleanUrl)
        ? current
        : [...current, cleanUrl],
    );
  };

  const setPrimaryProductImage = (
    index: number,
  ) => {
    setPrimaryImageIndex(index);
  };

  const removeProductImage = (
    index: number,
  ) => {
    setImages((current) => {
      const next = current.filter(
        (_, i) => i !== index,
      );

      setPrimaryImageIndex((prev) => {
        if (next.length === 0) {
          return 0;
        }

        if (index === prev) {
          return 0;
        }

        if (index < prev) {
          return prev - 1;
        }

        return Math.min(
          prev,
          next.length - 1,
        );
      });

      return next;
    });
  };

  /* =======================================================
     VARIANT IMAGE HELPERS
  ======================================================= */

  const addVariantImage = (
    variantIndex: number,
    url: string,
  ) => {
    const cleanUrl = url.trim();

    if (!cleanUrl) return;

    setVariants((current) =>
      current.map((variant, index) => {
        if (index !== variantIndex) {
          return variant;
        }

        if (
          variant.image_urls.includes(
            cleanUrl,
          )
        ) {
          return variant;
        }

        const nextImages = [
          ...variant.image_urls,
          cleanUrl,
        ];

        return {
          ...variant,
          image_urls: nextImages,

          image_url:
            variant.image_url ||
            cleanUrl,

          primary_image_index:
            nextImages.length === 1
              ? 0
              : variant.primary_image_index,
        };
      }),
    );
  };

  const removeVariantImage = (
    variantIndex: number,
    imageIndex: number,
  ) => {
    setVariants((current) =>
      current.map((variant, index) => {
        if (index !== variantIndex) {
          return variant;
        }

        const nextImages =
          variant.image_urls.filter(
            (_, i) =>
              i !== imageIndex,
          );

        let nextPrimary = 0;

        if (nextImages.length > 0) {
          if (
            imageIndex ===
            variant.primary_image_index
          ) {
            nextPrimary = 0;
          } else if (
            imageIndex <
            variant.primary_image_index
          ) {
            nextPrimary =
              variant.primary_image_index -
              1;
          } else {
            nextPrimary = Math.min(
              variant.primary_image_index,
              nextImages.length - 1,
            );
          }
        }

        return {
          ...variant,

          image_urls: nextImages,

          image_url:
            nextImages[nextPrimary] ??
            "",

          primary_image_index:
            nextPrimary,
        };
      }),
    );
  };

  const setPrimaryVariantImage = (
    variantIndex: number,
    imageIndex: number,
  ) => {
    setVariants((current) =>
      current.map((variant, index) => {
        if (index !== variantIndex) {
          return variant;
        }

        return {
          ...variant,
          primary_image_index:
            imageIndex,
          image_url:
            variant.image_urls[
              imageIndex
            ] ?? "",
        };
      }),
    );
  };

  /* =======================================================
     KEEP VARIANTS INHERITING THE LATEST PARENT DATA
  ======================================================= */

  const getCurrentInheritedSnapshot = (variant: VariantDraft): ProductSnapshot => {
    if (variant.base_variant_id || variant.base_variant_name) {
      const base = variants.find((item) => item.variant_id === variant.base_variant_id || item.variant_name === variant.base_variant_name);
      if (base && base !== variant) return getVariantBaseSnapshot(base);
    }

    return {
      ...parentSnapshot,
      keywords: [...parentSnapshot.keywords],
      attributes: { ...parentSnapshot.attributes },
    };
  };

  /* =======================================================
     SAVE
  ======================================================= */

  const save = useApiMutation(
    async () => {
      const cleanCategory =
        categoryName.trim();

      if (!cleanCategory) {
        throw new Error(
          "CATEGORY_NAME_REQUIRED",
        );
      }

      let category =
        categories.find(
          (c) =>
            c.name
              .trim()
              .toLowerCase() ===
            cleanCategory.toLowerCase(),
        );

      if (!category) {
        category =
          await api.createCategory(
            cleanCategory,
          );

        setCategories((current) => [
          ...current,
          category!,
        ]);
      }

      const data = {
        // احتفظ بعنوان المنتج القديم عند التعديل إذا كانت حقول
        // الاسم الجديدة فارغة، حتى لا يطلب النظام إعادة كتابة العنوان.
        product_name:
          nameAr.trim() ||
          nameEn.trim() ||
          String(product?.product_name ?? "").trim(),

        name_ar:
          nameAr.trim(),

        name_en:
          nameEn.trim(),

        description:
          description.trim(),

        keywords:
          parentSnapshot.keywords,

        category_id:
          category.id,

        has_variants:
          hasVariants,

        price:
          Number(price) || 0,

        selling_price:
          sellingPrice.trim() === ""
            ? null
            : Number(sellingPrice),

        stock_qty:
          Number(stock) || 0,

        /* =================================================
           الكمية المباعة سابقًا
        ================================================= */

        sold_qty:
          Number(soldQty || 0),

        warehouse,

        image_url:
          images[primaryImageIndex] ??
          images[0] ??
          "",
      };

      const result = product
        ? await api.updateProduct({
            product_id:
              product.product_id,
            ...data,
          })
        : await api.saveProduct(data);

      const productId =
        product?.product_id ||
        (result as {
          product_id?: string;
        })?.product_id;

      if (!productId) {
        return result;
      }

      /* ===================================================
         SAVE VARIANTS
      =================================================== */

      if (hasVariants) {
        /*
         * حذف التفريعات القديمة
         * التي تم حذفها من الواجهة.
         */

        if (product?.product_id) {
          const existing =
            await api.productVariants(
              product.product_id,
            );

          const keptIds = new Set(
            variants
              .map(
                (v) =>
                  v.variant_id,
              )
              .filter(Boolean),
          );

          for (const item of existing) {
            if (
              !keptIds.has(
                item.variant_id,
              )
            ) {
              await api.deleteVariant(
                item.variant_id,
              );
            }
          }
        }

        /*
         * حفظ / تعديل كل Variant
         */

        for (const variant of variants) {
          // The parent is the source of truth for inherited data. Overrides stay local.
          const inheritedSnapshot = getCurrentInheritedSnapshot(variant);
          const effectiveVariant = getVariantEffectiveData({
            ...variant,
            inherited: inheritedSnapshot,
          });

          const primaryImage =
            variant.image_urls[
              variant.primary_image_index
            ] ??
            variant.image_url ??
            "";

          const payload = {
            product_id:
              productId,

            // saveVariant requires a warehouse; variants use the selected parent warehouse.
            warehouse,

            variant_name:
              variant.variant_name,

            sku:
              variant.sku ||
              generateSKU(
                variant.variant_name,
                variant.color,
                variant.size,
              ),

            price:
              Number(
                variant.price ||
                  price ||
                  0,
              ),

            selling_price:
              variant.selling_price
                ? Number(
                    variant.selling_price,
                  )
                : null,

            purchase_price:
              variant.purchase_price
                ? Number(
                    variant.purchase_price,
                  )
                : null,

            stock_qty:
              Number(
                variant.stock_qty ||
                  0,
              ),

            image_url:
              primaryImage,

            details: {
              kind:
                variant.kind,

              base_variant_id:
                variant.base_variant_id,

              base_variant_name:
                variant.base_variant_name,

              attributes: {
                color:
                  variant.color,

                model:
                  variant.model,

                size:
                  variant.size,

                pack_quantity:
                  variant.pack_quantity,
              },

              // Persist the latest parent/base snapshot, while overrides remain separate.
              inherited_from_product:
                inheritedSnapshot,

              effective_product_data: effectiveVariant,

              overrides:
                variant.overrides,

              image_urls:
                variant.image_urls,

              primary_image_index:
                variant.primary_image_index,
            },
          };

          if (
            variant.variant_id
          ) {
            await api.updateVariant({
              variant_id:
                variant.variant_id,
              ...payload,
            });
          } else {
            await api.saveVariant(
              payload,
            );
          }
        }
      }

      return result;
    },
  );

  /* =======================================================
     HANDLE SAVE
  ======================================================= */

  const handleSave = async () => {
    try {
      await save.mutateAsync();

      toast.success(
        product
          ? "تم تعديل المنتج بنجاح"
          : "تم إضافة المنتج بنجاح",
      );

      onOpenChange(false);
    } catch (e) {
      toast.error(
        errorMessage(e, lang),
      );
    }
  };

  /* =======================================================
     RENDER
  ======================================================= */

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
    >
      <DialogContent
        className="
          max-w-4xl
          max-h-[90vh]
          overflow-y-auto
          ltr:text-left
          rtl:text-right
        "
      >
        <DialogHeader>
          <DialogTitle>
            {product
              ? "تعديل منتج"
              : "إضافة منتج جديد"}
          </DialogTitle>

          <DialogDescription>
            قم بإدخال تفاصيل المنتج
            وتحديد خصائصه وتفريعاته
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">

          {/* =================================================
             BASIC PRODUCT INFO
          ================================================= */}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

            <div className="space-y-2">
              <Label>
                اسم المنتج (عربي)
              </Label>

              <Input
                value={nameAr}
                onChange={(e) =>
                  setNameAr(
                    e.target.value,
                  )
                }
                placeholder="مثال: قميص قطني"
              />
            </div>

            <div className="space-y-2">
              <Label>
                اسم المنتج (إنجليزي)
              </Label>

              <Input
                value={nameEn}
                onChange={(e) =>
                  setNameEn(
                    e.target.value,
                  )
                }
                placeholder="Example: Cotton Shirt"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>
              الوصف
            </Label>

            <Input
              value={description}
              onChange={(e) =>
                setDescription(
                  e.target.value,
                )
              }
              placeholder="وصف المنتج..."
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

            <div className="space-y-2">
              <Label>
                الكلمات المفتاحية
              </Label>

              <Input
                value={keywords}
                onChange={(e) =>
                  setKeywords(
                    e.target.value,
                  )
                }
                placeholder="ملابس؛ ملابس رجالي"
              />
            </div>

            <div className="space-y-2">
              <Label>
                القسم / التصنيف
              </Label>

              <Input
                value={categoryName}
                list="product-category-options"
                onChange={(e) => {
                  setCategoryTouched(true);
                  setCategoryName(e.target.value);
                }}
                placeholder="اكتب أو اختر تصنيفاً — سيتم اقتراحه من عنوان المنتج"
              />

              <datalist id="product-category-options">
                {categories.map((category) => (
                  <option key={category.id} value={category.name} />
                ))}
              </datalist>

              {categorySuggestions.length > 0 && (
                <div className="flex flex-wrap gap-2 pt-1">
                  {categorySuggestions.map((suggestion) => (
                    <button
                      key={suggestion.id}
                      type="button"
                      onClick={() => {
                        setCategoryTouched(true);
                        setCategoryName(suggestion.name);
                      }}
                      className={`rounded-full border px-3 py-1 text-xs font-medium transition ${
                        categoryName.trim().toLowerCase() === suggestion.name.trim().toLowerCase()
                          ? "border-[#823292] bg-[#823292] text-white"
                          : "border-purple-200 bg-purple-50 text-[#823292] hover:border-[#823292]"
                      }`}
                    >
                      {suggestion.name}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* =================================================
             ATTRIBUTES
          ================================================= */}

          <div
            className="
              border
              p-4
              rounded-lg
              bg-gray-50
              dark:bg-zinc-900
              space-y-3
            "
          >
            <Label className="font-bold">
              خصائص المنتج الأساسية
            </Label>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">

              <div className="space-y-1">
                <Label className="text-xs">
                  اللون
                </Label>

                <Input
                  value={productColor}
                  onChange={(e) =>
                    setProductColor(
                      e.target.value,
                    )
                  }
                  placeholder="أحمر"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs">
                  الموديل
                </Label>

                <Input
                  value={productModel}
                  onChange={(e) =>
                    setProductModel(
                      e.target.value,
                    )
                  }
                  placeholder="2026-X"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs">
                  المقاس / الحجم
                </Label>

                <Input
                  value={productSize}
                  onChange={(e) =>
                    setProductSize(
                      e.target.value,
                    )
                  }
                  placeholder="XL"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs">
                  كمية العبوة
                </Label>

                <Input
                  value={
                    productPackQuantity
                  }
                  onChange={(e) =>
                    setProductPackQuantity(
                      e.target.value,
                    )
                  }
                  placeholder="12"
                />
              </div>

            </div>
          </div>

          {/* =================================================
             PRICE & INVENTORY
          ================================================= */}

          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">

            <div className="space-y-2">
              <Label>
                السعر الأساسي
              </Label>

              <Input
                type="number"
                min="0"
                value={price}
                onChange={(e) =>
                  setPrice(
                    e.target.value,
                  )
                }
                placeholder="100"
              />
            </div>

            <div className="space-y-2">
              <Label>
                سعر البيع
              </Label>

              <Input
                type="number"
                min="0"
                value={sellingPrice}
                onChange={(e) =>
                  setSellingPrice(
                    e.target.value,
                  )
                }
                placeholder="80"
              />
            </div>

            <div className="space-y-2">
              <Label>
                الكمية في المخزن
              </Label>

              <Input
                type="number"
                min="0"
                value={stock}
                onChange={(e) =>
                  setStock(
                    e.target.value,
                  )
                }
                placeholder="50"
              />
            </div>

            {/* =================================================
               NEW: PREVIOUSLY SOLD QUANTITY
            ================================================= */}

            <div className="space-y-2">
              <Label>
                الكمية المباعة سابقًا
              </Label>

              <Input
                type="number"
                min="0"
                value={soldQty}
                onChange={(e) =>
                  setSoldQty(
                    e.target.value,
                  )
                }
                placeholder="0"
              />
            </div>

            <div className="space-y-2">
              <Label>
                المخزن
              </Label>

              <WarehouseSelect
                warehouses={warehouses}
                value={warehouse}
                onChange={setWarehouse}
              />
            </div>

          </div>

          {/* =================================================
             PRODUCT IMAGES
          ================================================= */}

          <div className="space-y-3">

            <div>
              <Label className="font-bold">
                صور المنتج الأساسي
              </Label>

              <p className="text-xs text-muted-foreground mt-1">
                اضغط على النجمة لتحديد الصورة
                الرئيسية.
              </p>
            </div>

            <div className="flex flex-wrap gap-3 items-center">

              {images.map(
                (img, idx) => (
                  <div
                    key={`${img}-${idx}`}
                    className="
                      relative
                      w-20
                      h-20
                      border
                      rounded-lg
                      overflow-hidden
                      group
                    "
                  >
                    <img
                      src={img}
                      alt=""
                      className="
                        w-full
                        h-full
                        object-cover
                      "
                    />

                    <div
                      className="
                        absolute
                        inset-0
                        bg-black/50
                        opacity-0
                        group-hover:opacity-100
                        transition-opacity
                        flex
                        items-center
                        justify-center
                        gap-1
                      "
                    >
                      <button
                        type="button"
                        onClick={() =>
                          setPrimaryProductImage(
                            idx,
                          )
                        }
                        className={`
                          p-1.5
                          rounded-full
                          ${
                            primaryImageIndex ===
                            idx
                              ? "bg-amber-500 text-white"
                              : "bg-white text-black"
                          }
                        `}
                      >
                        <Star
                          className="w-3.5 h-3.5"
                          fill={
                            primaryImageIndex ===
                            idx
                              ? "currentColor"
                              : "none"
                          }
                        />
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          removeProductImage(
                            idx,
                          )
                        }
                        className="
                          p-1.5
                          rounded-full
                          bg-red-600
                          text-white
                        "
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {primaryImageIndex ===
                      idx && (
                      <div
                        className="
                          absolute
                          top-1
                          left-1
                          bg-amber-500
                          text-white
                          rounded-full
                          p-1
                        "
                      >
                        <Star
                          className="w-3 h-3"
                          fill="currentColor"
                        />
                      </div>
                    )}
                  </div>
                ),
              )}

              <ImageDropzone
                onUpload={
                  addProductImage
                }
              />

            </div>
          </div>

          {/* =================================================
             VARIANTS
          ================================================= */}

          <div className="border-t pt-5">

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">

              <div>
                <Label className="font-bold text-base">
                  التفريعات (Variants)
                </Label>

                <p className="text-xs text-muted-foreground mt-1">
                  أضف ألوان أو مقاسات أو موديلات
                  مختلفة لنفس المنتج.
                </p>
              </div>

              <Button
                type="button"
                variant={
                  hasVariants
                    ? "default"
                    : "outline"
                }
                onClick={() =>
                  setHasVariants(
                    !hasVariants,
                  )
                }
              >
                {hasVariants
                  ? "إلغاء التفريعات"
                  : "تفعيل التفريعات"}
              </Button>

            </div>

            {hasVariants && (
              <div
                className="
                  mt-4
                  space-y-4
                  border
                  p-4
                  rounded-lg
                  bg-slate-50
                  dark:bg-zinc-900/50
                "
              >

                {/* ===========================================
                   ADD VARIANT
                =========================================== */}

                <div
                  className="
                    rounded-lg
                    border
                    bg-white
                    dark:bg-zinc-800
                    p-4
                  "
                >

                  <div className="flex items-center gap-2 mb-4">
                    <div
                      className="
                        w-8
                        h-8
                        rounded-lg
                        bg-primary/10
                        text-primary
                        flex
                        items-center
                        justify-center
                      "
                    >
                      <Plus className="w-4 h-4" />
                    </div>

                    <div>
                      <Label className="font-semibold">
                        إضافة تفريعة جديدة
                      </Label>

                      <p className="text-xs text-muted-foreground">
                        يمكنك تحديد الاسم واللون
                        والمقاس والموديل.
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">

                    <Input
                      placeholder="اسم التفريعة"
                      value={
                        variantNameInput
                      }
                      onChange={(e) =>
                        setVariantNameInput(
                          e.target.value,
                        )
                      }
                    />

                    <Input
                      placeholder="اللون"
                      value={
                        variantColorInput
                      }
                      onChange={(e) =>
                        setVariantColorInput(
                          e.target.value,
                        )
                      }
                    />

                    <Input
                      placeholder="الموديل"
                      value={
                        variantModelInput
                      }
                      onChange={(e) =>
                        setVariantModelInput(
                          e.target.value,
                        )
                      }
                    />

                    <Input
                      placeholder="المقاس / الحجم"
                      value={
                        variantSizeInput
                      }
                      onChange={(e) =>
                        setVariantSizeInput(
                          e.target.value,
                        )
                      }
                    />

                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2">

                    <Input
                      placeholder="كمية العبوة"
                      value={
                        variantPackQuantityInput
                      }
                      onChange={(e) =>
                        setVariantPackQuantityInput(
                          e.target.value,
                        )
                      }
                    />

                    <Button
                      type="button"
                      onClick={
                        addVariant
                      }
                      className="w-full"
                    >
                      <Plus className="w-4 h-4 ml-1" />
                      إضافة تفريعة
                    </Button>

                  </div>

                </div>

                {/* ===========================================
                   VARIANT LIST
                =========================================== */}

                <div className="space-y-3">

                  {variants.length ===
                    0 && (
                    <div
                      className="
                        text-center
                        py-8
                        border
                        border-dashed
                        rounded-lg
                        text-sm
                        text-muted-foreground
                      "
                    >
                      لم تتم إضافة أي
                      تفريعات حتى الآن.
                    </div>
                  )}

                  {variants.map(
                    (v, idx) => (
                      <div
                        key={
                          v.variant_id ??
                          `draft-${idx}`
                        }
                        className="
                          border
                          rounded-lg
                          bg-white
                          dark:bg-zinc-800
                          shadow-sm
                          overflow-hidden
                        "
                      >

                        {/* VARIANT HEADER */}

                        <div className="p-3">

                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">

                            <div className="flex items-center gap-3 min-w-0">

                              <div
                                className="
                                  w-10
                                  h-10
                                  rounded-lg
                                  bg-muted
                                  flex
                                  items-center
                                  justify-center
                                  shrink-0
                                "
                              >
                                {v.image_urls[
                                  v.primary_image_index
                                ] ? (
                                  <img
                                    src={
                                      v.image_urls[
                                        v.primary_image_index
                                      ]
                                    }
                                    alt=""
                                    className="
                                      w-full
                                      h-full
                                      object-cover
                                      rounded-lg
                                    "
                                  />
                                ) : (
                                  <ImagePlus className="w-4 h-4 text-muted-foreground" />
                                )}
                              </div>

                              <div className="min-w-0">

                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="font-bold truncate">
                                    {v.variant_name ||
                                      `تفريعة #${
                                        idx + 1
                                      }`}
                                  </span>

                                  <span
                                    className="
                                      text-[10px]
                                      bg-zinc-100
                                      dark:bg-zinc-700
                                      px-2
                                      py-1
                                      rounded
                                      font-mono
                                    "
                                  >
                                    {v.sku ||
                                      "بدون SKU"}
                                  </span>
                                </div>

                                <div className="flex gap-2 flex-wrap mt-1">

                                  {v.color && (
                                    <span className="text-xs text-muted-foreground">
                                      اللون:{" "}
                                      {v.color}
                                    </span>
                                  )}

                                  {v.size && (
                                    <span className="text-xs text-muted-foreground">
                                      المقاس:{" "}
                                      {v.size}
                                    </span>
                                  )}

                                  {v.model && (
                                    <span className="text-xs text-muted-foreground">
                                      الموديل:{" "}
                                      {v.model}
                                    </span>
                                  )}

                                </div>

                              </div>

                            </div>

                            <div className="flex items-center gap-1">

                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                onClick={() =>
                                  setEditingVariantImagesIndex(
                                    idx,
                                  )
                                }
                              >
                                <ImagePlus className="w-3.5 h-3.5 ml-1" />

                                الصور (
                                {
                                  v.image_urls
                                    .length
                                }
                                )
                              </Button>

                              <Button
                                type="button"
                                size="sm"
                                variant="ghost"
                                onClick={() =>
                                  updateVariant(
                                    idx,
                                    {
                                      isCollapsed:
                                        !v.isCollapsed,
                                    },
                                  )
                                }
                              >
                                {v.isCollapsed ? (
                                  <ChevronDown className="w-4 h-4" />
                                ) : (
                                  <ChevronUp className="w-4 h-4" />
                                )}
                              </Button>

                              <Button
                                type="button"
                                size="sm"
                                variant="destructive"
                                onClick={() =>
                                  removeVariant(
                                    idx,
                                  )
                                }
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </Button>

                            </div>

                          </div>
                        </div>

                        {/* =====================================
                           VARIANT DETAILS
                        ===================================== */}

                        {!v.isCollapsed && (
                          <div
                            className="
                              border-t
                              p-4
                              bg-muted/20
                            "
                          >

                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">

                              <div className="space-y-1">
                                <Label className="text-xs">
                                  السعر
                                </Label>

                                <Input
                                  type="number"
                                  min="0"
                                  value={
                                    v.price
                                  }
                                  onChange={(e) =>
                                    updateVariant(
                                      idx,
                                      {
                                        price:
                                          e
                                            .target
                                            .value,
                                      },
                                    )
                                  }
                                />
                              </div>

                              <div className="space-y-1">
                                <Label className="text-xs">
                                  سعر البيع
                                </Label>

                                <Input
                                  type="number"
                                  min="0"
                                  value={
                                    v.selling_price
                                  }
                                  onChange={(e) =>
                                    updateVariant(
                                      idx,
                                      {
                                        selling_price:
                                          e
                                            .target
                                            .value,
                                      },
                                    )
                                  }
                                />
                              </div>

                              <div className="space-y-1">
                                <Label className="text-xs">
                                  الكمية
                                </Label>

                                <Input
                                  type="number"
                                  min="0"
                                  value={
                                    v.stock_qty
                                  }
                                  onChange={(e) =>
                                    updateVariant(
                                      idx,
                                      {
                                        stock_qty:
                                          e
                                            .target
                                            .value,
                                      },
                                    )
                                  }
                                />
                              </div>

                              <div className="space-y-1">
                                <Label className="text-xs">
                                  SKU
                                </Label>

                                <Input
                                  value={
                                    v.sku ??
                                    ""
                                  }
                                  onChange={(e) =>
                                    updateVariant(
                                      idx,
                                      {
                                        sku:
                                          e
                                            .target
                                            .value,
                                      },
                                    )
                                  }
                                />
                              </div>

                            </div>

                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-3">

                              <div>
                                <Label className="text-xs">
                                  اللون
                                </Label>

                                <Input
                                  value={
                                    v.color
                                  }
                                  onChange={(e) =>
                                    updateVariant(
                                      idx,
                                      {
                                        color:
                                          e
                                            .target
                                            .value,
                                      },
                                    )
                                  }
                                />
                              </div>

                              <div>
                                <Label className="text-xs">
                                  الموديل
                                </Label>

                                <Input
                                  value={
                                    v.model
                                  }
                                  onChange={(e) =>
                                    updateVariant(
                                      idx,
                                      {
                                        model:
                                          e
                                            .target
                                            .value,
                                      },
                                    )
                                  }
                                />
                              </div>

                              <div>
                                <Label className="text-xs">
                                  المقاس
                                </Label>

                                <Input
                                  value={
                                    v.size
                                  }
                                  onChange={(e) =>
                                    updateVariant(
                                      idx,
                                      {
                                        size:
                                          e
                                            .target
                                            .value,
                                      },
                                    )
                                  }
                                />
                              </div>

                              <div>
                                <Label className="text-xs">
                                  كمية العبوة
                                </Label>

                                <Input
                                  value={
                                    v.pack_quantity
                                  }
                                  onChange={(e) =>
                                    updateVariant(
                                      idx,
                                      {
                                        pack_quantity:
                                          e
                                            .target
                                            .value,
                                      },
                                    )
                                  }
                                />
                              </div>

                            </div>

                          </div>
                        )}

                      </div>
                    ),
                  )}

                </div>
              </div>
            )}
          </div>
        </div>

        {/* ===================================================
           FOOTER
        =================================================== */}

        <DialogFooter>

          <Button
            type="button"
            variant="outline"
            onClick={() =>
              onOpenChange(false)
            }
            disabled={save.isPending}
          >
            إلغاء
          </Button>

          <Button
            type="button"
            onClick={handleSave}
            disabled={save.isPending}
          >
            {save.isPending
              ? "جاري الحفظ..."
              : "حفظ المنتج"}
          </Button>

        </DialogFooter>
      </DialogContent>

      {/* =====================================================
         VARIANT IMAGES DIALOG
      ===================================================== */}

      <Dialog
        open={
          editingVariantImagesIndex !==
          null
        }
        onOpenChange={() =>
          setEditingVariantImagesIndex(
            null,
          )
        }
      >
        <DialogContent className="max-w-xl">

          <DialogHeader>
            <DialogTitle>
              إدارة صور التفريعة
            </DialogTitle>

            <DialogDescription>
              يمكنك إضافة أكثر من صورة
              وتحديد الصورة الرئيسية.
            </DialogDescription>
          </DialogHeader>

          {editingVariantImagesIndex !==
            null && (
            <div className="space-y-5">

              {/* IMAGES */}

              <div className="flex flex-wrap gap-3">

                {variants[
                  editingVariantImagesIndex
                ]?.image_urls.map(
                  (img, imgIdx) => {
                    const variant =
                      variants[
                        editingVariantImagesIndex
                      ];

                    const isPrimary =
                      variant?.primary_image_index ===
                      imgIdx;

                    return (
                      <div
                        key={`${img}-${imgIdx}`}
                        className="
                          relative
                          w-24
                          h-24
                          border
                          rounded-lg
                          overflow-hidden
                          group
                        "
                      >

                        <img
                          src={img}
                          className="
                            w-full
                            h-full
                            object-cover
                          "
                          alt=""
                        />

                        <div
                          className="
                            absolute
                            inset-0
                            bg-black/50
                            opacity-0
                            group-hover:opacity-100
                            transition-opacity
                            flex
                            items-center
                            justify-center
                            gap-1
                          "
                        >

                          <button
                            type="button"
                            onClick={() =>
                              setPrimaryVariantImage(
                                editingVariantImagesIndex,
                                imgIdx,
                              )
                            }
                            className={`
                              p-1.5
                              rounded-full
                              ${
                                isPrimary
                                  ? "bg-amber-500 text-white"
                                  : "bg-white text-black"
                              }
                            `}
                          >
                            <Star
                              className="w-3.5 h-3.5"
                              fill={
                                isPrimary
                                  ? "currentColor"
                                  : "none"
                              }
                            />
                          </button>

                          <button
                            type="button"
                            onClick={() =>
                              removeVariantImage(
                                editingVariantImagesIndex,
                                imgIdx,
                              )
                            }
                            className="
                              p-1.5
                              rounded-full
                              bg-red-500
                              text-white
                            "
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>

                        </div>

                        {isPrimary && (
                          <div
                            className="
                              absolute
                              top-1
                              left-1
                              bg-amber-500
                              text-white
                              rounded-full
                              p-1
                            "
                          >
                            <Star
                              className="w-3 h-3"
                              fill="currentColor"
                            />
                          </div>
                        )}

                      </div>
                    );
                  },
                )}

                {/* DROPZONE */}

                <ImageDropzone
                  onUpload={(url) =>
                    addVariantImage(
                      editingVariantImagesIndex,
                      url,
                    )
                  }
                />

              </div>

              {variants[
                editingVariantImagesIndex
              ]?.image_urls.length ===
                0 && (
                <div
                  className="
                    text-center
                    py-5
                    text-sm
                    text-muted-foreground
                    border
                    border-dashed
                    rounded-lg
                  "
                >
                  لم تتم إضافة صور
                  لهذه التفريعة بعد.
                </div>
              )}

            </div>
          )}

        </DialogContent>
      </Dialog>
    </Dialog>
  );
}