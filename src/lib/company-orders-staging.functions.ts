import { mapOrderRow } from "../../apps/orders-manager/lib/order-row";
import { calculateOrderTotal } from "./inventory-planning";
import { createServerFn } from "@tanstack/react-start";
import { requireCompanyAccess } from "./company-access.server";
import { neon } from "@neondatabase/serverless";
import { z } from "zod";

/** Isolated Neon OMS staging branch only. Never sends shipments to Tala. */
function stage() {
  const url = process.env["CRM_ORDERS_STAGING_URL"];
  if (!url) throw new Error("OMS_STAGING_NOT_CONFIGURED");
  return neon(url);
}
export const getStagingLocations = createServerFn({ method: "POST" })
  .validator(z.object({ token: z.string().min(16).max(8192) }))
  .handler(async ({ data }) => {
    await requireCompanyAccess(data.token, "orders", "read");
    const rows =
      await stage()`SELECT g.name AS governorate,l.name AS city FROM address_governorates g LEFT JOIN address_localities l ON l.governorate=g.name ORDER BY g.name,l.name`;
    const locations: Record<string, string[]> = {};
    for (const row of rows) {
      const g = String(row["governorate"] ?? "");
      if (!locations[g]) locations[g] = [];
      if (row["city"] != null) locations[g].push(String(row["city"]));
    }
    return locations;
  });
const brandSchema = z.enum(["homey", "sodfa"]);
const readToken = z.string().min(16).max(8192);
const workspaceSchema = z.object({ token: readToken, brand: brandSchema });

export const getStagingWorkspaceAccess = createServerFn({ method: "POST" })
  .validator(workspaceSchema)
  .handler(async ({ data }) => {
    await requireCompanyAccess(data.token, data.brand, "read");
    const { role } = await requireCompanyAccess(data.token, "orders", "read");
    return {
      create: role === "operator" || role === "manager" || role === "admin",
      confirm: role === "admin" || role === "manager",
    };
  });

export const listWorkspaceOrders = createServerFn({ method: "POST" })
  .validator(workspaceSchema)
  .handler(async ({ data }) => {
    await requireCompanyAccess(data.token, "orders", "read");
    await requireCompanyAccess(data.token, data.brand, "read");

    const manager = async () => {
      const url = process.env["CRM_ORDERS_READ_URL"];
      if (!url) throw new Error("OMS_READ_NOT_CONFIGURED");
      const db = neon(url);
      const rows = await db`SELECT id::text, brand, created_at, updated_at, customer_name,
        phone, alternate_phone, governorate, city, address, source, payment_method,
        items, status, shipping_company, shipping, discount, prepaid, manual_total,
        manual_collection, carrier_received, notes, assigned_to, version
        FROM orders WHERE brand=${data.brand} AND deleted_at IS NULL
        AND source IS DISTINCT FROM 'central-control-center-staging'
        ORDER BY created_at DESC, id DESC LIMIT 501`;
      const ids = rows.slice(0, 500).map((row) => String(row["id"]));
      if (!ids.length) return rows;
      const shipments = await db`SELECT order_id::text AS order_id,
        tracking_code AS tala_tracking_code, state AS tala_dispatch_state,
        to_jsonb(s)->>'provider_status_code' AS tala_status_code,
        to_jsonb(s)->>'provider_status_name' AS tala_status_name,
        to_jsonb(s)->>'provider_delivery_fees' AS tala_delivery_fees,
        to_jsonb(s)->>'provider_customer_due' AS tala_customer_due,
        to_jsonb(s)->>'provider_delivered_amount' AS tala_delivered_amount,
        to_jsonb(s)->>'provider_collected_amount' AS tala_collected_amount,
        to_jsonb(s)->>'provider_pending_collection_amount' AS tala_pending_collection_amount,
        to_jsonb(s)->>'provider_collected_fees' AS tala_collected_fees
        FROM tala_order_shipments s WHERE order_id=ANY(${ids}::uuid[])`.catch(() => []);
      const byOrder = new Map(shipments.map(({ order_id, ...details }) => [order_id, details]));
      return rows.map((row) => ({ ...row, ...byOrder.get(row["id"]) }));
    };
    const preview = async () => stage()`SELECT * FROM orders WHERE brand=${data.brand}
      AND source='central-control-center-staging' AND deleted_at IS NULL
      ORDER BY created_at DESC, id DESC LIMIT 501`;

    const [managerResult, previewResult] = await Promise.allSettled([manager(), preview()]);
    const managerRows = managerResult.status === "fulfilled" ? managerResult.value : [];
    const previewRows = previewResult.status === "fulfilled" ? previewResult.value : [];
    const previewIds = new Set(previewRows.map((row) => String(row["id"])));
    return {
      orders: [
        ...managerRows
          .slice(0, 500)
          .filter((row) => !previewIds.has(String(row["id"])))
          .map((row) => ({ ...mapOrderRow(row), workspaceSource: "manager" as const })),
        ...previewRows
          .slice(0, 500)
          .map((row) => ({ ...mapOrderRow(row), workspaceSource: "preview" as const })),
      ].sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
      available: {
        manager: managerResult.status === "fulfilled",
        preview: previewResult.status === "fulfilled",
      },
      limited: managerRows.length > 500 || previewRows.length > 500,
    };
  });

