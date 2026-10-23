-- Diskon % per baris item. Harga satuan tetap harga pricelist/asli; line_total = qty × harga × (1 − diskon%).
-- Jalankan di SQL Editor Supabase.

alter table public.invoice_items
  add column discount_percent numeric(5, 2) not null default 0
  check (discount_percent >= 0 and discount_percent < 100);
