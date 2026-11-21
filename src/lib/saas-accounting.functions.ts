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
 const [_,rows]=await sql.transaction([scope,sql`
 WITH allowed AS (
  SELECT count(*)::int AS n FROM saas.account_categories
  WHERE tenant_id=${data.tenantId}::uuid
   AND id IN (${data.debitAccountId}::uuid,${data.creditAccountId}::uuid)
   AND active
 ), inserted AS (
  INSERT INTO saas.journal_entries(id,tenant_id,reference,description,state,created_by)
  SELECT ${data.requestId}::uuid,${data.tenantId}::uuid,${data.requestId},
    ${data.description},'draft',${actor.id}::uuid FROM allowed WHERE n=2
  ON CONFLICT(tenant_id,reference) DO NOTHING RETURNING id
 ), lines AS (
  INSERT INTO saas.journal_lines(tenant_id,entry_id,account_id,debit_minor,credit_minor)
  SELECT ${data.tenantId}::uuid,inserted.id,entry.account_id,entry.debit,entry.credit
  FROM inserted JOIN (VALUES
    (${data.debitAccountId}::uuid,${cents}::bigint,0::bigint),
    (${data.creditAccountId}::uuid,0::bigint,${cents}::bigint)
  ) AS entry(account_id,debit,credit) ON true
  RETURNING entry_id,debit_minor,credit_minor
 ), balanced AS (
  SELECT entry_id,sum(debit_minor) AS debits,sum(credit_minor) AS credits
  FROM lines GROUP BY entry_id HAVING count(*)=2 AND sum(debit_minor)=sum(credit_minor)
 ), posted AS (
  UPDATE saas.journal_entries j SET state='posted'
  FROM balanced b WHERE j.id=b.entry_id AND j.tenant_id=${data.tenantId}::uuid
  RETURNING j.id,j.state
 ), audited AS (
  INSERT INTO saas.audit_log(tenant_id,actor_id,action,entity_kind,entity_id,next)
  SELECT ${data.tenantId}::uuid,${actor.id}::uuid,'journal_posted','journal',id::text,
   ${JSON.stringify({amountMinor:cents})}::jsonb FROM posted
  RETURNING id
 ) SELECT posted.id::text,posted.state FROM posted JOIN audited ON true
 `]);
 if(rows.length)return {ok:true,id:rows[0].id,posted:true,idempotentReplay:false};
 const [scope2,existing]=await sql.transaction([
  sql`SELECT set_config('app.tenant_id',${data.tenantId},true),set_config('app.actor_id',${actor.id},true)`,
  sql`SELECT id::text,state FROM saas.journal_entries
   WHERE id=${data.requestId}::uuid AND tenant_id=${data.tenantId}::uuid`
 ],{readOnly:true});void scope2;
 if(existing.length)return {ok:true,id:existing[0].id,posted:existing[0].state==="posted",idempotentReplay:true};
 throw Error("INVALID_ACCOUNT_OR_UNBALANCED_JOURNAL");
});
