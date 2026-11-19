-- iZone — atomic dashboard operations. Each function checks the caller's role,
-- runs in one transaction and lets the administrator attach a note that is
-- stored in price_history.

-- Buying prices for one model (all storages at once). An empty base price
-- removes the online price for that storage.
create or replace function public.save_buy_prices(p_model_id uuid, p_rows jsonb, p_note text default null)
returns integer
language plpgsql volatile security invoker set search_path = ''
as $$
declare
  r jsonb;
  v_count integer := 0;
  v_storage integer;
  v_base numeric;
begin
  if not public.is_manager() then
    raise exception 'Only owners and managers can change buying prices' using errcode = '42501';
  end if;
  perform set_config('izone.change_note', coalesce(nullif(btrim(p_note), ''), 'Manual update'), true);

  for r in select * from jsonb_array_elements(coalesce(p_rows, '[]'::jsonb)) loop
    v_storage := (r ->> 'storage_gb')::integer;
    v_base := nullif(r ->> 'base_price', '')::numeric;
    if v_base is null then
      delete from public.buy_prices where model_id = p_model_id and storage_gb = v_storage;
      continue;
    end if;
    insert into public.buy_prices as bp (model_id, storage_gb, base_price, price_excellent, price_good, price_fair, price_damaged, is_active)
    values (p_model_id, v_storage, v_base,
            nullif(r ->> 'price_excellent', '')::numeric, nullif(r ->> 'price_good', '')::numeric,
            nullif(r ->> 'price_fair', '')::numeric, nullif(r ->> 'price_damaged', '')::numeric,
            coalesce((r ->> 'is_active')::boolean, true))
    on conflict (model_id, storage_gb) do update set
      base_price = excluded.base_price,
      price_excellent = excluded.price_excellent,
      price_good = excluded.price_good,
      price_fair = excluded.price_fair,
      price_damaged = excluded.price_damaged,
      is_active = excluded.is_active
    where (bp.base_price, bp.price_excellent, bp.price_good, bp.price_fair, bp.price_damaged, bp.is_active)
          is distinct from
          (excluded.base_price, excluded.price_excellent, excluded.price_good, excluded.price_fair, excluded.price_damaged, excluded.is_active);
    if found then
      v_count := v_count + 1;
    end if;
  end loop;
  return v_count;
end $$;

-- Condition / defect / replaced-part deductions: [{key, deduction_type, value}]
create or replace function public.save_trade_in_rules(p_rules jsonb, p_note text default null)
returns integer
language plpgsql volatile security invoker set search_path = ''
as $$
declare
  v_count integer;
begin
  if not public.is_manager() then
    raise exception 'Only owners and managers can change deductions' using errcode = '42501';
  end if;
  perform set_config('izone.change_note', coalesce(nullif(btrim(p_note), ''), 'Manual update'), true);
  update public.trade_in_rules r
     set deduction_type = (x ->> 'deduction_type')::public.deduction_type,
         value = (x ->> 'value')::numeric
    from jsonb_array_elements(coalesce(p_rules, '[]'::jsonb)) as x
   where r.key = x ->> 'key'
     and (r.deduction_type, r.value) is distinct from ((x ->> 'deduction_type')::public.deduction_type, (x ->> 'value')::numeric);
  get diagnostics v_count = row_count;
  return v_count;
end $$;

-- Battery bands: replaces the whole set. Bands must cover 0–100% without gaps.
-- p_bands: [{id?, min_pct, max_pct, deduction_type, value}]
create or replace function public.save_battery_bands(p_bands jsonb, p_note text default null)
returns integer
language plpgsql volatile security invoker set search_path = ''
as $$
declare
  v_expected integer := 0;
  r record;
  v_ids uuid[];
