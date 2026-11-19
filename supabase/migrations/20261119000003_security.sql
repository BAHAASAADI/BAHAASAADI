-- iZone — row level security, function permissions and storage.
--
-- Roles:
--   visitors (anon / signed-in non-admins): read the public catalogue and content,
--     request estimates and submit enquiries through RPCs only.
--   staff:   inventory, enquiries, requests, sales, purchases, transfers.
--   manager: + all prices and pricing rules, shops, models, content, deletions.
--   owner:   + settings, currencies, main currency and team.

alter table public.admins             enable row level security;
alter table public.currencies         enable row level security;
alter table public.shops              enable row level security;
alter table public.site_settings      enable row level security;
alter table public.iphone_models      enable row level security;
alter table public.products           enable row level security;
alter table public.product_private    enable row level security;
alter table public.product_photos     enable row level security;
alter table public.buy_prices         enable row level security;
alter table public.trade_in_rules     enable row level security;
alter table public.battery_bands      enable row level security;
alter table public.price_history      enable row level security;
alter table public.customers          enable row level security;
alter table public.trade_in_enquiries enable row level security;
alter table public.trade_in_photos    enable row level security;
alter table public.customer_requests  enable row level security;
alter table public.purchases          enable row level security;
alter table public.sales              enable row level security;
alter table public.transfers          enable row level security;
alter table public.reviews            enable row level security;
alter table public.faqs               enable row level security;
alter table public.pages              enable row level security;

-- admins ---------------------------------------------------------------------
create policy admins_select on public.admins for select to authenticated using (public.is_staff());
create policy admins_insert on public.admins for insert to authenticated with check (public.is_owner());
create policy admins_update on public.admins for update to authenticated using (public.is_owner()) with check (public.is_owner());
create policy admins_delete on public.admins for delete to authenticated using (public.is_owner());

-- currencies & settings ------------------------------------------------------
create policy currencies_select on public.currencies for select to anon, authenticated using (true);
create policy currencies_insert on public.currencies for insert to authenticated with check (public.is_owner());
create policy currencies_update on public.currencies for update to authenticated using (public.is_manager()) with check (public.is_manager());
create policy currencies_delete on public.currencies for delete to authenticated using (public.is_owner());

create policy settings_select on public.site_settings for select to anon, authenticated using (true);
create policy settings_update on public.site_settings for update to authenticated using (public.is_owner()) with check (public.is_owner());

-- shops ------------------------------------------------------------------------
create policy shops_select on public.shops for select to anon, authenticated using (is_active or public.is_staff());
create policy shops_insert on public.shops for insert to authenticated with check (public.is_manager());
create policy shops_update on public.shops for update to authenticated using (public.is_manager()) with check (public.is_manager());
create policy shops_delete on public.shops for delete to authenticated using (public.is_owner());

-- models -----------------------------------------------------------------------
create policy models_select on public.iphone_models for select to anon, authenticated using (is_active or public.is_staff());
create policy models_insert on public.iphone_models for insert to authenticated with check (public.is_manager());
create policy models_update on public.iphone_models for update to authenticated using (public.is_manager()) with check (public.is_manager());
create policy models_delete on public.iphone_models for delete to authenticated using (public.is_manager());

-- products: sold and unpublished phones are never visible to customers ---------
create policy products_select on public.products for select to anon, authenticated
  using (
    public.is_staff()
    or (status <> 'sold' and is_published
        and exists (select 1 from public.shops s where s.id = shop_id and s.is_active))
  );
create policy products_insert on public.products for insert to authenticated with check (public.is_staff());
create policy products_update on public.products for update to authenticated using (public.is_staff()) with check (public.is_staff());
create policy products_delete on public.products for delete to authenticated using (public.is_manager());

create policy product_private_all on public.product_private for all to authenticated
  using (public.is_staff()) with check (public.is_staff());

create policy product_photos_select on public.product_photos for select to anon, authenticated
  using (exists (select 1 from public.products p where p.id = product_id));
