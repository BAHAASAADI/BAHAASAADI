-- iZone — business logic: helpers, integrity triggers, history and RPCs.

-- ---------------------------------------------------------------------------
-- Permission helpers (security definer so they can read `admins` under RLS)
-- ---------------------------------------------------------------------------
create or replace function public.current_admin_role()
returns public.admin_role
language sql stable security definer set search_path = ''
as $$
  select a.role from public.admins a where a.user_id = (select auth.uid()) and a.is_active
$$;

create or replace function public.is_staff()
returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (select 1 from public.admins a where a.user_id = (select auth.uid()) and a.is_active)
$$;

create or replace function public.is_manager()
returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.admins a
    where a.user_id = (select auth.uid()) and a.is_active and a.role in ('owner', 'manager')
  )
$$;

create or replace function public.is_owner()
returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.admins a
    where a.user_id = (select auth.uid()) and a.is_active and a.role = 'owner'
  )
$$;

-- True for SQL editor / migrations / service-role calls (not for website visitors).
create or replace function public.is_backend()
returns boolean
language sql stable set search_path = ''
as $$
  select session_user::text <> 'authenticator'
      or coalesce(nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'role', '') = 'service_role'
$$;

-- ---------------------------------------------------------------------------
-- Generic helpers
-- ---------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger language plpgsql set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end $$;

create or replace function public.format_storage(p_gb integer)
returns text language sql immutable set search_path = ''
as $$
  select case when p_gb >= 1024 and p_gb % 1024 = 0 then (p_gb / 1024)::text || 'TB' else p_gb::text || 'GB' end
$$;

create or replace function public.normalize_phone(p text)
returns text language sql immutable set search_path = ''
as $$
  select nullif(
    case
      when btrim(p) like '+%' then '+' || regexp_replace(p, '\D', '', 'g')
      when regexp_replace(p, '\D', '', 'g') like '00%' then '+' || substr(regexp_replace(p, '\D', '', 'g'), 3)
      else regexp_replace(coalesce(p, ''), '\D', '', 'g')
    end, '')
$$;

create or replace function public.main_currency()
returns text language sql stable security definer set search_path = ''
as $$
  select s.main_currency from public.site_settings s where s.id = 1
$$;

-- amount in p_from converted to p_to using the manual exchange rates.
create or replace function public.convert_amount(p_amount numeric, p_from text, p_to text)
returns numeric language sql stable security definer set search_path = ''
as $$
  select case
    when p_amount is null then null
    when p_from = p_to then p_amount
    else p_amount
         / (select c.rate from public.currencies c where c.code = p_from)
         * (select c.rate from public.currencies c where c.code = p_to)
  end
$$;

create or replace function public.rule_amount(p_type public.deduction_type, p_value numeric, p_base numeric)
returns numeric language sql immutable set search_path = ''
as $$
  select case when p_type = 'percent' then round(p_base * p_value / 100, 2) else coalesce(p_value, 0) end
$$;

create or replace function public.round_price(p_amount numeric, p_step numeric)
returns numeric language sql immutable set search_path = ''
as $$
  select case when p_step is null or p_step <= 0 then round(p_amount, 2) else round(p_amount / p_step) * p_step end
$$;

create or replace function public.change_note()
returns text language sql stable set search_path = ''
as $$
  select nullif(current_setting('izone.change_note', true), '')
$$;

-- ---------------------------------------------------------------------------
-- updated_at triggers
-- ---------------------------------------------------------------------------
create trigger admins_updated before update on public.admins for each row execute function public.set_updated_at();
create trigger shops_updated before update on public.shops for each row execute function public.set_updated_at();
create trigger site_settings_updated before update on public.site_settings for each row execute function public.set_updated_at();
create trigger iphone_models_updated before update on public.iphone_models for each row execute function public.set_updated_at();
create trigger product_private_updated before update on public.product_private for each row execute function public.set_updated_at();
create trigger trade_in_rules_updated before update on public.trade_in_rules for each row execute function public.set_updated_at();
create trigger battery_bands_updated before update on public.battery_bands for each row execute function public.set_updated_at();
create trigger customers_updated before update on public.customers for each row execute function public.set_updated_at();
create trigger customer_requests_updated before update on public.customer_requests for each row execute function public.set_updated_at();
create trigger reviews_updated before update on public.reviews for each row execute function public.set_updated_at();
create trigger faqs_updated before update on public.faqs for each row execute function public.set_updated_at();
create trigger pages_updated before update on public.pages for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Administrators: there must always be at least one active owner.
-- ---------------------------------------------------------------------------
create or replace function public.admins_keep_owner()
returns trigger language plpgsql security definer set search_path = ''
as $$
begin
  if not exists (select 1 from public.admins where role = 'owner' and is_active) then
    raise exception 'There must always be at least one active owner' using errcode = '23514';
  end if;
  return null;
end $$;

create constraint trigger admins_keep_owner
  after update or delete on public.admins
  deferrable initially deferred
  for each row execute function public.admins_keep_owner();

-- ---------------------------------------------------------------------------
-- Currencies: track who confirmed a rate and log every rate change.
-- ---------------------------------------------------------------------------
create or replace function public.currencies_before_update()
returns trigger language plpgsql set search_path = ''
as $$
begin
  new.updated_at = now();
  if new.rate is distinct from old.rate or new.confirmed_at is distinct from old.confirmed_at then
    new.updated_by = auth.uid();
  end if;
  return new;
end $$;
create trigger currencies_before_update before update on public.currencies
  for each row execute function public.currencies_before_update();

create or replace function public.currencies_log_rate()
returns trigger language plpgsql security definer set search_path = ''
as $$
begin
  if new.rate is distinct from old.rate then
    insert into public.price_history (kind, subject, field, old_value, new_value, currency, note)
    values ('rate', 'Exchange rate ' || new.code || ' per 1 ' || coalesce(public.main_currency(), '?'),
            'rate', old.rate, new.rate, new.code, public.change_note());
  end if;
  return null;