begin
  if not public.is_manager() then
    raise exception 'Only owners and managers can change battery deductions' using errcode = '42501';
  end if;

  for r in
    select (x ->> 'min_pct')::integer as min_pct, (x ->> 'max_pct')::integer as max_pct
      from jsonb_array_elements(coalesce(p_bands, '[]'::jsonb)) x
     order by 1
  loop
    if r.min_pct <> v_expected or r.max_pct < r.min_pct then
      raise exception 'Battery bands must cover 0–100%% without gaps or overlaps (check the band starting at %)', r.min_pct
        using errcode = '22023';
    end if;
    v_expected := r.max_pct + 1;
  end loop;
  if v_expected <> 101 then
    raise exception 'Battery bands must cover 0–100%%' using errcode = '22023';
  end if;

  perform set_config('izone.change_note', coalesce(nullif(btrim(p_note), ''), 'Manual update'), true);
  set constraints public.battery_bands_no_overlap deferred;

  select array_agg((x ->> 'id')::uuid) into v_ids
    from jsonb_array_elements(p_bands) x where nullif(x ->> 'id', '') is not null;
  delete from public.battery_bands where v_ids is null or id <> all (v_ids);

  update public.battery_bands b
     set min_pct = (x ->> 'min_pct')::smallint,
         max_pct = (x ->> 'max_pct')::smallint,
         deduction_type = (x ->> 'deduction_type')::public.deduction_type,
         value = (x ->> 'value')::numeric
    from jsonb_array_elements(p_bands) x
   where nullif(x ->> 'id', '') is not null and b.id = (x ->> 'id')::uuid
     and (b.min_pct, b.max_pct, b.deduction_type, b.value) is distinct from
         ((x ->> 'min_pct')::smallint, (x ->> 'max_pct')::smallint, (x ->> 'deduction_type')::public.deduction_type, (x ->> 'value')::numeric);

  insert into public.battery_bands (min_pct, max_pct, deduction_type, value)
  select (x ->> 'min_pct')::smallint, (x ->> 'max_pct')::smallint, (x ->> 'deduction_type')::public.deduction_type, (x ->> 'value')::numeric
    from jsonb_array_elements(p_bands) x
   where nullif(x ->> 'id', '') is null;

  set constraints public.battery_bands_no_overlap immediate;
  return jsonb_array_length(p_bands);
end $$;

-- Individual selling price / special offer change with a note.
create or replace function public.update_product_prices(p_id uuid, p_price numeric, p_offer numeric, p_note text default null)
returns void
language plpgsql volatile security invoker set search_path = ''
as $$
begin
  if not public.is_manager() then
    raise exception 'Only owners and managers can change selling prices' using errcode = '42501';
  end if;
  if p_price is null or p_price < 0 then
    raise exception 'Enter a valid selling price' using errcode = '22023';
  end if;
  if p_offer is not null and (p_offer < 0 or p_offer >= p_price) then
    raise exception 'The offer price must be lower than the selling price' using errcode = '22023';
  end if;
  perform set_config('izone.change_note', coalesce(nullif(btrim(p_note), ''), 'Manual update'), true);
  update public.products
     set price = p_price, offer_price = p_offer
   where id = p_id and status <> 'sold'
     and (price, offer_price) is distinct from (p_price, p_offer);
end $$;

-- Exchange rates: [{code, rate, round_to}] — confirms every rate that is saved.
create or replace function public.save_currency_rates(p_rates jsonb, p_note text default null)
returns integer
language plpgsql volatile security invoker set search_path = ''
as $$
declare
  v_main text := public.main_currency();
  v_count integer;
begin
  if not public.is_manager() then
    raise exception 'Only owners and managers can change exchange rates' using errcode = '42501';
  end if;
  if exists (select 1 from jsonb_array_elements(p_rates) x where coalesce((x ->> 'rate')::numeric, 0) <= 0) then
    raise exception 'Every exchange rate must be greater than zero' using errcode = '22023';
  end if;
  perform set_config('izone.change_note', coalesce(nullif(btrim(p_note), ''), 'Manual rate update'), true);
  update public.currencies c
     set rate = case when c.code = v_main then 1 else (x ->> 'rate')::numeric end,
         round_to = coalesce(nullif(x ->> 'round_to', '')::numeric, c.round_to),
         confirmed_at = now()
    from jsonb_array_elements(p_rates) x
   where c.code = x ->> 'code';
  get diagnostics v_count = row_count;
  return v_count;
end $$;

revoke execute on function public.save_buy_prices(uuid, jsonb, text) from public, anon;
revoke execute on function public.save_trade_in_rules(jsonb, text) from public, anon;
revoke execute on function public.save_battery_bands(jsonb, text) from public, anon;
revoke execute on function public.update_product_prices(uuid, numeric, numeric, text) from public, anon;
revoke execute on function public.save_currency_rates(jsonb, text) from public, anon;
grant execute on function public.save_buy_prices(uuid, jsonb, text) to authenticated;
grant execute on function public.save_trade_in_rules(jsonb, text) to authenticated;
grant execute on function public.save_battery_bands(jsonb, text) to authenticated;
grant execute on function public.update_product_prices(uuid, numeric, numeric, text) to authenticated;
grant execute on function public.save_currency_rates(jsonb, text) to authenticated;
