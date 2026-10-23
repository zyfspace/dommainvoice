-- Pengaturan bersama (mis. default remarks invoice). Hanya service role yang menulis.
create table public.app_settings (
  key text primary key,
  value text not null,
  updated_at timestamptz not null default now()
);

alter table public.app_settings enable row level security;
create policy "staff read settings" on public.app_settings for select to authenticated using (public.is_staff());
