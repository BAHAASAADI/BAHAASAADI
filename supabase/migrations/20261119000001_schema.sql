-- iZone — core schema
-- Every business table lives in `public` and is protected by row level security
-- (see 20261119000003_security.sql). Money is stored as numeric with an explicit
-- currency code; reporting amounts are also stored in the main currency at the
-- time of the transaction (`*_main` columns).

create extension if not exists pgcrypto with schema extensions;

-- ---------------------------------------------------------------------------
-- Types
-- ---------------------------------------------------------------------------
create type public.product_status   as enum ('available', 'reserved', 'sold');
create type public.device_condition as enum ('like_new', 'excellent', 'good', 'fair', 'damaged');
create type public.parts_status     as enum ('original', 'replaced', 'unknown');
create type public.enquiry_status   as enum ('new', 'contacted', 'negotiating', 'accepted', 'rejected', 'completed');
create type public.request_kind     as enum ('reserve', 'question', 'contact');
create type public.request_status   as enum ('new', 'handled', 'closed');
create type public.admin_role       as enum ('owner', 'manager', 'staff');
create type public.deduction_type   as enum ('percent', 'fixed');
create type public.purchase_source  as enum ('customer', 'supplier', 'trade_in');

-- ---------------------------------------------------------------------------
-- Administrators (role-based permissions: owner > manager > staff)
-- ---------------------------------------------------------------------------
create table public.admins (
  user_id    uuid primary key references auth.users (id) on delete cascade,
  email      text not null,
  full_name  text,
  role       public.admin_role not null default 'staff',
  is_active  boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Currencies & settings
-- rate = how many units of this currency equal 1 unit of the main currency.
-- ---------------------------------------------------------------------------
create table public.currencies (
  code         text primary key check (code ~ '^[A-Z]{3}$'),
  name         text not null,
  symbol       text not null,
  decimals     smallint not null default 2 check (decimals between 0 and 4),
  round_to     numeric(12, 2) not null default 1 check (round_to > 0),
  rate         numeric(20, 8) not null check (rate > 0),
  is_active    boolean not null default true,
  confirmed_at timestamptz,
  updated_at   timestamptz not null default now(),
  updated_by   uuid references auth.users (id) on delete set null
);

create table public.shops (
  id            uuid primary key default gen_random_uuid(),
  name          text not null check (length(btrim(name)) > 0),
  address       text,
  city          text,
  country       text,
  phone         text,
  whatsapp      text,
  opening_hours text,
  maps_url      text,
  currency      text not null references public.currencies (code),
  is_active     boolean not null default true,
  sort_order    integer not null default 0,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create table public.site_settings (
  id                 smallint primary key default 1 check (id = 1),
  main_currency      text not null references public.currencies (code),
  primary_shop_id    uuid references public.shops (id) on delete set null,
  whatsapp_number    text,
  contact_phone      text,
  contact_email      text,
  instagram_url      text,
  facebook_url       text,
  tiktok_url         text,
  trade_in_min_offer numeric(12, 2) not null default 0 check (trade_in_min_offer >= 0),
  updated_at         timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- iPhone catalogue (models are editable from the dashboard)
-- ---------------------------------------------------------------------------
create table public.iphone_models (
  id           uuid primary key default gen_random_uuid(),
  slug         text not null unique check (slug ~ '^[a-z0-9-]+$'),
  name         text not null,
  release_year smallint,
  sort_order   integer not null default 0,
  storages     integer[] not null check (cardinality(storages) > 0),
  colors       text[] not null default '{}',
  is_active    boolean not null default true,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Inventory
-- ---------------------------------------------------------------------------
create sequence public.inventory_number_seq start with 1001;

create table public.products (
  id               uuid primary key default gen_random_uuid(),
  inventory_id     text not null unique default ('IZ-' || nextval('public.inventory_number_seq')::text),
  model_id         uuid not null references public.iphone_models (id) on delete restrict,
  storage_gb       integer not null check (storage_gb > 0),
  color            text not null check (length(btrim(color)) > 0),
  battery_health   smallint check (battery_health between 0 and 100),
  condition        public.device_condition not null,
  parts_status     public.parts_status not null default 'original',
  replaced_parts   text,
  description      text,
  price            numeric(12, 2) not null check (price >= 0),
  offer_price      numeric(12, 2) check (offer_price >= 0),
  currency         text not null references public.currencies (code),
  status           public.product_status not null default 'available',
  shop_id          uuid not null references public.shops (id) on delete restrict,
  is_featured      boolean not null default false,
  is_published     boolean not null default true,
  price_updated_at timestamptz not null default now(),
  reserved_at      timestamptz,
  sold_at          timestamptz,
  created_by       uuid default auth.uid() references auth.users (id) on delete set null,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  constraint offer_below_price check (offer_price is null or offer_price < price)
);
create index products_status_idx on public.products (status);
create index products_shop_idx on public.products (shop_id);
create index products_model_idx on public.products (model_id);
create index products_created_idx on public.products (created_at desc);

-- Data that must never be visible to customers.
create table public.product_private (
  product_id     uuid primary key references public.products (id) on delete cascade,
  imei           text,
  serial_number  text,
  internal_notes text,
  updated_at     timestamptz not null default now()
);

create table public.product_photos (
  id         uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products (id) on delete cascade,
  path       text not null unique,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);
create index product_photos_product_idx on public.product_photos (product_id, sort_order);

-- ---------------------------------------------------------------------------
-- Buying prices (what iZone pays customers) — always separate from selling prices.
-- base_price = like new, 100% functional, all original parts, in the main currency.
-- price_<condition> optionally replaces the global condition deduction for this
-- model/storage.
-- ---------------------------------------------------------------------------
create table public.buy_prices (
  id              uuid primary key default gen_random_uuid(),
  model_id        uuid not null references public.iphone_models (id) on delete cascade,
  storage_gb      integer not null check (storage_gb > 0),
  base_price      numeric(12, 2) not null check (base_price >= 0),
  price_excellent numeric(12, 2) check (price_excellent >= 0),
  price_good      numeric(12, 2) check (price_good >= 0),
  price_fair      numeric(12, 2) check (price_fair >= 0),
  price_damaged   numeric(12, 2) check (price_damaged >= 0),
  is_active       boolean not null default true,
  updated_at      timestamptz not null default now(),
  updated_by      uuid default auth.uid() references auth.users (id) on delete set null,
  unique (model_id, storage_gb)
);

create table public.trade_in_rules (
  key            text primary key,
  category       text not null check (category in ('condition', 'defect', 'part')),
  label          text not null,
  deduction_type public.deduction_type not null default 'percent',
  value          numeric(12, 2) not null default 0 check (value >= 0),
  sort_order     integer not null default 0,
  updated_at     timestamptz not null default now(),
  constraint trade_in_rules_percent_max check (deduction_type <> 'percent' or value <= 100)
);

create table public.battery_bands (
  id             uuid primary key default gen_random_uuid(),
  min_pct        smallint not null check (min_pct between 0 and 100),
  max_pct        smallint not null check (max_pct between 0 and 100),
  deduction_type public.deduction_type not null default 'percent',
  value          numeric(12, 2) not null default 0 check (value >= 0),
  updated_at     timestamptz not null default now(),
  constraint battery_bands_order check (min_pct <= max_pct),
  constraint battery_bands_percent_max check (deduction_type <> 'percent' or value <= 100),
  constraint battery_bands_no_overlap exclude using gist (int4range(min_pct, max_pct, '[]') with &&) deferrable initially immediate
);

-- Every price, rule and exchange-rate change is recorded here by triggers.
create table public.price_history (
  id           bigint generated always as identity primary key,
  kind         text not null check (kind in ('sell', 'buy', 'rule', 'rate')),
  product_id   uuid references public.products (id) on delete set null,
  buy_price_id uuid references public.buy_prices (id) on delete set null,
  model_id     uuid references public.iphone_models (id) on delete set null,
  subject      text not null,
  field        text not null,
  old_value    numeric(20, 8),
  new_value    numeric(20, 8),
  currency     text,
  note         text,
  changed_by   uuid default auth.uid() references auth.users (id) on delete set null,
  changed_at   timestamptz not null default now()
);
create index price_history_changed_idx on public.price_history (changed_at desc);
create index price_history_product_idx on public.price_history (product_id);

-- ---------------------------------------------------------------------------
-- Customers, trade-in enquiries and customer requests
-- ---------------------------------------------------------------------------
create table public.customers (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  phone      text not null unique,
  email      text,
  notes      text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create sequence public.enquiry_number_seq start with 1001;

create table public.trade_in_enquiries (
  id                uuid primary key default gen_random_uuid(),
  reference         text not null unique default ('TI-' || nextval('public.enquiry_number_seq')::text),
  customer_id       uuid references public.customers (id) on delete set null,
  customer_name     text not null,
  customer_phone    text not null,
  model_id          uuid references public.iphone_models (id) on delete set null,
  model_name        text not null,
  storage_gb        integer not null,
  condition         public.device_condition not null,
  battery_health    smallint check (battery_health between 0 and 100),
  answers           jsonb not null default '{}',
  other_defects     text,
  other_replaced    text,
  estimated_offer   numeric(12, 2),
  currency          text not null,
  breakdown         jsonb not null default '{}',
  final_offer       numeric(12, 2) check (final_offer >= 0),
  final_currency    text references public.currencies (code),
  preferred_shop_id uuid references public.shops (id) on delete set null,
  status            public.enquiry_status not null default 'new',
  admin_notes       text,
  locale            text,
  status_changed_at timestamptz not null default now(),
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);
create index trade_in_enquiries_status_idx on public.trade_in_enquiries (status, created_at desc);

create table public.trade_in_photos (
  id         uuid primary key default gen_random_uuid(),
  enquiry_id uuid not null references public.trade_in_enquiries (id) on delete cascade,
  path       text not null unique,
  created_at timestamptz not null default now()
);

create table public.customer_requests (
  id           uuid primary key default gen_random_uuid(),
  kind         public.request_kind not null,
  product_id   uuid references public.products (id) on delete set null,
  inventory_id text,
  shop_id      uuid references public.shops (id) on delete set null,
  name         text not null,
  phone        text not null,
  email        text,
  message      text,
  status       public.request_status not null default 'new',
  locale       text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create index customer_requests_status_idx on public.customer_requests (status, created_at desc);

-- ---------------------------------------------------------------------------
-- Transactions
-- ---------------------------------------------------------------------------
create table public.purchases (
  id                 uuid primary key default gen_random_uuid(),
  product_id         uuid references public.products (id) on delete set null,
  inventory_id       text,
  model_id           uuid references public.iphone_models (id) on delete set null,
  description        text not null,
  shop_id            uuid references public.shops (id) on delete set null,
  source             public.purchase_source not null default 'supplier',
  counterparty_name  text,
  counterparty_phone text,
  customer_id        uuid references public.customers (id) on delete set null,
  enquiry_id         uuid references public.trade_in_enquiries (id) on delete set null,
  price              numeric(12, 2) not null check (price >= 0),
  currency           text not null references public.currencies (code),
  price_main         numeric(14, 2) not null default 0,
  purchased_at       timestamptz not null default now(),
  notes              text,
  created_by         uuid default auth.uid() references auth.users (id) on delete set null,
  created_at         timestamptz not null default now()
);
create unique index purchases_product_unique on public.purchases (product_id) where product_id is not null;
create index purchases_date_idx on public.purchases (purchased_at desc);

create table public.sales (
  id             uuid primary key default gen_random_uuid(),
  product_id     uuid references public.products (id) on delete set null,
  inventory_id   text not null,
  model_id       uuid references public.iphone_models (id) on delete set null,
  description    text not null,
  shop_id        uuid references public.shops (id) on delete set null,
  price          numeric(12, 2) not null check (price >= 0),
  currency       text not null references public.currencies (code),
  price_main     numeric(14, 2) not null default 0,
  cost_main      numeric(14, 2),
  profit_main    numeric(14, 2) generated always as (price_main - cost_main) stored,
  customer_name  text,
  customer_phone text,
  customer_id    uuid references public.customers (id) on delete set null,
  sold_at        timestamptz not null default now(),
  notes          text,
  created_by     uuid default auth.uid() references auth.users (id) on delete set null,
  created_at     timestamptz not null default now()
);
create unique index sales_product_unique on public.sales (product_id) where product_id is not null;
create index sales_date_idx on public.sales (sold_at desc);

create table public.transfers (
  id             uuid primary key default gen_random_uuid(),
  product_id     uuid not null references public.products (id) on delete cascade,
  inventory_id   text not null,
  from_shop_id   uuid references public.shops (id) on delete set null,
  to_shop_id     uuid references public.shops (id) on delete set null,
  note           text,
  transferred_by uuid default auth.uid() references auth.users (id) on delete set null,
  transferred_at timestamptz not null default now()
);
create index transfers_date_idx on public.transfers (transferred_at desc);

-- ---------------------------------------------------------------------------
-- Website content
-- ---------------------------------------------------------------------------
create table public.reviews (
  id           uuid primary key default gen_random_uuid(),
  author_name  text not null,
  rating       smallint not null check (rating between 1 and 5),
  body         text not null,
  shop_id      uuid references public.shops (id) on delete set null,
  source       text,
  review_date  date,
  is_published boolean not null default true,
  sort_order   integer not null default 0,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create table public.faqs (
  id           uuid primary key default gen_random_uuid(),
  locale       text not null check (locale in ('en', 'fr', 'ar', 'pl')),
  question     text not null,
  answer       text not null,
  sort_order   integer not null default 0,
  is_published boolean not null default true,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create table public.pages (
  slug       text not null check (slug in ('privacy', 'terms', 'trade-in-conditions')),
  locale     text not null check (locale in ('en', 'fr', 'ar', 'pl')),
  title      text not null,
  body       text not null,
  updated_at timestamptz not null default now(),
  primary key (slug, locale)
);
