import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import { neon } from "@neondatabase/serverless";
import { z } from "zod";

const Request = z.object({
  token:z.string().min(16).max(8192),
  requestId:z.string().uuid(),
  title:z.string().trim().min(3).max(240),
  brand:z.enum(["homey","sodfa"]),
  channels:z.array(z.enum(["homey_web","sodfa_web"])).max(2),
  proposedPrice:z.number().nonnegative().max(1_000_000).nullable(),
});
export const createCompanyProductDraft = createServerFn({method:"POST"})
 .validator(Request).handler(async({data})=>{
  const url=process.env.VITE_SUPABASE_URL,key=process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
  if(!url||!key)throw new Error("AUTH_NOT_CONFIGURED");
  const client=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}});
  const {data:{user},error}=await client.auth.getUser(data.token);
  if(error||!user?.email||!user.id)throw new Error("UNAUTHORIZED");
  const writerUrl=process.env.CRM_DRAFT_WRITE_URL;
  if(!writerUrl)throw new Error("DRAFT_STORAGE_NOT_CONFIGURED");
  const sql=neon(writerUrl);
  // Idempotency: retrying the same requestId never creates a second catalog row.
  const record=await sql`INSERT INTO product_references
    (source_system_id,source_product_id,brand_id,title)
    VALUES ('crm_manual',${data.requestId},${data.brand},${data.title})
    ON CONFLICT (source_system_id,source_product_id)
    DO UPDATE SET title=product_references.title RETURNING id,title`;
  const id=Number(record[0].id);
  for(const channel of ["homey_web","sodfa_web"] as const){
    const checked=data.channels.includes(channel);
    await sql`INSERT INTO channel_listing_drafts
      (product_reference_id,channel_id,intended_visibility,proposed_price_egp,updated_by,brand_cross_listing)
      VALUES (${id},${channel},${checked},${data.proposedPrice},${user.id},
      ${(data.brand==="homey"&&channel==="sodfa_web")||(data.brand==="sodfa"&&channel==="homey_web")})
      ON CONFLICT(product_reference_id,channel_id) DO UPDATE
      SET intended_visibility=EXCLUDED.intended_visibility,
      proposed_price_egp=EXCLUDED.proposed_price_egp,updated_by=EXCLUDED.updated_by,
      brand_cross_listing=EXCLUDED.brand_cross_listing,updated_at=now()`;
  }
  await sql`INSERT INTO audit_events(actor_id,system_id,event_type,target_table,target_key,next_value)
    VALUES(${user.id},'company_control_center','create_product_draft',
      'product_references',${data.requestId},${JSON.stringify({brand:data.brand,channels:data.channels,title:data.title})}::jsonb)`;
  return {ok:true,status:"draft",productId:data.requestId};
 });
