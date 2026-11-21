import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import { neon } from "@neondatabase/serverless";
import { z } from "zod";

// Drafts live only in the separate CRM database. These changes NEVER publish
// products or modify the HOMEY or SODFA storefront databases.
const Request = z.object({
  token: z.string().min(16).max(8192),
  source: z.enum(["homey_store","sodfa_dashboard","crm_manual"]),
  sourceProductId: z.string().min(1).max(180),
  channel: z.enum(["homey_web","sodfa_web"]),
  intendedVisibility: z.boolean(),
  price: z.number().nonnegative().max(1_000_000).nullable(),
});
export const saveChannelDraft = createServerFn({method:"POST"})
  .validator(Request)
  .handler(async({data})=>{
    // A draft may target either storefront. Publication is separately controlled
    // and never triggered here. This permits explicit cross-brand proposals.
    const url = process.env.VITE_SUPABASE_URL;
    const publishableKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
    if (!url || !publishableKey) throw new Error("AUTH_NOT_CONFIGURED");
    const auth = createClient(url,publishableKey,{auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}});
    const {data:result,error} = await auth.auth.getUser(data.token);
    if(error || !result.user?.id || !result.user.email) throw new Error("UNAUTHORIZED");
    const pgUrl=process.env.CRM_DRAFT_WRITE_URL;
    if(!pgUrl)throw new Error("DRAFT_STORAGE_NOT_CONFIGURED");
    const sql=neon(pgUrl);
    const row=await sql`SELECT p.id AS product_ref
      FROM product_references p WHERE p.source_system_id=${data.source}
      AND p.source_product_id=${data.sourceProductId} LIMIT 1`;
    if(!row.length)throw new Error("PRODUCT_NOT_IN_CRM_INDEX");
    const id=Number(row[0].product_ref);
    const cross = (data.source==="homey_store" && data.channel==="sodfa_web")
      || (data.source==="sodfa_dashboard" && data.channel==="homey_web");
    const before=await sql`SELECT intended_visibility,proposed_price_egp
      FROM channel_listing_drafts WHERE product_reference_id=${id}
      AND channel_id=${data.channel}`;
    await sql`INSERT INTO channel_listing_drafts(
      product_reference_id,channel_id,intended_visibility,proposed_price_egp,updated_by,brand_cross_listing)
      VALUES (${id},${data.channel},${data.intendedVisibility},${data.price},${result.user.id},${cross})
      ON CONFLICT(product_reference_id,channel_id) DO UPDATE
      SET intended_visibility=EXCLUDED.intended_visibility,
      proposed_price_egp=EXCLUDED.proposed_price_egp,
      brand_cross_listing=EXCLUDED.brand_cross_listing,
      updated_by=EXCLUDED.updated_by,updated_at=now()`;
    // Audit is deliberately non-PII, and records who made the proposed edit.
    await sql`INSERT INTO audit_events(actor_id,system_id,event_type,target_table,target_key,
      previous_value,next_value)
      VALUES (${result.user.id},'company_control_center','draft_channel_update',
      'channel_listing_drafts',${data.sourceProductId},
      ${JSON.stringify(before[0]??null)}::jsonb,
      ${JSON.stringify({channel:data.channel,visible:data.intendedVisibility,price:data.price})}::jsonb)`;
    return {ok:true,status:"draft",sourceProductId:data.sourceProductId,channel:data.channel};
  });
