-- SODFA — Automatic Product Category Assignment
-- Run AFTER 20260908_product_categories_smart.sql
-- Safe migration for existing product_catalog records.

begin;

-- 1) Fallback category: products never remain uncategorized.
insert into public.product_categories (name, slug, keywords)
select
  'غير مصنف - يحتاج مراجعة',
  'uncategorized-review',
  array['غير مصنف','uncategorized','unknown','other','needs review']
where not exists (
  select 1
  from public.product_categories
  where lower(btrim(name)) = lower('غير مصنف - يحتاج مراجعة')
);

-- 2) Resolve the best category for a product title/description/keywords.
-- If no meaningful match exists, return the fallback category.
create or replace function public.resolve_product_category(
  p_query text,
  p_keywords text[] default '{}'
)
returns uuid
language plpgsql
stable
as $$
declare
  v_query text;
  v_category_id uuid;
  v_fallback_id uuid;
begin
  v_query := lower(btrim(concat_ws(' ', coalesce(p_query, ''), array_to_string(coalesce(p_keywords, '{}'), ' '))));

  select id into v_fallback_id
  from public.product_categories
  where lower(btrim(name)) = lower('غير مصنف - يحتاج مراجعة')
  limit 1;

  if coalesce(v_query, '') = '' then
    return v_fallback_id;
  end if;

  with scored as (
    select
      c.id,
      (
        case
          when position(lower(c.name) in v_query) > 0 then 20
          else 0
        end
        + coalesce((
          select sum(
            case
              when length(btrim(k)) >= 2 and position(lower(btrim(k)) in v_query) > 0
                then case when length(btrim(k)) >= 7 then 8 else 4 end
              else 0
            end
          )
          from unnest(coalesce(c.keywords, '{}')) as k
        ), 0)
      )::integer as score
    from public.product_categories c
    where lower(btrim(c.name)) <> lower('غير مصنف - يحتاج مراجعة')
  )
  select id into v_category_id
  from scored
  where score > 0
  order by score desc, id
  limit 1;

  return coalesce(v_category_id, v_fallback_id);
end;
$$;

revoke all on function public.resolve_product_category(text, text[]) from public;
grant execute on function public.resolve_product_category(text, text[]) to anon, authenticated;

-- 3) Automatically assign a category whenever product_catalog is inserted or
-- updated with a NULL/empty category. A manual category is never overwritten.
create or replace function public.auto_assign_product_catalog_category()
returns trigger
language plpgsql
as $$
declare
  v_text text;
begin
  if new.category_id is null then
    v_text := concat_ws(' ',
      coalesce(new.name_ar, ''),
      coalesce(new.name_en, ''),
      coalesce(new.description, '')
    );

    new.category_id := public.resolve_product_category(
      v_text,
      coalesce(new.keywords, '{}')
    );
  end if;

  return new;
end;
$$;

-- The project stores category metadata in product_catalog.
drop trigger if exists trg_auto_assign_product_catalog_category on public.product_catalog;
create trigger trg_auto_assign_product_catalog_category
before insert or update of name_ar, name_en, description, keywords, category_id
on public.product_catalog
for each row
execute function public.auto_assign_product_catalog_category();

-- 4) Backfill every existing product that currently has no category.
update public.product_catalog pc
set category_id = public.resolve_product_category(
  concat_ws(' ', coalesce(pc.name_ar, ''), coalesce(pc.name_en, ''), coalesce(pc.description, '')),
  coalesce(pc.keywords, '{}')
)
where pc.category_id is null;

-- 5) Add/repair the relation only when it does not already exist.
do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'product_catalog_category_id_fkey'
      and conrelid = 'public.product_catalog'::regclass
  ) then
    alter table public.product_catalog
      add constraint product_catalog_category_id_fkey
      foreign key (category_id)
      references public.product_categories(id)
      on update cascade
      on delete restrict;
  end if;
end $$;

create index if not exists product_catalog_category_id_idx
  on public.product_catalog(category_id);

-- 6) After the backfill and trigger are in place, make category mandatory.
-- Every product will receive either its best match or the review category.
alter table public.product_catalog
  alter column category_id set not null;

commit;
