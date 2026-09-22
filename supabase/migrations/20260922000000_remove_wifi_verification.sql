-- ============================================================================
-- 20260922000000_remove_wifi_verification.sql
-- Removes mandatory Wi-Fi verification from fn_check_in and fn_check_out.
-- Preserves GPS and Biometric requirements.
-- ============================================================================

BEGIN;

-- 1. REBUILD fn_check_in without Wi-Fi enforcement
CREATE OR REPLACE FUNCTION public.fn_check_in(
  p_attendance_type   attendance_type,
  p_wifi_ssid        text,
  p_wifi_bssid       text,
  p_lat              numeric,
  p_lon              numeric,
  p_accuracy         numeric
)
RETURNS attendance
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
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
  v_max_session_num   int := 0;
  v_session_number   int := 1;
  v_approval         additional_attendance_requests;
  v_verification     verification_method;
  v_settings         office_settings;
  v_wifi_ok          boolean := true; -- Default to true since Wi-Fi is no longer required
  v_loc_ok           boolean := false;
  v_dist             numeric;
BEGIN
  -- Authentication
  IF v_employee_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required: No valid user session found';
  END IF;

  SELECT * INTO v_employee FROM employees WHERE id = v_employee_id AND is_active;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Employee account not found or inactive';
  END IF;

  SELECT * INTO v_settings FROM office_settings LIMIT 1;

  -- AUTOMATIC FORCED CLOSURE
  UPDATE attendance
  SET attendance_state = 'MISSING_CHECK_OUT',
      check_out_at = check_in_at + make_interval(mins => v_settings.max_session_minutes),
      notes = coalesce(notes, '') || ' [System closed due to max duration]'
  WHERE employee_id = v_employee_id
    AND check_out_at IS NULL
    AND v_now > check_in_at + make_interval(mins => v_settings.max_session_minutes);

  -- Block concurrent active sessions
  IF EXISTS (
    SELECT 1 FROM attendance
    WHERE employee_id = v_employee_id
    AND check_out_at IS NULL
  ) THEN
    RAISE EXCEPTION 'You already have an active session. Please check out first.';
  END IF;

  -- Session Number Calculation
  SELECT max(session_number) INTO v_max_session_num
    FROM attendance
    WHERE employee_id = v_employee_id
      AND attendance_date = v_today;

  IF v_max_session_num IS NULL THEN
    v_session_number := 1;
  ELSE
    IF v_employee.allow_multiple_sessions THEN
      v_session_number := v_max_session_num + 1;
    ELSE
      IF EXISTS (
        SELECT 1 FROM attendance
        WHERE employee_id = v_employee_id
          AND attendance_date = v_today
          AND attendance_state = 'CHECKED_OUT'
      ) THEN
        SELECT * INTO v_approval
          FROM additional_attendance_requests
          WHERE employee_id = v_employee_id
            AND requested_date = v_today
            AND status = 'APPROVED'
            AND used = false
          FOR UPDATE;

        IF NOT FOUND THEN
          RAISE EXCEPTION 'ADDITIONAL_ATTENDANCE_APPROVAL_REQUIRED: You have already completed a session today. Second check-in requires admin approval';
        END IF;

        v_session_number := v_max_session_num + 1;
        UPDATE additional_attendance_requests
          SET used = true, used_at = v_now, allowed_session_number = v_session_number
          WHERE id = v_approval.id;
      ELSE
        v_session_number := v_max_session_num + 1;
      END IF;
    END IF;
  END IF;

  -- Validations
  v_schedule := fn_get_effective_schedule(v_employee_id, v_today);
  v_is_weekly_off := fn_is_weekly_off(v_employee_id, v_today);
  SELECT * INTO v_leave FROM employee_leaves WHERE employee_id = v_employee_id AND leave_date = v_today;

  IF p_attendance_type = 'OFFICE' THEN
    -- Wi-Fi Validation REMOVED
    -- v_wifi_ok is already true

    -- Location Validation PRESERVED
    IF p_lat IS NULL OR p_lon IS NULL THEN
      RAISE EXCEPTION 'Precise location permission is required';
    END IF;
    IF p_accuracy IS NULL OR p_accuracy > v_settings.location_accuracy_threshold THEN
      RAISE EXCEPTION 'GPS_ACCURACY_TOO_LOW: %', v_settings.location_accuracy_threshold;
    END IF;
    v_dist := fn_calculate_distance(p_lat, p_lon, v_settings.office_latitude, v_settings.office_longitude);
    IF v_dist > v_settings.allowed_radius THEN
      RAISE EXCEPTION 'You are outside the office attendance area';
    END IF;
    v_loc_ok := true;
    v_verification := 'GPS_AND_BIOMETRIC';
  ELSIF p_attendance_type = 'WORK_FROM_HOME' THEN
    SELECT * INTO v_wfh
      FROM wfh_requests
      WHERE employee_id = v_employee_id AND request_date = v_today AND status = 'APPROVED';
    IF NOT FOUND THEN
      RAISE EXCEPTION 'Work-from-home attendance requires admin permission';
    END IF;
    v_verification := 'WFH_APPROVAL';
  END IF;

  IF v_is_weekly_off THEN v_classification := 'WEEKLY_OFF'; ELSE v_classification := 'NORMAL_WORKING_DAY'; END IF;

  DELETE FROM attendance
  WHERE employee_id = v_employee_id AND attendance_date = v_today
  AND day_classification IN ('ABSENT', 'PAID_LEAVE', 'UNPAID_LEAVE');

  INSERT INTO attendance (
    employee_id, attendance_date, session_number, attendance_type, verification_method,
    additional_session_approval_id, check_in_at,
    schedule_id, scheduled_start, scheduled_end, required_minutes_snapshot, break_minutes_snapshot,
    day_classification, attendance_state, worked_on_weekly_off,
    check_in_wifi_verified, check_in_qr_token_id, check_out_wifi_verified,
    latitude, longitude, location_accuracy,
    wfh_request_id
  ) VALUES (
    v_employee_id, v_today, v_session_number, p_attendance_type, v_verification,
    v_approval.id, v_now,
    v_schedule.id, v_schedule.start_time, v_schedule.end_time,
    coalesce(v_schedule.required_minutes, v_settings.default_required_minutes),
    coalesce(v_schedule.break_minutes, v_settings.default_break_minutes),
    v_classification, 'CHECKED_IN', v_is_weekly_off,
    v_wifi_ok, NULL, NULL,
    p_lat, p_lon, p_accuracy,
    CASE WHEN p_attendance_type = 'WORK_FROM_HOME' THEN v_wfh.id ELSE NULL END
  ) RETURNING * INTO v_row;

  IF v_schedule.id IS NOT NULL AND NOT v_is_weekly_off THEN
    DECLARE
      v_scheduled_checkin timestamptz := (v_today::text || ' ' || v_schedule.start_time::text)::timestamp AT TIME ZONE v_settings.office_timezone;
      v_late int := greatest(0, extract(epoch from (v_now - v_scheduled_checkin)) / 60)::int;
    BEGIN
      UPDATE attendance SET late_minutes = v_late, is_late = (v_late > 0) WHERE id = v_row.id RETURNING * INTO v_row;
    END;
  END IF;

  IF v_leave.id IS NOT NULL THEN
    UPDATE employee_leaves SET worked_on_leave = true, leave_counted = false WHERE id = v_leave.id;
  END IF;

  RETURN v_row;
