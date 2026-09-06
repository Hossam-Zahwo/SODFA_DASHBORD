-- SODFA: persistent product image gallery
-- Run this migration in the Supabase SQL editor before using
-- multiple product images.

create table if not exists public.product_images (
  product_image_id uuid primary key default gen_random_uuid(),
  product_id text not null,
  image_url text not null,
  sort_order integer not null default 0,
  is_primary boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists product_images_product_id_idx
  on public.product_images (product_id);

create unique index if not exists product_images_product_url_uidx
  on public.product_images (product_id, image_url);

-- Keep only one primary image per product.
create unique index if not exists product_images_one_primary_uidx
  on public.product_images (product_id)
  where is_primary = true;

alter table public.product_images enable row level security;

drop policy if exists "product_images_select_authenticated"
  on public.product_images;
create policy "product_images_select_authenticated"
  on public.product_images
  for select
  to authenticated
  using (true);

drop policy if exists "product_images_insert_authenticated"
  on public.product_images;
create policy "product_images_insert_authenticated"
  on public.product_images
  for insert
  to authenticated
  with check (true);

drop policy if exists "product_images_update_authenticated"
  on public.product_images;
create policy "product_images_update_authenticated"
  on public.product_images
  for update
  to authenticated
  using (true)
  with check (true);

drop policy if exists "product_images_delete_authenticated"
  on public.product_images;
create policy "product_images_delete_authenticated"
  on public.product_images
  for delete
  to authenticated
  using (true);

-- The uploader uses getPublicUrl(), so the bucket must be public.
insert into storage.buckets (id, name, public)
values ('sodfa-images', 'sodfa-images', true)
on conflict (id) do update
set public = true;

drop policy if exists "sodfa_images_insert_authenticated"
  on storage.objects;
create policy "sodfa_images_insert_authenticated"
  on storage.objects
  for insert
  to authenticated
  with check (bucket_id = 'sodfa-images');

drop policy if exists "sodfa_images_update_authenticated"
  on storage.objects;
create policy "sodfa_images_update_authenticated"
  on storage.objects
  for update
  to authenticated
  using (bucket_id = 'sodfa-images')
  with check (bucket_id = 'sodfa-images');

drop policy if exists "sodfa_images_delete_authenticated"
  on storage.objects;
create policy "sodfa_images_delete_authenticated"
  on storage.objects
  for delete
  to authenticated
  using (bucket_id = 'sodfa-images');

drop policy if exists "sodfa_images_public_read"
  on storage.objects;
create policy "sodfa_images_public_read"
  on storage.objects
  for select
  to public
  using (bucket_id = 'sodfa-images');
