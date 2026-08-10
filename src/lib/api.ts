/**
 * SODFA — single centralized API service.
 * Source of truth: Google Sheets ("Products" spreadsheet) via Google Apps Script Web App.
 * No other database is used anywhere in the app.
 */

export const DEFAULT_API_URL =
  "https://script.google.com/macros/s/AKfycbwhzVo3w5ud1VMbqZMc04KhNyFdek94186v7fNy6WjImU6VxUkkeHyWNemFyEr4ctggQQ/exec";

const API_URL_KEY = "sodfa_api_url";

/** The Web App URL currently in use (configurable from Settings). */
export function getApiUrl(): string {
  if (typeof window === "undefined") return DEFAULT_API_URL;
  try {
    return window.localStorage.getItem(API_URL_KEY) || DEFAULT_API_URL;
  } catch {
    return DEFAULT_API_URL;
  }
}

export function setApiUrl(url: string): void {
  try {
    const clean = url.trim();
    if (clean && clean !== DEFAULT_API_URL) window.localStorage.setItem(API_URL_KEY, clean);
    else window.localStorage.removeItem(API_URL_KEY);
  } catch {
    /* ignore */
  }
}

export class ApiError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ApiError";
  }
}

type Params = Record<string, string | number | boolean | undefined | null>;

function clean(params: Params): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined || v === null) continue;
    out[k] = String(v);
  }
  return out;
}

async function parse<T>(res: Response): Promise<T> {
  const text = await res.text();
  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch {
    throw new ApiError("BAD_RESPONSE");
  }
  const body = json as { success?: boolean; data?: T; error?: string };
  if (!body || body.success !== true) throw new ApiError(body?.error || "API_ERROR");
  return body.data as T;
}

export async function apiGet<T>(action: string | null, params: Params = {}): Promise<T> {
  const qs = new URLSearchParams(clean(action ? { action, ...params } : params));
  try {
    const res = await fetch(`${getApiUrl()}?${qs.toString()}`, {
      method: "GET",
      redirect: "follow",
    });
    return await parse<T>(res);
  } catch (e) {
    if (e instanceof ApiError) throw e;
    throw new ApiError("NETWORK");
  }
}

export async function apiPost<T>(action: string, params: Params = {}): Promise<T> {
  const body = new URLSearchParams(clean({ action, ...params }));
  try {
    // URLSearchParams => simple request, no CORS preflight against Apps Script.
    const res = await fetch(getApiUrl(), { method: "POST", body, redirect: "follow" });
    return await parse<T>(res);
  } catch (e) {
    if (e instanceof ApiError) throw e;
    throw new ApiError("NETWORK");
  }
}

/* ----------------------------- Types ----------------------------- */

export interface Product {
  product_id: string;
  product_name: string;
  barcode: string;
  image_url: string;
  warehouse: string;
  price: number;
  stock_qty: number;
  sold_qty: number;
  remaining_qty: number;
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

export type DamagedStatus = "Pending" | "Accepted" | "Rejected";

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
  sheets: Record<string, { connected: boolean; rows: number }>;
  timestamp: string;
}

/* --------------------------- Normalizers -------------------------- */

const s = (v: unknown): string => (v === undefined || v === null ? "" : String(v));
const n = (v: unknown): number => {
  const x = Number(String(v ?? "").replace(/[^0-9.-]/g, ""));
  return Number.isFinite(x) ? x : 0;
};
const pick = (r: Record<string, unknown>, keys: string[]): unknown => {
  for (const k of keys) {
    if (r[k] !== undefined && r[k] !== null && r[k] !== "") return r[k];
  }
  return undefined;
};

export function normalizeProduct(raw: Record<string, unknown>): Product {
  const price = n(pick(raw, ["price", "unit_price", "sale_price", "purchase_price"]));
  const stock = n(pick(raw, ["stock_qty", "total_stock", "quantity"]));
  const sold = n(pick(raw, ["sold_qty", "sold"]));
  const remainingRaw = pick(raw, ["remaining_qty", "remaining_stock", "remaining"]);
  const remaining = remainingRaw === undefined ? stock - sold : n(remainingRaw);
  return {
    product_id: s(raw["product_id"]),
    product_name: s(raw["product_name"]),
    barcode: s(pick(raw, ["barcode"]) ?? raw["product_id"]),
    image_url: s(pick(raw, ["image_url", "product_image"])),
    warehouse: s(pick(raw, ["warehouse", "warehouse_id"])),
    price,
    stock_qty: stock,
    sold_qty: sold,
    remaining_qty: remaining,
    created_at: s(raw["created_at"]),
    updated_at: s(raw["updated_at"]),
  };
}

