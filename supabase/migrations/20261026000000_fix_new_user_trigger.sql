-- Trigger sisa skema lama masih cast ke type `user_role` yang sudah tidak ada,
-- dan tidak mengisi profiles.email (not null). Ganti ke app_role + email.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.raw_app_meta_data->>'role' in ('admin', 'finance') then
    insert into public.profiles (id, email, full_name, role)
    values (
      new.id,
      new.email,
      coalesce(new.raw_user_meta_data->>'full_name', ''),
      (new.raw_app_meta_data->>'role')::public.app_role
    )
    on conflict (id) do nothing;
  end if;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
