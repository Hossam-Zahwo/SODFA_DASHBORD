import {createServerFn} from "@tanstack/react-start";
import {neon} from "@neondatabase/serverless";
import {z} from "zod";
import {requireCompanyAccess} from "./company-access.server";
const token=z.string().min(16).max(8192),tenantId=z.string().uuid(),brand=z.enum(["homey","sodfa"]);
async function runtime(t:string,tenant:string){
 const actor=await requireCompanyAccess(t,"all","admin");
 const url=process.env.SAAS_DATABASE_URL;
 if(!url)throw Error("SAAS_DATABASE_NOT_CONFIGURED");
 const sql=neon(url);
 return {sql,actor,scope:sql`SELECT set_config('app.tenant_id',${tenant},true),set_config('app.actor_id',${actor.id},true)`};
}
export const getSaaSInventory=createServerFn({method:"POST"})
.validator(z.object({token,tenantId,brand}))
.handler(async({data})=>{
 const {sql,scope}=await runtime(data.token,data.tenantId);
 const [_,warehouses,products,balances,movements]=await sql.transaction([
 scope,
 sql`SELECT id::text,brand_id,name FROM saas.warehouses WHERE brand_id=${data.brand} ORDER BY name`,
 sql`SELECT id::text,title,brand_id FROM saas.products WHERE brand_id=${data.brand} ORDER BY title LIMIT 500`,
 sql`SELECT b.warehouse_id::text,b.product_id::text,b.on_hand,b.reserved,b.version,p.title,
 w.name AS warehouse FROM saas.inventory_balances b JOIN saas.products p
 ON p.tenant_id=b.tenant_id AND p.id=b.product_id JOIN saas.warehouses w
 ON w.tenant_id=b.tenant_id AND w.id=b.warehouse_id WHERE p.brand_id=${data.brand}
 ORDER BY w.name,p.title LIMIT 500`,
 sql`SELECT m.id::text,m.delta,m.reason,m.reference,m.occurred_at::text,
 p.title,w.name AS warehouse FROM saas.inventory_movements m
 JOIN saas.products p ON p.tenant_id=m.tenant_id AND p.id=m.product_id
 JOIN saas.warehouses w ON w.tenant_id=m.tenant_id AND w.id=m.warehouse_id
 WHERE p.brand_id=${data.brand} ORDER BY occurred_at DESC LIMIT 60`
 ],{readOnly:true});
 return {warehouses,products,balances,movements,staging:true};
});
export const adjustSaaSInventory=createServerFn({method:"POST"})
.validator(z.object({token,tenantId,brand,
 productId:z.string().uuid(),warehouseId:z.string().uuid(),
 delta:z.number().int().min(-999999).max(999999).refine(x=>x!==0),
 reason:z.enum(["receipt","return","count_adjustment","transfer_in","transfer_out","sale"]),
 requestId:z.string().uuid()}))
.handler(async({data})=>{
 const {sql,scope,actor}=await runtime(data.token,data.tenantId);
 // The movement idempotency key is unique per tenant+warehouse+product+reason.
 // A duplicate retry inserts no movement, and hence makes no second change.
 const [_,rows]=await sql.transaction([scope,sql`
 WITH verified AS (
  SELECT p.id product_id,w.id warehouse_id
  FROM saas.products p JOIN saas.warehouses w
  ON w.tenant_id=p.tenant_id AND w.brand_id=p.brand_id
  WHERE p.tenant_id=${data.tenantId}::uuid AND p.id=${data.productId}::uuid
   AND w.id=${data.warehouseId}::uuid AND p.brand_id=${data.brand}
 ), claimed AS (
  INSERT INTO saas.inventory_movements(tenant_id,warehouse_id,product_id,delta,reason,reference,actor_id)
  SELECT ${data.tenantId}::uuid,warehouse_id,product_id,
   ${data.delta},${data.reason},${data.requestId},${actor.id}::uuid FROM verified
  ON CONFLICT(tenant_id,warehouse_id,product_id,reference,reason) DO NOTHING
  RETURNING tenant_id,warehouse_id,product_id,delta
 ), updated AS (
  INSERT INTO saas.inventory_balances(tenant_id,warehouse_id,product_id,on_hand,reserved)
  SELECT tenant_id,warehouse_id,product_id,delta,0 FROM claimed
  ON CONFLICT(tenant_id,warehouse_id,product_id) DO UPDATE
  SET on_hand=saas.inventory_balances.on_hand+EXCLUDED.on_hand,
   updated_at=now(),version=saas.inventory_balances.version+1
  WHERE saas.inventory_balances.on_hand+EXCLUDED.on_hand>=saas.inventory_balances.reserved
  RETURNING on_hand,reserved,version
 ), audited AS (
  INSERT INTO saas.audit_log(tenant_id,actor_id,action,entity_kind,entity_id,next)
  SELECT ${data.tenantId}::uuid,${actor.id}::uuid,'inventory_adjustment','product',
   ${data.productId},${JSON.stringify({delta:data.delta,reason:data.reason,requestId:data.requestId})}::jsonb
  FROM updated RETURNING id
 ) SELECT on_hand,reserved,version FROM updated`]);
 if(rows.length)return {ok:true,changed:true,onHand:rows[0].on_hand,reserved:rows[0].reserved};
 // Empty result means either a duplicate idempotency key, mismatched warehouse/brand,
 // or insufficient available stock. Report honestly; never claim an adjustment.
 const [scope2,exists]=await sql.transaction([
  sql`SELECT set_config('app.tenant_id',${data.tenantId},true),set_config('app.actor_id',${actor.id},true)`,
  sql`SELECT count(*)::integer AS n FROM saas.inventory_movements
   WHERE tenant_id=${data.tenantId}::uuid AND warehouse_id=${data.warehouseId}::uuid
    AND product_id=${data.productId}::uuid AND reference=${data.requestId} AND reason=${data.reason}`
 ],{readOnly:true});void scope2;
 if(Number(exists[0]?.n??0)>0)return {ok:true,changed:false,idempotentReplay:true};
 throw Error("INVALID_PRODUCT_WAREHOUSE_OR_INSUFFICIENT_AVAILABLE_STOCK");
});
