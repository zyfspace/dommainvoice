-- Kurir & kota tujuan untuk baris biaya pengiriman (sesuai kolom sheet pencatatan).
-- Jalankan di SQL Editor Supabase.

alter table public.invoice_items
  add column ship_courier text,
  add column ship_city text;
