-- ============================================================================
-- 0018_admin_profile_access.sql
-- Ensures admins have the necessary read access to profiles and employees
-- to manage device registrations.
-- ============================================================================

-- 1. Grant Admins read access to profiles
-- This is necessary because the device management view joins employee_devices -> employees -> profiles
create policy "Admins can view all profiles"
  on public.profiles for select
  using ( (select role from public.profiles where id = auth.uid()) = 'ADMIN' );

-- 2. Grant Admins read access to employees
create policy "Admins can view all employees"
  on public.employees for select
  using ( (select role from public.profiles where id = auth.uid()) = 'ADMIN' );

-- 3. Ensure the employee_devices policy is robust
-- We already have a policy, but let's ensure it's comprehensive
drop policy if exists "Admins can manage all devices" on public.employee_devices;
create policy "Admins can manage all devices"
  on public.employee_devices for all
  using ( (select role from public.profiles where id = auth.uid()) = 'ADMIN' );
