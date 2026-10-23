-- Pulihkan profil akun lama setelah migrasi (lihat reset_old_schema.sql).
-- Email diambil dari auth.users; role lama di-map ke admin/finance.

insert into public.profiles (id, email, full_name, role, telegram_user_id)
select
  b.id,
  u.email,
  b.full_name,
  (case when lower(b.role) like '%fin%' then 'finance' else 'admin' end)::public.app_role,
  b.telegram_user_id
from public._profiles_backup b
join auth.users u on u.id = b.id
on conflict (id) do update
  set email = excluded.email, full_name = excluded.full_name, role = excluded.role,
      telegram_user_id = excluded.telegram_user_id;

drop table public._profiles_backup;

select email, full_name, role from public.profiles;
