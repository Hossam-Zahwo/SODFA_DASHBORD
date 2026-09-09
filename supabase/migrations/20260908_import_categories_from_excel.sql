-- SODFA — Excel Category Import
-- Run after 20260908_product_categories_smart.sql.
-- The UI parses the workbook and sends validated rows to this single RPC,
-- so the import is fast and atomic instead of performing one request per row.

begin;

alter table public.product_categories
  add column if not exists name_en text,
  add column if not exists keywords_ar text[] not null default '{}',
  add column if not exists keywords_en text[] not null default '{}';

-- Backfill the new bilingual fields from the existing combined keyword list.
update public.product_categories
set
  keywords_ar = case when cardinality(keywords_ar) = 0 then coalesce(keywords, '{}') else keywords_ar end,
  keywords_en = coalesce(keywords_en, '{}')
where cardinality(coalesce(keywords_ar, '{}')) = 0;

create or replace function public.import_product_categories(
  p_rows jsonb
)
returns table (
  inserted integer,
  updated integer,
  skipped integer
)
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_row jsonb;
  v_name text;
  v_name_en text;
  v_keywords_ar text[];
  v_keywords_en text[];
  v_keywords text[];
  v_existing public.product_categories%rowtype;
  v_slug text;
  v_inserted integer := 0;
  v_updated integer := 0;
  v_skipped integer := 0;
begin
  if jsonb_typeof(p_rows) <> 'array' then
    raise exception 'CATEGORY_IMPORT_ROWS_MUST_BE_ARRAY';
  end if;


  for v_row in
    select value from jsonb_array_elements(p_rows)
  loop
    v_name := btrim(coalesce(v_row->>'name', ''));
    v_name_en := nullif(btrim(coalesce(v_row->>'name_en', '')), '');

    if v_name = '' then
      v_skipped := v_skipped + 1;
      continue;
    end if;

    select *
      into v_existing
    from public.product_categories
    where lower(btrim(name)) = lower(v_name)
    limit 1;

    select coalesce(array_agg(distinct btrim(value) order by btrim(value)), '{}')
      into v_keywords_ar
    from jsonb_array_elements_text(
      case
        when jsonb_typeof(v_row->'keywords_ar') = 'array' then v_row->'keywords_ar'
        else '[]'::jsonb
      end
    ) as x(value)
    where btrim(value) <> '';

    select coalesce(array_agg(distinct btrim(value) order by btrim(value)), '{}')
      into v_keywords_en
    from jsonb_array_elements_text(
      case
        when jsonb_typeof(v_row->'keywords_en') = 'array' then v_row->'keywords_en'
        else '[]'::jsonb
      end
    ) as x(value)
    where btrim(value) <> '';

    v_keywords :=
      array(
        select distinct btrim(k)
        from unnest(
          coalesce(v_keywords_ar, '{}')
          || coalesce(v_keywords_en, '{}')
          || case when v_existing.id is null then '{}'::text[] else coalesce(v_existing.keywords, '{}') end
        ) as k
        where btrim(k) <> ''
        order by btrim(k)
      );

    if v_existing.id is null then
      v_slug := nullif(
        trim(both '-' from regexp_replace(
          lower(coalesce(v_name_en, v_name)),
          '[^a-z0-9]+',
          '-',
          'g'
        )),
        ''
      );

      -- A generated slug is helpful, but never let a slug collision block an import.
      if v_slug is not null and exists (
        select 1 from public.product_categories c
        where c.slug = v_slug
      ) then
        v_slug := v_slug || '-' || substr(md5(v_name), 1, 8);
      end if;

      insert into public.product_categories (
        name,
        name_en,
        slug,
        keywords,
        keywords_ar,
        keywords_en
      )
      values (
        v_name,
        v_name_en,
        v_slug,
        v_keywords,
        coalesce(v_keywords_ar, '{}'),
        coalesce(v_keywords_en, '{}')
      );

      v_inserted := v_inserted + 1;
    else
      if
        coalesce(v_existing.name_en, '') is distinct from coalesce(v_name_en, '')
        or coalesce(v_existing.keywords, '{}') is distinct from coalesce(v_keywords, '{}')
        or coalesce(v_existing.keywords_ar, '{}') is distinct from coalesce(v_keywords_ar, '{}')
        or coalesce(v_existing.keywords_en, '{}') is distinct from coalesce(v_keywords_en, '{}')
      then
        update public.product_categories
        set
          name_en = coalesce(v_name_en, name_en),
          keywords = v_keywords,
          keywords_ar = coalesce(v_keywords_ar, '{}'),
          keywords_en = coalesce(v_keywords_en, '{}'),
          updated_at = now()
        where id = v_existing.id;

        v_updated := v_updated + 1;
      else
        v_skipped := v_skipped + 1;
      end if;
    end if;
  end loop;

  return query select v_inserted, v_updated, v_skipped;
end;
$$;

revoke all on function public.import_product_categories(jsonb) from public;
grant execute on function public.import_product_categories(jsonb) to anon, authenticated;

commit;
