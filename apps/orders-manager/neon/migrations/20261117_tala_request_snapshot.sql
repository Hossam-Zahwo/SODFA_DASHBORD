ALTER TABLE public.tala_order_shipments
 ADD COLUMN IF NOT EXISTS request_data jsonb NOT NULL DEFAULT '{}'::jsonb;