end $$;
create trigger currencies_log_rate after update on public.currencies
  for each row execute function public.currencies_log_rate();

-- ---------------------------------------------------------------------------
-- Products: integrity rules + selling price history
-- ---------------------------------------------------------------------------
create or replace function public.products_before_write()
returns trigger language plpgsql security definer set search_path = ''
as $$
declare
  v_storages integer[];
begin
  select m.storages into v_storages from public.iphone_models m where m.id = new.model_id;
  if v_storages is null or not (new.storage_gb = any (v_storages)) then
    raise exception 'Storage % is not available for this model', public.format_storage(new.storage_gb)
      using errcode = '22023';
  end if;

  if tg_op = 'INSERT' then
    if new.status = 'sold' then
      raise exception 'A new phone cannot be added as sold' using errcode = '22023';
    end if;
    new.reserved_at = case when new.status = 'reserved' then now() end;
    new.sold_at = null;
    new.price_updated_at = now();
  else
    if new.price is distinct from old.price
       or new.offer_price is distinct from old.offer_price
       or new.currency is distinct from old.currency then
      if not (public.is_manager() or public.is_backend()) then
        raise exception 'Only owners and managers can change selling prices' using errcode = '42501';
      end if;
      new.price_updated_at = now();
    end if;

    if new.status is distinct from old.status then
      if new.status = 'sold' and not exists (select 1 from public.sales s where s.product_id = new.id) then
        raise exception 'Record a sale to mark a phone as sold' using errcode = '22023';
      end if;
      if old.status = 'sold' and exists (select 1 from public.sales s where s.product_id = new.id) then
        raise exception 'Reverse the sale before changing the status of a sold phone' using errcode = '22023';
      end if;
      new.reserved_at = case when new.status = 'reserved' then now() end;
      new.sold_at = case when new.status = 'sold' then now() end;
    end if;
  end if;

  new.updated_at = now();
  return new;
end $$;
create trigger products_before_write before insert or update on public.products
  for each row execute function public.products_before_write();

create or replace function public.products_log_price()
returns trigger language plpgsql security definer set search_path = ''
as $$
declare
  v_subject text;
begin
  select new.inventory_id || ' · ' || m.name || ' ' || public.format_storage(new.storage_gb)
    into v_subject from public.iphone_models m where m.id = new.model_id;

  if tg_op = 'INSERT' then
    insert into public.price_history (kind, product_id, model_id, subject, field, old_value, new_value, currency, note)
    values ('sell', new.id, new.model_id, v_subject, 'price', null, new.price, new.currency,
            coalesce(public.change_note(), 'Added to stock'));
    if new.offer_price is not null then
      insert into public.price_history (kind, product_id, model_id, subject, field, old_value, new_value, currency, note)
      values ('sell', new.id, new.model_id, v_subject, 'offer_price', null, new.offer_price, new.currency, public.change_note());
    end if;
  else
    if new.price is distinct from old.price or new.currency is distinct from old.currency then
      insert into public.price_history (kind, product_id, model_id, subject, field, old_value, new_value, currency, note)
      values ('sell', new.id, new.model_id, v_subject, 'price', old.price, new.price, new.currency, public.change_note());
    end if;
    if new.offer_price is distinct from old.offer_price then
      insert into public.price_history (kind, product_id, model_id, subject, field, old_value, new_value, currency, note)
      values ('sell', new.id, new.model_id, v_subject, 'offer_price', old.offer_price, new.offer_price, new.currency, public.change_note());
    end if;
  end if;
  return null;
end $$;
create trigger products_log_price after insert or update on public.products
  for each row execute function public.products_log_price();

-- ---------------------------------------------------------------------------
-- Buying prices: history + audit fields
-- ---------------------------------------------------------------------------
create or replace function public.buy_prices_before_write()
returns trigger language plpgsql security definer set search_path = ''
as $$
declare
  v_storages integer[];
begin
  select m.storages into v_storages from public.iphone_models m where m.id = new.model_id;
  if v_storages is null or not (new.storage_gb = any (v_storages)) then
    raise exception 'Storage % is not available for this model', public.format_storage(new.storage_gb)
      using errcode = '22023';
  end if;
  new.updated_at = now();
  new.updated_by = coalesce(auth.uid(), new.updated_by);
  return new;
end $$;
create trigger buy_prices_before_write before insert or update on public.buy_prices
  for each row execute function public.buy_prices_before_write();

create or replace function public.buy_prices_log()
returns trigger language plpgsql security definer set search_path = ''
as $$
declare
  v_subject text;
  v_currency text := public.main_currency();
  v_field text;
  v_old numeric;
  v_new numeric;
begin
  select m.name || ' ' || public.format_storage(new.storage_gb) into v_subject
    from public.iphone_models m where m.id = new.model_id;

  foreach v_field in array array['base_price', 'price_excellent', 'price_good', 'price_fair', 'price_damaged'] loop
    v_new := (to_jsonb(new) ->> v_field)::numeric;
    v_old := case when tg_op = 'UPDATE' then (to_jsonb(old) ->> v_field)::numeric end;
    if v_new is distinct from v_old and not (tg_op = 'INSERT' and v_new is null) then
      insert into public.price_history (kind, buy_price_id, model_id, subject, field, old_value, new_value, currency, note)
      values ('buy', new.id, new.model_id, v_subject, v_field, v_old, v_new, v_currency, public.change_note());
    end if;
  end loop;
  return null;
end $$;
create trigger buy_prices_log after insert or update on public.buy_prices
  for each row execute function public.buy_prices_log();

