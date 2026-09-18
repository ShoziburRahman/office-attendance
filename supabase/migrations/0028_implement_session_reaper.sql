-- ============================================================================
-- 0028_implement_session_reaper.sql
-- Implements an eager background session closure using pg_cron.
-- ============================================================================

-- 1. Enable the pg_cron extension
-- Note: In some Supabase environments, this extension must be enabled via the
-- Dashboard -> Database -> Extensions.
create extension if not exists pg_cron;

-- 2. Create the "Reaper" function
-- This function finds any session that has exceeded the max_session_minutes
-- and force-closes it as MISSING_CHECK_OUT.
create or replace function fn_reap_expired_sessions()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_max_mins int;
begin
  -- Get the current max session limit from settings
  select max_session_minutes into v_max_mins from office_settings limit 1;

  if v_max_mins is null then
    return;
  end if;

  -- Force-close all expired sessions
  update attendance
  set attendance_state = 'MISSING_CHECK_OUT',
      check_out_at = check_in_at + make_interval(mins => v_max_mins),
      notes = coalesce(notes, '') || ' [System closed due to max duration]'
  where attendance_state = 'CHECKED_IN'
    and check_out_at is null
    and now() > check_in_at + make_interval(mins => v_max_mins);
end;
$$;

-- 3. Schedule the heart-beat
-- Runs every minute to ensure sessions are closed promptly.
do $$
begin
  -- Only unschedule if the job actually exists to avoid XX000 error
  if exists (select 1 from cron.job where jobname = 'reap-expired-sessions') then
    perform cron.unschedule('reap-expired-sessions');
  end if;
end $$;

select cron.schedule('reap-expired-sessions', '* * * * *', 'select fn_reap_expired_sessions()');
