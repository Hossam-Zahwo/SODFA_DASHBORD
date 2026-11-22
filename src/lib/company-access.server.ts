import {createClient} from "@supabase/supabase-js";
import {neon} from "@neondatabase/serverless";

export type Workspace="all"|"homey"|"sodfa"|"sodfa_web"|"orders";
export type WorkspaceRole="viewer"|"operator"|"manager";
export type Capability="read"|"draft"|"staging_order"|"approve"|"admin";

const permissionLevels:Record<WorkspaceRole,number>={viewer:1,operator:2,manager:3};
const needed:Record<Capability,number>={read:1,draft:2,staging_order:2,approve:3,admin:4};

/** Authenticate a real user and check per-project responsibility on the server.
 * All-project access requires an existing SODFA admin. No client roles trusted.
 */
export async function requireCompanyAccess(token:string,project:Workspace,capability:Capability){
  const url=process.env["VITE_SUPABASE_URL"];
  const key=process.env["VITE_SUPABASE_PUBLISHABLE_KEY"];
  if(!url||!key)throw new Error("AUTH_NOT_CONFIGURED");
  const client=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}});
  const {data:{user},error}=await client.auth.getUser(token);
  if(error||!user?.id||!user.email)throw new Error("UNAUTHORIZED");
  const asUser=createClient(url,key,{global:{headers:{Authorization:"Bearer "+token}},
    auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}});
  const {data:profile,error:profileError}=await asUser.from("profiles").select("role")
    .eq("id",user.id).maybeSingle();
  if(profileError)throw new Error("ROLE_LOOKUP_FAILED");
  const isAdmin=profile?.role==="admin";
  if(isAdmin)return {id:user.id,role:"admin" as const,isAdmin:true};
  if(project==="all"||capability==="admin")throw new Error("ACCESS_DENIED");
  const pg=process.env["CRM_CATALOG_READ_URL"];
  if(!pg)throw new Error("ACCESS_POLICY_UNAVAILABLE");
  const rows=await neon(pg)`SELECT responsibility FROM workspace_permissions
    WHERE user_id=${user.id}::uuid AND project_id=${project} LIMIT 1`;
  if(!rows.length)throw new Error("ACCESS_DENIED");
  const role=String(rows[0]!["responsibility"]) as WorkspaceRole;
  if((permissionLevels[role]??0)<needed[capability])throw new Error("ACCESS_DENIED");
  return {id:user.id,role,isAdmin:false};
}
