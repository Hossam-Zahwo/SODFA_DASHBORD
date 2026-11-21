import {createServerFn} from "@tanstack/react-start";
import {neon} from "@neondatabase/serverless";
import {z} from "zod";
import {randomUUID} from "node:crypto";
import {requireCompanyAccess} from "./company-access.server";

/** Staging SaaS environment. RLS requires a verified actor and tenant context
 * in the SAME PostgreSQL transaction. No user-supplied SQL identifiers, no
 * cross-tenant owner role, no production storefront mutations.
 */
const token=z.string().min(16).max(8192);
const tenantId=z.string().uuid();
const brand=z.enum(["homey","sodfa"]);
const source="company_saas_staging";
const connection=()=>{
  const url=process.env.SAAS_DATABASE_URL;
  if(!url)throw new Error("SAAS_STAGING_DATABASE_NOT_CONFIGURED");
  return neon(url);
};
async function context(userToken:string,tenant:string){
  const actor=await requireCompanyAccess(userToken,"all","admin");
  const sql=connection();
  const scope=sql`SELECT set_config('app.tenant_id',${tenant},true) AS tenant_scope,
    set_config('app.actor_id',${actor.id},true) AS actor_scope`;
  return {sql,scope,actor};
}
const request=z.object({token,tenantId,brand:brand.optional()});

export const getSaaSWorkspace=createServerFn({method:"POST"}).validator(request)
.handler(async({data})=>{
 const {sql,scope}=await context(data.token,data.tenantId);
 const chosen=data.brand??"all";
 const [scopeResult,org,products,channels,customers,orders,warehouses,expenses,integrations,events]=await sql.transaction([
  scope,
  sql`SELECT id::text,slug,display_name,state FROM saas.tenants
    WHERE id=${data.tenantId}::uuid LIMIT 1`,
  sql`SELECT id::text,brand_id,title,status,source_system,external_id,sku,
    cost_minor,updated_at::text FROM saas.products
    WHERE (${chosen}='all' OR brand_id=${chosen})
    ORDER BY updated_at DESC,title LIMIT 500`,
  sql`SELECT id,brand_id,display_name,connector_state,enabled FROM saas.channels ORDER BY id`,
  sql`SELECT id::text,brand_id,display_name,phone,created_at::text FROM saas.customers
    WHERE (${chosen}='all' OR brand_id=${chosen}) ORDER BY created_at DESC LIMIT 100`,
  sql`SELECT id::text,brand_id,status,placed_at::text,version,external_order_id
    FROM saas.orders WHERE (${chosen}='all' OR brand_id=${chosen})
    ORDER BY placed_at DESC LIMIT 100`,
  sql`SELECT id::text,brand_id,name,active FROM saas.warehouses
    WHERE (${chosen}='all' OR brand_id=${chosen}) ORDER BY name`,
  sql`SELECT brand_id,category,amount_minor,incurred_at::text,description FROM saas.expenses
    WHERE (${chosen}='all' OR brand_id=${chosen}) ORDER BY incurred_at DESC LIMIT 60`,
  sql`SELECT system_key,connection_state,last_success_at::text,error_code FROM saas.integration_connections ORDER BY system_key`,
  sql`SELECT action,entity_kind,entity_id,occurred_at::text FROM saas.audit_log
    ORDER BY occurred_at DESC LIMIT 30`,
 ],{readOnly:true});
 void scopeResult;
 if(!org.length)throw new Error("TENANT_ACCESS_DENIED");
 return {organization:org[0],products,channels,customers,orders,warehouses,expenses,integrations,events,
  summary:{products:products.length,customers:customers.length,orders:orders.length,warehouses:warehouses.length},
  warning:"STAGING_ONLY_NO_LIVE_PUBLICATION_OR_CARRIER_DISPATCH"};
});

const createProduct=z.object({token,tenantId,brand,title:z.string().trim().min(3).max(240),
 sku:z.string().trim().max(100).nullable(),channels:z.array(z.enum(["homey_web","sodfa_web"])).max(2)});