create or replace function public.rules_log()
returns trigger language plpgsql security definer set search_path = ''
as $$
declare
  v_subject text;
begin
  if tg_table_name = 'trade_in_rules' then
    v_subject := 'Rule: ' || new.label;
  else
    v_subject := 'Battery ' || new.min_pct || '–' || new.max_pct || '%';
  end if;
  if tg_op = 'INSERT' or new.value is distinct from old.value or new.deduction_type is distinct from old.deduction_type then
    insert into public.price_history (kind, subject, field, old_value, new_value, currency, note)
    values ('rule', v_subject, new.deduction_type::text,
            case when tg_op = 'UPDATE' then old.value end, new.value,
            case when new.deduction_type = 'fixed' then public.main_currency() end, public.change_note());
  end if;
  return null;
end $$;
create trigger trade_in_rules_log after insert or update on public.trade_in_rules
  for each row execute function public.rules_log();
create trigger battery_bands_log after insert or update on public.battery_bands
  for each row execute function public.rules_log();

-- ---------------------------------------------------------------------------
-- Purchases & sales: store the main-currency amount at transaction time.
-- ---------------------------------------------------------------------------
create or replace function public.transactions_main_amount()
returns trigger language plpgsql security definer set search_path = ''
as $$
begin
  if tg_op = 'INSERT' or new.price is distinct from old.price or new.currency is distinct from old.currency then
    new.price_main = round(public.convert_amount(new.price, new.currency, public.main_currency()), 2);
  end if;
  return new;
end $$;
create trigger purchases_main_amount before insert or update on public.purchases
  for each row execute function public.transactions_main_amount();
create trigger sales_main_amount before insert or update on public.sales
  for each row execute function public.transactions_main_amount();

-- ---------------------------------------------------------------------------
-- Enquiries
-- ---------------------------------------------------------------------------
create or replace function public.enquiries_before_update()
returns trigger language plpgsql set search_path = ''
as $$
begin
  if new.status is distinct from old.status then
    new.status_changed_at = now();
  end if;
  new.updated_at = now();
  return new;
end $$;
create trigger enquiries_before_update before update on public.trade_in_enquiries
  for each row execute function public.enquiries_before_update();

-- ===========================================================================
-- RPC: trade-in estimate (single source of truth for the pricing engine)
-- Input: { model_id, storage_gb, condition, battery_health,
--          functional: { face_id, cameras, screen, touchscreen, speakers,
--                        microphone, charging, buttons } (true = works),
--          water_damage: bool, other_defects: text,
--          parts: { screen, battery, cameras, other } ('original'|'replaced'|'unknown'),
--          other_replaced: text }
-- ===========================================================================
create or replace function public.estimate_trade_in(p jsonb)
returns jsonb
language plpgsql stable security definer set search_path = ''
as $$
declare
  v_model public.iphone_models;
  v_price public.buy_prices;
  v_storage integer;
  v_condition public.device_condition;
  v_battery integer;
  v_main text;
  v_round numeric;
  v_min numeric;
  v_base numeric;
  v_amount numeric;
  v_explicit numeric;
  v_total numeric := 0;
  v_items jsonb := '[]'::jsonb;
  v_rule public.trade_in_rules;
  v_band public.battery_bands;
  v_func jsonb := coalesce(p -> 'functional', '{}'::jsonb);
  v_parts jsonb := coalesce(p -> 'parts', '{}'::jsonb);
  v_key text;
  v_estimate numeric;
  v_inspection boolean := false;
