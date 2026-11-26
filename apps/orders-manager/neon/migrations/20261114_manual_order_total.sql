ALTER TABLE public.orders
 ADD COLUMN IF NOT EXISTS manual_total numeric(14,2) CHECK (manual_total >= 0);