create policy product_photos_insert on public.product_photos for insert to authenticated with check (public.is_staff());
create policy product_photos_update on public.product_photos for update to authenticated using (public.is_staff()) with check (public.is_staff());
create policy product_photos_delete on public.product_photos for delete to authenticated using (public.is_staff());

-- buying prices & rules: public read (transparent estimates), managers write ---
create policy buy_prices_select on public.buy_prices for select to anon, authenticated using (is_active or public.is_staff());
create policy buy_prices_insert on public.buy_prices for insert to authenticated with check (public.is_manager());
create policy buy_prices_update on public.buy_prices for update to authenticated using (public.is_manager()) with check (public.is_manager());
create policy buy_prices_delete on public.buy_prices for delete to authenticated using (public.is_manager());

create policy rules_select on public.trade_in_rules for select to anon, authenticated using (true);
create policy rules_update on public.trade_in_rules for update to authenticated using (public.is_manager()) with check (public.is_manager());

create policy bands_select on public.battery_bands for select to anon, authenticated using (true);
create policy bands_insert on public.battery_bands for insert to authenticated with check (public.is_manager());
create policy bands_update on public.battery_bands for update to authenticated using (public.is_manager()) with check (public.is_manager());
create policy bands_delete on public.battery_bands for delete to authenticated using (public.is_manager());

-- history is written only by triggers
create policy price_history_select on public.price_history for select to authenticated using (public.is_staff());

-- customers, enquiries, requests (inserted by visitors only through RPCs) ------
create policy customers_select on public.customers for select to authenticated using (public.is_staff());
create policy customers_insert on public.customers for insert to authenticated with check (public.is_staff());
create policy customers_update on public.customers for update to authenticated using (public.is_staff()) with check (public.is_staff());
create policy customers_delete on public.customers for delete to authenticated using (public.is_manager());

create policy enquiries_select on public.trade_in_enquiries for select to authenticated using (public.is_staff());
create policy enquiries_update on public.trade_in_enquiries for update to authenticated using (public.is_staff()) with check (public.is_staff());
create policy enquiries_delete on public.trade_in_enquiries for delete to authenticated using (public.is_manager());

create policy trade_in_photos_select on public.trade_in_photos for select to authenticated using (public.is_staff());
create policy trade_in_photos_delete on public.trade_in_photos for delete to authenticated using (public.is_manager());

create policy requests_select on public.customer_requests for select to authenticated using (public.is_staff());
create policy requests_update on public.customer_requests for update to authenticated using (public.is_staff()) with check (public.is_staff());
create policy requests_delete on public.customer_requests for delete to authenticated using (public.is_manager());

-- transactions -----------------------------------------------------------------
create policy purchases_select on public.purchases for select to authenticated using (public.is_staff());
create policy purchases_insert on public.purchases for insert to authenticated with check (public.is_staff());
create policy purchases_update on public.purchases for update to authenticated using (public.is_manager()) with check (public.is_manager());
create policy purchases_delete on public.purchases for delete to authenticated using (public.is_manager());

create policy sales_select on public.sales for select to authenticated using (public.is_staff());
create policy sales_insert on public.sales for insert to authenticated with check (public.is_staff());
create policy sales_update on public.sales for update to authenticated using (public.is_manager()) with check (public.is_manager());
create policy sales_delete on public.sales for delete to authenticated using (public.is_manager());

create policy transfers_select on public.transfers for select to authenticated using (public.is_staff());
create policy transfers_insert on public.transfers for insert to authenticated with check (public.is_staff());
create policy transfers_delete on public.transfers for delete to authenticated using (public.is_manager());

-- content ----------------------------------------------------------------------
create policy reviews_select on public.reviews for select to anon, authenticated using (is_published or public.is_staff());
create policy reviews_write on public.reviews for all to authenticated using (public.is_manager()) with check (public.is_manager());
create policy faqs_select on public.faqs for select to anon, authenticated using (is_published or public.is_staff());
create policy faqs_write on public.faqs for all to authenticated using (public.is_manager()) with check (public.is_manager());
create policy pages_select on public.pages for select to anon, authenticated using (true);
create policy pages_write on public.pages for all to authenticated using (public.is_manager()) with check (public.is_manager());