begin
  begin
    v_storage := (p ->> 'storage_gb')::integer;
    v_condition := (p ->> 'condition')::public.device_condition;
    v_battery := (p ->> 'battery_health')::integer;
    select * into v_model from public.iphone_models m where m.id = (p ->> 'model_id')::uuid and m.is_active;
  exception when others then
    raise exception 'Invalid trade-in details' using errcode = '22023';
  end;

  if v_model.id is null then
    raise exception 'Unknown iPhone model' using errcode = '22023';
  end if;
  if v_storage is null or not (v_storage = any (v_model.storages)) then
    raise exception 'Invalid storage for this model' using errcode = '22023';
  end if;
  if v_condition is null then
    raise exception 'Please select the condition' using errcode = '22023';
  end if;
  if v_battery is null or v_battery < 0 or v_battery > 100 then
    raise exception 'Battery health must be between 0 and 100' using errcode = '22023';
  end if;

  select s.main_currency, s.trade_in_min_offer into v_main, v_min from public.site_settings s where s.id = 1;
  select c.round_to into v_round from public.currencies c where c.code = v_main;

  select * into v_price from public.buy_prices bp
   where bp.model_id = v_model.id and bp.storage_gb = v_storage and bp.is_active;
  if v_price.id is null then
    return jsonb_build_object(
      'available', false, 'currency', v_main, 'model_name', v_model.name, 'storage_gb', v_storage);
  end if;

  v_base := v_price.base_price;

  -- 1. Physical condition (explicit per-model price wins over the global rule)
  v_explicit := case v_condition
    when 'excellent' then v_price.price_excellent
    when 'good' then v_price.price_good
    when 'fair' then v_price.price_fair
    when 'damaged' then v_price.price_damaged
    else null end;
  if v_explicit is not null then
    v_amount := greatest(v_base - v_explicit, 0);
  else
    select * into v_rule from public.trade_in_rules r where r.key = 'condition_' || v_condition::text;
    v_amount := coalesce(public.rule_amount(v_rule.deduction_type, v_rule.value, v_base), 0);
  end if;
  if v_amount > 0 then
    v_items := v_items || jsonb_build_object('key', 'condition_' || v_condition::text, 'category', 'condition', 'amount', v_amount);
    v_total := v_total + v_amount;
  end if;

  -- 2. Battery health band
  select * into v_band from public.battery_bands b where v_battery between b.min_pct and b.max_pct;
  if v_band.id is not null then
    v_amount := public.rule_amount(v_band.deduction_type, v_band.value, v_base);
    if v_amount > 0 then
      v_items := v_items || jsonb_build_object('key', 'battery', 'category', 'battery', 'amount', v_amount,
                                               'band', v_band.min_pct || '-' || v_band.max_pct);
      v_total := v_total + v_amount;
    end if;
  end if;

  -- 3. Technical defects (false = does not work)
  foreach v_key in array array['face_id', 'cameras', 'screen', 'touchscreen', 'speakers', 'microphone', 'charging', 'buttons'] loop
    if v_func ->> v_key = 'false' then
      select * into v_rule from public.trade_in_rules r where r.key = 'defect_' || v_key;
      v_amount := coalesce(public.rule_amount(v_rule.deduction_type, v_rule.value, v_base), 0);
      v_items := v_items || jsonb_build_object('key', 'defect_' || v_key, 'category', 'defect', 'amount', v_amount);
      v_total := v_total + v_amount;
    end if;
  end loop;
  if coalesce((p ->> 'water_damage')::boolean, false) then
    select * into v_rule from public.trade_in_rules r where r.key = 'defect_water_damage';
    v_amount := coalesce(public.rule_amount(v_rule.deduction_type, v_rule.value, v_base), 0);
    v_items := v_items || jsonb_build_object('key', 'defect_water_damage', 'category', 'defect', 'amount', v_amount);
    v_total := v_total + v_amount;
    v_inspection := true;
  end if;
  if length(btrim(coalesce(p ->> 'other_defects', ''))) > 0 then
    select * into v_rule from public.trade_in_rules r where r.key = 'defect_other';
    v_amount := coalesce(public.rule_amount(v_rule.deduction_type, v_rule.value, v_base), 0);
    v_items := v_items || jsonb_build_object('key', 'defect_other', 'category', 'defect', 'amount', v_amount);
    v_total := v_total + v_amount;
    v_inspection := true;
  end if;

  -- 4. Replaced components
  foreach v_key in array array['screen', 'battery', 'cameras', 'other'] loop
    if v_parts ->> v_key = 'replaced' or (v_key = 'other' and length(btrim(coalesce(p ->> 'other_replaced', ''))) > 0) then
      select * into v_rule from public.trade_in_rules r where r.key = 'part_' || v_key;
      v_amount := coalesce(public.rule_amount(v_rule.deduction_type, v_rule.value, v_base), 0);
      v_items := v_items || jsonb_build_object('key', 'part_' || v_key, 'category', 'part', 'amount', v_amount);
      v_total := v_total + v_amount;
    end if;
    if v_parts ->> v_key = 'unknown' then
      v_inspection := true;
    end if;
  end loop;

  v_estimate := v_base - v_total;
  v_estimate := floor(v_estimate / coalesce(v_round, 1)) * coalesce(v_round, 1);
  v_estimate := greatest(v_estimate, coalesce(v_min, 0), 0);

  return jsonb_build_object(
    'available', true,
    'currency', v_main,
    'model_name', v_model.name,
    'storage_gb', v_storage,
    'base_price', v_base,
    'deductions', v_items,
    'total_deductions', v_total,
    'estimate', v_estimate,
    'inspection_required', v_inspection,
    'prices_updated_at', v_price.updated_at
  );
end $$;

-- ===========================================================================
-- RPC: submit a trade-in enquiry (public). Recalculates the estimate server-side.
-- ===========================================================================
create or replace function public.submit_trade_in(p jsonb)
returns jsonb
language plpgsql volatile security definer set search_path = ''
as $$
declare
  v_name text := btrim(coalesce(p ->> 'name', ''));
  v_phone text := public.normalize_phone(p ->> 'phone');
  v_shop uuid;
  v_id uuid;
  v_est jsonb;
  v_customer uuid;
  v_ref text;
  v_path text;
  v_count integer := 0;
begin
  if length(v_name) < 2 or length(v_name) > 120 then
    raise exception 'Please enter your name' using errcode = '22023';
  end if;
  if v_phone is null or length(regexp_replace(v_phone, '\D', '', 'g')) < 7 or length(v_phone) > 20 then
    raise exception 'Please enter a valid telephone number' using errcode = '22023';
  end if;
  if (select count(*) from public.trade_in_enquiries e
       where e.customer_phone = v_phone and e.created_at > now() - interval '1 hour') >= 5 then
    raise exception 'Too many enquiries from this telephone number. Please try again later.' using errcode = '54000';
  end if;

  begin
    v_shop := nullif(p ->> 'preferred_shop_id', '')::uuid;
    v_id := coalesce(nullif(p ->> 'id', '')::uuid, gen_random_uuid());
  exception when others then
    raise exception 'Invalid enquiry details' using errcode = '22023';
  end;
  if v_shop is not null and not exists (select 1 from public.shops s where s.id = v_shop and s.is_active) then
    raise exception 'Please select a valid shop' using errcode = '22023';
  end if;

  v_est := public.estimate_trade_in(p);

  insert into public.customers (name, phone)
  values (v_name, v_phone)
  on conflict (phone) do update set name = excluded.name
  returning id into v_customer;

  insert into public.trade_in_enquiries (
    id, customer_id, customer_name, customer_phone, model_id, model_name, storage_gb, condition,
    battery_health, answers, other_defects, other_replaced, estimated_offer, currency, breakdown,
    preferred_shop_id, locale)
  values (
    v_id, v_customer, v_name, v_phone, (p ->> 'model_id')::uuid, v_est ->> 'model_name',
    (p ->> 'storage_gb')::integer, (p ->> 'condition')::public.device_condition,
    (p ->> 'battery_health')::integer,
    jsonb_build_object(
      'functional', coalesce(p -> 'functional', '{}'::jsonb),
      'water_damage', coalesce((p ->> 'water_damage')::boolean, false),
      'parts', coalesce(p -> 'parts', '{}'::jsonb)),
    nullif(left(btrim(coalesce(p ->> 'other_defects', '')), 1000), ''),
    nullif(left(btrim(coalesce(p ->> 'other_replaced', '')), 500), ''),
    case when (v_est ->> 'available')::boolean then (v_est ->> 'estimate')::numeric end,
    v_est ->> 'currency', v_est, v_shop, left(p ->> 'locale', 5))
  returning reference into v_ref;

  -- Photos were uploaded to trade-in-photos/<enquiry id>/<file> before submission.
  for v_path in select jsonb_array_elements_text(coalesce(p -> 'photos', '[]'::jsonb)) loop
    exit when v_count >= 10;
    if v_path ~ ('^' || v_id::text || '/[A-Za-z0-9_-]{1,80}\.(jpg|jpeg|png|webp)$') then
      insert into public.trade_in_photos (enquiry_id, path) values (v_id, v_path) on conflict (path) do nothing;
      v_count := v_count + 1;
    end if;
  end loop;

  return jsonb_build_object('id', v_id, 'reference', v_ref, 'estimate', v_est);