export const createSaaSProduct=createServerFn({method:"POST"}).validator(createProduct)
.handler(async({data})=>{
 const {sql,scope,actor}=await context(data.token,data.tenantId);
 const id=randomUUID();
 const [_,brandExists,inserted,audit]=await sql.transaction([
  scope,
  sql`SELECT id FROM saas.brands WHERE id=${data.brand} LIMIT 1`,
  sql`INSERT INTO saas.products(id,tenant_id,brand_id,source_system,external_id,sku,title)
    SELECT ${id}::uuid,${data.tenantId}::uuid,${data.brand},${source},${id},
      ${data.sku},${data.title}
    WHERE EXISTS(SELECT 1 FROM saas.brands WHERE id=${data.brand})
    RETURNING id::text,title`,
  sql`INSERT INTO saas.audit_log(tenant_id,actor_id,action,entity_kind,entity_id,next)
    VALUES(${data.tenantId}::uuid,${actor.id}::uuid,'draft_product_created','product',${id},
      ${JSON.stringify({brand:data.brand,title:data.title,channels:data.channels})}::jsonb)
    RETURNING id`,
 ]);
 void brandExists;void audit;
 if(!inserted.length)throw new Error("INVALID_BRAND");
 if(data.channels.length){
  const writes=data.channels.map(channel=>
    sql`INSERT INTO saas.channel_listings(tenant_id,product_id,channel_id,visibility)
      VALUES(${data.tenantId}::uuid,${id}::uuid,${channel},
       CASE WHEN ${channel}=${data.brand==="homey"?"homey_web":"sodfa_web"}
         THEN 'draft' ELSE 'pending_approval' END)
      RETURNING id`);
  const [scope2,...out]=await sql.transaction([
   sql`SELECT set_config('app.tenant_id',${data.tenantId},true),
     set_config('app.actor_id',${actor.id},true)`,...writes]);
  void scope2;void out;
 }
 return {ok:true,id,status:"draft",published:false};
});

export const createSaaSCustomer=createServerFn({method:"POST"}).validator(z.object({
 token,tenantId,brand,name:z.string().trim().min(2).max(200),
 phone:z.string().trim().max(30).nullable()}))
.handler(async({data})=>{
 const {sql,scope,actor}=await context(data.token,data.tenantId);
 const id=randomUUID();
 const [_,rows]=await sql.transaction([scope,sql`
 WITH added AS (
  INSERT INTO saas.customers(id,tenant_id,brand_id,display_name,phone)
  VALUES(${id}::uuid,${data.tenantId}::uuid,${data.brand},${data.name},${data.phone})
  RETURNING id
 ), event AS (
  INSERT INTO saas.audit_log(tenant_id,actor_id,action,entity_kind,entity_id)
  SELECT ${data.tenantId}::uuid,${actor.id}::uuid,'customer_created','customer',id::text FROM added
  RETURNING id
 ) SELECT added.id::text FROM added JOIN event ON true`]);
 return {ok:rows.length===1,id};
});

export const createSaaSWarehouse=createServerFn({method:"POST"}).validator(z.object({
 token,tenantId,brand,name:z.string().trim().min(2).max(140)}))
.handler(async({data})=>{
 const {sql,scope,actor}=await context(data.token,data.tenantId);
 const id=randomUUID();
 const [_,rows]=await sql.transaction([scope,sql`
 WITH added AS (
  INSERT INTO saas.warehouses(id,tenant_id,brand_id,name)
  VALUES(${id}::uuid,${data.tenantId}::uuid,${data.brand},${data.name})
  RETURNING id
 ), event AS (
  INSERT INTO saas.audit_log(tenant_id,actor_id,action,entity_kind,entity_id)
  SELECT ${data.tenantId}::uuid,${actor.id}::uuid,'warehouse_created','warehouse',id::text FROM added
  RETURNING id
 ) SELECT added.id::text FROM added JOIN event ON true`]);
 return {ok:rows.length===1,id};
});

export const createSaaSExpense=createServerFn({method:"POST"}).validator(z.object({
 token,tenantId,brand,category:z.string().trim().min(2).max(120),
 amountEGP:z.number().finite().positive().max(10000000),
 description:z.string().max(500).default("")}))
.handler(async({data})=>{
 const {sql,scope,actor}=await context(data.token,data.tenantId);
 const id=randomUUID(),minor=Math.round(data.amountEGP*100);
 const [_,rows]=await sql.transaction([scope,sql`
 WITH added AS (
  INSERT INTO saas.expenses(id,tenant_id,brand_id,category,amount_minor,description)
  VALUES(${id}::uuid,${data.tenantId}::uuid,${data.brand},${data.category},${minor},${data.description})
  RETURNING id
 ), event AS (
  INSERT INTO saas.audit_log(tenant_id,actor_id,action,entity_kind,entity_id,next)
  SELECT ${data.tenantId}::uuid,${actor.id}::uuid,'expense_recorded','expense',id::text,
   ${JSON.stringify({brand:data.brand,category:data.category,minor})}::jsonb FROM added
  RETURNING id
 ) SELECT added.id::text FROM added JOIN event ON true`]);
 return {ok:rows.length===1,id};
});
