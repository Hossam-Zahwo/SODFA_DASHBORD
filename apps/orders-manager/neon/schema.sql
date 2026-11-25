-- HOMEY & SODFA Orders Manager — independent Neon PostgreSQL
-- Project rapid-lab-94017333, database orders_manager. NOT HOMEY Supabase.
CREATE TABLE IF NOT EXISTS public.orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  brand text NOT NULL CHECK (brand IN ('homey','sodfa')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  version integer NOT NULL DEFAULT 1,
  customer_name text NOT NULL,
  phone text NOT NULL,
  alternate_phone text NOT NULL DEFAULT '',
  governorate text NOT NULL DEFAULT '',
  city text NOT NULL DEFAULT '',
  address text NOT NULL DEFAULT '',
  source text NOT NULL DEFAULT '',
  payment_method text NOT NULL DEFAULT '',
  prepaid numeric(14,2) NOT NULL DEFAULT 0 CHECK (prepaid>=0),
  shipping numeric(14,2) NOT NULL DEFAULT 0 CHECK (shipping>=0),
  discount numeric(14,2) NOT NULL DEFAULT 0 CHECK (discount>=0),
  manual_total numeric(14,2) CHECK (manual_total>=0),
  manual_collection numeric(14,2) CHECK (manual_collection>=0),
  items jsonb NOT NULL DEFAULT '[]'::jsonb,
  status text NOT NULL DEFAULT 'new' CHECK(status IN ('new','contacted','confirmed','preparing','shipped','delivered','cancelled','returned','postponed','refused')),
  shipping_company text NOT NULL DEFAULT '' CHECK (length(shipping_company)<=120),
  carrier_received numeric(14,2) NOT NULL DEFAULT 0 CHECK (carrier_received>=0),
  notes text NOT NULL DEFAULT '',
  assigned_to text NOT NULL DEFAULT '',
  deleted_at timestamptz
);
CREATE TABLE IF NOT EXISTS public.customers (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 brand text NOT NULL CHECK(brand IN ('homey','sodfa')),
 name text NOT NULL,phone text NOT NULL,alternate_phone text NOT NULL DEFAULT '',
 governorate text NOT NULL DEFAULT '',city text NOT NULL DEFAULT '',
 address text NOT NULL DEFAULT '',notes text NOT NULL DEFAULT '',
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now(),
 deleted_at timestamptz
);
CREATE TABLE IF NOT EXISTS public.audit_log (
 id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
 created_at timestamptz NOT NULL DEFAULT now(),
 actor text NOT NULL,action text NOT NULL,entity text NOT NULL,
 entity_id text NOT NULL,brand text NOT NULL,details text NOT NULL DEFAULT ''
);
CREATE INDEX IF NOT EXISTS orders_brand_created_idx ON public.orders(brand,created_at DESC) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS orders_phone_idx ON public.orders(brand,phone) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS customers_brand_phone_idx ON public.customers(brand,phone) WHERE deleted_at IS NULL;
-- Never add public web access or browser-facing DB credentials.

-- Private staff login: provision password_hash only using an approved admin flow.
-- No plaintext credentials belong in this migration or GitHub.
CREATE TABLE IF NOT EXISTS public.staff_users (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 email text NOT NULL UNIQUE,
 password_hash text NOT NULL,
 display_name text NOT NULL DEFAULT '',
 is_active boolean NOT NULL DEFAULT true,
 failed_attempts integer NOT NULL DEFAULT 0,
 locked_until timestamptz,
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now()
);
BEGIN;
CREATE TABLE IF NOT EXISTS public.shipping_companies (
 name text NOT NULL CHECK (char_length(name) BETWEEN 2 AND 120),
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS shipping_companies_name_idx ON public.shipping_companies (lower(name));
COMMIT;

CREATE TABLE IF NOT EXISTS public.address_governorates (
 name text PRIMARY KEY
);

CREATE TABLE IF NOT EXISTS public.address_localities (
 governorate text NOT NULL REFERENCES public.address_governorates(name),
 name text NOT NULL,
 PRIMARY KEY (governorate, name)
);

ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS courier text NOT NULL DEFAULT '';
CREATE TABLE IF NOT EXISTS public.tala_connection_settings (
 brand text PRIMARY KEY CHECK (brand IN ('homey', 'sodfa')),
 endpoint text NOT NULL,
 documentation text NOT NULL,
 support text NOT NULL,
 credentials text,
 revision integer NOT NULL CHECK (revision > 0),
 updated_by uuid NOT NULL REFERENCES public.staff_users(id),
 updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.tala_order_shipments (
 order_id uuid PRIMARY KEY REFERENCES public.orders(id),
 state text NOT NULL CHECK (state IN ('sending','sent','review')),
 tracking_code text,
 external_id bigint,
 provider_status_code text,
 provider_status_name text,
 provider_delivered_amount numeric(14,2),
 provider_delivery_fees numeric(14,2),
 provider_customer_due numeric(14,2),
 provider_collected_amount numeric(14,2),
 provider_pending_collection_amount numeric(14,2),
 provider_collected_fees numeric(14,2),
 updated_at timestamptz NOT NULL DEFAULT now()
);
