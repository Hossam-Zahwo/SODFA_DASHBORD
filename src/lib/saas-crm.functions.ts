import {createServerFn} from "@tanstack/react-start";
import {neon} from "@neondatabase/serverless";
import {randomUUID} from "node:crypto";
import {z} from "zod";
import {requireSaaSAccess,type SaaSCapability} from "./saas-access.server";

const token=z.string().min(16).max(8192),tenantId=z.string().uuid();
const brand=z.enum(["homey","sodfa"]);
async function runtime(t:string,tenant:string,cap:SaaSCapability="read",brandScope:string="all"){
 const actor=await requireSaaSAccess(t,tenant,cap,brandScope);
 const url=process.env.SAAS_DATABASE_URL;
 if(!url)throw Error("SAAS_STAGING_UNCONFIGURED");
 const sql=neon(url);
 const scope=sql`SELECT set_config('app.tenant_id',${tenant},true),
    set_config('app.actor_id',${actor.id},true)`;
 return {sql,scope,actor};
}
export const getSaaSCRM=createServerFn({method:"POST"})
.validator(z.object({token,tenantId,brand:brand.optional()}))
.handler(async({data})=>{
 const b=data.brand??"all";
 const {sql,scope,actor}=await runtime(data.token,data.tenantId,"read",b);
 const [_,leads,tasks,activities]=await sql.transaction([
 scope,
 sql`SELECT id::text,brand_id,full_name,phone,stage,source,
 expected_value_minor,created_at::text FROM saas.crm_leads
 WHERE (${b}='all' OR brand_id=${b}) ORDER BY created_at DESC LIMIT 100`,
 sql`SELECT t.id::text,t.summary,t.priority,t.state,t.due_at::text,t.lead_id::text,
 l.brand_id FROM saas.crm_tasks t LEFT JOIN saas.crm_leads l
 ON l.tenant_id=t.tenant_id AND l.id=t.lead_id
 WHERE (${b}='all' OR l.brand_id=${b}) ORDER BY t.due_at NULLS LAST LIMIT 100`,
 sql`SELECT a.id::text,a.kind,a.summary,a.occurred_at::text,a.lead_id::text,
 l.brand_id FROM saas.crm_activities a LEFT JOIN saas.crm_leads l
 ON l.tenant_id=a.tenant_id AND l.id=a.lead_id
 WHERE (${b}='all' OR l.brand_id=${b}) ORDER BY a.occurred_at DESC LIMIT 50`,
 ],{readOnly:true});
 return {leads:actor.role==="viewer"?leads.map(x=>({...x,phone:null})):leads,tasks,activities,staging:true};
});
export const createSaaSLead=createServerFn({method:"POST"})
.validator(z.object({token,tenantId,brand,fullName:z.string().trim().min(2).max(200),
 phone:z.string().trim().max(30).nullable(),
 source:z.string().trim().max(80).nullable(),
 estimatedEGP:z.number().nonnegative().max(10_000_000)}))
.handler(async({data})=>{
 const {sql,scope,actor}=await runtime(data.token,data.tenantId,"crm_write",data.brand);
 const id=randomUUID();
 const [_,rows]=await sql.transaction([
 scope,
 sql`WITH added AS (
 INSERT INTO saas.crm_leads(id,tenant_id,brand_id,full_name,phone,source,owner_id,expected_value_minor)
 VALUES(${id}::uuid,${data.tenantId}::uuid,${data.brand},${data.fullName},
 ${data.phone},${data.source},${actor.id}::uuid,${Math.round(data.estimatedEGP*100)})
 RETURNING id
 ), audited AS (
 INSERT INTO saas.audit_log(tenant_id,actor_id,action,entity_kind,entity_id)
 SELECT ${data.tenantId}::uuid,${actor.id}::uuid,'crm_lead_created','lead',id::text FROM added
 RETURNING id
 ) SELECT added.id::text FROM added JOIN audited ON true`,
 ]);
 return {id:rows[0]?.id??null,created:rows.length===1};
});
export const updateSaaSLeadStage=createServerFn({method:"POST"})
.validator(z.object({token,tenantId,leadId:z.string().uuid(),brand,
 stage:z.enum(["new","contacted","qualified","proposal","won","lost"])}))
.handler(async({data})=>{
 const {sql,scope,actor}=await runtime(data.token,data.tenantId,"crm_write",data.brand);
 const [_,changed]=await sql.transaction([
 scope,
 sql`WITH updated AS (
 UPDATE saas.crm_leads SET stage=${data.stage},updated_at=now()
 WHERE id=${data.leadId}::uuid AND tenant_id=${data.tenantId}::uuid
 RETURNING id,stage
 ), audited AS (
 INSERT INTO saas.audit_log(tenant_id,actor_id,action,entity_kind,entity_id,next)
 SELECT ${data.tenantId}::uuid,${actor.id}::uuid,'crm_stage_update','lead',
 id::text,${JSON.stringify({stage:data.stage})}::jsonb FROM updated RETURNING id
 ) SELECT updated.id::text,updated.stage FROM updated JOIN audited ON true`,
 ]);
 if(!changed.length)throw Error("LEAD_NOT_FOUND_IN_TENANT");
 return changed[0];
});
export const createSaaSTask=createServerFn({method:"POST"})
.validator(z.object({token,tenantId,leadId:z.string().uuid(),brand,
 summary:z.string().trim().min(3).max(400),
 priority:z.enum(["low","normal","high","urgent"]).default("normal")}))
.handler(async({data})=>{
 const {sql,scope,actor}=await runtime(data.token,data.tenantId,"crm_write",data.brand);
 const id=randomUUID();
 const [_,rows]=await sql.transaction([scope,sql`
 WITH added AS (
 INSERT INTO saas.crm_tasks(id,tenant_id,lead_id,assigned_to,summary,priority)
 SELECT ${id}::uuid,${data.tenantId}::uuid,l.id,${actor.id}::uuid,${data.summary},${data.priority}
 FROM saas.crm_leads l WHERE l.id=${data.leadId}::uuid AND l.tenant_id=${data.tenantId}::uuid
 RETURNING id
 ), audited AS (
 INSERT INTO saas.audit_log(tenant_id,actor_id,action,entity_kind,entity_id)
 SELECT ${data.tenantId}::uuid,${actor.id}::uuid,'crm_task_created','task',id::text FROM added
 RETURNING id
 ) SELECT added.id::text FROM added JOIN audited ON true`]);
 if(!rows.length)throw Error("LEAD_NOT_FOUND_IN_TENANT");
 return {id:rows[0].id,ok:true};
});