end $$;

-- ===========================================================================
-- RPC: reservation / question / contact requests (public)
-- ===========================================================================
create or replace function public.submit_customer_request(p jsonb)
returns jsonb
language plpgsql volatile security definer set search_path = ''
as $$
declare
  v_kind public.request_kind;
  v_name text := btrim(coalesce(p ->> 'name', ''));
  v_phone text := public.normalize_phone(p ->> 'phone');
  v_email text := nullif(btrim(coalesce(p ->> 'email', '')), '');
  v_message text := nullif(left(btrim(coalesce(p ->> 'message', '')), 2000), '');
  v_product public.products;
  v_shop uuid;
  v_id uuid;
begin
  begin
    v_kind := (p ->> 'kind')::public.request_kind;
    v_shop := nullif(p ->> 'shop_id', '')::uuid;
    if nullif(p ->> 'product_id', '') is not null then
      select * into v_product from public.products pr where pr.id = (p ->> 'product_id')::uuid;
    end if;
  exception when others then
    raise exception 'Invalid request' using errcode = '22023';
  end;

  if v_kind is null then
    raise exception 'Invalid request' using errcode = '22023';
  end if;
  if length(v_name) < 2 or length(v_name) > 120 then
    raise exception 'Please enter your name' using errcode = '22023';
  end if;
  if v_phone is null or length(regexp_replace(v_phone, '\D', '', 'g')) < 7 or length(v_phone) > 20 then
    raise exception 'Please enter a valid telephone number' using errcode = '22023';
  end if;
  if v_email is not null and v_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then
    raise exception 'Please enter a valid email address' using errcode = '22023';
  end if;
  if v_kind in ('reserve', 'question') then
    if v_product.id is null or v_product.status = 'sold' or not v_product.is_published then
      raise exception 'This phone is no longer available' using errcode = '22023';
    end if;
    v_shop := v_product.shop_id;
  elsif v_message is null then
    raise exception 'Please enter a message' using errcode = '22023';
  end if;
  if (select count(*) from public.customer_requests r
       where r.phone = v_phone and r.created_at > now() - interval '1 hour') >= 8 then
    raise exception 'Too many requests from this telephone number. Please try again later.' using errcode = '54000';
  end if;

  insert into public.customer_requests (kind, product_id, inventory_id, shop_id, name, phone, email, message, locale)
  values (v_kind, v_product.id, v_product.inventory_id, v_shop, v_name, v_phone, v_email, v_message, left(p ->> 'locale', 5))
  returning id into v_id;

  return jsonb_build_object('id', v_id);
end $$;

-- ===========================================================================
-- RPC: record a sale (staff). Marks the phone as sold and stores profit.
-- ===========================================================================
create or replace function public.record_sale(
  p_product_id uuid,
  p_price numeric,
  p_currency text default null,
  p_sold_at timestamptz default null,
  p_customer_name text default null,
  p_customer_phone text default null,
  p_notes text default null)
returns uuid
language plpgsql volatile security invoker set search_path = ''
as $$
declare
  v_product public.products;
  v_model_name text;
  v_cost numeric;
  v_customer uuid;
  v_phone text := public.normalize_phone(p_customer_phone);
  v_sale uuid;
begin
  if not public.is_staff() then
    raise exception 'Not authorised' using errcode = '42501';
  end if;
  select * into v_product from public.products where id = p_product_id for update;
  if v_product.id is null then
    raise exception 'Phone not found' using errcode = 'P0002';
  end if;
  if v_product.status = 'sold' then
    raise exception 'This phone has already been sold' using errcode = '22023';
  end if;
  if p_price is null or p_price < 0 then
    raise exception 'Enter a valid selling price' using errcode = '22023';
  end if;

  select m.name into v_model_name from public.iphone_models m where m.id = v_product.model_id;
  select pu.price_main into v_cost from public.purchases pu where pu.product_id = v_product.id;

  if v_phone is not null then
    insert into public.customers (name, phone)
    values (coalesce(nullif(btrim(p_customer_name), ''), 'Customer'), v_phone)
    on conflict (phone) do update
      set name = coalesce(nullif(btrim(excluded.name), 'Customer'), public.customers.name)
    returning id into v_customer;
  end if;

  insert into public.sales (product_id, inventory_id, model_id, description, shop_id, price, currency,
                            cost_main, customer_name, customer_phone, customer_id, sold_at, notes)
  values (v_product.id, v_product.inventory_id, v_product.model_id,
          v_model_name || ' ' || public.format_storage(v_product.storage_gb) || ' ' || v_product.color,
          v_product.shop_id, p_price, coalesce(p_currency, v_product.currency), v_cost,
          nullif(btrim(p_customer_name), ''), v_phone, v_customer, coalesce(p_sold_at, now()),
          nullif(btrim(p_notes), ''))
  returning id into v_sale;

  update public.products set status = 'sold' where id = v_product.id;
  return v_sale;
