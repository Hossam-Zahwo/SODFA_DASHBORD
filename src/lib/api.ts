/**
 * SODFA — centralized Supabase API service
 *
 * Source of truth:
 * Supabase
 *
 * Tables:
 * - product_catalog
 * - product_categories
 * - product_variants
 * - inventory
 * - warehouses
 * - sales
 * - returns
 * - damaged_returns
 *
 * Google Sheets / Google Apps Script are NOT used.
 */

import { createClient } from "@supabase/supabase-js";
import { IMAGE_BUCKET } from "@/lib/images";

/* ============================================================
   SUPABASE
   ============================================================ */

const SUPABASE_URL =
  import.meta.env.VITE_SUPABASE_URL ||
  "https://fcwzxmslfltbvxputqec.supabase.co";

const SUPABASE_PUBLISHABLE_KEY =
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

if (!SUPABASE_PUBLISHABLE_KEY) {
  console.warn(
    "[SODFA] VITE_SUPABASE_PUBLISHABLE_KEY is missing.",
  );
}

export const supabase = createClient(
  SUPABASE_URL,
  SUPABASE_PUBLISHABLE_KEY || "",
);

/* ============================================================
   COMPATIBILITY
   ============================================================ */

export const DEFAULT_API_URL = SUPABASE_URL;

const API_URL_KEY = "sodfa_api_url";

export function getApiUrl(): string {
  return SUPABASE_URL;
}

export function setApiUrl(_url: string): void {
  try {
    if (typeof window !== "undefined") {
      window.localStorage.removeItem(API_URL_KEY);
    }
  } catch {
    // ignore
  }
}

/* ============================================================
   ERRORS
   ============================================================ */

export class ApiError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ApiError";
  }
}

function supabaseError(
  error: {
    message?: string;
    details?: string;
    hint?: string;
    code?: string;
  } | null,
): ApiError {
  const message =
    error?.message ||
    error?.details ||
    error?.hint ||
    "SUPABASE_ERROR";

  const code = error?.code
    ? ` [${error.code}]`
    : "";

  return new ApiError(`${message}${code}`);
}

/* ============================================================
   HELPERS
   ============================================================ */

type Params = Record<
  string,
  string | number | boolean | undefined | null
>;

type JsonObject = Record<string, unknown>;

function s(value: unknown): string {
  return value === undefined ||
    value === null
    ? ""
    : String(value);
}

function n(value: unknown): number {
  if (
    value === undefined ||
    value === null ||
    value === ""
  ) {
    return 0;
  }

  const x = Number(
    String(value).replace(
      /[^0-9.-]/g,
      "",
    ),
  );

  return Number.isFinite(x)
    ? x
    : 0;
}

function pick(
  row: Record<string, unknown>,
  keys: string[],
): unknown {
  for (const key of keys) {
    const value = row[key];

    if (
      value !== undefined &&
      value !== null &&
      value !== ""
    ) {
      return value;
    }
  }

  return undefined;
}

