import { createServerFn } from "@tanstack/react-start";
import {requireCompanyAccess} from "./company-access.server";
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
  preserveVisibility: z.boolean().optional(),
  price: z.number().nonnegative().max(1_000_000).nullable(),
});
export const saveChannelDraft = createServerFn({method:"POST"})
  .validator(Request)
  .handler(async({data})=>{
    // A draft may target either storefront. Publication is separately controlled
    // and never triggered here. This permits explicit cross-brand proposals.
    const pgUrl=process.env["CRM_DRAFT_WRITE_URL"];
    if(!pgUrl)throw new Error("DRAFT_STORAGE_NOT_CONFIGURED");
    const sql=neon(pgUrl);
    const row=await sql`SELECT p.id AS product_ref,p.brand_id AS brand
      FROM product_references p WHERE p.source_system_id=${data.source}
      AND p.source_product_id=${data.sourceProductId} LIMIT 1`;
    if(!row.length)throw new Error("PRODUCT_NOT_IN_CRM_INDEX");
    const id=String(row[0]!["product_ref"]);
    const originalBrand=String(row[0]!["brand"]) as "homey"|"sodfa";
    const destination=data.channel==="homey_web"?"homey":"sodfa";
    const actor=await requireCompanyAccess(data.token,originalBrand,"draft");
    const cross=originalBrand!==destination;
    if(cross){
      await requireCompanyAccess(data.token,originalBrand,"approve");
      await requireCompanyAccess(data.token,destination,"approve");
    }
    const updated=await sql`WITH previous AS (
      SELECT intended_visibility,proposed_price_egp FROM channel_listing_drafts
      WHERE product_reference_id=${id}::bigint AND channel_id=${data.channel}
    ), saved AS (
      INSERT INTO channel_listing_drafts(
        product_reference_id,channel_id,intended_visibility,proposed_price_egp,updated_by,brand_cross_listing)
      SELECT ${id}::bigint,${data.channel},${data.intendedVisibility}::boolean,${data.price}::numeric,${actor.id},${cross}::boolean
      WHERE NOT ${data.preserveVisibility??false}::boolean OR EXISTS (SELECT 1 FROM previous)
      ON CONFLICT(product_reference_id,channel_id) DO UPDATE
      SET intended_visibility=CASE WHEN ${data.preserveVisibility??false}::boolean THEN channel_listing_drafts.intended_visibility ELSE EXCLUDED.intended_visibility END,
          proposed_price_egp=EXCLUDED.proposed_price_egp,
          brand_cross_listing=EXCLUDED.brand_cross_listing,
          updated_by=EXCLUDED.updated_by,updated_at=now()
      RETURNING channel_id,intended_visibility,proposed_price_egp
    )
    INSERT INTO audit_events(actor_id,system_id,event_type,target_table,target_key,previous_value,next_value)
    SELECT ${actor.id},'company_control_center','draft_channel_update','channel_listing_drafts',
      ${data.sourceProductId},(SELECT to_jsonb(previous) FROM previous),
      jsonb_build_object('channel',saved.channel_id,'visible',saved.intended_visibility,'price',saved.proposed_price_egp)
    FROM saved RETURNING target_key`;
    if(!updated.length)throw new Error("CHANNEL_DRAFT_NOT_FOUND");
    return {ok:true,status:"draft",sourceProductId:data.sourceProductId,channel:data.channel};
  });


export const renameCompanyProductDraft = createServerFn({method:"POST"})
  .validator(z.object({
    token:z.string().min(16).max(8192),
    brand:z.enum(["homey","sodfa"]),
    productId:z.string().min(1).max(180),
    title:z.string().trim().min(3).max(240),
  }))
  .handler(async({data})=>{
    const actor=await requireCompanyAccess(data.token,data.brand,"draft");
    const url=process.env["CRM_DRAFT_WRITE_URL"];
    if(!url)throw new Error("DRAFT_STORAGE_NOT_CONFIGURED");
    const sql=neon(url);
    const rows=await sql`WITH previous AS (
      SELECT id,title FROM product_references
      WHERE source_system_id='crm_manual' AND source_product_id=${data.productId}
        AND brand_id=${data.brand} FOR UPDATE
    ), saved AS (
      UPDATE product_references AS product SET title=${data.title}
      FROM previous WHERE product.id=previous.id
      RETURNING product.title,previous.title AS old_title
    ), audited AS (
      INSERT INTO audit_events(actor_id,system_id,event_type,target_table,target_key,previous_value,next_value)
      SELECT ${actor.id},'company_control_center','draft_product_rename','product_references',
        ${data.productId},jsonb_build_object('title',old_title),jsonb_build_object('title',title)
      FROM saved
    ) SELECT title FROM saved`;
    if(!rows.length)throw new Error("MANUAL_DRAFT_NOT_FOUND");
    return {title:String(rows[0]!["title"])};
  });
