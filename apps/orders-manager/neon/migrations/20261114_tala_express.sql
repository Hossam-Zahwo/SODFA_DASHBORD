INSERT INTO public.shipping_companies (name)
VALUES ('تالا إكسبريس')
ON CONFLICT ((lower(name))) DO NOTHING;
