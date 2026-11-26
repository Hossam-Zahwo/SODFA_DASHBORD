BEGIN;
CREATE TABLE IF NOT EXISTS public.shipping_companies (
 name text NOT NULL CHECK (char_length(name) BETWEEN 2 AND 120),
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS shipping_companies_name_idx ON public.shipping_companies (lower(name));
COMMIT;
