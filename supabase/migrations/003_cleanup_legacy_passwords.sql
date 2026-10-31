-- ════════════════════════════════════════════════════════════════════════════
-- 003 — CLEANUP (run after the migration window, e.g. 60–90 days)
-- Removes the old homemade password hashes entirely. Anyone who never signed in
-- during the window can still get in with "Forgot password?" (their email is kept).
-- ════════════════════════════════════════════════════════════════════════════
begin;
alter table public.users drop column if exists password_hash;
commit;
