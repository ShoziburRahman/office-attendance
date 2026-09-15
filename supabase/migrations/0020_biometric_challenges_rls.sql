-- ============================================================================
-- 0020_biometric_challenges_rls.sql
-- Adds RLS policies for the biometric_challenges table to allow employees
-- to generate and verify their own challenges.
-- ============================================================================

-- 1. Enable RLS on the table (should already be enabled, but for safety)
alter table public.biometric_challenges enable row level security;

-- 2. Allow employees to insert their own challenges
create policy "Employees can insert their own challenges"
  on public.biometric_challenges for insert
  with check ( employee_id = auth.uid() );

-- 3. Allow employees to read their own challenges
create policy "Employees can read their own challenges"
  on public.biometric_challenges for select
  using ( employee_id = auth.uid() );

-- 4. Allow admins to manage all challenges (for auditing/debugging)
create policy "Admins can manage all challenges"
  on public.biometric_challenges for all
  using ( (select role from public.profiles where id = auth.uid()) = 'ADMIN' );
