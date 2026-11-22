-- Staged CRM social-account registry only. No Meta token, no publishing, no production writes.
-- Apply to an isolated QA branch first; do NOT auto-run against production.
CREATE TABLE IF NOT EXISTS public.crm_social_channels (
  brand_id text NOT NULL REFERENCES public.brands(id),
  platform text NOT NULL CHECK(platform IN ('facebook','instagram')),
  provider text NOT NULL CHECK(provider IN ('metricool','meta_graph')),
  provider_brand_ref text,
  external_account_id text NOT NULL,
  display_handle text NOT NULL,
  connection_state text NOT NULL DEFAULT 'observed'
    CHECK(connection_state IN ('observed','needs_permissions','verified_read','verified_publish','error')),
  can_read_metrics boolean NOT NULL DEFAULT false,
  can_publish boolean NOT NULL DEFAULT false,
  last_verified_at timestamptz,
  PRIMARY KEY(brand_id,platform),
  CHECK(NOT can_read_metrics OR connection_state IN ('verified_read','verified_publish')),
  CHECK(NOT can_publish OR connection_state='verified_publish')
);
-- Accounts identified in connected Metricool brand 8272894; this does not verify Meta API scopes.
INSERT INTO public.crm_social_channels(brand_id,platform,provider,provider_brand_ref,external_account_id,display_handle)
VALUES('homey','facebook','metricool','8272894','1426956800493435','هومي'),
('homey','instagram','metricool','8272894','homeyegypt.ecom','@homeyegypt.ecom')
ON CONFLICT (brand_id,platform) DO NOTHING;
-- Grant SELECT only to a dedicated read-only QA database role separately; never GRANT PUBLIC.