export function normalizeSale(raw: Record<string, unknown>): Sale {
  const price = n(pick(raw, ["price", "unit_price", "unit_sale_price"]));
  const qty = n(pick(raw, ["qty", "quantity"]));
  return {
    sale_id: s(raw["sale_id"]),
    product_id: s(raw["product_id"]),
    product_name: s(raw["product_name"]),
    barcode: s(raw["barcode"]),
    warehouse: s(pick(raw, ["warehouse", "warehouse_id"])),
    qty,
    price,
    total: n(pick(raw, ["total", "total_value", "total_sale_value"])) || price * qty,
    sale_date: s(pick(raw, ["sale_date", "date", "created_at"])),
    sale_time: s(pick(raw, ["sale_time", "time"])),
  };
}

export function normalizeReturn(raw: Record<string, unknown>): ReturnRecord {
  const price = n(pick(raw, ["price", "unit_price", "unit_sale_price"]));
  const qty = n(pick(raw, ["qty", "quantity"]));
  return {
    return_id: s(raw["return_id"]),
    product_id: s(raw["product_id"]),
    product_name: s(raw["product_name"]),
    barcode: s(raw["barcode"]),
    warehouse: s(pick(raw, ["warehouse", "warehouse_id"])),
    qty,
    price,
    return_total: n(pick(raw, ["return_total", "total"])) || price * qty,
    product_image: s(pick(raw, ["product_image", "product_image_url"])),
    invoice_image: s(pick(raw, ["invoice_image", "invoice_image_url"])),
    delivery_note_image: s(
      pick(raw, ["delivery_note_image", "livery_note_image", "delivery_note_image_url"]),
    ),
    return_reason: s(pick(raw, ["return_reason", "reason"])),
    notes: s(raw["notes"]),
    return_date: s(pick(raw, ["return_date", "date", "created_at"])),
    return_time: s(pick(raw, ["return_time", "time"])),
  };
}

export function normalizeDamaged(raw: Record<string, unknown>): DamagedReturn {
  const r = raw as Record<string, unknown>;
  const g = (...keys: string[]) => s(pick(r, keys));
  const status = g("status", "Status") as DamagedStatus;
  const norm = status
    ? ((status.charAt(0).toUpperCase() + status.slice(1).toLowerCase()) as DamagedStatus)
    : ("Pending" as DamagedStatus);
  return {
    damaged_return_id: g("damaged_return_id", "Damaged_Return_ID"),
    shipment_code: g("shipment_code", "Shipment_Code"),
    product_id: g("product_id", "Product_ID"),
    product_name: g("product_name", "Product_Name"),
    barcode: g("barcode", "Product_Barcode"),
    warehouse: g("warehouse", "warehouse_id", "Warehouse_ID"),
    qty: n(pick(r, ["quantity", "qty", "Quantity"])),
    damage_reason: g("reason", "damage_reason", "Damage_Reason"),
    damage_details: g("details", "damage_details", "Damage_Details", "notes", "Notes"),
    status: (["Pending", "Accepted", "Rejected"] as string[]).includes(norm)
      ? norm
      : "Pending",
    policy_image: g("police_image", "policy_image", "Policy_Image_URL", "policy_image_url"),
    product_image: g("product_image", "Product_Image_URL", "product_image_url"),
    policy_product_image: g(
      "combined_return_image",
      "policy_product_image",
      "Policy_Product_Image_URL",
      "policy_product_image_url",
    ),
    return_date: g("date", "return_date", "Return_Date", "created_at", "Created_At"),
    return_time: g("time", "return_time", "Return_Time"),
  };
}

/* ------------------------------ Calls ----------------------------- */

