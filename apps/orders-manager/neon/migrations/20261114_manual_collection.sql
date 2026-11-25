ALTER TABLE public.orders
 ADD COLUMN IF NOT EXISTS manual_collection numeric(14,2) CHECK (manual_collection >= 0);
