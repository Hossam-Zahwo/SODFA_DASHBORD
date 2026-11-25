CREATE TABLE IF NOT EXISTS public.waybills (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 brand text NOT NULL CHECK(brand IN ('homey','sodfa')),
 customer_id uuid REFERENCES public.customers(id) ON DELETE SET NULL,
 order_id uuid REFERENCES public.orders(id) ON DELETE SET NULL,
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now(),
 customer_name text NOT NULL, phone text NOT NULL,
 alternate_phone text NOT NULL DEFAULT '',
 governorate text NOT NULL DEFAULT '',
 city text NOT NULL DEFAULT '',
 address text NOT NULL DEFAULT '',
 invoice_amount numeric(14,2) NOT NULL DEFAULT 0 CHECK(invoice_amount>=0),
 shipping_cost numeric(14,2) NOT NULL DEFAULT 0 CHECK(shipping_cost>=0),
 prepaid numeric(14,2) NOT NULL DEFAULT 0 CHECK(prepaid>=0),
 collection_amount numeric(14,2) GENERATED ALWAYS AS (GREATEST(invoice_amount+shipping_cost-prepaid,0)) STORED,
 payment_method text NOT NULL DEFAULT 'الدفع عند الاستلام',
 description text NOT NULL DEFAULT '',
 notes text NOT NULL DEFAULT '',
 reference text GENERATED ALWAYS AS ('WB-' || upper(substring(replace(id::text,'-',''),1,10))) STORED
);
CREATE INDEX IF NOT EXISTS waybills_customer_idx ON public.waybills(brand,phone,created_at DESC);
CREATE INDEX IF NOT EXISTS waybills_order_idx ON public.waybills(order_id) WHERE order_id IS NOT NULL;