export const api = {
  connection: () => apiGet<ConnectionStatus>(null),

  inventory: async (): Promise<Product[]> => {
    const d = await apiGet<{ products?: Record<string, unknown>[] }>("get_inventory");
    return (d.products ?? []).filter((p) => s(p["product_id"])).map(normalizeProduct);
  },
  saveProduct: (p: {
    product_name: string;
    price: number;
    stock_qty: number;
    sold_qty?: number;
    warehouse: string;
    image_url?: string;
  }) => apiPost<{ product_id: string; barcode: string }>("save_product", p),
  updateProduct: (p: {
    product_id: string;
    product_name?: string;
    price?: number;
    stock_qty?: number;
    sold_qty?: number;
    warehouse?: string;
    image_url?: string;
  }) => apiPost<unknown>("update_product", p),
  deleteProduct: (product_id: string) => apiPost<unknown>("delete_product", { product_id }),

  warehouses: async (): Promise<Warehouse[]> => {
    const d = await apiGet<{ warehouses?: Record<string, unknown>[] }>("get_warehouses");
    return (d.warehouses ?? [])
      .filter((w) => s(w["warehouse_id"]))
      .filter((w) => w["active"] !== false && String(w["active"] ?? "true") !== "false")
      .map((w) => ({
        warehouse_id: s(w["warehouse_id"]),
        warehouse_name: s(w["warehouse_name"]) || s(w["warehouse_id"]),
        active: true,
        created_at: s(w["created_at"]),
        updated_at: s(w["updated_at"]),
      }));
  },
  saveWarehouse: (warehouse_name: string) =>
    apiPost<{ warehouse_id: string }>("add_warehouse", { warehouse_name }),
  updateWarehouse: (warehouse_id: string, warehouse_name: string) =>
    apiPost<unknown>("rename_warehouse", { warehouse_id, warehouse_name }),
  deleteWarehouse: (warehouse_id: string) =>
    apiPost<unknown>("delete_warehouse", { warehouse_id }),

  sales: async (): Promise<Sale[]> => {
    const d = await apiGet<{ sales?: Record<string, unknown>[] }>("get_sales");
    return (d.sales ?? []).filter((x) => s(x["sale_id"])).map(normalizeSale);
  },
  recordSale: (p: { product_id: string; qty: number; warehouse?: string }) =>
    apiPost<{ sale_id: string }>("record_sale", p),

  returns: async (): Promise<ReturnRecord[]> => {
    const d = await apiGet<{ returns?: Record<string, unknown>[] }>("get_returns");
    return (d.returns ?? []).filter((x) => s(x["return_id"])).map(normalizeReturn);
  },
  recordReturn: (p: {
    product_id: string;
    qty: number;
    warehouse?: string;
    return_reason?: string;
    notes?: string;
    product_image?: string;
    invoice_image?: string;
    delivery_note_image?: string;
  }) => apiPost<{ return_id: string }>("record_return", p),

  damagedReturns: async (): Promise<DamagedReturn[]> => {
    const d = await apiGet<{ damaged_returns?: Record<string, unknown>[] }>(
      "get_damaged_returns",
    );
    return (d.damaged_returns ?? [])
      .map(normalizeDamaged)
      .filter((x) => x.damaged_return_id !== "");
  },
  recordDamagedReturn: (p: {
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
  }) =>
    apiPost<{ damaged_return_id: string }>("record_damaged_return", {
      product_id: p.product_id,
      shipment_code: p.shipment_code,
      qty: p.qty,
      quantity: p.qty,
      warehouse: p.warehouse ?? "",
      reason: p.damage_reason ?? "",
      details: p.damage_details ?? "",
      status: (p.status ?? "Pending").toLowerCase(),
      police_image: p.policy_image ?? "",
      product_image: p.product_image ?? "",
      combined_return_image: p.policy_product_image ?? "",
    }),
  updateDamagedStatus: (damaged_return_id: string, status: DamagedStatus) =>
    apiPost<unknown>("update_damaged_return_status", {
      damaged_return_id,
      status: status.toLowerCase(),
    }),

  uploadImage: (file_base64: string, file_name: string, mime_type: string) =>
    apiPost<{ image_url: string; file_id: string }>("upload_image", {
      file_base64,
      file_name,
      mime_type,
    }),
};