-- ════════════════════════════════════════════════════════════════════════════
-- 002 — LOCK DOWN (run ONLY after the new code is deployed and you can sign in on it)
-- After this, the browser can only read/update its OWN row, cannot read password
-- hashes, and cannot change Pro/billing fields. The server (service_role) is unaffected.
-- ════════════════════════════════════════════════════════════════════════════
begin;

alter table public.users enable row level security;

-- Remove EVERY existing policy on users (e.g. the "Allow all for now" / "Allow all with anon key"
-- policies found in this project). Permissive policies are OR-ed, so any leftover allow-all would
-- defeat the rules below.
do $$ declare p record; begin
  for p in select policyname from pg_policies where schemaname = 'public' and tablename = 'users' loop
    execute format('drop policy %I on public.users', p.policyname);
  end loop;
end $$;

-- Unused legacy tables (score_history, mistakes, srs_data, lex_data) had allow-all policies.
-- The app does not use them; close them to browsers entirely (the server can still reach them).
do $$ declare t text; p record; begin
  foreach t in array array['score_history','mistakes','srs_data','lex_data'] loop
    if to_regclass('public.' || t) is not null then
      for p in select policyname from pg_policies where schemaname = 'public' and tablename = t loop
        execute format('drop policy %I on public.%I', p.policyname, t);
      end loop;
      execute format('alter table public.%I enable row level security', t);
      execute format('revoke all on table public.%I from anon, authenticated', t);
    end if;
  end loop;
end $$;

-- Start from zero for browser roles.
revoke all on table public.users from anon;
revoke all on table public.users from authenticated;

-- Column-level grants: only columns that exist are granted (robust to schema differences).
do $$
declare
  readable text[] := array['id','auth_id','email','name','avatar_color','avatar_emoji','diagnostic_done','diagnostic','history','notes','study_plan','learn_progress','earned_badges','stats','onboarding_done','is_pro','subscription_status','created_at'];
  insertable text[] := array['auth_id','email','name','avatar_color','avatar_emoji','diagnostic_done','diagnostic','history','notes','study_plan','learn_progress','earned_badges','stats','onboarding_done'];
  updatable text[] := array['name','avatar_color','avatar_emoji','diagnostic_done','diagnostic','history','notes','study_plan','learn_progress','earned_badges','stats','onboarding_done'];
  cols text;
begin
  select string_agg(quote_ident(c), ',') into cols from unnest(readable) c
    where exists (select 1 from information_schema.columns where table_schema='public' and table_name='users' and column_name=c);
  execute format('grant select (%s) on public.users to authenticated', cols);
  select string_agg(quote_ident(c), ',') into cols from unnest(insertable) c
    where exists (select 1 from information_schema.columns where table_schema='public' and table_name='users' and column_name=c);
  execute format('grant insert (%s) on public.users to authenticated', cols);
  select string_agg(quote_ident(c), ',') into cols from unnest(updatable) c
    where exists (select 1 from information_schema.columns where table_schema='public' and table_name='users' and column_name=c);
  execute format('grant update (%s) on public.users to authenticated', cols);
end $$;

-- Row-level policies: a signed-in user sees and edits only the row linked to their login.
drop policy if exists users_select_own on public.users;
drop policy if exists users_insert_own on public.users;
drop policy if exists users_update_own on public.users;
create policy users_select_own on public.users for select to authenticated
  using (auth_id = (select auth.uid()));
create policy users_insert_own on public.users for insert to authenticated
  with check (auth_id = (select auth.uid()) and lower(email) = lower((select auth.jwt()) ->> 'email'));
create policy users_update_own on public.users for update to authenticated
  using (auth_id = (select auth.uid()))
  with check (auth_id = (select auth.uid()));
-- No delete policy on purpose: account deletion goes through /api/delete-account (server).

commit;
