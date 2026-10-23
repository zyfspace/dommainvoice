-- Pembayaran invoice + bukti transfer (syarat status Paid & cetak Surat Jalan).
-- Jalankan di SQL Editor Supabase.

alter type public.invoice_status add value if not exists 'paid' after 'issued';

-- Satu invoice bisa punya beberapa pembayaran (DP / termin / pelunasan).
create table public.invoice_payments (
  id uuid primary key default gen_random_uuid(),
  invoice_id uuid not null references public.invoices (id) on delete cascade,
  amount numeric(16, 2) not null check (amount > 0),
  proof_path text not null,
  file_name text not null,
  content_type text not null,
  notes text,
  created_by uuid references public.profiles (id) on delete set null,
  created_by_email text,
  created_at timestamptz not null default now()
);
create index on public.invoice_payments (invoice_id);

alter table public.invoice_payments enable row level security;
create policy "staff read payments" on public.invoice_payments for select to authenticated using (public.is_staff());

-- Bucket privat bukti transfer. Tanpa policy storage → hanya service role (server) yang baca/tulis.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('payment-proofs', 'payment-proofs', false, 5242880, array['image/jpeg', 'image/png', 'image/webp', 'application/pdf'])
on conflict (id) do nothing;
