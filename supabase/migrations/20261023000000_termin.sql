-- Payment type Termin (N tahap) + syarat cetak Surat Jalan per grup.
-- Jalankan di SQL Editor Supabase.

alter type public.payment_type add value if not exists 'termin';

-- installment kini 1..N (DP = 2 tahap, Termin = N tahap).
alter table public.invoices drop constraint if exists invoices_installment_check;
alter table public.invoices add constraint invoices_installment_check check (installment >= 1);

-- Tahap yang menjadi syarat kirim: Surat Jalan bisa dicetak setelah tahap ini & sebelumnya Paid.
-- Grup lama tanpa tanda memakai tahap terakhir.
alter table public.invoices add column delivery_gate boolean not null default false;
