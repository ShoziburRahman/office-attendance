-- ============================================================================
-- 0023_admin_upsert_attendance.sql
-- Allows admins to create or update attendance records for any date,
-- including days currently marked as ABSENT.
-- ============================================================================

create or replace function fn_admin_upsert_attendance(
  p_employee_id     uuid,
  p_date            date,
  p_check_in_time   text default null,
  p_check_out_time  text default null,
  p_attendance_type attendance_type default 'OFFICE',
  p_reason          text default null
)
returns attendance
language plpgsql
security definer
set search_path = public
as $$
declare
  v_admin_id uuid := auth.uid();
  v_row      attendance;
  v_settings office_settings;
  v_schedule employee_schedules;
  v_is_off   boolean;
  v_classification day_classification;
  v_state    attendance_state;
  v_check_in timestamptz;
  v_check_out timestamptz;
  v_late_min int := 0;
  v_is_late  boolean := false;
  v_total_min int;
  v_break_min int;
  v_working_min int;
  v_regular_min int;
  v_ot_min int;
  v_tz text;
begin
  -- 1. Authorization & Validation
  if not fn_is_admin(v_admin_id) then
    raise exception 'Only admins may upsert attendance';
  end if;
  if p_reason is null or length(trim(p_reason)) = 0 then
    raise exception 'A reason is required for this correction';
  end if;

  select office_timezone into v_tz from office_settings limit 1;
  select * into v_settings from office_settings limit 1;
  v_is_off := fn_is_weekly_off(p_employee_id, p_date);
  v_schedule := fn_get_effective_schedule(p_employee_id, p_date);

  if v_is_off then
    v_classification := 'WEEKLY_OFF';
  else
    v_classification := 'NORMAL_WORKING_DAY';
  end if;

  -- Combine date and time
  if p_check_in_time is not null then
    v_check_in := (p_date::text || ' ' || p_check_in_time::text)::timestamp at time zone v_tz;
  end if;
  if p_check_out_time is not null then
    v_check_out := (p_date::text || ' ' || p_check_out_time::text)::timestamp at time zone v_tz;
  end if;

  v_state := case when v_check_out is not null then 'CHECKED_OUT' else 'CHECKED_IN' end;

  -- 2. Late calculation
  if v_check_in is not null and not v_is_off and v_schedule.id is not null then
    declare
      v_scheduled_checkin timestamptz;
    begin
      v_scheduled_checkin := (p_date::text || ' ' || v_schedule.start_time::text)::timestamp
                             at time zone v_tz;
      v_late_min := greatest(0, extract(epoch from (v_check_in - v_scheduled_checkin)) / 60)::int;
      v_is_late := (v_late_min > 0);
    end;
  end if;

  -- 3. Upsert
  select * into v_row from attendance
    where employee_id = p_employee_id and attendance_date = p_date
    for update;

  if found then
    update attendance set
      check_in_at = coalesce(v_check_in, check_in_at),
      check_out_at = coalesce(v_check_out, check_out_at),
      attendance_type = p_attendance_type,
      day_classification = v_classification,
      attendance_state = v_state,
      late_minutes = case when v_check_in is not null then v_late_min else late_minutes end,
      is_late = case when v_check_in is not null then v_is_late else is_late end,
      verification_method = 'ADMIN_MANUAL_ENTRY',
      -- Satisfy constraints by explicitly setting verification flags to TRUE for admin overrides
      qr_verified = true,
      wifi_verified = true,
      location_verified = true,
      notes = p_reason
    where id = v_row.id
    returning * into v_row;
  else
    insert into attendance (
      employee_id, attendance_date, session_number, attendance_type, verification_method,
      check_in_at, check_out_at, schedule_id, scheduled_start, scheduled_end,
      required_minutes_snapshot, break_minutes_snapshot, day_classification,
      attendance_state, worked_on_weekly_off, late_minutes, is_late, notes,
      qr_verified, wifi_verified, location_verified
    ) values (
      p_employee_id, p_date, 1, p_attendance_type, 'ADMIN_MANUAL_ENTRY',
      v_check_in, v_check_out, v_schedule.id, v_schedule.start_time, v_schedule.end_time,
      coalesce(v_schedule.required_minutes, v_settings.default_required_minutes),
      coalesce(v_schedule.break_minutes, v_settings.default_break_minutes),
      v_classification, v_state, v_is_off, v_late_min, v_is_late, p_reason,
      true, true, true
    )
    returning * into v_row;
  end if;

  -- 4. Duration calculation
  if v_row.check_in_at is not null and v_row.check_out_at is not null then
    v_total_min := round(extract(epoch from (v_row.check_out_at - v_row.check_in_at)) / 60)::int;
    v_break_min := coalesce(v_row.break_minutes_snapshot, v_settings.default_break_minutes);
    v_working_min := greatest(0, v_total_min - v_break_min);

    if v_row.worked_on_weekly_off then
      v_regular_min := 0;
      v_ot_min := v_working_min;
    else
      v_regular_min := least(v_working_min, coalesce(v_row.required_minutes_snapshot, v_settings.default_required_minutes));
      v_ot_min := greatest(0, v_working_min - coalesce(v_row.required_minutes_snapshot, v_settings.default_required_minutes));
    end if;

    update attendance set
      total_duration_minutes = v_total_min,
      working_minutes = v_working_min,
      regular_minutes = v_regular_min,
      overtime_minutes = v_ot_min
    where id = v_row.id;
  end if;

  -- 5. Logging
  insert into attendance_edit_logs (attendance_id, field_name, old_value, new_value, edited_by, reason)
    values (v_row.id, 'UPSERT', 'N/A', 'Attendance Updated/Created', v_admin_id, p_reason);

  select * into v_row from attendance where id = v_row.id;
  return v_row;
end;
$$;
