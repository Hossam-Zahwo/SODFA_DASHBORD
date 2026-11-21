import {createServerFn} from "@tanstack/react-start";
import {neon} from "@neondatabase/serverless";
import {z} from "zod";
import {requireCompanyAccess} from "./company-access.server";
const token=z.string().min(16).max(8192),tenantId=z.string().uuid();
async function context(t:string,tenant:string){
 const actor=await requireCompanyAccess(t,"all","admin");
 const url=process.env.SAAS_DATABASE_URL;if(!url)throw Error("SAAS_STAGING_UNAVAILABLE");
 const sql=neon(url);
 return {sql,actor,scope:sql`SELECT set_config('app.tenant_id',${tenant},true),set_config('app.actor_id',${actor.id},true)`};
}
export const getSaaSAccounting=createServerFn({method:"POST"}).validator(z.object({token,tenantId}))
.handler(async({data})=>{
 const {sql,scope}=await context(data.token,data.tenantId);
 const [_,accounts,journals,balances]=await sql.transaction([
 scope,
 sql`SELECT id::text,code,name,account_type FROM saas.account_categories WHERE active ORDER BY code`,
 sql`SELECT id::text,reference,description,entry_date::text,state FROM saas.journal_entries
   ORDER BY created_at DESC LIMIT 100`,
 sql`SELECT a.code,a.name,a.account_type,
   coalesce(sum(CASE WHEN j.state='posted' THEN l.debit_minor ELSE 0 END),0)::bigint AS debit_minor,
   coalesce(sum(CASE WHEN j.state='posted' THEN l.credit_minor ELSE 0 END),0)::bigint AS credit_minor
   FROM saas.account_categories a LEFT JOIN saas.journal_lines l
    ON l.tenant_id=a.tenant_id AND l.account_id=a.id
    LEFT JOIN saas.journal_entries j ON j.tenant_id=l.tenant_id AND j.id=l.entry_id
   GROUP BY a.code,a.name,a.account_type ORDER BY a.code`
 ],{readOnly:true});return {accounts,journals,balances,staging:true};
});
export const postSaaSJournal=createServerFn({method:"POST"}).validator(z.object({
 token,tenantId,requestId:z.string().uuid(),description:z.string().trim().min(3).max(300),
 debitAccountId:z.string().uuid(),creditAccountId:z.string().uuid(),
 amountEGP:z.number().positive().finite().max(10000000)}))
.handler(async({data})=>{
 const {sql,scope,actor}=await context(data.token,data.tenantId);
 if(data.debitAccountId===data.creditAccountId)throw Error("DEBIT_CREDIT_ACCOUNTS_MUST_DIFFER");
 const cents=Math.round(data.amountEGP*100);
 if(cents<1)throw Error("AMOUNT_BELOW_MINIMUM");
 // Single SQL statement: idempotent insert; create exactly 2 balanced lines
 // only for a newly inserted entry. A replay cannot post a second journal.
 const [_,created,lines,rows]=await sql.transaction([
  scope,
  sql`INSERT INTO saas.journal_entries(id,tenant_id,reference,description,state,created_by)
    SELECT ${data.requestId}::uuid,${data.tenantId}::uuid,${data.requestId},
      ${data.description},'draft',${actor.id}::uuid
    WHERE (SELECT count(*) FROM saas.account_categories WHERE tenant_id=${data.tenantId}::uuid
       AND id IN (${data.debitAccountId}::uuid,${data.creditAccountId}::uuid) AND active)=2
    ON CONFLICT(tenant_id,reference) DO NOTHING RETURNING id`,
  sql`INSERT INTO saas.journal_lines(tenant_id,entry_id,account_id,debit_minor,credit_minor)
    SELECT ${data.tenantId}::uuid,j.id,accounts.account_id,accounts.debit,accounts.credit
    FROM saas.journal_entries j JOIN (VALUES
      (${data.debitAccountId}::uuid,${cents}::bigint,0::bigint),
      (${data.creditAccountId}::uuid,0::bigint,${cents}::bigint)
    ) AS accounts(account_id,debit,credit) ON true
    WHERE j.id=${data.requestId}::uuid AND j.tenant_id=${data.tenantId}::uuid
      AND j.state='draft' AND j.description=${data.description}
      AND NOT EXISTS(SELECT 1 FROM saas.journal_lines l WHERE l.tenant_id=j.tenant_id AND l.entry_id=j.id)
    RETURNING entry_id`,
  sql`WITH posted AS (
    UPDATE saas.journal_entries j SET state='posted'
    WHERE j.id=${data.requestId}::uuid AND j.tenant_id=${data.tenantId}::uuid
      AND j.state='draft'
      AND (SELECT count(*) FROM saas.journal_lines l WHERE l.tenant_id=j.tenant_id AND l.entry_id=j.id)=2
      AND (SELECT sum(debit_minor)-sum(credit_minor) FROM saas.journal_lines l
           WHERE l.tenant_id=j.tenant_id AND l.entry_id=j.id)=0
    RETURNING j.id,j.state
   ), audited AS (
    INSERT INTO saas.audit_log(tenant_id,actor_id,action,entity_kind,entity_id,next)
    SELECT ${data.tenantId}::uuid,${actor.id}::uuid,'journal_posted','journal',id::text,
      ${JSON.stringify({amountMinor:cents})}::jsonb FROM posted RETURNING id
   ) SELECT posted.id::text,posted.state FROM posted JOIN audited ON true`
 ]);
 void created;void lines;
 if(rows.length)return {ok:true,id:rows[0].id,posted:true,idempotentReplay:false};
 const [scope2,existing]=await sql.transaction([
  sql`SELECT set_config('app.tenant_id',${data.tenantId},true),set_config('app.actor_id',${actor.id},true)`,
  sql`SELECT j.id::text,j.state,j.description,
   count(l.id)::int AS lines,
   coalesce(sum(l.debit_minor),0)::bigint AS debit_total,
   coalesce(sum(l.credit_minor),0)::bigint AS credit_total,
   count(*) FILTER(WHERE l.account_id=${data.debitAccountId}::uuid AND l.debit_minor=${cents})::int AS matching_debit,
   count(*) FILTER(WHERE l.account_id=${data.creditAccountId}::uuid AND l.credit_minor=${cents})::int AS matching_credit
   FROM saas.journal_entries j LEFT JOIN saas.journal_lines l
   ON l.tenant_id=j.tenant_id AND l.entry_id=j.id
   WHERE j.id=${data.requestId}::uuid AND j.tenant_id=${data.tenantId}::uuid
   GROUP BY j.id,j.state,j.description`
 ],{readOnly:true});void scope2;
 if(existing.length){
   const e=existing[0];
   if(e.description!==data.description || Number(e.lines)!==2 ||
      Number(e.debit_total)!==cents || Number(e.credit_total)!==cents ||
      Number(e.matching_debit)!==1 || Number(e.matching_credit)!==1)
     throw Error("IDEMPOTENCY_PAYLOAD_CONFLICT");
   return {ok:true,id:e.id,posted:e.state==="posted",idempotentReplay:true};
 }
 throw Error("INVALID_ACCOUNT_OR_UNBALANCED_JOURNAL");
});