function catalog() {
  const url = process.env["CRM_CATALOG_READ_URL"];
  if (!url) throw new Error("CRM_CATALOG_NOT_CONFIGURED");
  return neon(url);
}

export const searchStagingOrderProducts = createServerFn({ method: "POST" })
  .validator(
    z.object({ token: readToken, brand: brandSchema, query: z.string().trim().min(2).max(200) }),
  )
  .handler(async ({ data }) => {
    await requireCompanyAccess(data.token, "orders", "read");
    await requireCompanyAccess(data.token, data.brand, "read");
    const rows = await catalog()`SELECT id::text AS id, title FROM product_references
   WHERE brand_id=${data.brand} AND strpos(lower(title),lower(${data.query}))>0
   ORDER BY (lower(title)=lower(${data.query})) DESC,title,id LIMIT 15`;
    return rows.map((row) => ({ id: String(row["id"]), name: String(row["title"]) }));
  });

const CreateSchema = z.object({
  token: z.string().min(16).max(8192),
  creationRequestId: z.string().uuid(),
  brand: z.enum(["homey", "sodfa"]),
  customerName: z.string().trim().min(2).max(200),
  phone: z.string().min(8).max(30),
  governorate: z.string().min(2).max(60),
  city: z.string().min(2).max(150),
  address: z.string().trim().min(5).max(600),
  items: z
    .array(
      z.object({
        name: z.string().trim().min(2).max(200),
        catalogId: z
          .string()
          .regex(/^\d{1,20}$/)
          .optional(),
        sku: z.string().max(100).default(""),
        quantity: z.number().int().min(1).max(999),
        price: z.number().min(0).max(1_000_000),
      }),
    )
    .min(1)
    .max(50),
  carrier: z.string().trim().max(100).default(""),
  alternatePhone: z.string().trim().max(30).default(""),
  paymentMethod: z.string().trim().max(100).default("الدفع عند الاستلام"),
  notes: z.string().trim().max(3000).default(""),
  assignedTo: z.string().trim().max(120).default(""),
  courier: z.string().trim().max(120).default(""),
  manualCollection: z.number().min(0).max(1_000_000).nullable().optional(),
  shipping: z.number().min(0).max(100_000).default(0),
  prepaid: z.number().min(0).max(1_000_000).default(0),
  discount: z.number().min(0).max(100_000).default(0),
});
export const createStagingOrder = createServerFn({ method: "POST" })
  .validator(CreateSchema)
  .handler(async ({ data }) => {
    const actor = await requireCompanyAccess(data.token, "orders", "staging_order");
    await requireCompanyAccess(data.token, data.brand, "read");
    const phone = data.phone
      .normalize("NFKC")
      .replace(/[٠-٩۰-۹]/g, (d) =>
        String(d.charCodeAt(0) - (d.charCodeAt(0) >= 0x6f0 ? 0x6f0 : 0x660)),
      )
      .replace(/[\s().-]/g, "");
    if (!/^\+?\d{8,15}$/.test(phone)) throw new Error("PHONE_INVALID");
    const db = stage();
    const place =
      await db`SELECT 1 FROM address_localities WHERE governorate=${data.governorate} AND name=${data.city} LIMIT 1`;
    if (!place.length) throw new Error("INVALID_ORDER_LOCATION");
    const amount = calculateOrderTotal(data.items, data.shipping, data.discount);
    if (data.prepaid > amount) throw new Error("PREPAID_EXCEEDS_TOTAL");
    const ids = [
      ...new Set(data.items.flatMap((item) => (item.catalogId ? [item.catalogId] : []))),
    ];
    const refs = new Map<string, { name: string; sourceProductId: string }>();
    if (ids.length) {
      await requireCompanyAccess(data.token, data.brand, "read");
      const catalogRows =
        await catalog()`SELECT id::text AS id,title,source_product_id FROM product_references
    WHERE brand_id=${data.brand} AND id::text=ANY(${ids}::text[])`;
      for (const row of catalogRows)
        refs.set(String(row["id"]), {
          name: String(row["title"]),
          sourceProductId: String(row["source_product_id"]),
        });
      if (refs.size !== ids.length) throw new Error("ORDER_PRODUCT_NOT_AVAILABLE");
    }
    const items = data.items.map((item) => ({
      ...item,
      ...(item.catalogId ? refs.get(item.catalogId) : undefined),
    }));
    // The order and its audit event commit together. A retry never emits another event.
    const rows = await db`WITH inserted AS (
   INSERT INTO orders(id,brand,created_at,customer_name,phone,alternate_phone,
    governorate,city,address,source,payment_method,prepaid,shipping,discount,items,status,
    shipping_company,carrier_received,notes,assigned_to,courier,manual_total,manual_collection)
   VALUES(${data.creationRequestId}::uuid,${data.brand},now(),${data.customerName},${phone},${data.alternatePhone},
    ${data.governorate},${data.city},${data.address},'central-control-center-staging',
     ${data.paymentMethod},${data.prepaid},${data.shipping},${data.discount},
    ${JSON.stringify(items)}::jsonb,'new',${data.carrier},0,${data.notes},${data.assignedTo},${data.courier},NULL,${data.manualCollection ?? null})
   ON CONFLICT(id) DO NOTHING RETURNING id,brand,status,version
  ), audited AS (
   INSERT INTO audit_log(actor,action,entity,entity_id,brand,details)
   SELECT ${actor.id},'create','order',id::text,brand,'control-center staging only, no shipping dispatch' FROM inserted
  ) SELECT id::text,status,version FROM inserted`;
    if (rows.length)
      return {
        id: String(rows[0]!["id"]),
        status: String(rows[0]!["status"]),
        version: Number(rows[0]!["version"]),
        amount,
        staging: true,
      };
    const existing = await db`SELECT id::text,status,version,items,shipping,discount FROM orders
   WHERE id=${data.creationRequestId}::uuid AND brand=${data.brand}
    AND source='central-control-center-staging' AND deleted_at IS NULL`;
    const order = existing[0];
    if (!order) throw new Error("IDEMPOTENCY_CONFLICT");
    return {
      id: String(order["id"]),
      status: String(order["status"]),
      version: Number(order["version"]),
      amount: calculateOrderTotal(
        order["items"],
        Number(order["shipping"]),
        Number(order["discount"]),
      ),
      staging: true,
    };
  });
