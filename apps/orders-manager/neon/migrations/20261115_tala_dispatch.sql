CREATE TABLE IF NOT EXISTS public.tala_order_shipments (
 order_id uuid PRIMARY KEY REFERENCES public.orders(id),
 state text NOT NULL CHECK (state IN ('sending','sent','review')),
 tracking_code text,
 external_id bigint,
 updated_at timestamptz NOT NULL DEFAULT now()
);
