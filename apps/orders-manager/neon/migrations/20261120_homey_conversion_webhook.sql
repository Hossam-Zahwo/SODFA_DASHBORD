-- HOMEY storefront conversion webhook inbox / per-platform delivery ledger.
-- Apply only to Orders Manager Neon DB, never to SODFA or HOMEY Supabase.
CREATE TABLE IF NOT EXISTS public.homey_conversion_deliveries (
  source_order_id uuid NOT NULL,
  provider text NOT NULL CHECK (provider IN ('meta','tiktok')),
  event_name text NOT NULL DEFAULT 'Purchase',
  event_time bigint NOT NULL,
  value_egp numeric(14,2) NOT NULL CHECK (value_egp >= 0),
  currency text NOT NULL DEFAULT 'EGP' CHECK (currency = 'EGP'),
  consent_verified boolean NOT NULL DEFAULT true CHECK (consent_verified),
  state text NOT NULL DEFAULT 'pending' CHECK (state IN ('pending','sending','sent','error')),
  lease_until timestamptz,
  attempts integer NOT NULL DEFAULT 0,
  last_http_status integer,
  last_error text,
  sent_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (source_order_id,provider)
);
CREATE INDEX IF NOT EXISTS homey_conversion_retry_idx
  ON public.homey_conversion_deliveries (state,lease_until,created_at)
  WHERE state <> 'sent';
-- Data minimized: no customer name, phone, email, address or IP is stored.
