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
type Product = { id: string; title: string; brand: string; source: string };
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
    } = {
      fetchedAt: new Date().toISOString(),
      catalog: { connected: false, counts: [], products: [] },
      operations: { connected: false, summary: [], orders: [], customers: [], shipments: [] },
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
          db`SELECT source_product_id AS id, title, brand_id AS brand, source_system_id AS source
             FROM product_references
             WHERE (${brandCondition} = 'all' OR brand_id = ${brandCondition})
               AND (${search} = '' OR lower(title) LIKE '%' || ${search} || '%')
             ORDER BY title LIMIT 100`,
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
    await Promise.all(jobs);
    return response;
  });
