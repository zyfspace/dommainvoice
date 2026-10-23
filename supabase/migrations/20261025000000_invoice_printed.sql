-- Jejak cetak invoice: siapa yang pertama mencetak invoice yang sudah di-approve.
-- Mencegah invoice yang sama dicetak dobel oleh admin lain. Jalankan di SQL Editor Supabase.

alter table public.invoices
  add column printed_at timestamptz,
  add column printed_by uuid references public.profiles (id) on delete set null,
  add column printed_by_name text;
