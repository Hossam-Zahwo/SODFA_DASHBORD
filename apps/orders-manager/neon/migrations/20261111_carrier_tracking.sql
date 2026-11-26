BEGIN;
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS shipping_company text NOT NULL DEFAULT '' CHECK (length(shipping_company)<=120),
  ADD COLUMN IF NOT EXISTS carrier_received numeric(14,2) NOT NULL DEFAULT 0 CHECK (carrier_received>=0);
ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS orders_status_check;
ALTER TABLE public.orders ADD CONSTRAINT orders_status_check CHECK (
  status IN ('new','contacted','confirmed','preparing','shipped','delivered','cancelled','returned','postponed','refused')
);
COMMIT;
