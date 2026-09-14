CREATE OR REPLACE FUNCTION fn_admin_force_checkout(p_attendance_id uuid, p_reason text)
RETURNS attendance
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_admin_id uuid := auth.uid();
  v_row attendance;
  v_settings office_settings;
  v_total_minutes int;
  v_break_minutes int;
  v_working_minutes int;
  v_regular_minutes int;
  v_overtime_minutes int;
BEGIN
  IF NOT fn_is_admin(v_admin_id) THEN
    RAISE EXCEPTION 'Only admins may force a check-out';
  END IF;

  IF p_reason IS NULL OR length(trim(p_reason)) = 0 THEN
    RAISE EXCEPTION 'A reason is required for this emergency check-out';
  END IF;

  SELECT * INTO v_row FROM attendance WHERE id = p_attendance_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Attendance record not found';
  END IF;

  IF v_row.check_out_at IS NOT NULL THEN
    RAISE EXCEPTION 'This session is already checked out';
  END IF;

  SELECT * INTO v_settings FROM office_settings LIMIT 1;

  v_total_minutes := round(extract(epoch from (now() - v_row.check_in_at)) / 60)::int;
  v_break_minutes := coalesce(v_row.break_minutes_snapshot, v_settings.default_break_minutes);
  v_working_minutes := greatest(0, v_total_minutes - v_break_minutes);

  IF v_row.worked_on_weekly_off THEN
    v_regular_minutes := 0;
    v_overtime_minutes := v_working_minutes;
  ELSE
    v_regular_minutes := least(v_working_minutes, coalesce(v_row.required_minutes_snapshot, v_settings.default_required_minutes));
    v_overtime_minutes := greatest(0, v_working_minutes - coalesce(v_row.required_minutes_snapshot, v_settings.default_required_minutes));
  END IF;

  UPDATE attendance SET
    check_out_at = now(),
    attendance_state = 'CHECKED_OUT',
    total_duration_minutes = v_total_minutes,
    working_minutes = v_working_minutes,
    regular_minutes = v_regular_minutes,
    overtime_minutes = v_overtime_minutes
  WHERE id = p_attendance_id
  RETURNING * INTO v_row;

  INSERT INTO attendance_edit_logs (attendance_id, field_name, old_value, new_value, edited_by, reason)
  VALUES (p_attendance_id, 'attendance_state', 'CHECKED_IN', 'CHECKED_OUT', v_admin_id, 'FORCE_CHECKOUT: ' || p_reason);

  RETURN v_row;
END;
$$;
