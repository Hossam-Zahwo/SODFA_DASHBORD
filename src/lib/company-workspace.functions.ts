import { createServerFn } from "@tanstack/react-start";
import { requireCompanyAccess } from "./company-access.server";
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
  project: z.enum(["all","homey","sodfa","sodfa_web","orders"]).default("all"),
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
  customer_name: string; phone: string; city: string | null; governorate: string | null;
  address: string | null; payment_method: string | null;
  items: Array<{name:string;quantity:number;price:number;sku?:string}>;
  shipping: number; discount: number; prepaid: number;
  manual_total: number | null; carrier_received: number | null;
  source_order_id: string | null; version: number;
};
type Shipment = { brand: string; state: string; count: number };
type Count = { brand: string; count: number };

export const getCompanyWorkspaceData = createServerFn({ method: "POST" })
  .validator(RequestSchema)
  .handler(async ({ data }) => {
    const access=await requireCompanyAccess(data.token,data.project,"read");
    // All queries are server-side. Order PII is only exposed to operators/managers, never viewers.
    const response: {
      fetchedAt: string;
      accessRole: "admin"|"viewer"|"operator"|"manager";
      catalog: { connected: boolean; error?: string | undefined; counts: Count[]; products: Product[] };
      operations: {
        connected: boolean; error?: string | undefined; summary: Summary[];
        orders: OrderRow[]; customers: Count[]; shipments: Shipment[];
      };
      sodfa: { connected: boolean; error?: string | undefined;
        inventorySummary: { sku_rows: number; units: number; cost_value: number | null; warehouses: number } | null;
        salesSummary: { count_sales: number; sales_egp: number; first_date: string | null; last_date: string | null } | null;
        items: {product_id: string; product_name: string; warehouse: string; remaining_qty: number; purchase_price: number; sale_price: number}[];
      };
    } = {
      fetchedAt: new Date().toISOString(),
      accessRole:access.role,
      catalog: { connected: false, counts: [], products: [] },
      operations: { connected: false, summary: [], orders: [], customers: [], shipments: [] },
      sodfa: { connected:false, inventorySummary:null, salesSummary:null, items:[] },
    };
    // Scope is applied to DB reads, not only the rendered interface.
    const scope=data.project;
    const brandCondition=scope==="homey"?"homey":scope==="sodfa"||scope==="sodfa_web"?"sodfa":"all";
    const catalogEnabled=scope==="all"||scope==="homey"||scope==="sodfa";
    const ordersEnabled=scope==="all"||scope==="homey"||scope==="sodfa"||scope==="orders";
    const sodfaEnabled=scope==="all"||scope==="sodfa";
    const search = data.query.trim().toLowerCase();
    const jobs: Promise<void>[] = [];
    const catalogUrl = process.env["CRM_CATALOG_READ_URL"];
    if (catalogEnabled && catalogUrl) jobs.push((async () => {
      try {
        const db = neon(catalogUrl);
        // 454 reference records were imported from the source catalogs.
        const [countResult, productResult] = await Promise.allSettled([
          db`SELECT brand_id AS brand, count(*)::integer AS count FROM product_references WHERE (${brandCondition} = 'all' OR brand_id = ${brandCondition}) GROUP BY brand_id ORDER BY brand_id`,
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
        response.catalog = {
          connected: countResult.status === "fulfilled" || productResult.status === "fulfilled",
          counts: countResult.status === "fulfilled" ? countResult.value as Count[] : [],
          products: productResult.status === "fulfilled" ? productResult.value as Product[] : [],
          error: countResult.status === "rejected" || productResult.status === "rejected"
            ? "جزء من فهرس المنتجات تعذر تحميله؛ اعرض البيانات المتاحة وأعد التحديث" : undefined,
        };
      } catch {
        response.catalog = {...response.catalog, error: "تعذرت قراءة فهرس المنتجات من قاعدة CRM"};
      }
    })());
    const ordersUrl = process.env["CRM_ORDERS_READ_URL"];
    if (ordersEnabled && ordersUrl) jobs.push((async () => {
      try {
        const db = neon(ordersUrl);
        // Independent queries: a shipping integration failure must not erase
        // all orders and customer counts from the operations dashboard.
        const [summaryResult, orderResult, customerResult, shipmentResult] = await Promise.allSettled([
          db`SELECT brand, status, count(*)::integer AS count
             FROM orders WHERE deleted_at IS NULL
             AND (${brandCondition} = 'all' OR brand = ${brandCondition})
             GROUP BY brand, status ORDER BY brand, status`,
          db`SELECT id::text AS id,brand,created_at::text AS created_at,status,
             shipping_company,source,customer_name,phone,city,governorate,
             address,payment_method,items,shipping::float8 AS shipping,
             discount::float8 AS discount,prepaid::float8 AS prepaid,
             manual_total::float8 AS manual_total,carrier_received::float8 AS carrier_received,
             source_order_id,version
             FROM orders WHERE deleted_at IS NULL
             AND (${brandCondition} = 'all' OR brand = ${brandCondition})
             ORDER BY created_at DESC LIMIT 500`,
          db`SELECT brand, count(*)::integer AS count
             FROM customers WHERE deleted_at IS NULL
             AND (${brandCondition} = 'all' OR brand = ${brandCondition})
             GROUP BY brand ORDER BY brand`,
          db`SELECT o.brand, COALESCE(s.state,'not_dispatched') AS state,
             count(*)::integer AS count
             FROM orders o LEFT JOIN tala_order_shipments s ON s.order_id=o.id
             WHERE o.deleted_at IS NULL
             AND (${brandCondition} = 'all' OR o.brand = ${brandCondition})
             GROUP BY o.brand, COALESCE(s.state,'not_dispatched')
             ORDER BY o.brand, state`,
        ]);
        const okay = <T,>(x:PromiseSettledResult<T[]>)=>x.status==="fulfilled"?x.value:[];
        response.operations = {
          connected: summaryResult.status==="fulfilled" || orderResult.status==="fulfilled",
          summary: okay(summaryResult) as Summary[],
          orders: okay(orderResult) as OrderRow[],
          customers: okay(customerResult) as Count[],
          shipments: okay(shipmentResult) as Shipment[],
          error: [summaryResult,orderResult,customerResult,shipmentResult]
            .some(x=>x.status==="rejected") ? "بعض مصادر الطلبات أو الشحن غير متاحة؛ البيانات السليمة ظاهرة" : undefined,
        };
      } catch {
        response.operations = {...response.operations, error: "تعذرت قراءة بيانات إدارة الطلبات"};
      }
    })());
    const sodfaUrl = process.env["CRM_SODFA_READ_URL"];
    if (sodfaEnabled && sodfaUrl) jobs.push((async () => {
      try {
        const db = neon(sodfaUrl);
        const [invResult,salResult,itemResult] = await Promise.allSettled([
          db`SELECT count(*)::integer AS sku_rows, COALESCE(sum(remaining_qty),0)::float8 AS units,
             COALESCE(sum(remaining_qty * purchase_price),0)::float8 AS cost_value,
             count(DISTINCT warehouse)::integer AS warehouses FROM website_inventory`,
          db`SELECT count(*)::integer AS count_sales, COALESCE(sum(total_sale_value),0)::float8 AS sales_egp,
             min(sale_date)::text AS first_date, max(sale_date)::text AS last_date FROM sales`,
          db`SELECT product_id, product_name, warehouse, remaining_qty::float8 AS remaining_qty,
             purchase_price::float8 AS purchase_price, sale_price::float8 AS sale_price
             FROM website_inventory ORDER BY product_name LIMIT 1000`,
        ]);
        response.sodfa = {
          connected: invResult.status === "fulfilled" || salResult.status === "fulfilled",
          inventorySummary: invResult.status === "fulfilled"
            ? (invResult.value[0] ?? null) as typeof response.sodfa.inventorySummary : null,
          salesSummary: salResult.status === "fulfilled"
            ? (salResult.value[0] ?? null) as typeof response.sodfa.salesSummary : null,
          items: itemResult.status === "fulfilled"
            ? itemResult.value as typeof response.sodfa.items : [],
          error: [invResult,salResult,itemResult].some(x=>x.status==="rejected")
            ? "جزء من بيانات مخزون أو مبيعات صدفة تعذر تحميله" : undefined,
        };
      } catch {
        response.sodfa = {...response.sodfa,error:"تعذرت قراءة مخزون صدفة ومبيعاتها من Neon"};
      }
    })());
    await Promise.all(jobs);
    // A viewer sees operational counts and non-sensitive rows, not customer
    // contact details or purchase costs.
    if(!access.isAdmin && access.role==="viewer"){
      response.operations.orders=response.operations.orders.map(o=>({
        ...o,customer_name:"محجوب",phone:"",city:null,governorate:null,address:null,
        payment_method:null,items:[],manual_total:null,carrier_received:null,
      }));
      response.sodfa.items=response.sodfa.items.map(i=>({...i,purchase_price:0}));
      if(response.sodfa.inventorySummary)response.sodfa.inventorySummary.cost_value=null;
    }
    return response;
  });
