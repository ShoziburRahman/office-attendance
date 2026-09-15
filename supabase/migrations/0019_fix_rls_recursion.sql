-- ============================================================================
-- 0019_fix_rls_recursion.sql
-- Fixes infinite recursion in RLS policies by using a SECURITY DEFINER function
-- for admin checks.
-- ============================================================================

-- 1. Create a SECURITY DEFINER function to check admin status.
-- SECURITY DEFINER allows this function to bypass RLS, breaking the recursive loop.
create or replace function public.is_admin()
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  return exists (
    select 1
    from public.profiles
    where id = auth.uid()
    and role = 'ADMIN'
  );
end;
$$;

-- 2. Fix profiles policy
drop policy if exists "Admins can view all profiles" on public.profiles;
create policy "Admins can view all profiles"
  on public.profiles for select
  using ( public.is_admin() );

-- 3. Fix employees policy
drop policy if exists "Admins can view all employees" on public.employees;
create policy "Admins can view all employees"
  on public.employees for select
  using ( public.is_admin() );

-- 4. Fix employee_devices policy
drop policy if exists "Admins can manage all devices" on public.employee_devices;
create policy "Admins can manage all devices"
  on public.employee_devices for all
  using ( public.is_admin() );