end $$;

-- RPC: undo a sale recorded by mistake (managers). The phone returns to stock.
create or replace function public.reverse_sale(p_sale_id uuid)
returns void
language plpgsql volatile security invoker set search_path = ''
as $$
declare
  v_product uuid;
begin
  if not public.is_manager() then
    raise exception 'Only owners and managers can reverse a sale' using errcode = '42501';
  end if;
  delete from public.sales where id = p_sale_id returning product_id into v_product;
  if not found then
    raise exception 'Sale not found' using errcode = 'P0002';
  end if;
  if v_product is not null then
    update public.products set status = 'available' where id = v_product;
  end if;
end $$;

-- ===========================================================================
-- RPC: move a phone to another shop (staff) with a permanent transfer record.
-- ===========================================================================
create or replace function public.transfer_product(p_product_id uuid, p_to_shop uuid, p_note text default null)
returns uuid
language plpgsql volatile security invoker set search_path = ''
as $$
declare
  v_product public.products;
  v_transfer uuid;
begin
  if not public.is_staff() then
    raise exception 'Not authorised' using errcode = '42501';
  end if;
  select * into v_product from public.products where id = p_product_id for update;
  if v_product.id is null then
    raise exception 'Phone not found' using errcode = 'P0002';
  end if;
  if v_product.status = 'sold' then
    raise exception 'A sold phone cannot be transferred' using errcode = '22023';
  end if;
  if v_product.shop_id = p_to_shop then
    raise exception 'The phone is already in this shop' using errcode = '22023';
  end if;
  if not exists (select 1 from public.shops s where s.id = p_to_shop and s.is_active) then
    raise exception 'Destination shop not found or inactive' using errcode = '22023';
  end if;

  insert into public.transfers (product_id, inventory_id, from_shop_id, to_shop_id, note)
  values (v_product.id, v_product.inventory_id, v_product.shop_id, p_to_shop, nullif(btrim(p_note), ''))
  returning id into v_transfer;
  update public.products set shop_id = p_to_shop where id = v_product.id;
  return v_transfer;
end $$;

-- ===========================================================================
-- RPC: bulk selling-price adjustments (managers)
-- p_filter: { product_ids?: uuid[], shop_id?, model_id?, condition?, status? }
-- p_target 'price':       p_mode 'percent' (+/-%), 'fixed' (+/- amount), 'set'
-- p_target 'offer_price': p_mode 'percent_off', 'fixed_off', 'set', 'clear'
-- ===========================================================================
create or replace function public.bulk_adjust_sell_prices(
  p_filter jsonb,
  p_target text,
  p_mode text,
  p_value numeric default 0,
  p_round_to numeric default null,
  p_note text default null)
returns integer
language plpgsql volatile security invoker set search_path = ''
as $$
declare
  v_ids uuid[];
  v_count integer;
begin
  if not public.is_manager() then
    raise exception 'Only owners and managers can change selling prices' using errcode = '42501';
  end if;
  if p_target not in ('price', 'offer_price') then
    raise exception 'Invalid target' using errcode = '22023';
  end if;
  if (p_target = 'price' and p_mode not in ('percent', 'fixed', 'set'))
     or (p_target = 'offer_price' and p_mode not in ('percent_off', 'fixed_off', 'set', 'clear')) then
    raise exception 'Invalid adjustment mode' using errcode = '22023';
  end if;
  if p_mode <> 'clear' and p_value is null then
    raise exception 'Enter a value' using errcode = '22023';
  end if;
  if p_mode = 'percent_off' and (p_value <= 0 or p_value >= 100) then
    raise exception 'Discount must be between 0 and 100%%' using errcode = '22023';
  end if;
  if p_mode = 'percent' and p_value <= -100 then
    raise exception 'Percentage must be greater than -100%%' using errcode = '22023';
  end if;

  if p_filter ? 'product_ids' then
    select array_agg(x::uuid) into v_ids from jsonb_array_elements_text(p_filter -> 'product_ids') x;
  end if;

  perform set_config('izone.change_note', coalesce(nullif(btrim(p_note), ''), 'Bulk price adjustment'), true);

  if p_target = 'price' then
    update public.products pr set
      price = greatest(public.round_price(case p_mode
                when 'percent' then pr.price * (1 + p_value / 100)
                when 'fixed' then pr.price + p_value
                else p_value end, p_round_to), 0),
      offer_price = case when pr.offer_price is not null
                          and pr.offer_price >= greatest(public.round_price(case p_mode
                                when 'percent' then pr.price * (1 + p_value / 100)
                                when 'fixed' then pr.price + p_value
                                else p_value end, p_round_to), 0)
                         then null else pr.offer_price end
    where pr.status <> 'sold'
      and (v_ids is null or pr.id = any (v_ids))
      and (nullif(p_filter ->> 'shop_id', '') is null or pr.shop_id = (p_filter ->> 'shop_id')::uuid)
      and (nullif(p_filter ->> 'model_id', '') is null or pr.model_id = (p_filter ->> 'model_id')::uuid)
      and (nullif(p_filter ->> 'condition', '') is null or pr.condition = (p_filter ->> 'condition')::public.device_condition)
      and (nullif(p_filter ->> 'status', '') is null or pr.status = (p_filter ->> 'status')::public.product_status);
  else
    update public.products pr set
      offer_price = case p_mode
        when 'clear' then null
        when 'set' then public.round_price(p_value, p_round_to)
        when 'percent_off' then public.round_price(pr.price * (1 - p_value / 100), p_round_to)
        else public.round_price(pr.price - p_value, p_round_to) end
    where pr.status <> 'sold'
      and (v_ids is null or pr.id = any (v_ids))
      and (nullif(p_filter ->> 'shop_id', '') is null or pr.shop_id = (p_filter ->> 'shop_id')::uuid)
      and (nullif(p_filter ->> 'model_id', '') is null or pr.model_id = (p_filter ->> 'model_id')::uuid)
      and (nullif(p_filter ->> 'condition', '') is null or pr.condition = (p_filter ->> 'condition')::public.device_condition)
      and (nullif(p_filter ->> 'status', '') is null or pr.status = (p_filter ->> 'status')::public.product_status)
      -- an offer must stay below the normal price and above zero
      and (p_mode = 'clear' or (
            case p_mode
              when 'set' then public.round_price(p_value, p_round_to)
              when 'percent_off' then public.round_price(pr.price * (1 - p_value / 100), p_round_to)
              else public.round_price(pr.price - p_value, p_round_to) end) between 0 and pr.price - 0.01);
  end if;

  get diagnostics v_count = row_count;
  return v_count;