function makeId(prefix: string): string {
  const uuid =
    typeof crypto !== "undefined" &&
    typeof crypto.randomUUID === "function"
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random()
          .toString(36)
          .slice(2, 10)}`;

  return `${prefix}-${uuid}`;
}

function today(): string {
  return new Date()
    .toISOString()
    .slice(0, 10);
}

function currentTime(): string {
  return new Date()
    .toTimeString()
    .slice(0, 8);
}

function normalizeStatus(
  value: unknown,
): DamagedStatus {
  const status = s(value)
    .trim()
    .toLowerCase();

  if (status === "accepted") {
    return "Accepted";
  }

  if (status === "rejected") {
    return "Rejected";
  }

  return "Pending";
}

function normalizeKeywords(
  value: unknown,
): string[] {
  if (Array.isArray(value)) {
    return value
      .map((item) => s(item).trim())
      .filter(Boolean);
  }

  if (typeof value === "string") {
    return value
      .split(/[,\n،]+/)
      .map((item) => item.trim())
      .filter(Boolean);
  }

  return [];
}

function normalizeDetails(
  value: unknown,
): JsonObject {
  if (
    value &&
    typeof value === "object" &&
    !Array.isArray(value)
  ) {
    return value as JsonObject;
  }

  return {};
}

/* ============================================================
   TYPES
   ============================================================ */

export interface Product {
  product_id: string;
  product_name: string;
  name_ar?: string;
  name_en?: string;
  description?: string;
  keywords?: string[];
  category_id?: string | null;
  category_name?: string;
  has_variants?: boolean;

  barcode: string;
  image_url: string;
  image_urls?: string[];
  primary_image_url?: string;
  warehouse: string;

  purchase_price?: number;
  price: number;
  selling_price?: number | null;

  stock_qty: number;
  sold_qty: number;
  remaining_qty: number;

  stock_purchase_value?: number;
  stock_sale_value?: number;
  sales_value?: number;
  last_sale_date?: string;

  created_at: string;
  updated_at: string;
}

export interface ProductCatalog {
  product_id: string;
  name_ar: string;
  name_en: string;
  description: string;
  keywords: string[];
  category_id: string | null;
  category_name?: string;
  has_variants: boolean;
  created_at: string;
  updated_at: string;
}

export interface ProductCategory {
  id: string;
  name: string;
  created_at: string;
  updated_at: string;
}

export interface ProductVariant {
  variant_id: string;
  product_id: string;
  variant_name: string;
  details: JsonObject;
  barcode: string;
  sku: string;
  image_url: string;

  created_at: string;
  updated_at: string;
}

export interface Warehouse {
  warehouse_id: string;
  warehouse_name: string;
  active?: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface Sale {
  sale_id: string;
  product_id: string;
  product_name: string;
  barcode: string;
  warehouse: string;
  qty: number;
  price: number;
  total: number;
  sale_date: string;
  sale_time: string;
}

export interface ReturnRecord {
  return_id: string;
  product_id: string;
  product_name: string;
  barcode: string;
  warehouse: string;
  qty: number;
  price: number;
  return_total: number;
  product_image: string;
  invoice_image: string;
  delivery_note_image: string;
  return_reason: string;
  notes: string;
  return_date: string;
  return_time: string;
}

export type DamagedStatus =
  | "Pending"
  | "Accepted"
  | "Rejected";

export interface DamagedReturn {
  damaged_return_id: string;
  shipment_code: string;
  product_id: string;
  product_name: string;
  barcode: string;
  warehouse: string;
  qty: number;
  damage_reason: string;
  damage_details: string;
  status: DamagedStatus;
  policy_image: string;
  product_image: string;
  policy_product_image: string;
  return_date: string;
  return_time: string;
}

export interface ConnectionStatus {
  connected: boolean;
  spreadsheet_name: string;
  sheets: Record<
    string,
    {
      connected: boolean;
      rows: number;
    }
  >;
  timestamp: string;
}

/* ============================================================
   PRODUCT IMAGE HELPERS
   ============================================================ */

function cleanImageUrls(
  urls: unknown,
): string[] {
  if (!Array.isArray(urls)) {
    return [];
  }

  return Array.from(
    new Set(
      urls
        .map((url) => s(url).trim())
        .filter(Boolean),
    ),
  );
}

async function syncProductImages(
  productId: string,
  imageUrls: unknown,
  primaryImageUrl?: unknown,
): Promise<void> {
  const urls = cleanImageUrls(imageUrls);

  const { error: deleteError } =
    await supabase
      .from("product_images")
      .delete()
      .eq("product_id", productId);

  if (deleteError) {
    throw supabaseError(deleteError);
  }

  if (urls.length === 0) {
    return;
  }

  const primary =
    s(primaryImageUrl).trim() || urls[0];

  const rows = urls.map(
    (image_url, sort_order) => ({
      product_id: productId,
      image_url,
      sort_order,
      is_primary:
        image_url === primary,
    }),
  );

  const { error: insertError } =
    await supabase
      .from("product_images")
      .insert(rows);

  if (insertError) {
    throw supabaseError(insertError);
  }
}

/* ============================================================
   NORMALIZERS
   ============================================================ */

export function normalizeProduct(
  raw: Record<string, unknown>,
): Product {
  const price = n(
    pick(raw, [
      "sale_price",
      "price",
      "unit_sale_price",
    ]),
  );

  const stock = n(
    pick(raw, [
      "stock_qty",
      "total_stock",
      "quantity",
    ]),
  );

  const sold = n(
    pick(raw, [
      "sold_qty",
      "sold",
    ]),
  );

  const remainingRaw = pick(
    raw,
    [
      "remaining_qty",
      "remaining_stock",
      "remaining",
    ],
  );

  const remaining =
    remainingRaw === undefined
      ? Math.max(0, stock - sold)
      : Math.max(
          0,
          n(remainingRaw),
        );

  return {
    product_id: s(raw.product_id),

    product_name:
      s(raw.product_name) ||
      s(raw.name_ar) ||
      s(raw.name_en),

    name_ar: s(raw.name_ar),

    name_en: s(raw.name_en),

    description:
      s(raw.description),

    keywords:
      normalizeKeywords(
        raw.keywords,
      ),

    category_id:
      raw.category_id === undefined ||
      raw.category_id === null ||
      raw.category_id === ""
        ? null
        : s(raw.category_id),

    category_name:
      s(raw.category_name),

    has_variants:
      raw.has_variants === true,

    barcode:
      s(
        pick(raw, [
          "barcode",
        ]),
      ) ||
      s(raw.product_id),

    image_url: s(
      pick(raw, [
        "image_url",
        "product_image",
        "product_image_url",
      ]),
    ),

    image_urls: Array.isArray(raw.image_urls)
      ? raw.image_urls
          .map((url) => s(url))
          .filter(Boolean)
      : undefined,

    primary_image_url:
      s(raw.primary_image_url) ||
      s(raw.image_url) ||
      undefined,

    warehouse: s(
      pick(raw, [
        "warehouse",
        "warehouse_id",
        "warehouse_name",
      ]),
    ),

    purchase_price: n(
      raw.purchase_price,
    ),

    price,

    selling_price:
      raw.selling_price === undefined ||
      raw.selling_price === null ||
      raw.selling_price === ""
        ? null
        : n(raw.selling_price),

    stock_qty: stock,

    sold_qty: sold,

    remaining_qty: remaining,

    stock_purchase_value: n(
      raw.stock_purchase_value,
    ),

    stock_sale_value: n(
      raw.stock_sale_value,
    ),

    sales_value: n(
      raw.sales_value,
    ),

    last_sale_date: s(
      raw.last_sale_date,
    ),

    created_at: s(
      raw.created_at,
    ),

    updated_at: s(
      raw.updated_at,
    ),
  };
}

export function normalizeSale(
  raw: Record<string, unknown>,
): Sale {
  const price = n(
    pick(raw, [
      "unit_sale_price",
      "price",
      "unit_price",
    ]),
  );

  const qty = n(
    pick(raw, [
      "qty",
      "quantity",
    ]),
  );

  const totalValue = pick(
    raw,
    [
      "total_sale_value",
      "total_value",
      "total",
    ],
  );

  const total =
    totalValue === undefined
      ? price * qty
      : n(totalValue);

  return {
    sale_id: s(raw.sale_id),

    product_id: s(
      raw.product_id,
    ),

    product_name: s(
      raw.product_name,
    ),

    barcode: s(
      raw.barcode,
    ),

    warehouse: s(
      pick(raw, [
        "warehouse",
        "warehouse_id",
        "warehouse_name",
      ]),
    ),

    qty,

    price,

    total,

    sale_date: s(
      pick(raw, [
        "sale_date",
        "date",
        "created_at",
      ]),
    ),

    sale_time: s(
      pick(raw, [
        "sale_time",
        "time",
      ]),
    ),
  };
}

export function normalizeReturn(
  raw: Record<string, unknown>,
): ReturnRecord {
  const price = n(
    pick(raw, [
      "unit_sale_price",
      "unit_price",
      "price",
    ]),
  );

  const qty = n(
    pick(raw, [
      "qty",
      "quantity",
    ]),
  );

  const totalRaw = pick(
    raw,
    [
      "return_total",
      "total",
    ],
  );

  const returnTotal =
    totalRaw === undefined
      ? price * qty
      : n(totalRaw);

  return {
    return_id: s(
      raw.return_id,
    ),

    product_id: s(
      raw.product_id,
    ),

    product_name: s(
      raw.product_name,
    ),

    barcode: s(
      raw.barcode,
    ),

    warehouse: s(
      raw.warehouse,
    ),

    qty,

    price,

    return_total:
      returnTotal,

    product_image: s(
      pick(raw, [
        "product_image",
        "product_image_url",
      ]),
    ),

    invoice_image: s(
      pick(raw, [
        "invoice_image",
        "invoice_image_url",
      ]),
    ),

    delivery_note_image: s(
      pick(raw, [
        "delivery_note_image",
        "delivery_note_image_url",
      ]),
    ),

    return_reason: s(
      pick(raw, [
        "return_reason",
        "reason",
      ]),
    ),

    notes: s(raw.notes),

    return_date: s(
      pick(raw, [
        "return_date",
        "date",
        "created_at",
      ]),
    ),

    return_time: s(
      pick(raw, [
        "return_time",
        "time",
      ]),
    ),
  };
}

export function normalizeDamaged(
  raw: Record<string, unknown>,
): DamagedReturn {
  return {
    damaged_return_id: s(
      raw.damaged_return_id,
    ),

    shipment_code: s(
      raw.shipment_code,
    ),

    product_id: s(
      raw.product_id,
    ),

    product_name: s(
      raw.product_name,
    ),

    barcode: s(
      raw.barcode,
    ),

    warehouse: s(
      pick(raw, [
        "warehouse",
        "warehouse_name",
        "warehouse_id",
      ]),
    ),

    qty: n(
      pick(raw, [
        "quantity",
        "qty",
      ]),
    ),

    damage_reason: s(
      pick(raw, [
        "damage_reason",
        "reason",
      ]),
    ),

    damage_details: s(
      pick(raw, [
        "damage_details",
        "details",
        "notes",
      ]),
    ),

    status:
      normalizeStatus(
        raw.status,
      ),

    policy_image: s(
      pick(raw, [
        "policy_image_url",
        "police_image",
        "policy_image",
      ]),
    ),

    product_image: s(
      pick(raw, [
        "product_image_url",
        "product_image",
      ]),
    ),

    policy_product_image: s(
      pick(raw, [
        "policy_product_image_url",
        "combined_return_image",
        "policy_product_image",
      ]),
    ),

    return_date: s(
      pick(raw, [
        "return_date",
        "date",
        "created_at",
      ]),
    ),

    return_time: s(
      pick(raw, [
        "return_time",
        "time",
      ]),
    ),
  };
}

/* ============================================================
   COMPATIBILITY GET
   ============================================================ */

export async function apiGet<T>(
  action: string | null,
  params: Params = {},
): Promise<T> {
  void params;

  switch (action) {
    case null:
    case "connection":
      return (await api.connection()) as T;

    case "get_inventory":
      return {
        products:
          await api.inventory(),
      } as T;

    case "get_warehouses":
      return {
        warehouses:
          await api.warehouses(),
      } as T;

    case "get_sales":
      return {
        sales:
          await api.sales(),
      } as T;

    case "get_returns":
      return {
        returns:
          await api.returns(),
      } as T;

    case "get_damaged_returns":
      return {
        damaged_returns:
          await api.damagedReturns(),
      } as T;

    case "get_categories":
      return {
        categories:
          await api.categories(),
      } as T;

    case "get_product_catalog":
      return {
        products:
          await api.productCatalog(),
      } as T;

    case "get_product_variants":
      return {
        variants:
          await api.productVariants(
            s(params.product_id),
          ),
      } as T;

    default:
      throw new ApiError(
        `UNKNOWN_GET_ACTION: ${action}`,
      );
  }
}

/* ============================================================
   COMPATIBILITY POST
   ============================================================ */

export async function apiPost<T>(
  action: string,
  params: Params = {},
): Promise<T> {
  switch (action) {
    /* --------------------------------------------------------
       SAVE PRODUCT
       -------------------------------------------------------- */

    case "save_product":
      return (await api.saveProduct({
        product_name:
          s(params.product_name),

        name_ar:
          s(params.name_ar),

        name_en:
          s(params.name_en),

        description:
          s(params.description),

        keywords:
          normalizeKeywords(
            params.keywords,
          ),

        category_id:
          params.category_id === undefined ||
          params.category_id === null ||
          params.category_id === ""
            ? null
            : s(params.category_id),

        has_variants:
          params.has_variants === true,

        barcode:
          s(params.barcode),

        price:
          n(params.price),

        stock_qty:
          n(params.stock_qty),

        sold_qty:
          n(params.sold_qty),

        warehouse:
          s(params.warehouse),

        image_url:
          s(params.image_url),

        selling_price:
          params.selling_price === undefined ||
          params.selling_price === null ||
          params.selling_price === ""
            ? null
            : n(params.selling_price),

        purchase_price:
          params.purchase_price === undefined
            ? undefined
            : n(params.purchase_price),
      })) as T;

    /* --------------------------------------------------------
       UPDATE PRODUCT
       -------------------------------------------------------- */

    case "update_product":
      return (await api.updateProduct({
        product_id:
          s(params.product_id),

        product_name:
          params.product_name !== undefined
            ? s(params.product_name)
            : undefined,

        name_ar:
          params.name_ar !== undefined
            ? s(params.name_ar)
            : undefined,

        name_en:
          params.name_en !== undefined
            ? s(params.name_en)
            : undefined,

        description:
          params.description !== undefined
            ? s(params.description)
            : undefined,

        keywords:
          params.keywords !== undefined
            ? normalizeKeywords(
                params.keywords,
              )
            : undefined,

        category_id:
          params.category_id !== undefined
            ? params.category_id === null ||
              params.category_id === ""
              ? null
              : s(params.category_id)
            : undefined,

        has_variants:
          params.has_variants !== undefined
            ? Boolean(params.has_variants)
            : undefined,

        barcode:
          params.barcode !== undefined
            ? s(params.barcode)
            : undefined,

        price:
          params.price !== undefined
            ? n(params.price)
            : undefined,

        selling_price:
          params.selling_price !== undefined
            ? params.selling_price === null ||
              params.selling_price === ""
              ? null
              : n(params.selling_price)
            : undefined,

        purchase_price:
          params.purchase_price !== undefined
            ? n(params.purchase_price)
            : undefined,

        stock_qty:
          params.stock_qty !== undefined
            ? n(params.stock_qty)
            : undefined,

        sold_qty:
          params.sold_qty !== undefined
            ? n(params.sold_qty)
            : undefined,

        warehouse:
          params.warehouse !== undefined
            ? s(params.warehouse)
            : undefined,

        image_url:
          params.image_url !== undefined
            ? s(params.image_url)
            : undefined,
      })) as T;

    /* --------------------------------------------------------
       DELETE PRODUCT
       -------------------------------------------------------- */

    case "delete_product":
      return (await api.deleteProduct(
        s(params.product_id),
      )) as T;

    /* --------------------------------------------------------
       CATEGORY
       -------------------------------------------------------- */

    case "add_category":
      return (await api.createCategory(
        s(params.name),
      )) as T;

    case "update_category":
      return (await api.updateCategory(
        s(params.id),
        s(params.name),
      )) as T;

    case "delete_category":
      return (await api.deleteCategory(
        s(params.id),
      )) as T;

    /* --------------------------------------------------------
       VARIANT
       -------------------------------------------------------- */

    case "save_variant":
      return (await api.saveVariant({
        product_id:
          s(params.product_id),

        variant_name:
          s(params.variant_name),

        details:
          normalizeDetails(
            params.details,
          ),

        barcode:
          s(params.barcode),

        sku:
          s(params.sku),

        image_url:
          s(params.image_url),

        warehouse:
          s(params.warehouse),

        price:
          n(params.price),

        purchase_price:
          n(params.purchase_price),

        selling_price:
          params.selling_price === undefined ||
          params.selling_price === null ||
          params.selling_price === ""
            ? null
            : n(params.selling_price),

        stock_qty:
          n(params.stock_qty),
      })) as T;

    case "update_variant":
      return (await api.updateVariant({
        variant_id:
          s(params.variant_id),

        variant_name:
          params.variant_name !== undefined
            ? s(params.variant_name)
            : undefined,

        details:
          params.details !== undefined
            ? normalizeDetails(
                params.details,
              )
            : undefined,

        barcode:
          params.barcode !== undefined
            ? s(params.barcode)
            : undefined,

        sku:
          params.sku !== undefined
            ? s(params.sku)
            : undefined,

        image_url:
          params.image_url !== undefined
            ? s(params.image_url)
            : undefined,
      })) as T;

    case "delete_variant":
      return (await api.deleteVariant(
        s(params.variant_id),
      )) as T;

    /* --------------------------------------------------------
       WAREHOUSE
       -------------------------------------------------------- */

    case "add_warehouse":
      return (await api.saveWarehouse(
        s(params.warehouse_name),
      )) as T;

    case "rename_warehouse":
      return (await api.updateWarehouse(
        s(params.warehouse_id),
        s(params.warehouse_name),
      )) as T;

    case "delete_warehouse":
      return (await api.deleteWarehouse(
        s(params.warehouse_id),
      )) as T;

    /* --------------------------------------------------------
       SALES
       -------------------------------------------------------- */

    case "record_sale":
      return (await api.recordSale({
        product_id:
          s(params.product_id),

        qty:
          n(params.qty),

        warehouse:
          params.warehouse !== undefined
            ? s(params.warehouse)
            : undefined,
      })) as T;

    /* --------------------------------------------------------
       RETURNS
       -------------------------------------------------------- */

    case "record_return":
      return (await api.recordReturn({
        product_id:
          s(params.product_id),

        qty:
          n(params.qty),

        warehouse:
          params.warehouse !== undefined
            ? s(params.warehouse)
            : undefined,

        return_reason:
          params.return_reason !== undefined
            ? s(params.return_reason)
            : undefined,

        notes:
          params.notes !== undefined
            ? s(params.notes)
            : undefined,

        product_image:
          params.product_image !== undefined
            ? s(params.product_image)
            : undefined,

        invoice_image:
          params.invoice_image !== undefined
            ? s(params.invoice_image)
            : undefined,

        delivery_note_image:
          params.delivery_note_image !== undefined
            ? s(params.delivery_note_image)
            : undefined,
      })) as T;

    default:
      throw new ApiError(
        `UNKNOWN_POST_ACTION: ${action}`,
      );
  }
}

/* ============================================================
   API
   ============================================================ */

export const api = {
  /* ==========================================================
     CONNECTION
     ========================================================== */

  connection:
    async (): Promise<ConnectionStatus> => {
      const tables = [
        "product_catalog",
        "product_categories",
        "product_variants",
        "inventory",
        "warehouses",
        "sales",
        "returns",
        "damaged_returns",
      ] as const;

      const sheets: ConnectionStatus["sheets"] =
        {};

      let connected = true;

      for (const table of tables) {
        const { count, error } =
          await supabase
            .from(table)
            .select("*", {
              count: "exact",
              head: true,
            });

        if (error) {
          connected = false;

          sheets[table] = {
            connected: false,
            rows: 0,
          };
        } else {
          sheets[table] = {
            connected: true,
            rows: count ?? 0,
          };
        }
      }

      return {
        connected,
        spreadsheet_name:
          "Supabase",

        sheets,

        timestamp:
          new Date().toISOString(),
      };
    },

  /* ==========================================================
     PRODUCT CATALOG
     ========================================================== */

  productCatalog:
    async (): Promise<ProductCatalog[]> => {
      const {
        data,
        error,
      } = await supabase
        .from("product_catalog")
        .select("*")
        .order(
          "created_at",
          {
            ascending: false,
          },
        );

      if (error) {
        throw supabaseError(error);
      }

      const categoryIds = Array.from(
        new Set(
          (data ?? [])
            .map((row) => s(row.category_id))
            .filter(Boolean),
        ),
      );

      const categoryMap = new Map<string, string>();

      if (categoryIds.length > 0) {
        const { data: categories } = await supabase
          .from("product_categories")
          .select("id, name")
          .in("id", categoryIds);

        for (const category of categories ?? []) {
          categoryMap.set(s(category.id), s(category.name));
        }
      }

      return (data ?? []).map(
        (row) => {
          const categoryId = s(row.category_id);

          return {
            product_id:
              s(row.product_id),

            name_ar:
              s(row.name_ar),

            name_en:
              s(row.name_en),

            description:
              s(row.description),

            keywords:
              normalizeKeywords(
                row.keywords,
              ),

            category_id:
              row.category_id
                ? s(row.category_id)
                : null,

            category_name:
              categoryMap.get(categoryId) ?? "",

            has_variants:
              row.has_variants === true,

            created_at:
              s(row.created_at),

            updated_at:
              s(row.updated_at),
          };
        },
      );
    },

  /* ==========================================================
     CATEGORIES
     ========================================================== */

  categories:
    async (): Promise<ProductCategory[]> => {
      const {
        data,
        error,
      } = await supabase
        .from("product_categories")
        .select("*")
        .order(
          "name",
          {
            ascending: true,
          },
        );

      if (error) {
        throw supabaseError(error);
      }

      return (data ?? []).map(
        (row) => ({
          id: s(row.id),
          name: s(row.name),
          created_at:
            s(row.created_at),
          updated_at:
            s(row.updated_at),
        }),
      );
    },

  createCategory:
    async (
      name: string,
    ): Promise<ProductCategory> => {
      const cleanName =
        name.trim();

      if (!cleanName) {
        throw new ApiError(
          "CATEGORY_NAME_REQUIRED",
        );
      }

      const {
        data,
        error,
      } = await supabase
        .from("product_categories")
        .insert({
          name: cleanName,
        })
        .select("*")
        .single();

      if (error) {
        throw supabaseError(error);
      }

      return {
        id: s(data?.id),
        name: s(data?.name),
        created_at:
          s(data?.created_at),
        updated_at:
          s(data?.updated_at),
      };
    },

  updateCategory:
    async (
      id: string,
      name: string,
    ) => {
      if (!id) {
        throw new ApiError(
          "CATEGORY_ID_REQUIRED",
        );
      }

      const cleanName =
        name.trim();

      if (!cleanName) {
        throw new ApiError(
          "CATEGORY_NAME_REQUIRED",
        );
      }

      const {
        error,
      } = await supabase
        .from("product_categories")
        .update({
          name: cleanName,
          updated_at:
            new Date().toISOString(),
        })
        .eq("id", id);

      if (error) {
        throw supabaseError(error);
      }

      return {
        success: true,
      };
    },

  deleteCategory:
    async (
      id: string,
    ) => {
      if (!id) {
        throw new ApiError(
          "CATEGORY_ID_REQUIRED",
        );
      }

      const {
        error,
      } = await supabase
        .from("product_categories")
        .delete()
        .eq("id", id);

      if (error) {
        throw supabaseError(error);
      }

      return {
        success: true,
      };
    },

  /* ==========================================================
     PRODUCT VARIANTS
     ========================================================== */

  productVariants:
    async (
      productId?: string,
    ): Promise<ProductVariant[]> => {
      let query = supabase
        .from("product_variants")
        .select("*")
        .order(
          "created_at",
          {
            ascending: true,
          },
        );

      if (productId) {
        query = query.eq(
          "product_id",
          productId,
        );
      }

      const {
        data,
        error,
      } = await query;

      if (error) {
        throw supabaseError(error);
      }

      return (data ?? []).map(
        (row) => ({
          variant_id:
            s(row.variant_id),

          product_id:
            s(row.product_id),

          variant_name:
            s(row.variant_name),

          details:
            normalizeDetails(
              row.details,
            ),

          barcode:
            s(row.barcode),

          sku:
            s(row.sku),

          image_url:
            s(row.image_url),

          created_at:
            s(row.created_at),

          updated_at:
            s(row.updated_at),
        }),
      );
    },

  saveVariant:
    async (p: {
      product_id: string;
      variant_name: string;
      details?: JsonObject;
      barcode?: string;
      sku?: string;
      image_url?: string;
      warehouse: string;
      price: number;
      purchase_price?: number;
      selling_price?: number | null;
      stock_qty: number;
    }) => {
      if (!p.product_id) {
        throw new ApiError(
          "PRODUCT_ID_REQUIRED",
        );
      }

      if (!p.variant_name?.trim()) {
        throw new ApiError(
          "VARIANT_NAME_REQUIRED",
        );
      }

      if (!p.warehouse?.trim()) {
        throw new ApiError(
          "WAREHOUSE_REQUIRED",
        );
      }

      /* Verify parent product */

      const {
        data: parent,
        error: parentError,
      } = await supabase
        .from("product_catalog")
        .select("*")
        .eq(
          "product_id",
          p.product_id,
        )
        .maybeSingle();

      if (parentError) {
        throw supabaseError(
          parentError,
        );
      }

      if (!parent) {
        throw new ApiError(
          "PARENT_PRODUCT_NOT_FOUND",
        );
      }

      const variantId =
        makeId("VAR");

      const barcode =
        p.barcode?.trim() ||
        variantId;

      const sku =
        p.sku?.trim() || "";

      const stockQty =
        Math.max(
          0,
          n(p.stock_qty),
        );

      const purchasePrice =
        Math.max(
          0,
          n(p.purchase_price),
        );

      const salePrice =
        Math.max(
          0,
          n(p.price),
        );

      const sellingPrice =
        p.selling_price === null ||
        p.selling_price === undefined
          ? null
          : Math.max(
              0,
              n(p.selling_price),
            );

      /* Create variant */

      const {
        error: variantError,
      } = await supabase
        .from("product_variants")
        .insert({
          variant_id: variantId,

          product_id:
            p.product_id,

          variant_name:
            p.variant_name.trim(),

          details:
            normalizeDetails(
              p.details,
            ),

          barcode,

          sku: sku || null,

          image_url:
            p.image_url?.trim() || "",

        });

      if (variantError) {
        throw supabaseError(
          variantError,
        );
      }

      /* Create inventory record */

      const {
        error: inventoryError,
      } = await supabase
        .from("inventory")
        .insert({
          product_id:
            variantId,

          product_name:
            p.variant_name.trim(),

          barcode,

          image_url:
            p.image_url?.trim() || "",

          warehouse:
            p.warehouse.trim(),

          purchase_price:
            purchasePrice,

          sale_price:
            salePrice,

          selling_price:
            sellingPrice,

          stock_qty:
            stockQty,

          stock_purchase_value:
            purchasePrice * stockQty,

          stock_sale_value:
            salePrice * stockQty,

          sold_qty: 0,

          sales_value: 0,

          remaining_qty:
            stockQty,
        });

      if (inventoryError) {
        /* Roll back variant if inventory failed */

        await supabase
          .from("product_variants")
          .delete()
          .eq(
            "variant_id",
            variantId,
          );

        throw supabaseError(
          inventoryError,
        );
      }

      /* Mark parent as having variants */

      await supabase
        .from("product_catalog")
        .update({
          has_variants: true,
          updated_at:
            new Date().toISOString(),
        })
        .eq(
          "product_id",
          p.product_id,
        );

      return {
        variant_id: variantId,
        product_id:
          p.product_id,
        barcode,
        sku,
      };
    },

  updateVariant:
    async (p: {
      variant_id: string;
      variant_name?: string;
      details?: JsonObject;
      barcode?: string;
      sku?: string;
      image_url?: string;
      price?: number;
      purchase_price?: number;
      selling_price?: number | null;
      stock_qty?: number;
    }) => {
      if (!p.variant_id) {
        throw new ApiError(
          "VARIANT_ID_REQUIRED",
        );
      }

      const update: Record<
        string,
        unknown
      > = {};

      if (
        p.variant_name !==
        undefined
      ) {
        const name =
          p.variant_name.trim();

        if (!name) {
          throw new ApiError(
            "VARIANT_NAME_REQUIRED",
          );
        }

        update.variant_name =
          name;
      }

      if (
        p.details !==
        undefined
      ) {
        update.details =
          normalizeDetails(
            p.details,
          );
      }

      if (
        p.barcode !==
        undefined
      ) {
        update.barcode =
          p.barcode.trim() ||
          null;
      }

      if (
        p.sku !==
        undefined
      ) {
        update.sku =
          p.sku.trim() ||
          null;
      }

      if (
        p.image_url !==
        undefined
      ) {
        update.image_url =
          p.image_url.trim();
      }

      update.updated_at =
        new Date().toISOString();

      const {
        data: variant,
        error,
      } = await supabase
        .from("product_variants")
        .update(update)
        .eq(
          "variant_id",
          p.variant_id,
        )
        .select("*")
        .maybeSingle();

      if (error) {
        throw supabaseError(error);
      }

      if (!variant) {
        throw new ApiError(
          "VARIANT_NOT_FOUND",
        );
      }

      /* Keep inventory synchronized */

      const inventoryUpdate: Record<
        string,
        unknown
      > = {};

      if (
        p.variant_name !==
        undefined
      ) {
        inventoryUpdate.product_name =
          p.variant_name.trim();
      }

      if (
        p.barcode !==
        undefined
      ) {
        inventoryUpdate.barcode =
          p.barcode.trim();
      }

      if (
        p.image_url !==
        undefined
      ) {
        inventoryUpdate.image_url =
          p.image_url.trim();
      }

      if (p.price !== undefined) {
        inventoryUpdate.sale_price = Math.max(0, n(p.price));
      }

      if (p.purchase_price !== undefined) {
        inventoryUpdate.purchase_price = Math.max(0, n(p.purchase_price));
      }

      if (p.selling_price !== undefined) {
        inventoryUpdate.selling_price =
          p.selling_price === null ? null : Math.max(0, n(p.selling_price));
      }

      if (p.stock_qty !== undefined) {
        const nextStock = Math.max(0, n(p.stock_qty));
        inventoryUpdate.stock_qty = nextStock;
        inventoryUpdate.remaining_qty = nextStock;
      }

      if (
        Object.keys(
          inventoryUpdate,
        ).length > 0
      ) {
        await supabase
          .from("inventory")
          .update(
            inventoryUpdate,
          )
          .eq(
            "product_id",
            p.variant_id,
          );
      }

      return {
        success: true,
        variant_id:
          p.variant_id,
      };
    },

  deleteVariant:
    async (
      variantId: string,
    ) => {
      if (!variantId) {
        throw new ApiError(
          "VARIANT_ID_REQUIRED",
        );
      }

      const {
        data: variant,
        error: fetchError,
      } = await supabase
        .from("product_variants")
        .select(
          "variant_id, product_id",
        )
        .eq(
          "variant_id",
          variantId,
        )
        .maybeSingle();

      if (fetchError) {
        throw supabaseError(
          fetchError,
        );
      }

      if (!variant) {
        throw new ApiError(
          "VARIANT_NOT_FOUND",
        );
      }

      /* Delete inventory record */

      const {
        error: inventoryError,
      } = await supabase
        .from("inventory")
        .delete()
        .eq(
          "product_id",
          variantId,
        );

      if (inventoryError) {
        throw supabaseError(
          inventoryError,
        );
      }

      /* Delete variant */

      const {
        error,
      } = await supabase
        .from("product_variants")
        .delete()
        .eq(
          "variant_id",
          variantId,
        );

      if (error) {
        throw supabaseError(error);
      }

      /* Check remaining variants */

      const {
        count,
      } = await supabase
        .from("product_variants")
        .select(
          "variant_id",
          {
            count: "exact",
            head: true,
          },
        )
        .eq(
          "product_id",
          s(variant.product_id),
        );

      if ((count ?? 0) === 0) {
        await supabase
          .from("product_catalog")
          .update({
            has_variants: false,
            updated_at:
              new Date().toISOString(),
          })
          .eq(
            "product_id",
            s(variant.product_id),
          );
      }

      return {
        success: true,
        variant_id:
          variantId,
      };
    },

  /* ==========================================================
     INVENTORY
     ========================================================== */

  inventory:
    async (): Promise<Product[]> => {
      const {
        data,
        error,
      } = await supabase
        .from("inventory")
        .select("*")
        .order(
          "created_at",
          {
            ascending: false,
          },
        );

      if (error) {
        throw supabaseError(error);
      }

      const rows =
        (data ?? []).filter(
          (row) =>
            s(row.product_id) !==
            "",
        );

      /*
       * Load product catalog data separately.
       *
       * We intentionally do this in a second query
       * to avoid breaking existing inventory rows.
       */

      const ids = Array.from(
        new Set(
          rows.map(
            (row) =>
              s(row.product_id),
          ),
        ),
      );

      let catalogMap =
        new Map<
          string,
          Record<string, unknown>
        >();

      if (ids.length > 0) {
        // Do not depend on an implicit Supabase relationship between
        // product_catalog and product_categories. Some existing SODFA
        // databases do not expose that FK relationship to PostgREST,
        // which can leave the Inventory query stuck/erroring even though
        // the inventory rows themselves are valid. Load the two tables
        // separately and join them in memory.
        const {
          data: catalogs,
          error: catalogError,
        } = await supabase
          .from("product_catalog")
          .select("*")
          .in("product_id", ids);

        if (catalogError) {
          // Inventory must remain usable even if an optional catalog row
          // is unavailable. The inventory data itself is the source of
          // truth for the Inventory screen.
          catalogMap = new Map();
        } else {
          catalogMap = new Map(
            (catalogs ?? []).map((catalog) => [
              s(catalog.product_id),
              catalog as Record<string, unknown>,
            ]),
          );

          const categoryIds = Array.from(
            new Set(
              (catalogs ?? [])
                .map((catalog) => s(catalog.category_id))
                .filter(Boolean),
            ),
          );

          if (categoryIds.length > 0) {
            const {
              data: categories,
              error: categoryError,
            } = await supabase
              .from("product_categories")
              .select("id, name")
              .in("id", categoryIds);

            if (!categoryError) {
              const categoryMap = new Map(
                (categories ?? []).map((category) => [
                  s(category.id),
                  s(category.name),
                ]),
              );

              for (const [productId, catalog] of catalogMap) {
                const categoryId = s(catalog.category_id);
                if (categoryId) {
                  catalog.product_categories = {
                    id: categoryId,
                    name: categoryMap.get(categoryId) ?? "",
                  };
                }
              }
            }
          }
        }
      }

      const imageMap =
        new Map<
          string,
          {
            image_urls: string[];
            primary_image_url: string;
          }
        >();

      if (ids.length > 0) {
        const {
          data: productImages,
          error: imageError,
        } = await supabase
          .from("product_images")
          .select(
            "product_id, image_url, sort_order, is_primary",
          )
          .in("product_id", ids)
          .order("sort_order", {
            ascending: true,
          });

        // Keep inventory usable on databases that have not run
        // the optional product_images migration yet.
        if (!imageError) {
          for (const image of productImages ?? []) {
            const productId =
              s(image.product_id);
            const imageUrl =
              s(image.image_url).trim();

            if (!productId || !imageUrl) {
              continue;
            }

            const current =
              imageMap.get(productId) ?? {
                image_urls: [],
                primary_image_url: "",
              };

            if (
              !current.image_urls.includes(
                imageUrl,
              )
            ) {
              current.image_urls.push(
                imageUrl,
              );
            }

            if (
              image.is_primary === true ||
              !current.primary_image_url
            ) {
              if (
                image.is_primary === true
              ) {
                current.primary_image_url =
                  imageUrl;
              }
            }

            imageMap.set(
              productId,
              current,
            );
          }
        }
      }

      return rows.map(
        (row) => {
          const catalog =
            catalogMap.get(
              s(row.product_id),
            );

          const category =
            catalog?.product_categories as
              | {
                  name?: string;
                }
              | null
              | undefined;

          return normalizeProduct({
            ...(row as Record<
              string,
              unknown
            >),

            name_ar:
              catalog?.name_ar,

            name_en:
              catalog?.name_en,

            description:
              catalog?.description,

            keywords:
              catalog?.keywords,

            category_id:
              catalog?.category_id,

            category_name:
              category?.name,

            has_variants:
              catalog?.has_variants,

            image_urls:
              imageMap.get(
                s(row.product_id),
              )?.image_urls,

            primary_image_url:
              imageMap.get(
                s(row.product_id),
              )?.primary_image_url,
          });
        },
      );
    },

  /* ==========================================================
     SAVE PRODUCT
     ========================================================== */

  saveProduct:
    async (p: {
      product_name: string;
      name_ar?: string;
      name_en?: string;
      description?: string;
      keywords?: string[];
      category_id?: string | null;
      has_variants?: boolean;

      barcode?: string;
      price: number;
      stock_qty: number;
      sold_qty?: number;
      warehouse: string;
      image_url?: string;
      purchase_price?: number;
      selling_price?: number | null;
    }) => {
      const fallbackName =
        p.product_name?.trim();

      const nameAr =
        p.name_ar?.trim() || "";

      const nameEn =
        p.name_en?.trim() || "";

      const finalProductName =
        fallbackName ||
        nameAr ||
        nameEn;

      if (!finalProductName) {
        throw new ApiError(
          "PRODUCT_NAME_REQUIRED",
        );
      }

      if (!p.warehouse?.trim()) {
        throw new ApiError(
          "WAREHOUSE_REQUIRED",
        );
      }

      const product_id =
        makeId("PRD");

      const barcode =
        p.barcode?.trim() ||
        product_id;

      const stockQty =
        Math.max(
          0,
          n(p.stock_qty),
        );

      const soldQty =
        Math.min(
          stockQty,
          Math.max(
            0,
            n(p.sold_qty),
          ),
        );

      const remainingQty =
        Math.max(
          0,
          stockQty - soldQty,
        );

      const purchasePrice =
        Math.max(
          0,
          n(p.purchase_price),
        );

      const salePrice =
        Math.max(
          0,
          n(p.price),
        );

      const sellingPrice =
        p.selling_price === null ||
        p.selling_price === undefined
          ? null
          : Math.max(
              0,
              n(p.selling_price),
            );

      /*
       * First create the product catalog.
       */

      const {
        error: catalogError,
      } = await supabase
        .from("product_catalog")
        .insert({
          product_id,

          name_ar:
            nameAr || null,

          name_en:
            nameEn || null,

          description:
            p.description?.trim() ||
            null,

          keywords:
            normalizeKeywords(
              p.keywords,
            ),

          category_id:
            p.category_id || null,

          has_variants:
            p.has_variants === true,
        });

      if (catalogError) {
        throw supabaseError(
          catalogError,
        );
      }

      /*
       * Then create inventory record.
       */

      const row = {
        product_id,

        product_name:
          finalProductName,

        barcode,

        image_url:
          p.image_url?.trim() ||
          "",

        warehouse:
          p.warehouse.trim(),

        purchase_price:
          purchasePrice,

        sale_price:
          salePrice,

        selling_price:
          sellingPrice,

        stock_qty:
          stockQty,

        stock_purchase_value:
          purchasePrice *
          stockQty,

        stock_sale_value:
          salePrice *
          stockQty,

        sold_qty:
          soldQty,

        sales_value:
          salePrice *
          soldQty,

        remaining_qty:
          remainingQty,
      };

      const {
        data,
        error,
      } = await supabase
        .from("inventory")
        .insert(row)
        .select(
          "product_id, barcode",
        )
        .single();

      if (error) {
        /*
         * Roll back catalog if inventory failed.
         */

        await supabase
          .from("product_catalog")
          .delete()
          .eq(
            "product_id",
            product_id,
          );

        throw supabaseError(error);
      }

      const imageUrls =
        cleanImageUrls(p.image_urls);

      if (imageUrls.length > 0) {
        try {
          await syncProductImages(
            product_id,
            imageUrls,
            p.primary_image_url ||
              p.image_url,
          );
        } catch (imageError) {
          // Roll back the newly created product so a failed
          // image record never leaves a half-created product.
          await supabase
            .from("inventory")
            .delete()
            .eq(
              "product_id",
              product_id,
            );

          await supabase
            .from("product_catalog")
            .delete()
            .eq(
              "product_id",
              product_id,
            );

          throw imageError;
        }
      }

      return {
        product_id:
          s(data?.product_id) ||
          product_id,

        barcode:
          s(data?.barcode) ||
          barcode,
      };
    },

  /* ==========================================================
     UPDATE PRODUCT
     ========================================================== */

  updateProduct:
    async (p: {
      product_id: string;

      product_name?: string;

      name_ar?: string;
      name_en?: string;
      description?: string;
      keywords?: string[];
      category_id?: string | null;
      has_variants?: boolean;

      barcode?: string;
      price?: number;
      purchase_price?: number;
      selling_price?: number | null;
      stock_qty?: number;
      sold_qty?: number;
      warehouse?: string;
      image_url?: string;
    }) => {
      if (!p.product_id) {
        throw new ApiError(
          "PRODUCT_ID_REQUIRED",
        );
      }

      /*
       * Inventory can contain more than one row for the same
       * product when warehouses are used.
       *
       * For compatibility with the existing system we keep
       * the existing single-row behavior here.
       */

      const {
        data: current,
        error: fetchError,
      } = await supabase
        .from("inventory")
        .select("*")
        .eq(
          "product_id",
          p.product_id,
        )
        .limit(1)
        .maybeSingle();

      if (fetchError) {
        throw supabaseError(
          fetchError,
        );
      }

      if (!current) {
        throw new ApiError(
          "PRODUCT_NOT_FOUND",
        );
      }

      const currentStock =
        n(current.stock_qty);

      const currentSold =
        n(current.sold_qty);

      const nextStock =
        p.stock_qty !== undefined
          ? Math.max(
              0,
              n(p.stock_qty),
            )
          : currentStock;

      const nextSold =
        p.sold_qty !== undefined
          ? Math.max(
              0,
              n(p.sold_qty),
            )
          : currentSold;

      if (nextSold > nextStock) {
        throw new ApiError(
          "SOLD_QUANTITY_CANNOT_EXCEED_STOCK",
        );
      }

      const nextSalePrice =
        p.price !== undefined
          ? Math.max(
              0,
              n(p.price),
            )
          : n(current.sale_price);

      const nextPurchasePrice =
        p.purchase_price !==
        undefined
          ? Math.max(
              0,
              n(p.purchase_price),
            )
          : n(
              current.purchase_price,
            );

      const nextSellingPrice =
        p.selling_price === undefined
          ? current.selling_price === null ||
            current.selling_price === undefined
            ? null
            : Math.max(
                0,
                n(
                  current.selling_price,
                ),
              )
          : p.selling_price === null
            ? null
            : Math.max(
                0,
                n(p.selling_price),
              );

      const update: Record<
        string,
        unknown
      > = {};

      /*
       * Legacy product name
       */

      if (
        p.product_name !==
        undefined
      ) {
        const name =
          p.product_name.trim();

        if (!name) {
          throw new ApiError(
            "PRODUCT_NAME_REQUIRED",
          );
        }

        update.product_name =
          name;
      }

      if (
        p.barcode !==
        undefined
      ) {
        update.barcode =
          p.barcode.trim();
      }

      if (
        p.price !==
        undefined
      ) {
        update.sale_price =
          nextSalePrice;
      }

      if (
        p.selling_price !==
        undefined
      ) {
        update.selling_price =
          nextSellingPrice;
      }

      if (
        p.purchase_price !==
        undefined
      ) {
        update.purchase_price =
          nextPurchasePrice;
      }

      if (
        p.stock_qty !==
        undefined
      ) {
        update.stock_qty =
          nextStock;
      }

      if (
        p.sold_qty !==
        undefined
      ) {
        update.sold_qty =
          nextSold;
      }

      if (
        p.warehouse !==
        undefined
      ) {
        if (
          !p.warehouse.trim()
        ) {
          throw new ApiError(
            "WAREHOUSE_REQUIRED",
          );
        }

        update.warehouse =
          p.warehouse.trim();
      }

      if (
        p.image_url !==
        undefined
      ) {
        update.image_url =
          p.image_url.trim();
      }

      update.remaining_qty =
        Math.max(
          0,
          nextStock -
            nextSold,
        );

      update.stock_purchase_value =
        nextPurchasePrice *
        nextStock;

      update.stock_sale_value =
        nextSalePrice *
        nextStock;

      const {
        error,
      } = await supabase
        .from("inventory")
        .update(update)
        .eq(
          "product_id",
          p.product_id,
        );

      if (error) {
        throw supabaseError(error);
      }

      /*
       * Update catalog data.
       */

      const catalogUpdate: Record<
        string,
        unknown
      > = {};

      if (
        p.name_ar !==
        undefined
      ) {
        catalogUpdate.name_ar =
          p.name_ar.trim() ||
          null;
      }

      if (
        p.name_en !==
        undefined
      ) {
        catalogUpdate.name_en =
          p.name_en.trim() ||
          null;
      }

      if (
        p.description !==
        undefined
      ) {
        catalogUpdate.description =
          p.description.trim() ||
          null;
      }

      if (
        p.keywords !==
        undefined
      ) {
        catalogUpdate.keywords =
          normalizeKeywords(
            p.keywords,
          );
      }

      if (
        p.category_id !==
        undefined
      ) {
        catalogUpdate.category_id =
          p.category_id ||
          null;
      }

      if (
        p.has_variants !==
        undefined
      ) {
        catalogUpdate.has_variants =
          p.has_variants;
      }

      /*
       * If catalog record does not exist yet,
       * create it for an old product.
       */

      if (
        Object.keys(
          catalogUpdate,
        ).length > 0
      ) {
        catalogUpdate.updated_at =
          new Date().toISOString();

        const {
          data: catalog,
          error: catalogFetchError,
        } = await supabase
          .from("product_catalog")
          .select("product_id")
          .eq(
            "product_id",
            p.product_id,
          )
          .maybeSingle();

        if (catalogFetchError) {
          throw supabaseError(
            catalogFetchError,
          );
        }

        if (!catalog) {
          await supabase
            .from("product_catalog")
            .insert({
              product_id:
                p.product_id,

              name_ar:
                p.name_ar?.trim() ||
                current.product_name ||
                null,

              name_en:
                p.name_en?.trim() ||
                null,

              description:
                p.description?.trim() ||
                null,

              keywords:
                normalizeKeywords(
                  p.keywords,
                ),

              category_id:
                p.category_id ||
                null,

              has_variants:
                p.has_variants === true,
            });
        } else {
          const {
            error:
              catalogUpdateError,
          } = await supabase
            .from("product_catalog")
            .update(
              catalogUpdate,
            )
            .eq(
              "product_id",
              p.product_id,
            );

          if (catalogUpdateError) {
            throw supabaseError(
              catalogUpdateError,
            );
          }
        }
      }

      if (
        p.image_urls !== undefined
      ) {
        await syncProductImages(
          p.product_id,
          p.image_urls,
          p.primary_image_url ||
            p.image_url,
        );
      }

      return {
        success: true,
      };
    },

  /* ==========================================================
     DELETE PRODUCT
     ========================================================== */

  deleteProduct:
    async (
      product_id: string,
    ) => {
      const productId =
        s(product_id).trim();

      if (!productId) {
        throw new ApiError(
          "PRODUCT_ID_REQUIRED",
        );
      }

      /* --------------------------------------------------------
         CHECK IF THIS IS A VARIANT
         -------------------------------------------------------- */

      const {
        data: variant,
        error: variantFetchError,
      } = await supabase
        .from("product_variants")
        .select("variant_id")
        .eq(
          "variant_id",
          productId,
        )
        .maybeSingle();

      if (variantFetchError) {
        throw supabaseError(
          variantFetchError,
        );
      }

      if (variant) {
        return await api.deleteVariant(
          productId,
        );
      }

      /* --------------------------------------------------------
         VERIFY PRODUCT EXISTS
         -------------------------------------------------------- */

      const {
        data: inventoryRows,
        error: inventoryFetchError,
      } = await supabase
        .from("inventory")
        .select("product_id")
        .eq(
          "product_id",
          productId,
        );

      if (inventoryFetchError) {
        throw supabaseError(
          inventoryFetchError,
        );
      }

      const {
        data: catalogRow,
        error: catalogFetchError,
      } = await supabase
        .from("product_catalog")
        .select("product_id")
        .eq(
          "product_id",
          productId,
        )
        .maybeSingle();

      if (catalogFetchError) {
        throw supabaseError(
          catalogFetchError,
        );
      }

      if (
        (!inventoryRows ||
          inventoryRows.length === 0) &&
        !catalogRow
      ) {
        throw new ApiError(
          "PRODUCT_NOT_FOUND",
        );
      }

      /* --------------------------------------------------------
         DELETE PRODUCT IMAGES
         -------------------------------------------------------- */


      /* --------------------------------------------------------
         DELETE INVENTORY
         -------------------------------------------------------- */

      if (
        inventoryRows &&
        inventoryRows.length > 0
      ) {
        const {
          data: deletedInventory,
          error: inventoryDeleteError,
        } = await supabase
          .from("inventory")
          .delete()
          .eq(
            "product_id",
            productId,
          )
          .select("product_id");

        if (inventoryDeleteError) {
          throw supabaseError(
            inventoryDeleteError,
          );
        }

        if (
          (deletedInventory?.length ?? 0) === 0
        ) {
          throw new ApiError(
            "INVENTORY_DELETE_NOT_ALLOWED_OR_NO_ROWS_DELETED",
          );
        }
      }

      /* --------------------------------------------------------
         DELETE PRODUCT VARIANTS
         -------------------------------------------------------- */

      const {
        data: variants,
        error: variantsFetchError,
      } = await supabase
        .from("product_variants")
        .select("variant_id")
        .eq(
          "product_id",
          productId,
        );

      if (variantsFetchError) {
        throw supabaseError(
          variantsFetchError,
        );
      }

      for (const variant of variants ?? []) {
        const variantId =
          s(variant.variant_id).trim();

        if (!variantId) {
          continue;
        }

        /* Delete variant inventory */

        const {
          error: variantInventoryError,
        } = await supabase
          .from("inventory")
          .delete()
          .eq(
            "product_id",
            variantId,
          );

        if (variantInventoryError) {
          throw supabaseError(
            variantInventoryError,
          );
        }

        /* Delete variant images */

      

        /* Delete variant */

        const {
          error: variantDeleteError,
        } = await supabase
          .from("product_variants")
          .delete()
          .eq(
            "variant_id",
            variantId,
          );

        if (variantDeleteError) {
          throw supabaseError(
            variantDeleteError,
          );
        }
      }

      /* --------------------------------------------------------
         DELETE PRODUCT CATALOG
         -------------------------------------------------------- */

      if (catalogRow) {
        const {
          data: deletedCatalog,
          error: catalogDeleteError,
        } = await supabase
          .from("product_catalog")
          .delete()
          .eq(
            "product_id",
            productId,
          )
          .select("product_id");

        if (catalogDeleteError) {
          throw supabaseError(
            catalogDeleteError,
          );
        }

        if (
          (deletedCatalog?.length ?? 0) === 0
        ) {
          throw new ApiError(
            "PRODUCT_CATALOG_DELETE_NOT_ALLOWED_OR_NO_ROWS_DELETED",
          );
        }
      }

      /* --------------------------------------------------------
         FINAL VERIFICATION
         -------------------------------------------------------- */

      const {
        data: remainingInventory,
        error: finalInventoryError,
      } = await supabase
        .from("inventory")
        .select("product_id")
        .eq(
          "product_id",
          productId,
        )
        .limit(1);

      if (finalInventoryError) {
        throw supabaseError(
          finalInventoryError,
        );
      }

      const {
        data: remainingCatalog,
        error: finalCatalogError,
      } = await supabase
        .from("product_catalog")
        .select("product_id")
        .eq(
          "product_id",
          productId,
        )
        .limit(1);

      if (finalCatalogError) {
        throw supabaseError(
          finalCatalogError,
        );
      }

      if (
        (remainingInventory?.length ?? 0) > 0 ||
        (remainingCatalog?.length ?? 0) > 0
      ) {
        throw new ApiError(
          "PRODUCT_DELETE_VERIFICATION_FAILED",
        );
      }

      return {
        success: true,
        product_id: productId,
      };
    },

  /* ==========================================================
     WAREHOUSES
     ========================================================== */

  warehouses:
    async (): Promise<
      Warehouse[]
    > => {
      const {
        data,
        error,
      } = await supabase
        .from("warehouses")
        .select("*")
        .order(
          "warehouse_name",
          {
            ascending: true,
          },
        );

      if (error) {
        throw supabaseError(
          error,
        );
      }

      const all =
        (data ?? [])
          .filter(
            (w) =>
              s(
                w.warehouse_id,
              ) !== "",
          )
          .map((w) => ({
            warehouse_id:
              s(
                w.warehouse_id,
              ),

            warehouse_name:
              s(
                w.warehouse_name,
              ) ||
              s(
                w.warehouse_id,
              ),

            active:
              w.active !== false,

            created_at:
              s(
                w.created_at,
              ),

            updated_at:
              s(
                w.updated_at,
              ),
          }));

      const active =
        all.filter(
          (w) => w.active,
        );

      return active.length
        ? active
        : all.map((w) => ({
            ...w,
            active: true,
          }));
    },

  /* ==========================================================
     SAVE WAREHOUSE
     ========================================================== */

  saveWarehouse:
    async (
      warehouse_name: string,
    ) => {
      const name =
        warehouse_name.trim();

      if (!name) {
        throw new ApiError(
          "WAREHOUSE_NAME_REQUIRED",
        );
      }

      const warehouse_id =
        makeId("WH");

      const {
        data,
        error,
      } = await supabase
        .from("warehouses")
        .insert({
          warehouse_id,
          warehouse_name:
            name,
          active: true,
        })
        .select(
          "warehouse_id",
        )
        .single();

      if (error) {
        throw supabaseError(
          error,
        );
      }

      return {
        warehouse_id:
          s(
            data?.warehouse_id,
          ) ||
          warehouse_id,
      };
    },

  /* ==========================================================
     UPDATE WAREHOUSE
     ========================================================== */

  updateWarehouse:
    async (
      warehouse_id: string,
      warehouse_name: string,
    ) => {
      if (!warehouse_id) {
        throw new ApiError(
          "WAREHOUSE_ID_REQUIRED",
        );
      }

      const name =
        warehouse_name.trim();

      if (!name) {
        throw new ApiError(
          "WAREHOUSE_NAME_REQUIRED",
        );
      }

      const {
        error,
      } = await supabase
        .from("warehouses")
        .update({
          warehouse_name:
            name,
        })
        .eq(
          "warehouse_id",
          warehouse_id,
        );

      if (error) {
        throw supabaseError(
          error,
        );
      }

      return {
        success: true,
      };
    },

  /* ==========================================================
     DELETE WAREHOUSE
     ========================================================== */

  deleteWarehouse:
    async (
      warehouse_id: string,
    ) => {
      if (!warehouse_id) {
        throw new ApiError(
          "WAREHOUSE_ID_REQUIRED",
        );
      }

      const {
        error,
      } = await supabase
        .from("warehouses")
        .delete()
        .eq(
          "warehouse_id",
          warehouse_id,
        );

      if (error) {
        throw supabaseError(
          error,
        );
      }

      return {
        success: true,
      };
    },

  /* ==========================================================
     SALES
     ========================================================== */

  sales:
    async (): Promise<Sale[]> => {
      const {
        data,
        error,
      } = await supabase
        .from("sales")
        .select("*")
        .order(
          "created_at",
          {
            ascending: false,
          },
        );

      if (error) {
        throw supabaseError(
          error,
        );
      }

      return (data ?? [])
        .filter(
          (row) =>
            s(row.sale_id) !==
            "",
        )
        .map((row) =>
          normalizeSale(
            row as Record<
              string,
              unknown
            >,
          ),
        );
    },

  /* ==========================================================
     RECORD SALE
     ========================================================== */

  recordSale:
    async (p: {
      product_id: string;
      qty: number;
      warehouse?: string;
    }) => {
      const qty =
        Math.max(
          0,
          n(p.qty),
        );

      if (qty <= 0) {
        throw new ApiError(
          "INVALID_QUANTITY",
        );
      }

      if (!p.product_id) {
        throw new ApiError(
          "PRODUCT_ID_REQUIRED",
        );
      }

      const {
        data: product,
        error:
          productError,
      } = await supabase
        .from("inventory")
        .select("*")
        .eq(
          "product_id",
          p.product_id,
        )
        .limit(1)
        .maybeSingle();

      if (productError) {
        throw supabaseError(
          productError,
        );
      }

      if (!product) {
        throw new ApiError(
          "PRODUCT_NOT_FOUND",
        );
      }

      const remaining =
        Math.max(
          0,
          n(
            product.remaining_qty,
          ),
        );

      if (qty > remaining) {
        throw new ApiError(
          "INSUFFICIENT_STOCK",
        );
      }

      const unitPrice =
        product.selling_price !==
          null &&
        product.selling_price !==
          undefined &&
        product.selling_price !==
          ""
          ? Math.max(
              0,
              n(
                product.selling_price,
              ),
            )
          : Math.max(
              0,
              n(
                product.sale_price,
              ),
            );

      const newSold =
        n(product.sold_qty) +
        qty;

      const newRemaining =
        Math.max(
          0,
          remaining - qty,
        );

      const total =
        unitPrice * qty;

      const sale_id =
         makeId("SODFA-SAL");

      const saleDate =
        today();

      const saleTime =
        currentTime();

      const warehouse =
        p.warehouse?.trim() ||
        s(product.warehouse);

      if (!warehouse) {
        throw new ApiError(
          "WAREHOUSE_REQUIRED",
        );
      }

      const {
        error: saleError,
      } = await supabase
        .from("sales")
        .insert({
          sale_id,

          product_id:
            p.product_id,

          product_name:
            s(
              product.product_name,
            ),

          barcode:
            s(product.barcode),

          warehouse,

          qty,

          unit_sale_price:
            unitPrice,

          total_sale_value:
            total,

          sale_date:
            saleDate,

          sale_time:
            saleTime,

          unit_price:
            unitPrice,

          total_value:
            total,
        });

      if (saleError) {
        throw supabaseError(
          saleError,
        );
      }

      const {
        error:
          inventoryError,
      } = await supabase
        .from("inventory")
        .update({
          sold_qty:
            newSold,

          remaining_qty:
            newRemaining,

          sales_value:
            n(
              product.sales_value,
            ) + total,

          last_sale_date:
            new Date().toISOString(),
        })
        .eq(
          "product_id",
          p.product_id,
        );

      if (inventoryError) {
        throw supabaseError(
          inventoryError,
        );
      }

      return {
        sale_id,
      };
    },

  /* ==========================================================
     RETURNS
     ========================================================== */

  returns:
    async (): Promise<
      ReturnRecord[]
    > => {
      const {
        data,
        error,
      } = await supabase
        .from("returns")
        .select("*")
        .order(
          "created_at",
          {
            ascending: false,
          },
        );

      if (error) {
        throw supabaseError(
          error,
        );
      }

      return (data ?? [])
        .filter(
          (row) =>
            s(row.return_id) !==
            "",
        )
        .map((row) =>
          normalizeReturn(
            row as Record<
              string,
              unknown
            >,
          ),
        );
    },

  /* ==========================================================
     RECORD RETURN
     ========================================================== */

  recordReturn:
    async (p: {
      product_id: string;
      qty: number;
      warehouse?: string;
      return_reason?: string;
      notes?: string;
      product_image?: string;
      invoice_image?: string;
      delivery_note_image?: string;
    }) => {
      const qty =
        Math.max(
          0,
          n(p.qty),
        );

      if (qty <= 0) {
        throw new ApiError(
          "INVALID_QUANTITY",
        );
      }

      if (!p.product_id) {
        throw new ApiError(
          "PRODUCT_ID_REQUIRED",
        );
      }

      const {
        data: product,
        error:
          productError,
      } = await supabase
        .from("inventory")
        .select("*")
        .eq(
          "product_id",
          p.product_id,
        )
        .limit(1)
        .maybeSingle();

      if (productError) {
        throw supabaseError(
          productError,
        );
      }

      if (!product) {
        throw new ApiError(
          "PRODUCT_NOT_FOUND",
        );
      }

      const currentSold =
        Math.max(
          0,
          n(product.sold_qty),
        );

      if (qty > currentSold) {
        throw new ApiError(
          "RETURN_QUANTITY_EXCEEDS_SOLD_QUANTITY",
        );
      }

      const currentRemaining =
        Math.max(
          0,
          n(
            product.remaining_qty,
          ),
        );

      const price =
        product.selling_price !==
          null &&
        product.selling_price !==
          undefined &&
        product.selling_price !==
          ""
          ? Math.max(
              0,
              n(
                product.selling_price,
              ),
            )
          : Math.max(
              0,
              n(
                product.sale_price,
              ),
            );

      const newSold =
        Math.max(
          0,
          currentSold - qty,
        );

      const newRemaining =
        currentRemaining + qty;

      const returnTotal =
        price * qty;

      const return_id =
        makeId("RET");

      const warehouse =
        p.warehouse?.trim() ||
        s(product.warehouse);

      if (!warehouse) {
        throw new ApiError(
          "WAREHOUSE_REQUIRED",
        );
      }

      const {
        error,
      } = await supabase
        .from("returns")
        .insert({
          return_id,

          product_id:
            p.product_id,

          product_name:
            s(
              product.product_name,
            ),

          barcode:
            s(product.barcode),

          warehouse,

          qty,

          unit_sale_price:
            price,

          return_total:
            returnTotal,

          product_image:
            p.product_image ??
            s(product.image_url),

          invoice_image:
            p.invoice_image ??
            "",

          delivery_note_image:
            p.delivery_note_image ??
            "",

          return_reason:
            p.return_reason ??
            "",

          notes:
            p.notes ?? "",

          return_date:
            today(),

          return_time:
            currentTime(),

          unit_price:
            price,
        });

      if (error) {
        throw supabaseError(
          error,
        );
      }

      const {
        error:
          inventoryError,
      } = await supabase
        .from("inventory")
        .update({
          sold_qty:
            newSold,

          remaining_qty:
            newRemaining,
        })
        .eq(
          "product_id",
          p.product_id,
        );

      if (inventoryError) {
        throw supabaseError(
          inventoryError,
        );
      }

      return {
        return_id,
      };
    },

  /* ==========================================================
     DELETE NORMAL RETURN
     ========================================================== */

  deleteReturn:
    async (
      return_id: string,
    ) => {
      const returnId =
        s(return_id).trim();

      if (!returnId) {
        throw new ApiError(
          "RETURN_ID_REQUIRED",
        );
      }

      const {
        data: returnRow,
        error:
          returnFetchError,
      } = await supabase
        .from("returns")
        .select(
          "return_id, product_id, qty",
        )
        .eq(
          "return_id",
          returnId,
        )
        .maybeSingle();

      if (returnFetchError) {
        throw supabaseError(
          returnFetchError,
        );
      }

      if (!returnRow) {
        throw new ApiError(
          "RETURN_NOT_FOUND",
        );
      }

      const productId =
        s(
          returnRow.product_id,
        ).trim();

      const qty =
        Math.max(
          0,
          n(returnRow.qty),
        );

      if (!productId) {
        throw new ApiError(
          "RETURN_PRODUCT_ID_MISSING",
        );
      }

      if (qty <= 0) {
        throw new ApiError(
          "RETURN_QUANTITY_INVALID",
        );
      }

      const {
        data: product,
        error: productError,
      } = await supabase
        .from("inventory")
        .select(
          "product_id, sold_qty, remaining_qty",
        )
        .eq(
          "product_id",
          productId,
        )
        .limit(1)
        .maybeSingle();

      if (productError) {
        throw supabaseError(
          productError,
        );
      }

      if (!product) {
        throw new ApiError(
          "PRODUCT_NOT_FOUND",
        );
      }

      const {
        error: deleteError,
      } = await supabase
        .from("returns")
        .delete()
        .eq(
          "return_id",
          returnId,
        );

      if (deleteError) {
        throw supabaseError(
          deleteError,
        );
      }

      const currentSold =
        Math.max(
          0,
          n(product.sold_qty),
        );

      const currentRemaining =
        Math.max(
          0,
          n(
            product.remaining_qty,
          ),
        );

      const restoredSold =
        Math.max(
          0,
          currentSold + qty,
        );

      const restoredRemaining =
        Math.max(
          0,
          currentRemaining - qty,
        );

      const {
        error:
          inventoryError,
      } = await supabase
        .from("inventory")
        .update({
          sold_qty:
            restoredSold,

          remaining_qty:
            restoredRemaining,
        })
        .eq(
          "product_id",
          productId,
        );

      if (inventoryError) {
        throw supabaseError(
          inventoryError,
        );
      }

      return {
        success: true,

        return_id:
          returnId,

        product_id:
          productId,

        qty,
      };
    },

  /* ==========================================================
     DAMAGED RETURNS
     ========================================================== */

  damagedReturns:
    async (): Promise<
      DamagedReturn[]
    > => {
      const {
        data,
        error,
      } = await supabase
        .from(
          "damaged_returns",
        )
        .select("*")
        .order(
          "created_at",
          {
            ascending: false,
          },
        );

      if (error) {
        throw supabaseError(
          error,
        );
      }

      return (data ?? [])
        .map((row) =>
          normalizeDamaged(
            row as Record<
              string,
              unknown
            >,
          ),
        )
        .filter(
          (row) =>
            row.damaged_return_id !==
            "",
        );
    },

  /* ==========================================================
     RECORD DAMAGED RETURN
     ========================================================== */

  recordDamagedReturn:
    async (p: {
      product_id: string;
      shipment_code: string;
      qty: number;
      warehouse?: string;
      damage_reason?: string;
      damage_details?: string;
      status?: DamagedStatus;
      policy_image?: string;
      product_image?: string;
      policy_product_image?: string;
      notes?: string;
    }) => {
      const qty =
        Math.max(
          0,
          n(p.qty),
        );

      if (qty <= 0) {
        throw new ApiError(
          "INVALID_QUANTITY",
        );
      }

      if (!p.product_id) {
        throw new ApiError(
          "PRODUCT_ID_REQUIRED",
        );
      }

      const {
        data: product,
        error:
          productError,
      } = await supabase
        .from("inventory")
        .select("*")
        .eq(
          "product_id",
          p.product_id,
        )
        .limit(1)
        .maybeSingle();

      if (productError) {
        throw supabaseError(
          productError,
        );
      }

      if (!product) {
        throw new ApiError(
          "PRODUCT_NOT_FOUND",
        );
      }

      const damaged_return_id =
        makeId("DMG");

      const warehouse =
        p.warehouse?.trim() ||
        s(product.warehouse);

      const status =
        p.status ??
        "Pending";

      const date =
        today();

      const time =
        currentTime();

      const policyImage =
        p.policy_image ??
        "";

      const productImage =
        p.product_image ??
        "";

      const combinedImage =
        p.policy_product_image ??
        "";

      const reason =
        p.damage_reason ??
        "";

      const details =
        p.damage_details ??
        "";

      const {
        data,
        error,
      } = await supabase
        .from(
          "damaged_returns",
        )
        .insert({
          damaged_return_id,

          product_id:
            p.product_id,

          product_name:
            s(
              product.product_name,
            ),

          barcode:
            s(product.barcode),

          shipment_code:
            p.shipment_code ??
            "",

          warehouse_id:
            warehouse,

          warehouse_name:
            warehouse,

          warehouse:
            warehouse,

          quantity:
            qty,

          return_date:
            date,

          return_time:
            time,

          damage_reason:
            reason,

          damage_details:
            details,

          policy_image_url:
            policyImage,

          product_image_url:
            productImage,

          policy_product_image_url:
            combinedImage,

          notes:
            p.notes ??
            "",

          status:
            status.toLowerCase(),

          police_image:
            policyImage,

          product_image:
            productImage,

          combined_return_image:
            combinedImage,

          reason,

          details,

          date,

          time,
        })
        .select(
          "damaged_return_id",
        )
        .single();

      if (error) {
        throw supabaseError(
          error,
        );
      }

      return {
        damaged_return_id:
          s(
            data?.damaged_return_id,
          ) ||
          damaged_return_id,
      };
    },

  /* ==========================================================
     UPDATE DAMAGED STATUS
     ========================================================== */

  updateDamagedStatus:
    async (
      damaged_return_id: string,
      status: DamagedStatus,
    ) => {
      if (!damaged_return_id) {
        throw new ApiError(
          "DAMAGED_RETURN_ID_REQUIRED",
        );
      }

      const normalized =
        status.toLowerCase();

      const allowed = [
        "pending",
        "accepted",
        "rejected",
      ];

      if (
        !allowed.includes(
          normalized,
        )
      ) {
        throw new ApiError(
          "INVALID_DAMAGED_STATUS",
        );
      }

      const {
        error,
      } = await supabase
        .from(
          "damaged_returns",
        )
        .update({
          status:
            normalized,
        })
        .eq(
          "damaged_return_id",
          damaged_return_id,
        );

      if (error) {
        throw supabaseError(
          error,
        );
      }

      return {
        success: true,
      };
    },

  /* ==========================================================
     DELETE DAMAGED RETURN
     ========================================================== */

  deleteDamagedReturn:
    async (
      damaged_return_id: string,
    ) => {
      if (!damaged_return_id) {
        throw new ApiError(
          "DAMAGED_RETURN_ID_REQUIRED",
        );
      }

      const {
        error,
      } = await supabase
        .from("damaged_returns")
        .delete()
        .eq(
          "damaged_return_id",
          damaged_return_id,
        );

      if (error) {
        throw supabaseError(
          error,
        );
      }

      return {
        success: true,
      };
    },

  /* ==========================================================
     IMAGE UPLOAD
     ========================================================== */

  uploadImage:
    async (
      file_base64: string,
      file_name: string,
      mime_type: string,
    ) => {
      if (!file_base64) {
        throw new ApiError(
          "IMAGE_DATA_REQUIRED",
        );
      }

      if (!file_name) {
        throw new ApiError(
          "IMAGE_FILE_NAME_REQUIRED",
        );
      }

      const cleanBase64 =
        file_base64.includes(",")
          ? file_base64.split(",")[1]
          : file_base64;

      let binary: string;

      try {
        binary =
          atob(cleanBase64);
      } catch {
        throw new ApiError(
          "INVALID_BASE64_IMAGE",
        );
      }

      const bytes =
        new Uint8Array(
          binary.length,
        );

      for (
        let i = 0;
        i < binary.length;
        i++
      ) {
        bytes[i] =
          binary.charCodeAt(i);
      }

      const safeName =
        file_name.replace(
          /[^a-zA-Z0-9._-]/g,
          "_",
        );

      const path =
        `${Date.now()}-${makeId(
          "IMG",
        )}-${safeName}`;

      const {
        error,
      } = await supabase.storage
        .from(
          IMAGE_BUCKET,
        )
        .upload(
          path,
          bytes,
          {
            contentType:
              mime_type ||
              "application/octet-stream",

            upsert: false,
          },
        );

      if (error) {
        throw supabaseError(
          error,
        );
      }

      const {
        data:
          publicUrlData,
      } =
        supabase.storage
          .from(
            IMAGE_BUCKET,
          )
          .getPublicUrl(
            path,
          );

      return {
        image_url:
          publicUrlData
            .publicUrl,

        file_id:
          path,
      };
    },
};
