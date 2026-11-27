-- PROPOSED — NOT APPLIED. Needs Daniel's approval before it is run (apply via Supabase migration).
-- Project: wknhfyeruhbynoddeiuo ("ShiftPay", eu-west-2). Checked 2026-11-27: all 8 public tables have RLS on,
-- 4 policies each, for the authenticated role only, all scoped to (select auth.uid()). 0 rows in every table.
--
-- Non-destructive: no table, column or row is dropped or changed. It removes access nobody should have
-- and adds two indexes.

begin;

-- 1. Defence in depth: signed-out visitors (anon) have no policies, so RLS already returns nothing to them.
--    Removing their table grants means a future mistake in a policy can't expose data to signed-out visitors.
revoke all on all tables in schema public from anon;
revoke all on all sequences in schema public from anon;
alter default privileges for role postgres in schema public revoke all on tables from anon;
alter default privileges for role postgres in schema public revoke all on sequences from anon;

-- 2. Performance advisor 0001 (unindexed foreign keys): cover the two composite foreign keys.
create index if not exists active_clock_user_job_idx on public.active_clock (user_id, job_id);
create index if not exists invoices_user_job_idx on public.invoices (user_id, job_id);

commit;

-- Kept on purpose (security advisor 0029): public.delete_my_account() is SECURITY DEFINER and executable by
-- authenticated users. That is intended: a signed-in person must be able to delete their own account, which
-- needs rights on auth.users. Checked: it runs with search_path = '', refuses when signed out, and deletes only
-- the caller's own auth.users row (where id = auth.uid()).
--
-- Rollback (if ever needed):
--   grant select, insert, update, delete on all tables in schema public to anon;
--   drop index if exists public.active_clock_user_job_idx;
--   drop index if exists public.invoices_user_job_idx;
