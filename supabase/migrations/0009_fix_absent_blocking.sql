-- ============================================================================
-- Fix for ABSENT records blocking check-ins
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
  v_completed_sessions int;
  v_session_number   int;
  v_approval         additional_attendance_requests;
  v_verification     verification_method;

  -- Settings
  v_settings         office_settings;

  -- Verification results
  v_qr_ok            boolean := false;
  v_wifi_ok          boolean := false;
  v_loc_ok           boolean := false;
  v_dist             numeric;
begin
  -- 1. Authentication and Employee check
  if v_employee_id is null then
    raise exception 'Authentication required: No valid user session found';
  end if;

  select * into v_employee from employees where id = v_employee_id and is_active;
  if not found then
    raise exception 'Employee account not found or inactive. Please contact admin';
  end if;

  -- 2. Check for active session
  if exists (
    select 1 from attendance
    where employee_id = v_employee_id
      and check_out_at is null
      and attendance_state = 'CHECKED_IN'
  ) then
    raise exception 'An attendance session is already active. Please check out before checking in again';
  end if;

  -- 3. Multi-session authorization (LEVEL 1, 2, 3)
  -- FIX: Only count sessions where the employee actually attended.
  -- Exclude synthesized 'ABSENT', 'PAID_LEAVE', or 'UNPAID_LEAVE' records.
  select count(*) into v_completed_sessions
    from attendance
    where employee_id = v_employee_id
      and attendance_date = v_today
      and day_classification = 'NORMAL_WORKING_DAY';

  if v_completed_sessions = 0 then
    v_session_number := 1;
  elsif v_employee.allow_multiple_sessions then
    v_session_number := v_completed_sessions + 1;
  else
    select * into v_approval
      from additional_attendance_requests
      where employee_id = v_employee_id
        and requested_date = v_today
        and status = 'APPROVED'
        and used = false
      for update;

    if not found then
      raise exception 'ADDITIONAL_ATTENDANCE_APPROVAL_REQUIRED: Second check-in requires admin permission';
    end if;

    v_session_number := v_completed_sessions + 1;
    update additional_attendance_requests
      set used = true, used_at = v_now, allowed_session_number = v_session_number
      where id = v_approval.id;
  end if;

  -- 4. Schedule and Day Classification
  v_schedule := fn_get_effective_schedule(v_employee_id, v_today);
  v_is_weekly_off := fn_is_weekly_off(v_employee_id, v_today);
  select * into v_leave from employee_leaves where employee_id = v_employee_id and leave_date = v_today;

  -- 5. Verification Logic
  select * into v_settings from office_settings limit 1;

  if p_attendance_type = 'OFFICE' then
    -- QR Verification (Fixed)
    if p_qr_token is null or p_qr_token <> v_settings.fixed_qr_token then
      raise exception 'Please scan the official office QR code';
    end if;
    v_qr_ok := true;

    -- Wi-Fi Verification
    if not p_wifi_verified then
      raise exception 'Please connect to the office Wi-Fi';
    end if;
    v_wifi_ok := true;

    -- Location Verification
    if p_lat is null or p_lon is null then
      raise exception 'Precise location permission is required for office attendance';
    end if;

    if p_accuracy is null or p_accuracy > v_settings.location_accuracy_threshold then
      raise exception 'Your GPS accuracy is too low. Please enable precise location and try again';
    end if;

    v_dist := fn_calculate_distance(p_lat, p_lon, v_settings.office_latitude, v_settings.office_longitude);
    if v_dist > v_settings.allowed_radius then
      raise exception 'You are outside the office attendance area';
    end if;
    v_loc_ok := true;

    v_verification := 'WIFI_AND_QR';
  elsif p_attendance_type = 'WORK_FROM_HOME' then
    select * into v_wfh
      from wfh_requests
      where employee_id = v_employee_id
        and request_date = v_today
        and status = 'APPROVED';
    if not found then
      raise exception 'Work-from-home attendance requires admin permission';
    end if;
    v_verification := 'WFH_APPROVAL';
  end if;

  -- 6. Day classification
  if v_is_weekly_off then
    v_classification := 'WEEKLY_OFF';
  else
    v_classification := 'NORMAL_WORKING_DAY';
  end if;

  -- 7. Cleanup existing ABSENT/LEAVE records for today
  -- If the employee is actually checking in, they are not absent.
  delete from attendance
  where employee_id = v_employee_id
    and attendance_date = v_today
    and day_classification in ('ABSENT', 'PAID_LEAVE', 'UNPAID_LEAVE');

  -- 8. Insert Attendance Record
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
  )
  returning * into v_row;

  -- 9. Late calculation
  if v_schedule.id is not null and not v_is_weekly_off then
    declare
      v_scheduled_checkin timestamptz;
      v_late int;
    begin
      v_scheduled_checkin := (v_today::text || ' ' || v_schedule.start_time::text)::timestamp
                             at time zone v_settings.office_timezone;
      v_late := greatest(0, extract(epoch from (v_now - v_scheduled_checkin)) / 60)::int;
      update attendance
        set late_minutes = v_late, is_late = (v_late > 0)
        where id = v_row.id
        returning * into v_row;
    end;
  end if;

  -- 10. Sync leave
  if v_leave.id is not null then
    update employee_leaves
      set worked_on_leave = true, leave_counted = false
      where id = v_leave.id;
  end if;

  return v_row;
end;
$$;
