-- ============================================================================
-- 0025_fix_weekly_off_system.sql
-- Implements strict timeline-based weekly-off configuration with exclusive bounds.
-- ============================================================================

-- 1. Fix the Overlap Constraint to allow multiple different days of the week
-- Now it only prevents overlaps for the SAME day of the week for a single employee.
alter table weekly_off_schedules drop constraint if exists excl_weekly_off_overlap;

alter table weekly_off_schedules add constraint excl_weekly_off_overlap exclude using gist (
  employee_id with =,
  day_of_week with =,
  daterange(effective_from, coalesce(effective_until, 'infinity'::date), '[)') with &&
);

-- 2. Implement the reconciliation RPC
create or replace function upsert_weekly_off(
  p_employee_id uuid,
  p_day_of_week smallint,
  p_effective_from date,
  p_created_by uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Authorization check (using existing fn_is_admin)
  if not fn_is_admin(p_created_by) then
    raise exception 'Unauthorized: Only admins may update weekly off schedules';
  end if;

  -- A. Close the rule that was active at the start date
  -- Range: effective_from < p_effective_from AND (effective_until is null OR effective_until > p_effective_from)
  update weekly_off_schedules
  set effective_until = p_effective_from
  where employee_id = p_employee_id
    and day_of_week = p_day_of_week
    and effective_from < p_effective_from
    and (effective_until is null or effective_until > p_effective_from);

  -- B. Remove all rules that start at or after the start date
  -- Since the new rule is open-ended, it supersedes all future configurations for this specific day
  delete from weekly_off_schedules
  where employee_id = p_employee_id
    and day_of_week = p_day_of_week
    and effective_from >= p_effective_from;

  -- C. Insert the new rule
  insert into weekly_off_schedules (employee_id, day_of_week, effective_from, created_by)
  values (p_employee_id, p_day_of_week, p_effective_from, p_created_by);
end;
$$;

-- 3. Update fn_is_weekly_off to use exclusive bounds [)
create or replace function fn_is_weekly_off(p_employee_id uuid, p_date date)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_is_off boolean;
begin
  select exists (
    select 1 from weekly_off_schedules
    where employee_id = p_employee_id
      and p_date >= effective_from
      and (effective_until is null or p_date < effective_until)
      and day_of_week = extract(dow from p_date)
  ) into v_is_off;

  return v_is_off;
end;
$$;
