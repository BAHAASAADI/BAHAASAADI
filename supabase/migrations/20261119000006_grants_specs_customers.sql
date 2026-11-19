-- iZone — hardening and additions
-- 1. Explicit privileges: the app no longer depends on Supabase's default
--    privileges (some projects do not expose new tables to the API automatically).
--    Row level security still decides which rows each person can see or change.
-- 2. Technical specifications for iPhone models.
-- 3. Reservation / question / contact requests are linked to customers.

-- ---------------------------------------------------------------------------
-- 1. Privileges
-- ---------------------------------------------------------------------------
grant usage on schema public to anon, authenticated, service_role;

-- Visitors: nothing except read-only access to the public catalogue and content
-- (this also removes broader default grants on projects that have them).
revoke all on all tables in schema public from anon;
revoke all on all sequences in schema public from anon;
grant select on
  public.currencies, public.shops, public.site_settings, public.iphone_models, public.products,
  public.product_photos, public.buy_prices, public.trade_in_rules, public.battery_bands,
  public.reviews, public.faqs, public.pages
to anon;

-- Signed-in users: RLS limits everything to dashboard members and their role.
grant select, insert, update, delete on all tables in schema public to authenticated;
grant all on all tables in schema public to service_role;
grant usage, select on all sequences in schema public to authenticated, service_role;

-- Helper functions evaluated inside policies and RPCs.
grant execute on function
  public.current_admin_role(), public.is_staff(), public.is_manager(), public.is_owner(), public.is_backend(),
  public.main_currency(), public.convert_amount(numeric, text, text), public.format_storage(integer),
  public.normalize_phone(text), public.rule_amount(public.deduction_type, numeric, numeric),
  public.round_price(numeric, numeric), public.change_note()
to anon, authenticated, service_role;
grant execute on all functions in schema public to service_role;

-- ---------------------------------------------------------------------------
-- 2. Technical specifications
-- ---------------------------------------------------------------------------
alter table public.iphone_models
  add column if not exists display_inches numeric(3, 1),
  add column if not exists chip text,
  add column if not exists biometrics text check (biometrics in ('Face ID', 'Touch ID')),
  add column if not exists connector text check (connector in ('Lightning', 'USB-C')),
  add column if not exists has_5g boolean;

update public.iphone_models m set
  display_inches = v.display, chip = v.chip, biometrics = v.bio, connector = v.conn, has_5g = v.g5