end $$;

-- ===========================================================================
-- RPC: bulk buying-price adjustments (managers)
-- p_mode 'percent' | 'fixed' (applied to base and explicit condition prices) | 'set' (base only)
-- ===========================================================================
create or replace function public.bulk_adjust_buy_prices(
  p_model_ids uuid[],
  p_storages integer[],
  p_mode text,
  p_value numeric,
  p_round_to numeric default null,
  p_note text default null)
returns integer
language plpgsql volatile security invoker set search_path = ''
as $$
declare
  v_count integer;
begin
  if not public.is_manager() then
    raise exception 'Only owners and managers can change buying prices' using errcode = '42501';
  end if;
  if p_mode not in ('percent', 'fixed', 'set') or p_value is null then
    raise exception 'Invalid adjustment' using errcode = '22023';
  end if;
  if p_mode = 'percent' and p_value <= -100 then
    raise exception 'Percentage must be greater than -100%%' using errcode = '22023';
  end if;

  perform set_config('izone.change_note', coalesce(nullif(btrim(p_note), ''), 'Bulk buying price adjustment'), true);

  update public.buy_prices bp set
    base_price = greatest(public.round_price(case p_mode
      when 'percent' then bp.base_price * (1 + p_value / 100)
      when 'fixed' then bp.base_price + p_value
      else p_value end, p_round_to), 0),
    price_excellent = case when p_mode = 'set' or bp.price_excellent is null then bp.price_excellent
      else greatest(public.round_price(case p_mode when 'percent' then bp.price_excellent * (1 + p_value / 100) else bp.price_excellent + p_value end, p_round_to), 0) end,
    price_good = case when p_mode = 'set' or bp.price_good is null then bp.price_good
      else greatest(public.round_price(case p_mode when 'percent' then bp.price_good * (1 + p_value / 100) else bp.price_good + p_value end, p_round_to), 0) end,
    price_fair = case when p_mode = 'set' or bp.price_fair is null then bp.price_fair
      else greatest(public.round_price(case p_mode when 'percent' then bp.price_fair * (1 + p_value / 100) else bp.price_fair + p_value end, p_round_to), 0) end,
    price_damaged = case when p_mode = 'set' or bp.price_damaged is null then bp.price_damaged
      else greatest(public.round_price(case p_mode when 'percent' then bp.price_damaged * (1 + p_value / 100) else bp.price_damaged + p_value end, p_round_to), 0) end
  where (p_model_ids is null or cardinality(p_model_ids) = 0 or bp.model_id = any (p_model_ids))
    and (p_storages is null or cardinality(p_storages) = 0 or bp.storage_gb = any (p_storages));

  get diagnostics v_count = row_count;
  return v_count;
end $$;

-- ===========================================================================
-- RPC: change the main currency (owner). Re-denominates every amount that is
-- stored in the main currency so history stays consistent.
-- ===========================================================================
create or replace function public.set_main_currency(p_code text)
returns void
language plpgsql volatile security invoker set search_path = ''
as $$
declare
  v_old text := public.main_currency();
  v_factor numeric;
begin
  if not public.is_owner() then
    raise exception 'Only the owner can change the main currency' using errcode = '42501';
  end if;
  if p_code = v_old then
    return;
  end if;
  select c.rate into v_factor from public.currencies c where c.code = p_code and c.is_active;
  if v_factor is null then
    raise exception 'Currency not found or inactive' using errcode = '22023';
  end if;

  perform set_config('izone.change_note', 'Main currency changed from ' || v_old || ' to ' || p_code, true);

  update public.buy_prices set
    base_price = round(base_price * v_factor, 2),
    price_excellent = round(price_excellent * v_factor, 2),
    price_good = round(price_good * v_factor, 2),
    price_fair = round(price_fair * v_factor, 2),
    price_damaged = round(price_damaged * v_factor, 2);
  update public.trade_in_rules set value = round(value * v_factor, 2) where deduction_type = 'fixed';
  update public.battery_bands set value = round(value * v_factor, 2) where deduction_type = 'fixed';
  update public.site_settings set trade_in_min_offer = round(trade_in_min_offer * v_factor, 2);
  update public.sales set price_main = round(price_main * v_factor, 2), cost_main = round(cost_main * v_factor, 2);
  update public.purchases set price_main = round(price_main * v_factor, 2);
  update public.currencies set rate = rate / v_factor;
  update public.site_settings set main_currency = p_code;
end $$;

-- ===========================================================================
-- Dashboard statistics (staff). Inventory figures are current; sales,
-- purchases and enquiries are filtered by the period.
-- ===========================================================================
create or replace function public.dashboard_stats(
  p_shop uuid default null,
  p_from timestamptz default null,
  p_to timestamptz default null)