export const confirmStagingOrder = createServerFn({ method: "POST" })
  .validator(
    z.object({
      token: z.string().min(16).max(8192),
      brand: brandSchema,
      id: z.string().uuid(),
      version: z.number().int().min(0),
    }),
  )
  .handler(async ({ data }) => {
    const actor = await requireCompanyAccess(data.token, "orders", "approve");
    await requireCompanyAccess(data.token, data.brand, "read");
    const db = stage();
    const rows = await db`WITH confirmed AS (
   UPDATE orders SET status='confirmed',updated_at=now(),version=version+1
    WHERE id=${data.id}::uuid AND version=${data.version}
      AND brand=${data.brand}
      AND status IN ('new','contacted') AND source='central-control-center-staging'
      AND deleted_at IS NULL RETURNING id,status,version,brand
  ), audited AS (
   INSERT INTO audit_log(actor,action,entity,entity_id,brand,details)
   SELECT ${actor.id},'confirm','order',id::text,brand,'control-center staging confirmation' FROM confirmed
  ) SELECT id::text,status,version FROM confirmed`;
    if (!rows.length) throw new Error("ORDER_CONFLICT_OR_ALREADY_CONFIRMED");
    return {
      id: String(rows[0]!["id"]),
      status: String(rows[0]!["status"]),
      version: Number(rows[0]!["version"]),
      staging: true,
    };
  });
