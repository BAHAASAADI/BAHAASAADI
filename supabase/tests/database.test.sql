-- iZone database tests (business rules + row level security).
-- Run against a LOCAL/TEST database only, after the migrations, with three auth users
-- owner@izone.test / manager@izone.test / staff@izone.test registered via public.add_admin().
-- Everything runs inside a transaction that is rolled back:
--   psql "$DATABASE_URL" -f supabase/tests/database.test.sql

-- Business-rule and security tests, run inside a transaction that is rolled back.
\set ON_ERROR_STOP 1
select id as owner_id from auth.users where email = 'owner@izone.test' \gset
select id as staff_id from auth.users where email = 'staff@izone.test' \gset
\set AS_ANON 'reset session authorization; set session authorization authenticator; set role anon; select set_config(''request.jwt.claims'', ''{"role":"anon"}'', false);'
\set AS_OWNER 'reset session authorization; set session authorization authenticator; set role authenticated; select set_config(''request.jwt.claims'', ''{"role":"authenticated","sub":"' :owner_id '"}'', false);'
\set AS_STAFF 'reset session authorization; set session authorization authenticator; set role authenticated; select set_config(''request.jwt.claims'', ''{"role":"authenticated","sub":"' :staff_id '"}'', false);'
\set AS_ADMIN 'reset role; reset session authorization; select set_config(''request.jwt.claims'', '''', false);'
begin;
create schema tst;

create or replace function tst.as_user(p_email text) returns void language plpgsql as $$
declare v uuid;
begin
  select id into v from auth.users where email = p_email;
  perform set_config('request.jwt.claims', json_build_object('sub', v, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
end $$;
create or replace function tst.as_anon() returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claims', '{"role":"anon"}', true);
  execute 'set local role anon';
end $$;
create or replace function tst.expect_error(p_sql text, p_like text) returns void language plpgsql as $$
begin
  begin
    execute p_sql;
  exception when others then
    if sqlerrm ilike '%' || p_like || '%' then raise notice 'PASS (expected error): %', sqlerrm; return; end if;
    raise exception 'FAIL: unexpected error "%" for %', sqlerrm, p_sql;
  end;
  raise exception 'FAIL: expected error % for %', p_like, p_sql;
end $$;
create or replace function tst.check(p_ok boolean, p_label text) returns void language plpgsql as $$
begin
  if not coalesce(p_ok, false) then raise exception 'FAIL: %', p_label; end if;
  raise notice 'PASS: %', p_label;
end $$;
grant usage on schema tst to anon, authenticated; grant execute on all functions in schema tst to anon, authenticated;

-- ---- anon -----------------------------------------------------------------
:AS_ANON
select tst.check((select count(*) from public.currencies) = 3, 'anon reads currencies');
select tst.expect_error($q$insert into public.shops (name, currency) values ('x', 'EUR')$q$, 'permission denied');
select tst.expect_error($q$select public.dashboard_stats()$q$, 'permission denied');
select tst.expect_error($q$select count(*) from public.admins$q$, 'permission denied');
select tst.check(
  (public.estimate_trade_in(jsonb_build_object('model_id', (select id from public.iphone_models where slug = 'iphone-15-pro-max'),
     'storage_gb', 256, 'condition', 'good', 'battery_health', 88)) ->> 'available')::boolean = false,
  'estimate unavailable before a buying price exists');
select tst.expect_error($q$select public.estimate_trade_in(jsonb_build_object('model_id', (select id from public.iphone_models where slug = 'iphone-15-pro-max'), 'storage_gb', 128, 'condition', 'good', 'battery_health', 88))$q$, 'Invalid storage');
:AS_ADMIN

-- ---- staff cannot manage prices / shops ------------------------------------
:AS_STAFF
select tst.expect_error($q$insert into public.shops (name, currency) values ('x', 'EUR')$q$, 'row-level security');
:AS_ADMIN

-- ---- owner sets up a shop and buying prices --------------------------------
:AS_OWNER
insert into public.shops (name, city, country, currency, whatsapp) values ('Test shop A', 'City', 'Country', 'EUR', '+48 600 000 000');
insert into public.shops (name, city, country, currency) values ('Test shop B', 'City B', 'Country', 'PLN');
insert into public.buy_prices (model_id, storage_gb, base_price)
  select id, 256, 900 from public.iphone_models where slug = 'iphone-15-pro-max';
insert into public.buy_prices (model_id, storage_gb, base_price, price_good)
  select id, 512, 1000, 700 from public.iphone_models where slug = 'iphone-15-pro-max';
select tst.check((select count(*) from public.price_history where kind = 'buy') = 3, 'buy price history recorded (base x2 + explicit good)');
:AS_ADMIN

-- ---- estimates --------------------------------------------------------------
:AS_ANON
-- 900 base; good 12% = 108; battery 88 -> 5% = 45; total 153 -> 747 -> floor to 5 -> 745
select tst.check(
  (public.estimate_trade_in(jsonb_build_object('model_id', (select id from public.iphone_models where slug = 'iphone-15-pro-max'),
    'storage_gb', 256, 'condition', 'good', 'battery_health', 88)) ->> 'estimate')::numeric = 745,
  'estimate = base - condition - battery (745)');
-- explicit good price for 512: 1000 -> 700 (300) ; battery 95 -> 0 ; face id broken 15% = 150 ; screen replaced 15% = 150 => 400
select tst.check(
  (public.estimate_trade_in(jsonb_build_object('model_id', (select id from public.iphone_models where slug = 'iphone-15-pro-max'),
    'storage_gb', 512, 'condition', 'good', 'battery_health', 95,
    'functional', jsonb_build_object('face_id', false, 'cameras', true),
    'parts', jsonb_build_object('screen', 'replaced', 'battery', 'original'))) ->> 'estimate')::numeric = 400,
  'explicit condition price + defect + replaced part (400)');
-- battery below 80 -> 20%
select tst.check(
  (public.estimate_trade_in(jsonb_build_object('model_id', (select id from public.iphone_models where slug = 'iphone-15-pro-max'),
    'storage_gb', 256, 'condition', 'like_new', 'battery_health', 79)) ->> 'estimate')::numeric = 720,
  'battery below 80% deducts 20% (720)');

-- submit trade-in as anon
select tst.check(
  (public.submit_trade_in(jsonb_build_object('id', 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee',
    'model_id', (select id from public.iphone_models where slug = 'iphone-15-pro-max'),
    'storage_gb', 256, 'condition', 'good', 'battery_health', 88, 'name', 'Jan Test', 'phone', '+48 600 111 222',
    'photos', jsonb_build_array('aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee/front.jpg', 'other/evil.jpg'),
    'estimated_offer', 99999)) ->> 'reference') like 'TI-%',
  'anon submits trade-in');
select tst.expect_error($q$select count(*) from public.trade_in_enquiries$q$, 'permission denied');
select tst.expect_error($q$select public.submit_trade_in(jsonb_build_object('model_id', (select id from public.iphone_models where slug = 'iphone-15-pro-max'), 'storage_gb', 256, 'condition', 'good', 'battery_health', 88, 'name', 'J', 'phone', '+48 600 111 222'))$q$, 'name');
:AS_ADMIN

:AS_STAFF
select tst.check((select estimated_offer from public.trade_in_enquiries where customer_phone = '+48600111222') = 745, 'server-side estimate stored (client value ignored)');
select tst.check((select count(*) from public.trade_in_photos) = 1, 'only photos inside the enquiry folder are linked');
update public.trade_in_enquiries set status = 'contacted', final_offer = 760, final_currency = 'EUR' where customer_phone = '+48600111222';
select tst.check((select status from public.trade_in_enquiries where customer_phone = '+48600111222') = 'contacted', 'staff updates enquiry status and final offer');

-- staff adds a phone with purchase record
insert into public.products (model_id, storage_gb, color, battery_health, condition, price, currency, shop_id)
  select m.id, 256, 'Natural Titanium', 91, 'excellent', 1100, 'EUR', s.id
  from public.iphone_models m, public.shops s where m.slug = 'iphone-15-pro-max' and s.name = 'Test shop A';
insert into public.purchases (product_id, inventory_id, model_id, description, shop_id, source, price, currency)
  select p.id, p.inventory_id, p.model_id, 'iPhone 15 Pro Max 256GB', p.shop_id, 'supplier', 800, 'EUR' from public.products p;
select tst.check((select inventory_id from public.products limit 1) ~ '^IZ-[0-9]+$', 'inventory id generated');
select tst.expect_error($q$update public.products set price = 1000$q$, 'Only owners and managers');
select tst.expect_error($q$update public.products set status = 'sold'$q$, 'Record a sale');
select tst.expect_error($q$insert into public.products (model_id, storage_gb, color, condition, price, currency, shop_id) select m.id, 128, 'Black', 'good', 1, 'EUR', s.id from public.iphone_models m, public.shops s where m.slug = 'iphone-15-pro-max' and s.name = 'Test shop A'$q$, 'not available for this model');
delete from public.products;
:AS_ADMIN

-- deleting as staff is silently filtered by RLS (0 rows) — verify the phone still exists
select tst.check((select count(*) from public.products) = 1, 'staff delete blocked by RLS');

-- manager/owner changes price -> history
:AS_OWNER
select set_config('izone.change_note', 'Market update', true);
update public.products set price = 1050;
select tst.check((select count(*) from public.price_history where kind = 'sell' and field = 'price' and note = 'Market update' and new_value = 1050) = 1, 'selling price history with note');
select tst.check(public.bulk_adjust_sell_prices('{}'::jsonb, 'price', 'percent', 10, 10, 'Bulk +10%') = 1, 'bulk +10% selling price');
select tst.check((select price from public.products limit 1) = 1160, 'bulk percent rounds to 10 (1155 -> 1160)');
select tst.check(public.bulk_adjust_sell_prices('{}'::jsonb, 'offer_price', 'percent_off', 5, 10, 'Black Friday') = 1, 'special offer 5% off');
select tst.check((select offer_price from public.products limit 1) = 1100, 'offer price 1102 -> 1100');
select tst.check(public.bulk_adjust_buy_prices(null, null, 'percent', -10, 5, 'Market down') = 2, 'bulk buy price -10%');
select tst.check((select base_price from public.buy_prices where storage_gb = 256) = 810, 'buy base 900 -> 810');
select tst.check((select price_good from public.buy_prices where storage_gb = 512) = 630, 'explicit condition price scaled 700 -> 630');
:AS_ADMIN

-- reserved phone stays visible, then transfer, then sale
:AS_STAFF
update public.products set status = 'reserved';
select tst.check((select reserved_at is not null from public.products limit 1), 'reserved_at set');
select tst.check(public.transfer_product((select id from public.products limit 1), (select id from public.shops where name = 'Test shop B'), 'Customer in city B') is not null, 'transfer between shops');
select tst.check((select s.name from public.products p join public.shops s on s.id = p.shop_id limit 1) = 'Test shop B', 'product moved to shop B');
:AS_ADMIN
:AS_ANON
select tst.check((select count(*) from public.products) = 1, 'anon sees reserved phone');
select tst.check(
  (public.submit_customer_request(jsonb_build_object('kind', 'question', 'product_id', (select id from public.products limit 1),
     'name', 'Ola Test', 'phone', '+48 511 222 333', 'message', 'Is it unlocked?')) ->> 'id') is not null,
  'anon asks a question about a phone');
select tst.expect_error($q$select count(*) from public.product_private$q$, 'permission denied');
select tst.check((select chip from public.iphone_models where slug = 'iphone-15-pro-max') = 'A17 Pro', 'model specs are public');
:AS_ADMIN

:AS_STAFF
select tst.check((select r.customer_id = c.id from public.customer_requests r join public.customers c on c.phone = '+48511222333' where r.phone = '+48511222333'), 'request linked to customer');
select public.record_sale((select id from public.products limit 1), 1100, 'EUR', null, 'Anna', '+48 500 000 000', null);
select tst.check((select status from public.products limit 1) = 'sold', 'sale marks phone sold');
select tst.check((select profit_main from public.sales limit 1) = 300, 'gross profit = 1100 - 800');
select tst.check((public.dashboard_stats() ->> 'gross_profit')::numeric = 300, 'dashboard profit');
select tst.check((public.dashboard_stats() ->> 'in_stock')::int = 0, 'dashboard stock after sale');
select tst.expect_error($q$select public.reverse_sale((select id from public.sales limit 1))$q$, 'Only owners and managers');
:AS_ADMIN
:AS_ANON
select tst.check((select count(*) from public.products) = 0, 'sold phone disappears from public catalogue');
select tst.expect_error($q$select public.submit_customer_request(jsonb_build_object('kind', 'reserve', 'product_id', 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee', 'name', 'Anna', 'phone', '+48500000000'))$q$, 'no longer available');
:AS_ADMIN

-- owner reverses the sale, changes main currency
:AS_OWNER
select public.reverse_sale((select id from public.sales limit 1));
select tst.check((select status from public.products limit 1) = 'available', 'reversed sale returns phone to stock');
select public.set_main_currency('PLN');
select tst.check((select main_currency from public.site_settings) = 'PLN', 'main currency changed');
select tst.check((select rate from public.currencies where code = 'PLN') = 1, 'PLN rate rebased to 1');
select tst.check((select round(rate, 6) from public.currencies where code = 'EUR') = round(1 / 4.25, 6), 'EUR rate rebased');
select tst.check((select base_price from public.buy_prices where storage_gb = 256) = round(810 * 4.25, 2), 'buy prices re-denominated');
set constraints all immediate;
select tst.expect_error($q$update public.admins set role = 'staff' where email = 'owner@izone.test'$q$, 'at least one active owner');
:AS_ADMIN

rollback;