END;
$$;

-- 2. REBUILD fn_check_out without Wi-Fi enforcement
CREATE OR REPLACE FUNCTION public.fn_check_out(
  p_attendance_id    uuid,
  p_wifi_ssid        text,
  p_wifi_bssid       text,
  p_lat              numeric,
  p_lon              numeric,
  p_accuracy         numeric
)
RETURNS attendance
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_employee_id      uuid := auth.uid();
  v_now              timestamptz := now();
  v_settings         office_settings;
  v_attendance       attendance;
  v_wifi_ok          boolean := true; -- Default to true
  v_loc_ok           boolean := false;
  v_dist             numeric;
  v_duration         numeric;
  v_working           numeric;
  v_regular           numeric;
  v_overtime          numeric;
BEGIN
  SELECT * INTO v_settings FROM office_settings LIMIT 1;

  SELECT * INTO v_attendance FROM attendance
  WHERE id = p_attendance_id AND employee_id = v_employee_id AND attendance_state = 'CHECKED_IN';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Active session not found.';
  END IF;

  IF extract(epoch from (v_now - v_attendance.check_in_at)) / 60 > v_settings.max_session_minutes THEN
    RAISE EXCEPTION 'This session exceeded the maximum attendance window (% mins) and requires admin correction', v_settings.max_session_minutes;
  END IF;

  IF v_attendance.attendance_type = 'OFFICE' THEN
    -- Wi-Fi Validation REMOVED
    -- v_wifi_ok is already true

    -- Location Validation PRESERVED
    IF p_lat IS NULL OR p_lon IS NULL THEN
      RAISE EXCEPTION 'Precise location permission is required';
    END IF;
    IF p_accuracy IS NULL OR p_accuracy > v_settings.location_accuracy_threshold THEN
      RAISE EXCEPTION 'GPS_ACCURACY_TOO_LOW: %', v_settings.location_accuracy_threshold;
    END IF;
    v_dist := fn_calculate_distance(p_lat, p_lon, v_settings.office_latitude, v_settings.office_longitude);
    IF v_dist > v_settings.allowed_radius THEN
      RAISE EXCEPTION 'You are outside the office attendance area';
    END IF;
    v_loc_ok := true;
  END IF;

  v_duration := extract(epoch from (v_now - v_attendance.check_in_at)) / 60;
  v_working := v_duration - coalesce(v_attendance.break_minutes_snapshot, 0);

  IF v_attendance.worked_on_weekly_off THEN
    v_regular := 0;
    v_overtime := v_working;
  ELSE
    v_regular := least(v_working, coalesce(v_attendance.required_minutes_snapshot, v_settings.default_required_minutes));
    v_overtime := greatest(0, v_working - coalesce(v_attendance.required_minutes_snapshot, v_settings.default_required_minutes));
  END IF;

  UPDATE attendance SET
    check_out_at = v_now,
    attendance_state = 'CHECKED_OUT',
    check_out_wifi_verified = v_wifi_ok,
    check_out_location_verified = v_loc_ok,
    check_out_latitude = p_lat,
    check_out_longitude = p_lon,
    check_out_location_accuracy = p_accuracy,
    total_duration_minutes = v_duration,
    working_minutes = v_working,
    regular_minutes = v_regular,
    overtime_minutes = v_overtime
  WHERE id = p_attendance_id
  RETURNING * INTO v_attendance;

  RETURN v_attendance;
END;
$$;

COMMIT;
