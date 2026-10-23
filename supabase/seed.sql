-- Seed 2 akun internal Domma (identik dengan mode lokal).
--   admin@withdomma.com   / admindomma!    → role admin
--   finance@withdomma.com / financedomma!  → role finance
-- Alternatif yang lebih aman: `npm run seed:supabase` (pakai Admin API).

do $$
declare
  r record;
  v_id uuid;
begin
  for r in
    select * from (values
      ('admin@withdomma.com', 'admindomma!', 'admin', 'Admin Domma'),
      ('finance@withdomma.com', 'financedomma!', 'finance', 'Finance Domma')
    ) as t (email, pw, role, full_name)
  loop
    select id into v_id from auth.users where email = r.email;

    if v_id is null then
      v_id := gen_random_uuid();
      insert into auth.users (
        instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
        raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
        confirmation_token, email_change, email_change_token_new, recovery_token
      ) values (
        '00000000-0000-0000-0000-000000000000', v_id, 'authenticated', 'authenticated', r.email,
        extensions.crypt(r.pw, extensions.gen_salt('bf')), now(),
        '{"provider":"email","providers":["email"]}', jsonb_build_object('full_name', r.full_name), now(), now(),
        '', '', '', ''
      );
      insert into auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
      values (
        gen_random_uuid(), v_id, v_id::text,
        jsonb_build_object('sub', v_id::text, 'email', r.email, 'email_verified', true),
        'email', now(), now(), now()
      );
    else
      update auth.users set encrypted_password = extensions.crypt(r.pw, extensions.gen_salt('bf')) where id = v_id;
    end if;

    insert into public.profiles (id, email, full_name, role)
    values (v_id, r.email, r.full_name, r.role::public.app_role)
    on conflict (id) do update set email = excluded.email, role = excluded.role, full_name = excluded.full_name;
  end loop;
end $$;