-- ---------------------------------------------------------------------------
-- Function permissions: public RPCs for visitors, everything else signed-in only
-- (each admin RPC also checks the caller's role internally).
-- ---------------------------------------------------------------------------
revoke execute on function public.record_sale(uuid, numeric, text, timestamptz, text, text, text) from public, anon;
revoke execute on function public.reverse_sale(uuid) from public, anon;
revoke execute on function public.transfer_product(uuid, uuid, text) from public, anon;
revoke execute on function public.bulk_adjust_sell_prices(jsonb, text, text, numeric, numeric, text) from public, anon;
revoke execute on function public.bulk_adjust_buy_prices(uuid[], integer[], text, numeric, numeric, text) from public, anon;
revoke execute on function public.set_main_currency(text) from public, anon;
revoke execute on function public.dashboard_stats(uuid, timestamptz, timestamptz) from public, anon;
revoke execute on function public.shop_stats(timestamptz, timestamptz) from public, anon;
revoke execute on function public.add_admin(text, public.admin_role, text) from public, anon;

grant execute on function public.record_sale(uuid, numeric, text, timestamptz, text, text, text) to authenticated;
grant execute on function public.reverse_sale(uuid) to authenticated;
grant execute on function public.transfer_product(uuid, uuid, text) to authenticated;
grant execute on function public.bulk_adjust_sell_prices(jsonb, text, text, numeric, numeric, text) to authenticated;
grant execute on function public.bulk_adjust_buy_prices(uuid[], integer[], text, numeric, numeric, text) to authenticated;
grant execute on function public.set_main_currency(text) to authenticated;
grant execute on function public.dashboard_stats(uuid, timestamptz, timestamptz) to authenticated;
grant execute on function public.shop_stats(timestamptz, timestamptz) to authenticated;
grant execute on function public.add_admin(text, public.admin_role, text) to authenticated;

grant execute on function public.estimate_trade_in(jsonb) to anon, authenticated;
grant execute on function public.submit_trade_in(jsonb) to anon, authenticated;
grant execute on function public.submit_customer_request(jsonb) to anon, authenticated;

-- Visitors never write tables directly; RPCs above are the only entry points.
revoke insert, update, delete on all tables in schema public from anon;

-- ---------------------------------------------------------------------------
-- Storage
--   product-photos: public bucket, only staff can write.
--   trade-in-photos: private bucket; visitors can only add files inside a new
--                    <enquiry uuid>/ folder; only staff can view them.
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('product-photos', 'product-photos', true, 10485760, array['image/jpeg', 'image/png', 'image/webp']),
  ('trade-in-photos', 'trade-in-photos', false, 10485760, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

create policy "izone staff read product photos" on storage.objects for select to authenticated
  using (bucket_id = 'product-photos' and public.is_staff());
create policy "izone staff upload product photos" on storage.objects for insert to authenticated
  with check (bucket_id = 'product-photos' and public.is_staff());
create policy "izone staff update product photos" on storage.objects for update to authenticated
  using (bucket_id = 'product-photos' and public.is_staff())
  with check (bucket_id = 'product-photos' and public.is_staff());
create policy "izone staff delete product photos" on storage.objects for delete to authenticated
  using (bucket_id = 'product-photos' and public.is_staff());

create policy "izone visitors upload trade-in photos" on storage.objects for insert to anon, authenticated
  with check (
    bucket_id = 'trade-in-photos'
    and array_length(storage.foldername(name), 1) = 1
    and (storage.foldername(name))[1] ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    and storage.filename(name) ~ '^[A-Za-z0-9_-]{1,80}\.(jpg|jpeg|png|webp)$'
  );
create policy "izone staff read trade-in photos" on storage.objects for select to authenticated
  using (bucket_id = 'trade-in-photos' and public.is_staff());
create policy "izone managers delete trade-in photos" on storage.objects for delete to authenticated
  using (bucket_id = 'trade-in-photos' and public.is_manager());
