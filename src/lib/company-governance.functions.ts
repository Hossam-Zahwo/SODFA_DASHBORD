import {createServerFn} from "@tanstack/react-start";
import {neon} from "@neondatabase/serverless";
import {z} from "zod";
import {requireCompanyAccess} from "./company-access.server";

const project=z.enum(["homey","sodfa","sodfa_web","orders"]);
const role=z.enum(["viewer","operator","manager"]);
export const getCompanyGovernance=createServerFn({method:"POST"})
.validator(z.object({token:z.string().min(16).max(8192)}))
.handler(async({data})=>{
 await requireCompanyAccess(data.token,"all","admin");
 const url=process.env["CRM_CATALOG_READ_URL"];
 if(!url)throw new Error("POLICY_DB_UNAVAILABLE");
 const db=neon(url);
 const [assignments,backups,approvals]=await Promise.all([
 db`SELECT user_id::text AS user_id,project_id,responsibility,granted_by::text AS granted_by,
 updated_at::text AS updated_at FROM workspace_permissions ORDER BY updated_at DESC LIMIT 100`,
 db`SELECT source_system,backup_method,backup_reference,status,checked_at::text AS checked_at,
 is_offsite,restore_tested,row_counts,verification_notes FROM backup_registry ORDER BY checked_at DESC LIMIT 40`,
 db`SELECT id::text,project_id,operation_type,status,requested_by::text AS requested_by,
 reviewed_by::text AS reviewed_by,created_at::text AS created_at
 FROM operation_approvals ORDER BY created_at DESC LIMIT 50`,
 ]);
 return {assignments,backups,approvals};
});
export const assignCompanyResponsibility=createServerFn({method:"POST"})
.validator(z.object({token:z.string().min(16).max(8192),userId:z.string().uuid(),project:project,role:role}))
.handler(async({data})=>{
 const actor=await requireCompanyAccess(data.token,"all","admin");
 if(actor.id===data.userId)throw new Error("SELF_ROLE_EDIT_NOT_ALLOWED");
 const url=process.env["CRM_DRAFT_WRITE_URL"];
 if(!url)throw new Error("POLICY_WRITE_UNAVAILABLE");
 const db=neon(url);
 const before=await db`SELECT responsibility FROM workspace_permissions
 WHERE user_id=${data.userId}::uuid AND project_id=${data.project}`;
 const result=await db`INSERT INTO workspace_permissions(user_id,project_id,responsibility,granted_by)
 VALUES(${data.userId}::uuid,${data.project},${data.role},${actor.id}::uuid)
 ON CONFLICT(user_id,project_id) DO UPDATE
 SET responsibility=EXCLUDED.responsibility,granted_by=EXCLUDED.granted_by,updated_at=now()
 RETURNING user_id::text,project_id,responsibility`;
 await db`INSERT INTO audit_events(actor_id,system_id,event_type,target_table,target_key,previous_value,next_value)
 VALUES(${actor.id},'company_control_center','assign_responsibility','workspace_permissions',
 ${data.userId+":"+data.project},${JSON.stringify(before[0]??null)}::jsonb,
 ${JSON.stringify({project:data.project,role:data.role})}::jsonb)`;
 return {ok:true,assignment:result[0]};
});