from (values
  ('iphone-x',          5.8, 'A11 Bionic', 'Face ID',  'Lightning', false),
  ('iphone-xr',         6.1, 'A12 Bionic', 'Face ID',  'Lightning', false),
  ('iphone-xs',         5.8, 'A12 Bionic', 'Face ID',  'Lightning', false),
  ('iphone-xs-max',     6.5, 'A12 Bionic', 'Face ID',  'Lightning', false),
  ('iphone-11',         6.1, 'A13 Bionic', 'Face ID',  'Lightning', false),
  ('iphone-11-pro',     5.8, 'A13 Bionic', 'Face ID',  'Lightning', false),
  ('iphone-11-pro-max', 6.5, 'A13 Bionic', 'Face ID',  'Lightning', false),
  ('iphone-se-2',       4.7, 'A13 Bionic', 'Touch ID', 'Lightning', false),
  ('iphone-12-mini',    5.4, 'A14 Bionic', 'Face ID',  'Lightning', true),
  ('iphone-12',         6.1, 'A14 Bionic', 'Face ID',  'Lightning', true),
  ('iphone-12-pro',     6.1, 'A14 Bionic', 'Face ID',  'Lightning', true),
  ('iphone-12-pro-max', 6.7, 'A14 Bionic', 'Face ID',  'Lightning', true),
  ('iphone-13-mini',    5.4, 'A15 Bionic', 'Face ID',  'Lightning', true),
  ('iphone-13',         6.1, 'A15 Bionic', 'Face ID',  'Lightning', true),
  ('iphone-13-pro',     6.1, 'A15 Bionic', 'Face ID',  'Lightning', true),
  ('iphone-13-pro-max', 6.7, 'A15 Bionic', 'Face ID',  'Lightning', true),
  ('iphone-se-3',       4.7, 'A15 Bionic', 'Touch ID', 'Lightning', true),
  ('iphone-14',         6.1, 'A15 Bionic', 'Face ID',  'Lightning', true),
  ('iphone-14-plus',    6.7, 'A15 Bionic', 'Face ID',  'Lightning', true),
  ('iphone-14-pro',     6.1, 'A16 Bionic', 'Face ID',  'Lightning', true),
  ('iphone-14-pro-max', 6.7, 'A16 Bionic', 'Face ID',  'Lightning', true),
  ('iphone-15',         6.1, 'A16 Bionic', 'Face ID',  'USB-C',     true),
  ('iphone-15-plus',    6.7, 'A16 Bionic', 'Face ID',  'USB-C',     true),
  ('iphone-15-pro',     6.1, 'A17 Pro',    'Face ID',  'USB-C',     true),
  ('iphone-15-pro-max', 6.7, 'A17 Pro',    'Face ID',  'USB-C',     true),
  ('iphone-16',         6.1, 'A18',        'Face ID',  'USB-C',     true),
  ('iphone-16-plus',    6.7, 'A18',        'Face ID',  'USB-C',     true),
  ('iphone-16-pro',     6.3, 'A18 Pro',    'Face ID',  'USB-C',     true),
  ('iphone-16-pro-max', 6.9, 'A18 Pro',    'Face ID',  'USB-C',     true),
  ('iphone-16e',        6.1, 'A18',        'Face ID',  'USB-C',     true),
  ('iphone-17',         6.3, 'A19',        'Face ID',  'USB-C',     true),
  ('iphone-air',        6.5, 'A19 Pro',    'Face ID',  'USB-C',     true),
  ('iphone-17-pro',     6.3, 'A19 Pro',    'Face ID',  'USB-C',     true),
  ('iphone-17-pro-max', 6.9, 'A19 Pro',    'Face ID',  'USB-C',     true),
  -- Newer models: only what is certain; complete them in Dashboard → iPhone models.
  ('iphone-17e',        null, null,        'Face ID',  'USB-C',     true),
  ('iphone-18',         null, null,        'Face ID',  'USB-C',     true),
  ('iphone-18-pro',     null, null,        'Face ID',  'USB-C',     true),
  ('iphone-18-pro-max', null, null,        'Face ID',  'USB-C',     true)
) as v(slug, display, chip, bio, conn, g5)
where m.slug = v.slug and m.chip is null and m.display_inches is null;

-- ---------------------------------------------------------------------------
-- 3. Customer requests are linked to customers
-- ---------------------------------------------------------------------------
alter table public.customer_requests
  add column if not exists customer_id uuid references public.customers (id) on delete set null;
create index if not exists customer_requests_customer_idx on public.customer_requests (customer_id);
create index if not exists trade_in_enquiries_customer_idx on public.trade_in_enquiries (customer_id);
create index if not exists sales_customer_idx on public.sales (customer_id);
create index if not exists purchases_customer_idx on public.purchases (customer_id);

update public.customer_requests r set customer_id = c.id
  from public.customers c where r.customer_id is null and c.phone = r.phone;

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
  v_customer uuid;
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

  insert into public.customers (name, phone, email)
  values (v_name, v_phone, v_email)
  on conflict (phone) do update
    set name = excluded.name, email = coalesce(excluded.email, public.customers.email)
  returning id into v_customer;

  insert into public.customer_requests (kind, product_id, inventory_id, shop_id, customer_id, name, phone, email, message, locale)
  values (v_kind, v_product.id, v_product.inventory_id, v_shop, v_customer, v_name, v_phone, v_email, v_message, left(p ->> 'locale', 5))
  returning id into v_id;

  return jsonb_build_object('id', v_id);
end $$;

grant execute on function public.submit_customer_request(jsonb) to anon, authenticated;
