-- Bersihkan skema lama (versi awal: invoice_counters, payment_types, products, dst.)
-- sebelum menjalankan migrasi. HANYA aman bila tabel lama kosong / datanya tidak dipakai.
-- Akun login (auth.users) tidak disentuh; role tiap akun disimpan dulu lalu dipulihkan
-- oleh restore_profiles.sql.
--
-- Urutan: reset_old_schema.sql → 20261015000000_init.sql → 20261015120000_app_settings.sql
--         → restore_profiles.sql

create table if not exists public._profiles_backup as
  select id, full_name, role::text as role, telegram_user_id::text as telegram_user_id
  from public.profiles;

drop table if exists
  public.webhook_events,
  public.inbound_events,
  public.invoice_events,
  public.invoice_items,
  public.invoices,
  public.customer_pics,
  public.customers,
  public.products,
  public.payment_types,
  public.invoice_counters,
  public.sequences,
  public.app_settings,
  public.profiles
cascade;

-- Enum lama (nama & nilainya bisa beda dari skema baru).
do $$
declare t record;
begin
  for t in
    select typname from pg_type
    where typnamespace = 'public'::regnamespace and typtype = 'e'
  loop
    execute format('drop type if exists public.%I cascade', t.typname);
  end loop;
end $$;
