/**
 * SODFA — centralized Supabase API service
 *
 * Source of truth:
 * Supabase
 *
 * Tables:
 * - inventory
 * - warehouses
 * - sales
 * - returns
 * - damaged_returns
 *
 * Google Sheets / Google Apps Script are NOT used.
 */

import { createClient } from "@supabase/supabase-js";

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
    "[SODFA] VITE_SUPABASE_PUBLISHABLE_KEY is missing."
  );
}

export const supabase = createClient(
  SUPABASE_URL,
  SUPABASE_PUBLISHABLE_KEY || ""
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
    /* ignore */
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
  } | null
): ApiError {
  const message =
    error?.message ||
    error?.details ||
    error?.hint ||
    "SUPABASE_ERROR";

  const code = error?.code
    ? ` [${error.code}]`
    : "";

  return new ApiError(
    `${message}${code}`
  );
}

/* ============================================================
   HELPERS
   ============================================================ */

type Params = Record<
  string,
  string | number | boolean | undefined | null
>;

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
      ""
    )
  );

  return Number.isFinite(x)
    ? x
    : 0;
}

function pick(
  row: Record<string, unknown>,
  keys: string[]
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

function makeId(
  prefix: string
): string {
  const uuid =
    typeof crypto !== "undefined" &&
    typeof crypto.randomUUID ===
      "function"
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
  value: unknown
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

/* ============================================================
   TYPES
   ============================================================ */

export interface Product {
  product_id: string;
  product_name: string;
  barcode: string;
  image_url: string;
  warehouse: string;

  purchase_price?: number;
  price: number;

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
   NORMALIZERS
   ============================================================ */

export function normalizeProduct(
  raw: Record<string, unknown>
): Product {
  const price = n(
    pick(raw, [
      "sale_price",
      "price",
      "unit_sale_price",
    ])
  );

  const stock = n(
    pick(raw, [
      "stock_qty",
      "total_stock",
      "quantity",
    ])
  );

  const sold = n(
    pick(raw, [
      "sold_qty",
      "sold",
    ])
  );

  const remainingRaw = pick(
    raw,
    [
      "remaining_qty",
      "remaining_stock",
      "remaining",
    ]
  );

  const remaining =
    remainingRaw === undefined
      ? Math.max(
          0,
          stock - sold
        )
      : Math.max(
          0,
          n(remainingRaw)
        );

  return {
    product_id: s(
      raw.product_id
    ),

    product_name: s(
      raw.product_name
    ),

    barcode:
      s(
        pick(raw, [
          "barcode",
        ])
      ) ||
      s(raw.product_id),

    image_url: s(
      pick(raw, [
        "image_url",
        "product_image",
        "product_image_url",
      ])
    ),

    warehouse: s(
      pick(raw, [
        "warehouse",
        "warehouse_id",
        "warehouse_name",
      ])
    ),

    purchase_price: n(
      raw.purchase_price
    ),

    price,

    stock_qty: stock,

    sold_qty: sold,

    remaining_qty: remaining,

    stock_purchase_value: n(
      raw.stock_purchase_value
    ),

    stock_sale_value: n(
      raw.stock_sale_value
    ),

    sales_value: n(
      raw.sales_value
    ),

    last_sale_date: s(
      raw.last_sale_date
    ),

    created_at: s(
      raw.created_at
    ),

    updated_at: s(
      raw.updated_at
    ),
  };
}

export function normalizeSale(
  raw: Record<string, unknown>
): Sale {
  const price = n(
    pick(raw, [
      "unit_sale_price",
      "price",
      "unit_price",
    ])
  );

  const qty = n(
    pick(raw, [
      "qty",
      "quantity",
    ])
  );

  const totalValue =
    pick(raw, [
      "total_sale_value",
      "total_value",
      "total",
    ]);

  const total =
    totalValue === undefined
      ? price * qty
      : n(totalValue);

  return {
    sale_id: s(
      raw.sale_id
    ),

    product_id: s(
      raw.product_id
    ),

    product_name: s(
      raw.product_name
    ),

    barcode: s(
      raw.barcode
    ),

    warehouse: s(
      pick(raw, [
        "warehouse",
        "warehouse_id",
        "warehouse_name",
      ])
    ),

    qty,

    price,

    total,

    sale_date: s(
      pick(raw, [
        "sale_date",
        "date",
        "created_at",
      ])
    ),

    sale_time: s(
      pick(raw, [
        "sale_time",
        "time",
      ])
    ),
  };
}

export function normalizeReturn(
  raw: Record<string, unknown>
): ReturnRecord {
  const price = n(
    pick(raw, [
      "unit_sale_price",
      "unit_price",
      "price",
    ])
  );

  const qty = n(
    pick(raw, [
      "qty",
      "quantity",
    ])
  );

  const totalRaw = pick(
    raw,
    [
      "return_total",
      "total",
    ]
  );

  const returnTotal =
    totalRaw === undefined
      ? price * qty
      : n(totalRaw);

  return {
    return_id: s(
      raw.return_id
    ),

    product_id: s(
      raw.product_id
    ),

    product_name: s(
      raw.product_name
    ),

    barcode: s(
      raw.barcode
    ),

    warehouse: s(
      raw.warehouse
    ),

    qty,

    price,

    return_total:
      returnTotal,

    product_image: s(
      pick(raw, [
        "product_image",
        "product_image_url",
      ])
    ),

    invoice_image: s(
      pick(raw, [
        "invoice_image",
        "invoice_image_url",
      ])
    ),

    delivery_note_image: s(
      pick(raw, [
        "delivery_note_image",
        "delivery_note_image_url",
      ])
    ),

    return_reason: s(
      pick(raw, [
        "return_reason",
        "reason",
      ])
    ),

    notes: s(
      raw.notes
    ),

    return_date: s(
      pick(raw, [
        "return_date",
        "date",
        "created_at",
      ])
    ),

    return_time: s(
      pick(raw, [
        "return_time",
        "time",
      ])
    ),
  };
}

export function normalizeDamaged(
  raw: Record<string, unknown>
): DamagedReturn {
  return {
    damaged_return_id: s(
      raw.damaged_return_id
    ),

    shipment_code: s(
      raw.shipment_code
    ),

    product_id: s(
      raw.product_id
    ),

    product_name: s(
      raw.product_name
    ),

    barcode: s(
      raw.barcode
    ),

    warehouse: s(
      pick(raw, [
        "warehouse",
        "warehouse_name",
        "warehouse_id",
      ])
    ),

    qty: n(
      pick(raw, [
        "quantity",
        "qty",
      ])
    ),

    damage_reason: s(
      pick(raw, [
        "damage_reason",
        "reason",
      ])
    ),

    damage_details: s(
      pick(raw, [
        "damage_details",
        "details",
        "notes",
      ])
    ),

    status:
      normalizeStatus(
        raw.status
      ),

    policy_image: s(
      pick(raw, [
        "policy_image_url",
        "police_image",
        "policy_image",
      ])
    ),

    product_image: s(
      pick(raw, [
        "product_image_url",
        "product_image",
      ])
    ),

    policy_product_image: s(
      pick(raw, [
        "policy_product_image_url",
        "combined_return_image",
        "policy_product_image",
      ])
    ),

    return_date: s(
      pick(raw, [
        "return_date",
        "date",
        "created_at",
      ])
    ),

    return_time: s(
      pick(raw, [
        "return_time",
        "time",
      ])
    ),
  };
}

/* ============================================================
   COMPATIBILITY GET
   ============================================================ */

export async function apiGet<T>(
  action: string | null,
  params: Params = {}
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

    default:
      throw new ApiError(
        `UNKNOWN_GET_ACTION: ${action}`
      );
  }
}

/* ============================================================
   COMPATIBILITY POST
   ============================================================ */

export async function apiPost<T>(
  action: string,
  params: Params = {}
): Promise<T> {
  switch (action) {
    case "save_product":
      return (await api.saveProduct({
        product_name:
          s(params.product_name),

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
      })) as T;

    case "update_product":
      return (await api.updateProduct({
        product_id:
          s(params.product_id),

        product_name:
          params.product_name !==
          undefined
            ? s(params.product_name)
            : undefined,

        barcode:
          params.barcode !==
          undefined
            ? s(params.barcode)
            : undefined,

        price:
          params.price !==
          undefined
            ? n(params.price)
            : undefined,

        stock_qty:
          params.stock_qty !==
          undefined
            ? n(params.stock_qty)
            : undefined,

        sold_qty:
          params.sold_qty !==
          undefined
            ? n(params.sold_qty)
            : undefined,

        warehouse:
          params.warehouse !==
          undefined
            ? s(params.warehouse)
            : undefined,

        image_url:
          params.image_url !==
          undefined
            ? s(params.image_url)
            : undefined,
      })) as T;

    case "delete_product":
      return (await api.deleteProduct(
        s(params.product_id)
      )) as T;

    case "add_warehouse":
      return (await api.saveWarehouse(
        s(params.warehouse_name)
      )) as T;

    case "rename_warehouse":
      return (await api.updateWarehouse(
        s(params.warehouse_id),
        s(params.warehouse_name)
      )) as T;

    case "delete_warehouse":
      return (await api.deleteWarehouse(
        s(params.warehouse_id)
      )) as T;

    case "record_sale":
      return (await api.recordSale({
        product_id:
          s(params.product_id),

        qty:
          n(params.qty),

        warehouse:
          params.warehouse !==
          undefined
            ? s(params.warehouse)
            : undefined,
      })) as T;

    case "record_return":
      return (await api.recordReturn({
        product_id:
          s(params.product_id),

        qty:
          n(params.qty),

        warehouse:
          params.warehouse !==
          undefined
            ? s(params.warehouse)
            : undefined,

        return_reason:
          params.return_reason !==
          undefined
            ? s(params.return_reason)
            : undefined,

        notes:
          params.notes !==
          undefined
            ? s(params.notes)
            : undefined,

        product_image:
          params.product_image !==
          undefined
            ? s(params.product_image)
            : undefined,

        invoice_image:
          params.invoice_image !==
          undefined
            ? s(params.invoice_image)
            : undefined,

        delivery_note_image:
          params.delivery_note_image !==
          undefined
            ? s(
                params.delivery_note_image
              )
            : undefined,
      })) as T;

    default:
      throw new ApiError(
        `UNKNOWN_POST_ACTION: ${action}`
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
     INVENTORY
     ========================================================== */

  inventory:
    async (): Promise<Product[]> => {
      const { data, error } =
        await supabase
          .from("inventory")
          .select("*")
          .order(
            "created_at",
            {
              ascending: false,
            }
          );

      if (error) {
        throw supabaseError(error);
      }

      return (data ?? [])
        .filter(
          (row) =>
            s(row.product_id) !==
            ""
        )
        .map((row) =>
          normalizeProduct(
            row as Record<
              string,
              unknown
            >
          )
        );
    },

  /* ==========================================================
     SAVE PRODUCT
     ========================================================== */

  saveProduct:
    async (p: {
      product_name: string;
      barcode?: string;
      price: number;
      stock_qty: number;
      sold_qty?: number;
      warehouse: string;
      image_url?: string;
      purchase_price?: number;
    }) => {
      const productName =
        p.product_name.trim();

      if (!productName) {
        throw new ApiError(
          "PRODUCT_NAME_REQUIRED"
        );
      }

      if (!p.warehouse?.trim()) {
        throw new ApiError(
          "WAREHOUSE_REQUIRED"
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
          n(p.stock_qty)
        );

      const soldQty =
        Math.min(
          stockQty,
          Math.max(
            0,
            n(p.sold_qty)
          )
        );

      const remainingQty =
        Math.max(
          0,
          stockQty - soldQty
        );

      const purchasePrice =
        Math.max(
          0,
          n(p.purchase_price)
        );

      const salePrice =
        Math.max(
          0,
          n(p.price)
        );

      const row = {
        product_id,

        product_name:
          productName,

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
      } =
        await supabase
          .from("inventory")
          .insert(row)
          .select(
            "product_id, barcode"
          )
          .single();

      if (error) {
        throw supabaseError(error);
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
      barcode?: string;

      price?: number;
      purchase_price?: number;

      stock_qty?: number;
      sold_qty?: number;

      warehouse?: string;
      image_url?: string;
    }) => {
      if (!p.product_id) {
        throw new ApiError(
          "PRODUCT_ID_REQUIRED"
        );
      }

      const {
        data: current,
        error: fetchError,
      } =
        await supabase
          .from("inventory")
          .select("*")
          .eq(
            "product_id",
            p.product_id
          )
          .single();

      if (fetchError) {
        throw supabaseError(
          fetchError
        );
      }

      if (!current) {
        throw new ApiError(
          "PRODUCT_NOT_FOUND"
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
              n(p.stock_qty)
            )
          : currentStock;

      const nextSold =
        p.sold_qty !== undefined
          ? Math.max(
              0,
              n(p.sold_qty)
            )
          : currentSold;

      if (nextSold > nextStock) {
        throw new ApiError(
          "SOLD_QUANTITY_CANNOT_EXCEED_STOCK"
        );
      }

      const nextSalePrice =
        p.price !== undefined
          ? Math.max(
              0,
              n(p.price)
            )
          : n(current.sale_price);

      const nextPurchasePrice =
        p.purchase_price !==
        undefined
          ? Math.max(
              0,
              n(p.purchase_price)
            )
          : n(
              current.purchase_price
            );

      const update: Record<
        string,
        unknown
      > = {};

      if (
        p.product_name !==
        undefined
      ) {
        const name =
          p.product_name.trim();

        if (!name) {
          throw new ApiError(
            "PRODUCT_NAME_REQUIRED"
          );
        }

        update.product_name =
          name;
      }

      if (
        p.barcode !== undefined
      ) {
        update.barcode =
          p.barcode.trim();
      }

      if (
        p.price !== undefined
      ) {
        update.sale_price =
          nextSalePrice;
      }

      if (
        p.purchase_price !==
        undefined
      ) {
        update.purchase_price =
          nextPurchasePrice;
      }

      if (
        p.stock_qty !== undefined
      ) {
        update.stock_qty =
          nextStock;
      }

      if (
        p.sold_qty !== undefined
      ) {
        update.sold_qty =
          nextSold;
      }

      if (
        p.warehouse !== undefined
      ) {
        if (
          !p.warehouse.trim()
        ) {
          throw new ApiError(
            "WAREHOUSE_REQUIRED"
          );
        }

        update.warehouse =
          p.warehouse.trim();
      }

      if (
        p.image_url !== undefined
      ) {
        update.image_url =
          p.image_url.trim();
      }

      update.remaining_qty =
        Math.max(
          0,
          nextStock - nextSold
        );

      update.stock_purchase_value =
        nextPurchasePrice *
        nextStock;

      update.stock_sale_value =
        nextSalePrice *
        nextStock;

      const {
        error,
      } =
        await supabase
          .from("inventory")
          .update(update)
          .eq(
            "product_id",
            p.product_id
          );

      if (error) {
        throw supabaseError(error);
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
      product_id: string
    ) => {
      if (!product_id) {
        throw new ApiError(
          "PRODUCT_ID_REQUIRED"
        );
      }

      const {
        error,
      } =
        await supabase
          .from("inventory")
          .delete()
          .eq(
            "product_id",
            product_id
          );

      if (error) {
        throw supabaseError(error);
      }

      return {
        success: true,
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
      } =
        await supabase
          .from("warehouses")
          .select("*")
          .order(
            "warehouse_name",
            {
              ascending: true,
            }
          );

      if (error) {
        throw supabaseError(
          error
        );
      }

      const all =
        (data ?? [])
          .filter(
            (w) =>
              s(
                w.warehouse_id
              ) !== ""
          )
          .map((w) => ({
            warehouse_id:
              s(
                w.warehouse_id
              ),

            warehouse_name:
              s(
                w.warehouse_name
              ) ||
              s(
                w.warehouse_id
              ),

            active:
              w.active !== false,

            created_at:
              s(
                w.created_at
              ),

            updated_at:
              s(
                w.updated_at
              ),
          }));

      const active =
        all.filter(
          (w) => w.active
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
      warehouse_name: string
    ) => {
      const name =
        warehouse_name.trim();

      if (!name) {
        throw new ApiError(
          "WAREHOUSE_NAME_REQUIRED"
        );
      }

      const warehouse_id =
        makeId("WH");

      const {
        data,
        error,
      } =
        await supabase
          .from("warehouses")
          .insert({
            warehouse_id,

            warehouse_name:
              name,

            active: true,
          })
          .select(
            "warehouse_id"
          )
          .single();

      if (error) {
        throw supabaseError(
          error
        );
      }

      return {
        warehouse_id:
          s(
            data?.warehouse_id
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
      warehouse_name: string
    ) => {
      if (!warehouse_id) {
        throw new ApiError(
          "WAREHOUSE_ID_REQUIRED"
        );
      }

      const name =
        warehouse_name.trim();

      if (!name) {
        throw new ApiError(
          "WAREHOUSE_NAME_REQUIRED"
        );
      }

      const {
        error,
      } =
        await supabase
          .from("warehouses")
          .update({
            warehouse_name:
              name,
          })
          .eq(
            "warehouse_id",
            warehouse_id
          );

      if (error) {
        throw supabaseError(
          error
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
      warehouse_id: string
    ) => {
      if (!warehouse_id) {
        throw new ApiError(
          "WAREHOUSE_ID_REQUIRED"
        );
      }

      const {
        error,
      } =
        await supabase
          .from("warehouses")
          .delete()
          .eq(
            "warehouse_id",
            warehouse_id
          );

      if (error) {
        throw supabaseError(
          error
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
      } =
        await supabase
          .from("sales")
          .select("*")
          .order(
            "created_at",
            {
              ascending: false,
            }
          );

      if (error) {
        throw supabaseError(
          error
        );
      }

      return (data ?? [])
        .filter(
          (row) =>
            s(row.sale_id) !==
            ""
        )
        .map((row) =>
          normalizeSale(
            row as Record<
              string,
              unknown
            >
          )
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
          n(p.qty)
        );

      if (qty <= 0) {
        throw new ApiError(
          "INVALID_QUANTITY"
        );
      }

      if (!p.product_id) {
        throw new ApiError(
          "PRODUCT_ID_REQUIRED"
        );
      }

      const {
        data: product,
        error:
          productError,
      } =
        await supabase
          .from("inventory")
          .select("*")
          .eq(
            "product_id",
            p.product_id
          )
          .single();

      if (productError) {
        throw supabaseError(
          productError
        );
      }

      if (!product) {
        throw new ApiError(
          "PRODUCT_NOT_FOUND"
        );
      }

      const remaining =
        Math.max(
          0,
          n(
            product.remaining_qty
          )
        );

      if (qty > remaining) {
        throw new ApiError(
          "INSUFFICIENT_STOCK"
        );
      }

      const unitPrice =
        Math.max(
          0,
          n(product.sale_price)
        );

      const newSold =
        n(product.sold_qty) +
        qty;

      const newRemaining =
        Math.max(
          0,
          remaining - qty
        );

      const total =
        unitPrice * qty;

      const sale_id =
        makeId("SAL");

      const saleDate =
        today();

      const saleTime =
        currentTime();

      const warehouse =
        p.warehouse?.trim() ||
        s(product.warehouse);

      if (!warehouse) {
        throw new ApiError(
          "WAREHOUSE_REQUIRED"
        );
      }

      /*
       * Insert sale first.
       */

      const {
        error: saleError,
      } =
        await supabase
          .from("sales")
          .insert({
            sale_id,

            product_id:
              p.product_id,

            product_name:
              s(
                product.product_name
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
          saleError
        );
      }

      /*
       * Update inventory.
       */

      const {
        error:
          inventoryError,
      } =
        await supabase
          .from("inventory")
          .update({
            sold_qty:
              newSold,

            remaining_qty:
              newRemaining,

            sales_value:
              n(
                product.sales_value
              ) + total,

            last_sale_date:
              new Date().toISOString(),
          })
          .eq(
            "product_id",
            p.product_id
          );

      if (inventoryError) {
        throw supabaseError(
          inventoryError
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
      } =
        await supabase
          .from("returns")
          .select("*")
          .order(
            "created_at",
            {
              ascending: false,
            }
          );

      if (error) {
        throw supabaseError(
          error
        );
      }

      return (data ?? [])
        .filter(
          (row) =>
            s(row.return_id) !==
            ""
        )
        .map((row) =>
          normalizeReturn(
            row as Record<
              string,
              unknown
            >
          )
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
          n(p.qty)
        );

      if (qty <= 0) {
        throw new ApiError(
          "INVALID_QUANTITY"
        );
      }

      if (!p.product_id) {
        throw new ApiError(
          "PRODUCT_ID_REQUIRED"
        );
      }

      const {
        data: product,
        error:
          productError,
      } =
        await supabase
          .from("inventory")
          .select("*")
          .eq(
            "product_id",
            p.product_id
          )
          .single();

      if (productError) {
        throw supabaseError(
          productError
        );
      }

      if (!product) {
        throw new ApiError(
          "PRODUCT_NOT_FOUND"
        );
      }

      const currentSold =
        Math.max(
          0,
          n(product.sold_qty)
        );

      /*
       * IMPORTANT:
       * A normal return cannot exceed
       * the quantity already sold.
       */

      if (qty > currentSold) {
        throw new ApiError(
          "RETURN_QUANTITY_EXCEEDS_SOLD_QUANTITY"
        );
      }

      const currentRemaining =
        Math.max(
          0,
          n(product.remaining_qty)
        );

      const price =
        Math.max(
          0,
          n(product.sale_price)
        );

      const newSold =
        Math.max(
          0,
          currentSold - qty
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
          "WAREHOUSE_REQUIRED"
        );
      }

      const {
        error,
      } =
        await supabase
          .from("returns")
          .insert({
            return_id,

            product_id:
              p.product_id,

            product_name:
              s(
                product.product_name
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
              p.invoice_image ?? "",

            delivery_note_image:
              p.delivery_note_image ??
              "",

            return_reason:
              p.return_reason ?? "",

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
          error
        );
      }

      const {
        error:
          inventoryError,
      } =
        await supabase
          .from("inventory")
          .update({
            sold_qty:
              newSold,

            remaining_qty:
              newRemaining,
          })
          .eq(
            "product_id",
            p.product_id
          );

      if (inventoryError) {
        throw supabaseError(
          inventoryError
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
      const returnId = s(return_id).trim();

      if (!returnId) {
        throw new ApiError(
          "RETURN_ID_REQUIRED",
        );
      }

      /*
       * IMPORTANT:
       * Read the return BEFORE deleting it.
       *
       * We need product_id and qty in order to
       * restore the inventory after the return is deleted.
       *
       * We DO NOT use DELETE ... SELECT because
       * Supabase RLS can make the deleted row unavailable
       * in the returned mutation result even when the delete
       * itself is successful.
       */
      const {
        data: returnRow,
        error: returnFetchError,
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
        console.error(
          "[SODFA] Failed to read return before delete:",
          returnFetchError,
        );

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
        s(returnRow.product_id).trim();

      const qty = Math.max(
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

      /*
       * Read the current inventory BEFORE deleting the return.
       *
       * We need the current values so we can safely restore
       * the inventory state after deleting the return.
       */
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
        .maybeSingle();

      if (productError) {
        console.error(
          "[SODFA] Failed to read inventory before deleting return:",
          productError,
        );

        throw supabaseError(
          productError,
        );
      }

      if (!product) {
        throw new ApiError(
          "PRODUCT_NOT_FOUND",
        );
      }

      /*
       * Delete the return DIRECTLY.
       *
       * IMPORTANT:
       * Do NOT use .select() here.
       *
       * The previous implementation depended on the deleted
       * row being returned by Supabase, which can be affected
       * by RLS policies.
       */
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
        console.error(
          "[SODFA] Delete return failed:",
          deleteError,
        );

        throw supabaseError(
          deleteError,
        );
      }

      /*
       * The return has now been deleted successfully.
       *
       * Restore the inventory state:
       *
       * When creating a normal return:
       *
       * sold_qty      -= return qty
       * remaining_qty += return qty
       *
       * Therefore, when deleting that return, we reverse it:
       *
       * sold_qty      += return qty
       * remaining_qty -= return qty
       */
      const currentSold = Math.max(
        0,
        n(product.sold_qty),
      );

      const currentRemaining =
        Math.max(
          0,
          n(product.remaining_qty),
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
        error: inventoryError,
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
        console.error(
          "[SODFA] Return deleted but inventory update failed:",
          inventoryError,
        );

        throw supabaseError(
          inventoryError,
        );
      }

      return {
        success: true,
        return_id: returnId,
        product_id: productId,
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
      } =
        await supabase
          .from(
            "damaged_returns"
          )
          .select("*")
          .order(
            "created_at",
            {
              ascending: false,
            }
          );

      if (error) {
        throw supabaseError(
          error
        );
      }

      return (data ?? [])
        .map((row) =>
          normalizeDamaged(
            row as Record<
              string,
              unknown
            >
          )
        )
        .filter(
          (row) =>
            row.damaged_return_id !==
            ""
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
          n(p.qty)
        );

      if (qty <= 0) {
        throw new ApiError(
          "INVALID_QUANTITY"
        );
      }

      if (!p.product_id) {
        throw new ApiError(
          "PRODUCT_ID_REQUIRED"
        );
      }

      const {
        data: product,
        error:
          productError,
      } =
        await supabase
          .from("inventory")
          .select("*")
          .eq(
            "product_id",
            p.product_id
          )
          .single();

      if (productError) {
        throw supabaseError(
          productError
        );
      }

      if (!product) {
        throw new ApiError(
          "PRODUCT_NOT_FOUND"
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
      } =
        await supabase
          .from(
            "damaged_returns"
          )
          .insert({
            damaged_return_id,

            product_id:
              p.product_id,

            product_name:
              s(
                product.product_name
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

            /*
             * Legacy fields.
             */
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
            "damaged_return_id"
          )
          .single();

      if (error) {
        throw supabaseError(
          error
        );
      }

      return {
        damaged_return_id:
          s(
            data?.damaged_return_id
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
      status: DamagedStatus
    ) => {
      if (
        !damaged_return_id
      ) {
        throw new ApiError(
          "DAMAGED_RETURN_ID_REQUIRED"
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
          normalized
        )
      ) {
        throw new ApiError(
          "INVALID_DAMAGED_STATUS"
        );
      }

      const {
        error,
      } =
        await supabase
          .from(
            "damaged_returns"
          )
          .update({
            status:
              normalized,
          })
          .eq(
            "damaged_return_id",
            damaged_return_id
          );

      if (error) {
        throw supabaseError(
          error
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
        throw supabaseError(error);
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
      mime_type: string
    ) => {
      if (
        !file_base64
      ) {
        throw new ApiError(
          "IMAGE_DATA_REQUIRED"
        );
      }

      if (!file_name) {
        throw new ApiError(
          "IMAGE_FILE_NAME_REQUIRED"
        );
      }

      const cleanBase64 =
        file_base64.includes(
          ","
        )
          ? file_base64.split(
              ","
            )[1]
          : file_base64;

      let binary: string;

      try {
        binary =
          atob(
            cleanBase64
          );
      } catch {
        throw new ApiError(
          "INVALID_BASE64_IMAGE"
        );
      }

      const bytes =
        new Uint8Array(
          binary.length
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
          "_"
        );

      const path =
        `${Date.now()}-${makeId(
          "IMG"
        )}-${safeName}`;

      const {
        error,
      } =
        await supabase.storage
          .from(
            "sodfa-images"
          )
          .upload(
            path,
            bytes,
            {
              contentType:
                mime_type ||
                "application/octet-stream",

              upsert: false,
            }
          );

      if (error) {
        throw supabaseError(
          error
        );
      }

      const {
        data:
          publicUrlData,
      } =
        supabase.storage
          .from(
            "sodfa-images"
          )
          .getPublicUrl(
            path
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