import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import { neon } from "@neondatabase/serverless";
import { z } from "zod";

/**
 * CRM read bridge.
 * Each database URL belongs to a SELECT-only PostgreSQL role and is confined to
 * the feature branch's Vercel preview environment. No customer PII is selected.
 * Never call these database connections from a browser component.
 */
const RequestSchema = z.object({
  token: z.string().min(16).max(8192),
  brand: z.enum(["homey", "sodfa", "all"]).default("all"),
  query: z.string().max(120).default(""),
});

type Summary = { brand: string; status: string; count: number };
type Product = { id: string; title: string; brand: string; source: string; draft_visibility: boolean | null; draft_price: number | null;
  source_status: string | null; available_units: number | null; min_sale_price_egp: number | null; max_sale_price_egp: number | null;
  homey_draft: boolean | null; sodfa_draft: boolean | null; homey_price: number | null; sodfa_price: number | null;
  source_refreshed_at: string | null;
};
type OrderRow = {
  id: string; brand: string; created_at: string; status: string;
  shipping_company: string | null; source: string | null;
};
type Shipment = { brand: string; state: string; count: number };
type Count = { brand: string; count: number };

export const getCompanyWorkspaceData = createServerFn({ method: "POST" })
  .validator(RequestSchema)
  .handler(async ({ data }) => {
    const url = process.env.VITE_SUPABASE_URL;
    const key = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
    if (!url || !key) throw new Error("AUTH_NOT_CONFIGURED");
    const auth = createClient(url, key, {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    });
    const { data: result, error } = await auth.auth.getUser(data.token);
    if (error || !result.user || !result.user.email) throw new Error("UNAUTHORIZED");

    // No app secrets or customer records are returned by this server function.
    const response: {
      fetchedAt: string;
      catalog: { connected: boolean; error?: string; counts: Count[]; products: Product[] };
      operations: {
        connected: boolean; error?: string; summary: Summary[];
        orders: OrderRow[]; customers: Count[]; shipments: Shipment[];
      };
      sodfa: { connected: boolean; error?: string;
        inventorySummary: { sku_rows: number; units: number; cost_value: number; warehouses: number } | null;
        salesSummary: { count_sales: number; sales_egp: number; first_date: string | null; last_date: string | null } | null;
        items: {product_id: string; product_name: string; warehouse: string; remaining_qty: number; purchase_price: number; sale_price: number}[];
      };
    } = {
      fetchedAt: new Date().toISOString(),
      catalog: { connected: false, counts: [], products: [] },
      operations: { connected: false, summary: [], orders: [], customers: [], shipments: [] },
      sodfa: { connected:false, inventorySummary:null, salesSummary:null, items:[] },
    };
    const brandCondition = data.brand;
    const search = data.query.trim().toLowerCase();
    const jobs: Promise<void>[] = [];
    const catalogUrl = process.env.CRM_CATALOG_READ_URL;
    if (catalogUrl) jobs.push((async () => {
      try {
        const db = neon(catalogUrl);
        // 454 reference records were imported from the source catalogs.
        const [counts, products] = await Promise.all([
          db`SELECT brand_id AS brand, count(*)::integer AS count FROM product_references GROUP BY brand_id ORDER BY brand_id`,
          db`SELECT p.source_product_id AS id, p.title, p.brand_id AS brand,
             p.source_system_id AS source, native.intended_visibility AS draft_visibility,
             native.proposed_price_egp::float8 AS draft_price,
             snap.source_status, snap.available_units,
             snap.min_sale_price_egp::float8 AS min_sale_price_egp,
             snap.max_sale_price_egp::float8 AS max_sale_price_egp,
             snap.refreshed_at::text AS source_refreshed_at,
             hd.intended_visibility AS homey_draft,
             sd.intended_visibility AS sodfa_draft,
             hd.proposed_price_egp::float8 AS homey_price,
             sd.proposed_price_egp::float8 AS sodfa_price
             FROM product_references p
             LEFT JOIN product_source_snapshots snap ON snap.product_reference_id=p.id
             LEFT JOIN channel_listing_drafts native
               ON native.product_reference_id = p.id
               AND native.channel_id = (CASE WHEN p.brand_id = 'homey' THEN 'homey_web' ELSE 'sodfa_web' END)
             LEFT JOIN channel_listing_drafts hd ON hd.product_reference_id=p.id AND hd.channel_id='homey_web'
             LEFT JOIN channel_listing_drafts sd ON sd.product_reference_id=p.id AND sd.channel_id='sodfa_web'
             WHERE (${brandCondition} = 'all' OR p.brand_id = ${brandCondition})
               AND (${search} = '' OR lower(p.title) LIKE '%' || ${search} || '%')
             ORDER BY p.title LIMIT 500`,
        ]);
        response.catalog = {connected: true, counts: counts as Count[], products: products as Product[]};
      } catch {
        response.catalog = {...response.catalog, error: "تعذرت قراءة فهرس المنتجات من قاعدة CRM"};
      }
    })());
    const ordersUrl = process.env.CRM_ORDERS_READ_URL;
    if (ordersUrl) jobs.push((async () => {
      try {
        const db = neon(ordersUrl);
        const [summary, orders, customers, shipments] = await Promise.all([
          db`SELECT brand, status, count(*)::integer AS count
             FROM orders WHERE deleted_at IS NULL
             GROUP BY brand, status ORDER BY brand, status`,
          db`SELECT id::text AS id, brand, created_at::text AS created_at, status,
             shipping_company, source FROM orders WHERE deleted_at IS NULL
             AND (${brandCondition} = 'all' OR brand = ${brandCondition})
             ORDER BY created_at DESC LIMIT 40`,
          db`SELECT brand, count(*)::integer AS count
             FROM customers WHERE deleted_at IS NULL
             GROUP BY brand ORDER BY brand`,
          db`SELECT o.brand, COALESCE(s.state,'not_dispatched') AS state, count(*)::integer AS count
             FROM orders o LEFT JOIN tala_order_shipments s ON s.order_id=o.id
             WHERE o.deleted_at IS NULL
             GROUP BY o.brand, COALESCE(s.state,'not_dispatched')
             ORDER BY o.brand, state`,
        ]);
        response.operations = {
          connected: true,
          summary: summary as Summary[],
          orders: orders as OrderRow[],
          customers: customers as Count[],
          shipments: shipments as Shipment[],
        };
      } catch {
        response.operations = {...response.operations, error: "تعذرت قراءة بيانات إدارة الطلبات"};
      }
    })());
    const sodfaUrl = process.env.CRM_SODFA_READ_URL;
    if (sodfaUrl) jobs.push((async () => {
      try {
        const db = neon(sodfaUrl);
        const [inv,sal,items] = await Promise.all([
          db`SELECT count(*)::integer AS sku_rows, COALESCE(sum(remaining_qty),0)::float8 AS units,
             COALESCE(sum(remaining_qty * purchase_price),0)::float8 AS cost_value,
             count(DISTINCT warehouse)::integer AS warehouses FROM website_inventory`,
          db`SELECT count(*)::integer AS count_sales, COALESCE(sum(total_sale_value),0)::float8 AS sales_egp,
             min(sale_date)::text AS first_date, max(sale_date)::text AS last_date FROM sales`,
          db`SELECT product_id, product_name, warehouse, remaining_qty::float8 AS remaining_qty,
             purchase_price::float8 AS purchase_price, sale_price::float8 AS sale_price
             FROM website_inventory ORDER BY product_name LIMIT 100`,
        ]);
        response.sodfa = {
          connected: true,
          inventorySummary: (inv[0] ?? null) as typeof response.sodfa.inventorySummary,
          salesSummary: (sal[0] ?? null) as typeof response.sodfa.salesSummary,
          items: items as typeof response.sodfa.items,
        };
      } catch {
        response.sodfa = {...response.sodfa,error:"تعذرت قراءة مخزون صدفة ومبيعاتها من Neon"};
      }
    })());
    await Promise.all(jobs);
    return response;
  });
