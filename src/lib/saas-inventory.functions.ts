import {createServerFn} from "@tanstack/react-start";
import {neon} from "@neondatabase/serverless";
import {z} from "zod";
import {requireSaaSAccess,type SaaSCapability} from "./saas-access.server";
const token=z.string().min(16).max(8192),tenantId=z.string().uuid(),brand=z.enum(["homey","sodfa"]);
async function runtime(t:string,tenant:string,cap:SaaSCapability="read",brandScope:string="all"){
 const actor=await requireSaaSAccess(t,tenant,cap,brandScope);
 const url=process.env.SAAS_DATABASE_URL;
 if(!url)throw Error("SAAS_DATABASE_NOT_CONFIGURED");
 const sql=neon(url);
 return {sql,actor,scope:sql`SELECT set_config('app.tenant_id',${tenant},true),set_config('app.actor_id',${actor.id},true)`};
}
export const getSaaSInventory=createServerFn({method:"POST"})
.validator(z.object({token,tenantId,brand}))
.handler(async({data})=>{
 const {sql,scope}=await runtime(data.token,data.tenantId,"read",data.brand);
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
 const {sql,scope,actor}=await runtime(data.token,data.tenantId,"inventory_write",data.brand);
 // The movement idempotency key is unique per tenant+warehouse+product+reason.
 // A duplicate retry inserts no movement, and hence makes no second change.
 const [_,rows]=await sql.transaction([scope,sql`
  SELECT on_hand,reserved,version,replayed
  FROM saas.apply_inventory_movement(
   ${data.tenantId}::uuid,${actor.id}::uuid,
   ${data.warehouseId}::uuid,${data.productId}::uuid,
   ${data.delta},${data.reason},${data.requestId}
  )`]);
 if(!rows.length)throw Error("INVENTORY_MOVEMENT_NOT_RECORDED");
 const result=rows[0];
 return {ok:true,changed:!result.replayed,idempotentReplay:!!result.replayed,
   onHand:Number(result.on_hand),reserved:Number(result.reserved),version:Number(result.version)};
});
