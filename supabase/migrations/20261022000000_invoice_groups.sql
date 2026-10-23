-- Invoice DP: dibuat berpasangan (DP + Pelunasan) dalam satu grup, nomor berurutan.
-- Jalankan di SQL Editor Supabase.

alter table public.invoices
  add column group_id uuid,
  -- 1 = DP, 2 = Pelunasan (null = invoice tunggal)
  add column installment smallint check (installment in (1, 2));
create index on public.invoices (group_id);

-- Ambil n nomor berurutan sekaligus (atomik) → nomor DP & Pelunasan pasti bersebelahan.
create or replace function public.next_sequence_block(p_key text, p_n int)
returns int
language sql
security definer
set search_path = public
as $$
  insert into public.sequences (key, value) values (p_key, p_n)
  on conflict (key) do update set value = public.sequences.value + p_n
  returning value;
$$;
revoke all on function public.next_sequence_block(text, int) from public, anon, authenticated;
grant execute on function public.next_sequence_block(text, int) to service_role;
