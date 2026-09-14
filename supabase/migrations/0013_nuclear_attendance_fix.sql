-- ============================================================================
-- 0013_nuclear_attendance_fix.sql
-- The "Nuclear" fix: removing all ambiguity and adding heavy debugging.
-- ============================================================================

create or replace function fn_check_in(
  p_attendance_type   attendance_type,
  p_wifi_verified     boolean,
  p_qr_token          text default null,
  p_lat               numeric default null,
  p_lon               numeric default null,
  p_accuracy          numeric default null
)
returns attendance
language plpgsql
security definer
set search_path = public
as $$
declare
  v_employee_id      uuid := auth.uid();
  v_today            date := fn_office_today();
  v_now              timestamptz := now();
  v_schedule         employee_schedules;
  v_is_weekly_off    boolean;
  v_leave            employee_leaves;
  v_wfh              wfh_requests;
  v_classification   day_classification;
  v_row              attendance;
  v_employee         employees;
  v_completed_sessions int := 0;
  v_session_number   int := 1;
  v_approval         additional_attendance_requests;
  v_verification     verification_method;
  v_settings         office_settings;
  v_qr_ok            boolean := false;
  v_wifi_ok          boolean := false;
  v_loc_ok           boolean := false;
  v_dist             numeric;
begin
  -- 1. Auth & Employee Basic Checks
  if v_employee_id is null then
    raise exception 'Authentication required: No valid user session found';
  end if;

  select * into v_employee from employees where id = v_employee_id and is_active;
  if not found then
    raise exception 'Employee account not found or inactive';
  end if;

  -- 2. HARD BLOCK: Open Session
  -- If there's any row with check_out_at IS NULL, we can't check in.
  if exists (
    select 1 from attendance
    where employee_id = v_employee_id
    and check_out_at is null
  ) then
    raise exception 'You already have an active session. Please check out first.';
  end if;

  -- 3. Session Counting (The core problem area)
  -- ONLY count rows that are actually CHECKED_OUT and not marked as leave/absent.
  select count(*) into v_completed_sessions
    from attendance
    where employee_id = v_employee_id
      and attendance_date = v_today
      and attendance_state = 'CHECKED_OUT'
      and day_classification = 'NORMAL_WORKING_DAY';

  -- If no completed sessions, it's session #1.
  if v_completed_sessions = 0 then
    v_session_number := 1;
  elsif v_employee.allow_multiple_sessions then
    v_session_number := v_completed_sessions + 1;
  else
    -- Check for admin approval for session 2+
    select * into v_approval
      from additional_attendance_requests
      where employee_id = v_employee_id
        and requested_date = v_today
        and status = 'APPROVED'
        and used = false
      for update;

    if not found then
      -- This is the error you are seeing.
      raise exception 'ADDITIONAL_ATTENDANCE_APPROVAL_REQUIRED: You have already completed a session today. Second check-in requires admin approval';
    end if;

    v_session_number := v_completed_sessions + 1;
    update additional_attendance_requests
      set used = true, used_at = v_now, allowed_session_number = v_session_number
      where id = v_approval.id;
  end if;

  -- 4. Validations
  v_schedule := fn_get_effective_schedule(v_employee_id, v_today);
  v_is_weekly_off := fn_is_weekly_off(v_employee_id, v_today);
  select * into v_leave from employee_leaves where employee_id = v_employee_id and leave_date = v_today;
  select * into v_settings from office_settings limit 1;

  if p_attendance_type = 'OFFICE' then
    if p_qr_token is null or p_qr_token <> v_settings.fixed_qr_token then
      raise exception 'Please scan the official office QR code';
    end if;
    v_qr_ok := true;

    if not p_wifi_verified then
      raise exception 'Please connect to the office Wi-Fi';
    end if;
    v_wifi_ok := true;

    if p_lat is null or p_lon is null then
      raise exception 'Precise location permission is required';
    end if;
    if p_accuracy is null or p_accuracy > v_settings.location_accuracy_threshold then
      raise exception 'GPS_ACCURACY_TOO_LOW:' || v_settings.location_accuracy_threshold::text;
    end if;
    v_dist := fn_calculate_distance(p_lat, p_lon, v_settings.office_latitude, v_settings.office_longitude);
    if v_dist > v_settings.allowed_radius then
      raise exception 'You are outside the office attendance area';
    end if;
    v_loc_ok := true;
    v_verification := 'WIFI_AND_QR';
  elsif p_attendance_type = 'WORK_FROM_HOME' then
    select * into v_wfh from wfh_requests
    where employee_id = v_employee_id and request_date = v_today and status = 'APPROVED';
    if not found then
      raise exception 'Work-from-home attendance requires admin permission';
    end if;
    v_verification := 'WFH_APPROVAL';
  end if;

  -- 5. Finalization
  if v_is_weekly_off then v_classification := 'WEEKLY_OFF'; else v_classification := 'NORMAL_WORKING_DAY'; end if;

  -- Wipe any automatic absence marks for today
  delete from attendance
  where employee_id = v_employee_id and attendance_date = v_today
  and day_classification in ('ABSENT', 'PAID_LEAVE', 'UNPAID_LEAVE');

  insert into attendance (
    employee_id, attendance_date, session_number, attendance_type, verification_method,
    additional_session_approval_id, check_in_at,
    schedule_id, scheduled_start, scheduled_end, required_minutes_snapshot, break_minutes_snapshot,
    day_classification, attendance_state, worked_on_weekly_off,
    wifi_verified, qr_verified, location_verified,
    latitude, longitude, location_accuracy,
    wfh_request_id
  ) values (
    v_employee_id, v_today, v_session_number, p_attendance_type, v_verification,
    v_approval.id, v_now,
    v_schedule.id, v_schedule.start_time, v_schedule.end_time,
    coalesce(v_schedule.required_minutes, v_settings.default_required_minutes),
    coalesce(v_schedule.break_minutes, v_settings.default_break_minutes),
    v_classification, 'CHECKED_IN', v_is_weekly_off,
    v_wifi_ok, v_qr_ok, v_loc_ok,
    p_lat, p_lon, p_accuracy,
    case when p_attendance_type = 'WORK_FROM_HOME' then v_wfh.id else null end
  ) returning * into v_row;

  -- Late calculation
  if v_schedule.id is not null and not v_is_weekly_off then
    declare
      v_scheduled_checkin timestamptz := (v_today::text || ' ' || v_schedule.start_time::text)::timestamp at time zone v_settings.office_timezone;
      v_late int := greatest(0, extract(epoch from (v_now - v_scheduled_checkin)) / 60)::int;
    begin
      update attendance set late_minutes = v_late, is_late = (v_late > 0) where id = v_row.id returning * into v_row;
    end;
  end if;

  if v_leave.id is not null then
    update employee_leaves set worked_on_leave = true, leave_counted = false where id = v_leave.id;
  end if;

  return v_row;
end;
$$;
