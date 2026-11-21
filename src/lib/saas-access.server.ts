import {createClient} from "@supabase/supabase-js";
import {neon} from "@neondatabase/serverless";

export type SaaSCapability="read"|"crm_write"|"catalog_write"|"inventory_write"|"finance_write"|"tenant_admin";
export type SaaSRole="owner"|"admin"|"manager"|"operator"|"viewer";
const rank:Record<SaaSRole,number>={viewer:1,operator:2,manager:3,admin:4,owner:5};
const needed:Record<SaaSCapability,number>={
 read:1,crm_write:2,catalog_write:2,inventory_write:3,finance_write:3,tenant_admin:4,
};

/** For each request validate Supabase Auth remotely, then validate an ACTIVE
 * SaaS tenant membership and optionally a brand-specific grant using a
 * transaction-scoped PostgreSQL RLS session. Never accept role from the client.
 */
export async function requireSaaSAccess(token:string,tenantId:string,cap:SaaSCapability,brand?:string){
 const url=process.env.VITE_SUPABASE_URL,key=process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
 if(!url||!key)throw Error("SAAS_AUTH_NOT_CONFIGURED");
 const provider=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}});
 const {data:{user},error}=await provider.auth.getUser(token);
 if(error||!user?.id||!user.email)throw Error("UNAUTHORIZED");
 const dbUrl=process.env.SAAS_DATABASE_URL;
 if(!dbUrl)throw Error("SAAS_DATABASE_NOT_CONFIGURED");
 const sql=neon(dbUrl);
 const [_,membership,brands]=await sql.transaction([
  sql`SELECT set_config('app.tenant_id',${tenantId},true),set_config('app.actor_id',${user.id},true)`,
  sql`SELECT role FROM saas.memberships WHERE tenant_id=${tenantId}::uuid AND
   user_id=${user.id}::uuid AND is_active LIMIT 1`,
  sql`SELECT brand_id,role FROM saas.brand_access
   WHERE tenant_id=${tenantId}::uuid AND user_id=${user.id}::uuid`,
 ],{readOnly:true});
 if(membership.length!==1)throw Error("TENANT_MEMBERSHIP_REQUIRED");
 const tenantRole=String(membership[0].role) as SaaSRole;
 if((rank[tenantRole]??0)<needed[cap])throw Error("ROLE_CAPABILITY_DENIED");
 if(tenantRole==="owner"||tenantRole==="admin")
  return {id:user.id,role:tenantRole,isAdmin:true,tenantId};
 if(!brand||brand==="all")throw Error("BRAND_SCOPE_REQUIRED");
 const grant=brands.find(b=>String(b.brand_id)===brand);
 if(!grant||(rank[String(grant.role) as SaaSRole]??0)<needed[cap])
  throw Error("BRAND_CAPABILITY_DENIED");
 return {id:user.id,role:tenantRole,isAdmin:false,tenantId,brand};
}
