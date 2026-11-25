# HOMEY Meta / TikTok web events — Orders Manager

## Scope and separation
This integration lives in the HOMEY + SODFA **Orders Manager** Next.js project but **only processes HOMLY storefront INSERT webhooks**. It is not activated by order statuses, manual orders, or SODFA events. Changing a saved order to confirmed is not a new ecommerce checkout and MUST NOT automatically become another purchase.

## Implemented on feature branch
- POST `/api/integrations/homey/conversions`: secret-authenticated incoming Supabase `public.homly_orders` INSERT webhook. Requires `record.analytics_consent === true`; otherwise no marketing event is sent.
- Meta CAPI `Purchase` and TikTok Events API `PlaceAnOrder`, with exact source order UUID as `event_id` for browser/server deduplication. COD is NOT marked as settled payment.
- Per-platform Neon delivery ledger with unique `(source_order_id,provider)`, sending lease, retryable error state and permanently sent state. This prevents concurrent retries from resending delivered events.
- Staff-only GET `/api/integrations/homey/conversions/status`. Under the HOMEY settings tab, see counts and server configuration presence. The SODFA settings tab does not expose Homey-specific campaign data.
- No PII, IP, address, phone or customer names sent in this minimal event payload or stored in the ledger.

## Before connecting / deploying
1. Run migration `neon/migrations/20261120_homey_conversion_webhook.sql` in **Orders Manager's Neon database**, after verification and backup. Do not run it in the HOMEY storefront Supabase database or the SODFA database.
2. Configure server-only sensitive environment variables in the **Orders Manager Vercel project**:
   - `HOMEY_WEBHOOK_SECRET`: long new random signing secret, never the customer session secret.
   - `META_CAPI_ACCESS_TOKEN`: ensure it is a valid Meta conversions API token.
   - `TIKTOK_EVENTS_API_ACCESS_TOKEN`.
   - `DATABASE_URL` already used by Orders Manager, must remain private.
   These are NOT `NEXT_PUBLIC_*` and must never be committed.
3. Homey Supabase checkout must persist the actual analytics consent decision with the saved order in a trusted `analytics_consent boolean` field. The existing storefront does **not** yet persist this field. A migration and checkout update must be completed and verified first. Customer consent is not inferred from payment or staff confirmation.
4. Configure the **HOMEY Supabase database webhook**, INSERT only on `public.homly_orders`, POST to
   `https://homey-sodfa-orders-manager.vercel.app/api/integrations/homey/conversions`,
   with header `x-homey-webhook-secret` equal to `HOMEY_WEBHOOK_SECRET`. Confirm domain and deployment before enabling. **Do not configure a SODFA webhook.**
5. Existing `homly-meta-capi` / `homly-ad-conversions` functions in the storefront project must stay disabled for this event type when Orders Manager handles them; otherwise duplicate CAPI events can be emitted. Client Pixel signals may remain, with the same event ID.
6. Validate with safe, consented test orders; verify acceptance in both provider test-event dashboards, record counts, and deduplication. This commit was not live-tested and does not imply these endpoints are deployed.
7. Review privacy notice / opt-out, provider event schemas, supported Meta token scopes and production retries. A simple webhook retry on 5xx may help, but ambiguous external acknowledgements may need manual reconciliation.

## Status
**Code prepared only**. No Neon migration run, no Vercel environment variables written for Orders Manager, no production/preview deployment triggered manually, no Supabase webhook created, no live event test completed. Existing Homey Pixel and CAPI tokens stored in a **different Vercel project** do not automatically apply to this project.
