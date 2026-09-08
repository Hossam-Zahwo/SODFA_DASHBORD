-- SODFA: delete a sale and restore its inventory atomically.
-- Run this migration in the same Supabase project used by the application.

create or replace function public.delete_sale_and_restore_inventory(p_sale_id text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_sale public.sales%rowtype;
  v_product public.inventory%rowtype;
  v_new_sold numeric;
  v_new_remaining numeric;
  v_new_sales_value numeric;
  v_last_sale timestamptz;
begin
  if coalesce(trim(p_sale_id), '') = '' then
    return jsonb_build_object('success', false, 'error_code', 'SALE_ID_REQUIRED');
  end if;

  -- Lock the sale row so two delete attempts cannot both restore stock.
  select * into v_sale
  from public.sales
  where sale_id = p_sale_id
  for update;

  if not found then
    return jsonb_build_object('success', false, 'error_code', 'SALE_NOT_FOUND');
  end if;

  select * into v_product
  from public.inventory
  where product_id = v_sale.product_id
  for update;

  if not found then
    return jsonb_build_object('success', false, 'error_code', 'PRODUCT_NOT_FOUND');
  end if;

  v_new_sold := greatest(0, coalesce(v_product.sold_qty, 0) - coalesce(v_sale.qty, 0));
  v_new_remaining := coalesce(v_product.remaining_qty, 0) + coalesce(v_sale.qty, 0);
  v_new_sales_value := greatest(0, coalesce(v_product.sales_value, 0) - coalesce(v_sale.total_sale_value, v_sale.total_value, 0));

  -- Recalculate the latest sale date after deletion instead of guessing.
  select max(
    case
      when sale_date is null then null
      when sale_date::text ~ '^\\d{4}-\\d{2}-\\d{2}$'
        then (sale_date::text || ' ' || coalesce(nullif(sale_time::text, ''), '00:00:00'))::timestamptz
      else sale_date::timestamptz
    end
  ) into v_last_sale
  from public.sales
  where product_id = v_sale.product_id
    and sale_id <> v_sale.sale_id;

  update public.inventory
  set sold_qty = v_new_sold,
      remaining_qty = v_new_remaining,
      sales_value = v_new_sales_value,
      last_sale_date = v_last_sale
  where product_id = v_sale.product_id;

  delete from public.sales
  where sale_id = v_sale.sale_id;

  return jsonb_build_object(
    'success', true,
    'sale_id', v_sale.sale_id,
    'product_id', v_sale.product_id,
    'qty', v_sale.qty,
    'restored_value', coalesce(v_sale.total_sale_value, v_sale.total_value, 0)
  );
exception
  when others then
    raise;
end;
$$;

revoke all on function public.delete_sale_and_restore_inventory(text) from public;
grant execute on function public.delete_sale_and_restore_inventory(text) to authenticated;

-- SODFA: record a sale and update inventory atomically.
-- This complements delete_sale_and_restore_inventory above.
-- Both functions keep Supabase as the single source of truth.

create or replace function public.record_sale_and_update_inventory(
  p_sale_id text,
  p_product_id text,
  p_qty numeric,
  p_warehouse text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_product public.inventory%rowtype;
  v_qty numeric;
  v_unit_price numeric;
  v_total numeric;
  v_warehouse text;
  v_sale_date date;
  v_sale_time time;
  v_new_sold numeric;
  v_new_remaining numeric;
  v_new_sales_value numeric;
begin
  if coalesce(trim(p_sale_id), '') = '' then
    return jsonb_build_object('success', false, 'error_code', 'SALE_ID_REQUIRED');
  end if;

  if coalesce(trim(p_product_id), '') = '' then
    return jsonb_build_object('success', false, 'error_code', 'PRODUCT_ID_REQUIRED');
  end if;

  v_qty := greatest(0, coalesce(p_qty, 0));

  if v_qty <= 0 then
    return jsonb_build_object('success', false, 'error_code', 'INVALID_QUANTITY');
  end if;

  -- Lock inventory first so concurrent sales cannot oversell the same row.
  select * into v_product
  from public.inventory
  where product_id = trim(p_product_id)
  for update;

  if not found then
    return jsonb_build_object('success', false, 'error_code', 'PRODUCT_NOT_FOUND');
  end if;

  if v_qty > greatest(0, coalesce(v_product.remaining_qty, 0)) then
    return jsonb_build_object(
      'success', false,
      'error_code', 'INSUFFICIENT_STOCK',
      'available_qty', greatest(0, coalesce(v_product.remaining_qty, 0))
    );
  end if;

  v_warehouse := coalesce(nullif(trim(p_warehouse), ''), nullif(trim(v_product.warehouse::text), ''));

  if coalesce(v_warehouse, '') = '' then
    return jsonb_build_object('success', false, 'error_code', 'WAREHOUSE_REQUIRED');
  end if;

  v_unit_price := greatest(
    0,
    coalesce(
      nullif(v_product.selling_price::numeric, 0),
      nullif(v_product.sale_price::numeric, 0),
      0
    )
  );

  v_total := v_unit_price * v_qty;
  v_sale_date := current_date;
  v_sale_time := current_time::time;

  v_new_sold := coalesce(v_product.sold_qty, 0) + v_qty;
  v_new_remaining := greatest(0, coalesce(v_product.remaining_qty, 0) - v_qty);
  v_new_sales_value := coalesce(v_product.sales_value, 0) + v_total;

  insert into public.sales (
    sale_id,
    product_id,
    product_name,
    barcode,
    warehouse,
    qty,
    unit_sale_price,
    total_sale_value,
    sale_date,
    sale_time,
    unit_price,
    total_value
  ) values (
    trim(p_sale_id),
    trim(p_product_id),
    coalesce(v_product.product_name::text, ''),
    coalesce(v_product.barcode::text, ''),
    v_warehouse,
    v_qty,
    v_unit_price,
    v_total,
    v_sale_date,
    v_sale_time,
    v_unit_price,
    v_total
  );

  update public.inventory
  set sold_qty = v_new_sold,
      remaining_qty = v_new_remaining,
      sales_value = v_new_sales_value,
      last_sale_date = now()
  where product_id = trim(p_product_id);

  return jsonb_build_object(
    'success', true,
    'sale_id', trim(p_sale_id),
    'product_id', trim(p_product_id),
    'qty', v_qty,
    'unit_price', v_unit_price,
    'total', v_total,
    'warehouse', v_warehouse
  );
exception
  when unique_violation then
    return jsonb_build_object('success', false, 'error_code', 'SALE_ID_ALREADY_EXISTS');
  when others then
    raise;
end;
$$;

revoke all on function public.record_sale_and_update_inventory(text, text, numeric, text) from public;
grant execute on function public.record_sale_and_update_inventory(text, text, numeric, text) to authenticated;
