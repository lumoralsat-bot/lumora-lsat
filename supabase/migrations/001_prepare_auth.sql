-- ════════════════════════════════════════════════════════════════════════════
-- 001 — PREPARE (safe to run while the current site is live; additive only)
-- Run in Supabase → SQL Editor. Re-running is harmless.
-- ════════════════════════════════════════════════════════════════════════════
begin;

-- Link each profile row to a Supabase Auth account.
alter table public.users add column if not exists auth_id uuid;
alter table public.users add column if not exists migrated_at timestamptz;
alter table public.users add column if not exists created_at timestamptz default now();

do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'users_auth_id_fkey') then
    alter table public.users add constraint users_auth_id_fkey
      foreign key (auth_id) references auth.users(id) on delete cascade;  -- deleting the login deletes the profile
  end if;
end $$;
create unique index if not exists users_auth_id_key on public.users (auth_id);

-- One profile per email (case-insensitive). If this fails, run the duplicate check in SECURITY_MIGRATION.md first.
create unique index if not exists users_email_lower_key on public.users (lower(email));

-- Server-only helper: find an Auth user id by email (used by /api/auth-migrate).
create or replace function public.lumora_auth_user_by_email(p_email text)
returns table (id uuid, email_confirmed_at timestamptz)
language sql
security definer
set search_path = ''
as $$
  select u.id, u.email_confirmed_at from auth.users u where lower(u.email) = lower(p_email) limit 1;
$$;
revoke all on function public.lumora_auth_user_by_email(text) from public;
revoke all on function public.lumora_auth_user_by_email(text) from anon, authenticated;
grant execute on function public.lumora_auth_user_by_email(text) to service_role;

commit;
