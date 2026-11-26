ALTER TABLE public.tala_order_shipments
 ADD COLUMN IF NOT EXISTS provider_status_code text,
 ADD COLUMN IF NOT EXISTS provider_status_name text,
 ADD COLUMN IF NOT EXISTS provider_delivered_amount numeric(14,2),
 ADD COLUMN IF NOT EXISTS provider_delivery_fees numeric(14,2),
 ADD COLUMN IF NOT EXISTS provider_customer_due numeric(14,2),
 ADD COLUMN IF NOT EXISTS provider_collected_amount numeric(14,2),
 ADD COLUMN IF NOT EXISTS provider_pending_collection_amount numeric(14,2),
 ADD COLUMN IF NOT EXISTS provider_collected_fees numeric(14,2);
