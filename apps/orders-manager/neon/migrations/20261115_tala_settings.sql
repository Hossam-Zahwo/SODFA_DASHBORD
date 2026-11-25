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
