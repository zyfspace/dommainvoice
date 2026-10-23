-- Domma Invoice Management — skema awal
-- Jalankan di SQL Editor project Supabase baru, lalu jalankan supabase/seed.sql.

create extension if not exists pgcrypto with schema extensions;

-- ── Enum ───────────────────────────────────────────────────
create type public.app_role as enum ('admin', 'finance');
create type public.invoice_status as enum
  ('draft', 'on_check', 'revision_requested', 'rejected', 'approved', 'issued', 'cancelled');
create type public.customization_type as enum ('engrave', 'uv_print', 'plain');
create type public.payment_type as enum ('cbd', 'dp', 'top');
-- dts = PT Domma Teman Setia, tmb = PT Teman Melangkah Bersama
create type public.invoice_entity as enum ('dts', 'tmb');

-- ── Profiles (1:1 dengan auth.users) ──────────────────────
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null unique,
  full_name text,
  role public.app_role not null,
  telegram_user_id text unique,
  created_at timestamptz not null default now()
);

-- ── Customer & PIC ────────────────────────────────────────
create table public.customers (
  id uuid primary key default gen_random_uuid(),
  company_name text not null,
  billing_address text,
  npwp text,
  phone text,
  email text,
  notes text,
  created_by uuid references public.profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.customer_pics (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.customers (id) on delete cascade,
  name text not null,
  email text,
  phone text,
  position text,
  created_at timestamptz not null default now()
);
create index on public.customer_pics (customer_id);

-- ── Invoice ───────────────────────────────────────────────
create table public.invoices (
  id uuid primary key default gen_random_uuid(),
  invoice_number text unique,
  entity public.invoice_entity not null default 'dts',
  payment_type public.payment_type not null,
  status public.invoice_status not null default 'draft',
  customer_id uuid references public.customers (id) on delete set null,
  pic_id uuid references public.customer_pics (id) on delete set null,
  -- snapshot data customer saat invoice dibuat
  company_name text not null,
  pic_name text,
  email text,
  phone text,
  billing_address text,
  npwp text,
  invoice_date date not null,
  due_date date not null,
  notes text, -- remarks
  term_of_payment text,
  payment_info text,
  payable_label text,
  payable_percent numeric(5, 2) check (payable_percent is null or (payable_percent > 0 and payable_percent <= 100)),
  tax_rate numeric(5, 2) not null default 0,
  subtotal numeric(16, 2) not null default 0,
  tax_amount numeric(16, 2) not null default 0,
  total numeric(16, 2) not null default 0,
  revision_notes text,
  pdf_url text,
  email_sent_at timestamptz,
  sheets_synced_at timestamptz,
  created_by uuid references public.profiles (id),
  created_by_email text,
  approved_by uuid references public.profiles (id),
  approved_at timestamptz,
  issued_at timestamptz,
  cancelled_at timestamptz,
  cancel_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint due_after_invoice check (due_date >= invoice_date)
);
create index on public.invoices (status);
create index on public.invoices (created_at desc);

create table public.invoice_items (
  id uuid primary key default gen_random_uuid(),
  invoice_id uuid not null references public.invoices (id) on delete cascade,
  position int not null,
  sku text,
  product text not null,
  quantity numeric(12, 2) not null check (quantity > 0),
  uom text not null default 'Pcs',
  unit_price numeric(16, 2) not null check (unit_price >= 0),
  customization public.customization_type not null default 'plain',
  notes text,
  line_total numeric(16, 2) not null
);
create index on public.invoice_items (invoice_id);

-- Audit log: siapa membuat, mengubah, menyetujui, membatalkan.
create table public.invoice_events (
  id uuid primary key default gen_random_uuid(),
  invoice_id uuid not null references public.invoices (id) on delete cascade,
  actor_id uuid references public.profiles (id),
  actor_email text,
  action text not null,
  from_status public.invoice_status,
  to_status public.invoice_status,
  notes text,
  created_at timestamptz not null default now()
);
create index on public.invoice_events (invoice_id);

-- ── Penomoran (atomik, aman untuk request bersamaan) ──────
create table public.sequences (
  key text primary key,
  value int not null default 0
);
-- Satu counter → MM/YYYY-INV/DOM/NNN.
-- Ubah value ke nomor terakhir client sebelum go-live (nomor berikutnya = value + 1).
insert into public.sequences (key, value) values
  ('invoice:DOM', 0);

create or replace function public.next_sequence(p_key text)
returns int
language sql
security definer
set search_path = public
as $$
  insert into public.sequences (key, value) values (p_key, 1)
  on conflict (key) do update set value = public.sequences.value + 1
  returning value;
$$;
revoke all on function public.next_sequence(text) from public, anon, authenticated;
grant execute on function public.next_sequence(text) to service_role;

-- ── Webhook outbox (dashboard → n8n) & inbound (n8n → dashboard) ─
create table public.webhook_events (
  id text primary key, -- event_id unik, dikirim ke n8n untuk deduplikasi
  event_type text not null,
  invoice_id uuid not null references public.invoices (id) on delete cascade,
  payload jsonb not null,
  status text not null default 'pending' check (status in ('pending', 'sent', 'failed', 'skipped')),
  attempts int not null default 0,
  last_error text,
  created_at timestamptz not null default now(),
  sent_at timestamptz
);
create index on public.webhook_events (invoice_id);

create table public.inbound_events (
  event_id text primary key,
  event_type text not null,
  received_at timestamptz not null default now()
);

-- ── Row Level Security ────────────────────────────────────
-- Penulisan hanya lewat backend (service role) setelah validasi role.
-- User login (admin/finance) hanya diizinkan membaca.
create or replace function public.is_staff()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.profiles where id = auth.uid());
$$;

alter table public.profiles enable row level security;
alter table public.customers enable row level security;
alter table public.customer_pics enable row level security;
alter table public.invoices enable row level security;
alter table public.invoice_items enable row level security;
alter table public.invoice_events enable row level security;
alter table public.sequences enable row level security;
alter table public.webhook_events enable row level security;
alter table public.inbound_events enable row level security;

create policy "staff read profiles" on public.profiles for select to authenticated using (public.is_staff());
create policy "staff read customers" on public.customers for select to authenticated using (public.is_staff());
create policy "staff read pics" on public.customer_pics for select to authenticated using (public.is_staff());
create policy "staff read invoices" on public.invoices for select to authenticated using (public.is_staff());
create policy "staff read items" on public.invoice_items for select to authenticated using (public.is_staff());
create policy "staff read events" on public.invoice_events for select to authenticated using (public.is_staff());
-- sequences, webhook_events, inbound_events: tanpa policy → hanya service role.
