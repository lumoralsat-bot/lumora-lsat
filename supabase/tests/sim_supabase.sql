-- Minimal local simulation of Supabase's auth schema + roles, and the CURRENT (legacy) users table.
-- Used only to test the migrations in a throwaway Postgres. Never run this on your real project.
do $$ begin create role anon nologin; exception when duplicate_object then null; end $$;
do $$ begin create role authenticated nologin; exception when duplicate_object then null; end $$;
do $$ begin create role service_role nologin bypassrls; exception when duplicate_object then null; end $$;
create schema auth;
create table auth.users (id uuid primary key default gen_random_uuid(), email text unique, email_confirmed_at timestamptz);
create function auth.jwt() returns jsonb language sql stable as $$ select coalesce(nullif(current_setting('request.jwt.claims', true), ''), '{}')::jsonb $$;
create function auth.uid() returns uuid language sql stable as $$ select nullif(auth.jwt() ->> 'sub', '')::uuid $$;
grant usage on schema auth to anon, authenticated, service_role;
grant execute on all functions in schema auth to anon, authenticated, service_role;

create table public.users (
  id bigserial primary key, email text unique, name text, password_hash text,
  avatar_color int, avatar_emoji text, diagnostic_done boolean, diagnostic jsonb, history jsonb, notes jsonb,
  study_plan jsonb, learn_progress jsonb, earned_badges jsonb, stats jsonb, onboarding_done boolean,
  is_pro boolean default false, stripe_customer_id text, stripe_subscription_id text, subscription_status text
);
-- Supabase default: browser roles get full table privileges in public (this is the current exposure).
grant usage on schema public to anon, authenticated, service_role;
grant all on public.users to anon, authenticated, service_role;
grant usage, select on all sequences in schema public to anon, authenticated, service_role;

-- Mirror of the live project's current (insecure) state, found during the dashboard session:
alter table public.users enable row level security;
create policy "Allow all for now" on public.users for all to public using (true) with check (true);
create policy "Allow all with anon key" on public.users for all to public using (true) with check (true);
create table public.mistakes (id bigserial primary key, user_id text, stimulus text);
alter table public.mistakes enable row level security;
create policy "Allow all for now" on public.mistakes for all to public using (true) with check (true);
grant all on public.mistakes to anon, authenticated, service_role;
