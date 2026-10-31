-- Assertions run after 001 + 002. Any failure raises an exception (psql exits non-zero).
\set ON_ERROR_STOP on
insert into auth.users (id, email, email_confirmed_at) values
  ('11111111-1111-1111-1111-111111111111', 'alice@example.com', now()),
  ('22222222-2222-2222-2222-222222222222', 'bob@example.com', now());
insert into public.users (email, name, password_hash, auth_id, is_pro, stats) values
  ('alice@example.com', 'Alice', 'deadbeef', '11111111-1111-1111-1111-111111111111', false, '{"xp":1}'),
  ('bob@example.com',   'Bob',   'cafebabe', '22222222-2222-2222-2222-222222222222', true,  '{"xp":2}'),
  ('legacy@example.com','Leg',   'abc123',   null, false, '{}');

create or replace function pg_temp.expect_error(sql text, label text) returns void language plpgsql as $$
begin
  begin execute sql; exception when others then raise notice 'PASS (blocked) %: %', label, sqlerrm; return; end;
  raise exception 'FAIL % — statement was allowed: %', label, sql;
end $$;
create or replace function pg_temp.expect(cond boolean, label text) returns void language plpgsql as $$
begin if not cond then raise exception 'FAIL %', label; end if; raise notice 'PASS %', label; end $$;

-- ── anon (public key, not signed in) ──
set role anon;
select pg_temp.expect_error('select email from public.users', 'anon cannot read users');
select pg_temp.expect_error($q$update public.users set is_pro = true$q$, 'anon cannot update');
select pg_temp.expect_error($q$insert into public.users (email) values ('x@y.z')$q$, 'anon cannot insert');
select pg_temp.expect_error($q$select public.lumora_auth_user_by_email('alice@example.com')$q$, 'anon cannot call auth lookup');
reset role;

-- ── authenticated as Alice ──
set role authenticated;
select set_config('request.jwt.claims', '{"sub":"11111111-1111-1111-1111-111111111111","email":"alice@example.com","role":"authenticated"}', false);
select pg_temp.expect((select count(*) from public.users) = 1, 'alice sees exactly one row');
select pg_temp.expect((select email from public.users) = 'alice@example.com', 'that row is hers');
select pg_temp.expect_error('select password_hash from public.users', 'alice cannot read password_hash column');
select pg_temp.expect_error('select stripe_customer_id from public.users', 'alice cannot read stripe ids');
select pg_temp.expect_error($q$update public.users set is_pro = true$q$, 'alice cannot grant herself Pro');
select pg_temp.expect_error($q$update public.users set subscription_status = 'active'$q$, 'alice cannot change billing status');
select pg_temp.expect_error($q$update public.users set email = 'bob@example.com'$q$, 'alice cannot change email column');
select pg_temp.expect_error($q$update public.users set auth_id = '22222222-2222-2222-2222-222222222222'$q$, 'alice cannot re-link auth_id');
update public.users set stats = '{"xp":99}' where email = 'bob@example.com';
update public.users set name = 'Hacked' where auth_id = '22222222-2222-2222-2222-222222222222';
update public.users set stats = '{"xp":4}' where auth_id = '11111111-1111-1111-1111-111111111111';
update public.users set stats = '{"xp":5}';
select pg_temp.expect_error($q$delete from public.users$q$, 'alice cannot delete rows');
select pg_temp.expect_error($q$insert into public.users (auth_id, email, name) values ('22222222-2222-2222-2222-222222222222','bob@example.com','x')$q$, 'alice cannot insert a row for bob');
select pg_temp.expect_error($q$insert into public.users (auth_id, email, name, is_pro) values ('11111111-1111-1111-1111-111111111111','alice2@example.com','x', true)$q$, 'alice cannot insert with is_pro');
select pg_temp.expect_error($q$select public.lumora_auth_user_by_email('bob@example.com')$q$, 'authenticated cannot call auth lookup');
reset role;
select pg_temp.expect((select stats->>'xp' from public.users where email='bob@example.com') = '2', 'bob row unchanged by alice');
select pg_temp.expect((select name from public.users where email='bob@example.com') = 'Bob', 'bob name unchanged');
select pg_temp.expect((select stats->>'xp' from public.users where email='alice@example.com') = '5', 'alice can update her own progress');
select pg_temp.expect((select count(*) from public.users where email='legacy@example.com') = 1, 'legacy row untouched');

-- ── new user Carol: may create only her own row ──
insert into auth.users (id, email, email_confirmed_at) values ('33333333-3333-3333-3333-333333333333','carol@example.com', now());
set role authenticated;
select set_config('request.jwt.claims', '{"sub":"33333333-3333-3333-3333-333333333333","email":"carol@example.com"}', false);
select pg_temp.expect((select count(*) from public.users) = 0, 'carol sees nothing before creating a profile');
select pg_temp.expect_error($q$insert into public.users (auth_id, email, name) values ('33333333-3333-3333-3333-333333333333','legacy@example.com','x')$q$, 'carol cannot claim another email');
insert into public.users (auth_id, email, name, stats) values ('33333333-3333-3333-3333-333333333333','carol@example.com','Carol','{}');
select pg_temp.expect((select count(*) from public.users) = 1, 'carol created her own row');
reset role;

-- ── service_role (server) still works ──
set role service_role;
select pg_temp.expect((select count(*) from public.users) = 4, 'server sees all rows');
update public.users set is_pro = true where email = 'alice@example.com';
select pg_temp.expect((select id from public.lumora_auth_user_by_email('ALICE@example.com')) = '11111111-1111-1111-1111-111111111111', 'server lookup (case-insensitive)');
reset role;

-- ── deleting the login deletes the profile (cascade) ──
delete from auth.users where id = '33333333-3333-3333-3333-333333333333';
select pg_temp.expect((select count(*) from public.users where email='carol@example.com') = 0, 'profile removed with auth user');
select pg_temp.expect((select count(*) from pg_policies where schemaname='public' and tablename='users' and qual = 'true') = 0, 'old allow-all policies on users removed');
set role anon;
select pg_temp.expect_error($q$select * from public.mistakes$q$, 'anon cannot read legacy mistakes table');
reset role;
set role authenticated;
select set_config('request.jwt.claims', '{"sub":"11111111-1111-1111-1111-111111111111","email":"alice@example.com"}', false);
select pg_temp.expect_error($q$insert into public.mistakes (user_id) values ('x')$q$, 'authenticated cannot write legacy mistakes table');
reset role;
\echo ALL_RLS_TESTS_PASSED