returns jsonb
language plpgsql stable security invoker set search_path = ''
as $$
declare
  v_main text := public.main_currency();
  v_stock jsonb;
  v_sales jsonb;
  v_purchases jsonb;
  v_enquiries jsonb;
begin
  if not public.is_staff() then
    raise exception 'Not authorised' using errcode = '42501';
  end if;

  select jsonb_build_object(
    'in_stock', count(*) filter (where pr.status in ('available', 'reserved')),
    'available', count(*) filter (where pr.status = 'available'),
    'reserved', count(*) filter (where pr.status = 'reserved'),
    'inventory_value', coalesce(round(sum(public.convert_amount(coalesce(pr.offer_price, pr.price), pr.currency, v_main))
                                filter (where pr.status in ('available', 'reserved')), 2), 0),
    'inventory_cost', coalesce(round(sum(pu.price_main) filter (where pr.status in ('available', 'reserved')), 2), 0))
  into v_stock
  from public.products pr
  left join public.purchases pu on pu.product_id = pr.id
  where p_shop is null or pr.shop_id = p_shop;

  select jsonb_build_object(
    'sold', count(*),
    'revenue', coalesce(sum(s.price_main), 0),
    'gross_profit', coalesce(sum(s.profit_main), 0),
    'sales_without_cost', count(*) filter (where s.cost_main is null))
  into v_sales
  from public.sales s
  where (p_shop is null or s.shop_id = p_shop)
    and (p_from is null or s.sold_at >= p_from)
    and (p_to is null or s.sold_at < p_to);

  select jsonb_build_object('purchases', count(*), 'purchases_total', coalesce(sum(pu.price_main), 0))
  into v_purchases
  from public.purchases pu
  where (p_shop is null or pu.shop_id = p_shop)
    and (p_from is null or pu.purchased_at >= p_from)
    and (p_to is null or pu.purchased_at < p_to);

  select jsonb_build_object(
    'pending_enquiries', count(*) filter (where e.status in ('new', 'contacted', 'negotiating')),
    'new_enquiries', count(*) filter (where e.status = 'new'))
  into v_enquiries
  from public.trade_in_enquiries e
  where (p_shop is null or e.preferred_shop_id = p_shop)
    and (p_from is null or e.created_at >= p_from)
    and (p_to is null or e.created_at < p_to);

  return jsonb_build_object('main_currency', v_main) || v_stock || v_sales || v_purchases || v_enquiries;
end $$;

create or replace function public.shop_stats(p_from timestamptz default null, p_to timestamptz default null)
returns table (
  shop_id uuid, shop_name text, currency text, in_stock bigint, available bigint, reserved bigint,
  inventory_value numeric, inventory_cost numeric, sold bigint, revenue numeric, gross_profit numeric,
  purchases bigint, purchases_total numeric)
language sql stable security invoker set search_path = ''
as $$
  select
    s.id, s.name, s.currency,
    (select count(*) from public.products p where p.shop_id = s.id and p.status in ('available', 'reserved')),
    (select count(*) from public.products p where p.shop_id = s.id and p.status = 'available'),
    (select count(*) from public.products p where p.shop_id = s.id and p.status = 'reserved'),
    (select coalesce(round(sum(public.convert_amount(coalesce(p.offer_price, p.price), p.currency, public.main_currency())), 2), 0)
       from public.products p where p.shop_id = s.id and p.status in ('available', 'reserved')),
    (select coalesce(round(sum(pu.price_main), 2), 0) from public.products p
       join public.purchases pu on pu.product_id = p.id
      where p.shop_id = s.id and p.status in ('available', 'reserved')),
    (select count(*) from public.sales x where x.shop_id = s.id
        and (p_from is null or x.sold_at >= p_from) and (p_to is null or x.sold_at < p_to)),
    (select coalesce(sum(x.price_main), 0) from public.sales x where x.shop_id = s.id
        and (p_from is null or x.sold_at >= p_from) and (p_to is null or x.sold_at < p_to)),
    (select coalesce(sum(x.profit_main), 0) from public.sales x where x.shop_id = s.id
        and (p_from is null or x.sold_at >= p_from) and (p_to is null or x.sold_at < p_to)),
    (select count(*) from public.purchases x where x.shop_id = s.id
        and (p_from is null or x.purchased_at >= p_from) and (p_to is null or x.purchased_at < p_to)),
    (select coalesce(sum(x.price_main), 0) from public.purchases x where x.shop_id = s.id
        and (p_from is null or x.purchased_at >= p_from) and (p_to is null or x.purchased_at < p_to))
  from public.shops s
  where public.is_staff()
  order by s.sort_order, s.name
$$;

-- ===========================================================================
-- Team management (owner): grant dashboard access to an existing auth user.
-- ===========================================================================
create or replace function public.add_admin(p_email text, p_role public.admin_role, p_full_name text default null)
returns uuid
language plpgsql volatile security definer set search_path = ''
as $$
declare
  v_user uuid;
begin
  if not (public.is_owner() or public.is_backend()) then
    raise exception 'Only the owner can manage the team' using errcode = '42501';
  end if;
  select u.id into v_user from auth.users u where lower(u.email) = lower(btrim(p_email));
  if v_user is null then
    raise exception 'No account exists for %. Create the user first.', p_email using errcode = 'P0002';
  end if;
  insert into public.admins (user_id, email, full_name, role, is_active)
  values (v_user, lower(btrim(p_email)), nullif(btrim(p_full_name), ''), p_role, true)
  on conflict (user_id) do update
    set role = excluded.role, is_active = true,
        full_name = coalesce(excluded.full_name, public.admins.full_name);
  return v_user;
end $$;
