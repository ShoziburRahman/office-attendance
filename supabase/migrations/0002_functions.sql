-- ============================================================================
-- 0002_functions.sql
-- Secure, server-side attendance logic. All SECURITY DEFINER functions here
-- re-check authorization internally — they are the actual trust boundary,
-- RLS on the underlying tables is a second, independent layer (see 0003).
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Helper: is the calling user an admin?
-- ----------------------------------------------------------------------------
create or replace function fn_is_admin(p_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from profiles where id = p_user_id and role = 'ADMIN'
  );
$$;

-- ----------------------------------------------------------------------------
-- Helper: resolve the weekly-off status for an employee on a given date,
-- based on whichever weekly_off_schedules row was effective that date.
-- ----------------------------------------------------------------------------
create or replace function fn_is_weekly_off(p_employee_id uuid, p_date date)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from weekly_off_schedules w
    where w.employee_id = p_employee_id
      and w.effective_from <= p_date
      and (w.effective_until is null or w.effective_until > p_date)
      and w.day_of_week = extract(dow from p_date)::smallint
  );
$$;

-- ----------------------------------------------------------------------------
-- Helper: resolve the schedule effective for an employee on a given date.
-- ----------------------------------------------------------------------------
create or replace function fn_get_effective_schedule(p_employee_id uuid, p_date date)
returns employee_schedules
language sql
stable
security definer
set search_path = public
as $$
  select *
  from employee_schedules
  where employee_id = p_employee_id
    and effective_from <= p_date
    and (effective_until is null or effective_until > p_date)
  order by effective_from desc
  limit 1;
$$;

-- ----------------------------------------------------------------------------
-- Helper: current office timezone "today" — never trust client-supplied dates
-- for anything that affects pay/compliance.
-- ----------------------------------------------------------------------------
create or replace function fn_office_today()
returns date
language sql
stable
security definer
set search_path = public
as $$
  select (now() at time zone (select office_timezone from office_settings limit 1))::date;
$$;

create or replace function fn_office_now()
returns timestamptz
language sql
stable
as $$
  select now();
$$;

-- ============================================================================
-- QR TOKEN LIFECYCLE (admin-facing generation, employee-facing validation)
-- ============================================================================

-- Admin dashboard calls this repeatedly (e.g. every few seconds) to rotate
-- the displayed QR code. Old ACTIVE tokens are left to expire naturally.
create or replace function fn_generate_qr_token()
returns table (token text, expires_at timestamptz)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_token text;
  v_ttl int;
  v_expires timestamptz;
begin
  if not fn_is_admin(auth.uid()) then
    raise exception 'Only admins may generate QR tokens';
  end if;

  select qr_token_ttl_seconds into v_ttl from office_settings limit 1;
  v_token := encode(gen_random_bytes(24), 'base64');
  v_expires := now() + make_interval(secs => v_ttl);

  insert into office_qr_tokens (token, expires_at) values (v_token, v_expires);

  return query select v_token, v_expires;
end;
$$;

-- Internal helper (not exposed directly) that validates and *consumes* a QR
-- token exactly once. Called from within fn_check_in / fn_check_out.
create or replace function fn_consume_qr_token(p_token text, p_employee_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row office_qr_tokens%rowtype;
begin
  select * into v_row from office_qr_tokens where token = p_token for update;

  if not found then
    return false; -- unknown token
  end if;

  if v_row.status <> 'ACTIVE' then
    return false; -- already used, or previously flagged
  end if;

  if v_row.expires_at < now() then
    update office_qr_tokens set status = 'EXPIRED' where id = v_row.id;
    return false; -- expired: also true for old screenshots
  end if;

  update office_qr_tokens
    set status = 'USED', used_by = p_employee_id, used_at = now()
    where id = v_row.id;

  return true;
end;
$$;

-- ============================================================================
-- CHECK-IN
-- ============================================================================

create or replace function fn_check_in(
  p_attendance_type   attendance_type,
  p_wifi_verified     boolean,      -- claim from client / native plugin attestation
  p_qr_token          text default null
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
  v_qr_ok            boolean := false;
  v_row              attendance;
  v_employee         employees;
  v_completed_sessions int;
  v_session_number   int;
  v_approval         additional_attendance_requests;
  v_verification     verification_method;
begin
  select * into v_employee from employees where id = v_employee_id and is_active;
  if not found then
    raise exception 'Only active employees may check in';
  end if;

  -- No existing active session anywhere (enforced again by the unique index,
  -- this just gives a clean error instead of a constraint-violation)
  if exists (select 1 from attendance where employee_id = v_employee_id and check_out_at is null) then
    raise exception 'An attendance session is already active';
  end if;

  -- --------------------------------------------------------------------
  -- Multi-session authorization (server-side only — see docs addendum,
  -- "three levels of permission"). The client never decides this.
  -- --------------------------------------------------------------------
  select count(*) into v_completed_sessions
    from attendance
    where employee_id = v_employee_id and attendance_date = v_today;

  if v_completed_sessions = 0 then
    -- LEVEL 1: first session of the day, always allowed.
    v_session_number := 1;
  elsif v_employee.allow_multiple_sessions then
    -- LEVEL 3: standing permission, no per-date approval needed.
    v_session_number := v_completed_sessions + 1;
  else
    -- LEVEL 2: look for an approved, unused additional-attendance request
    -- for this specific employee and this specific date.
    select * into v_approval
      from additional_attendance_requests
      where employee_id = v_employee_id
        and requested_date = v_today
        and status = 'APPROVED'
        and used = false
      for update;

    if not found then
      raise exception 'ADDITIONAL_ATTENDANCE_APPROVAL_REQUIRED: Additional attendance for today requires admin approval';
    end if;

    v_session_number := v_completed_sessions + 1;

    update additional_attendance_requests
      set used = true, used_at = v_now, allowed_session_number = v_session_number
      where id = v_approval.id;
  end if;

  v_schedule := fn_get_effective_schedule(v_employee_id, v_today);
  v_is_weekly_off := fn_is_weekly_off(v_employee_id, v_today);
  select * into v_leave from employee_leaves where employee_id = v_employee_id and leave_date = v_today;

  -- -------------------- OFFICE attendance: Wi-Fi + QR both required --------------------
  if p_attendance_type = 'OFFICE' then
    if not p_wifi_verified then
      raise exception 'Office Wi-Fi verification failed';
    end if;
    if p_qr_token is null then
      raise exception 'QR code scan is required for office check-in';
    end if;
    v_qr_ok := fn_consume_qr_token(p_qr_token, v_employee_id);
    if not v_qr_ok then
      raise exception 'QR code is invalid, expired, or already used';
    end if;
    v_verification := 'WIFI_AND_QR';
  end if;

  -- -------------------- WFH attendance: must have an approved request for today --------------------
  -- NOTE: a WFH approval only ever authorizes WFH attendance. It never, by
  -- itself, grants permission for an additional (2nd+) session that day —
  -- that permission is evaluated entirely separately above.
  if p_attendance_type = 'WORK_FROM_HOME' then
    select * into v_wfh
      from wfh_requests
      where employee_id = v_employee_id
        and request_date = v_today
        and status = 'APPROVED';
    if not found then
      raise exception 'No approved Work From Home request found for today';
    end if;
    v_verification := 'WFH_APPROVAL';
  end if;

  -- -------------------- Day classification (see docs §1 item 3) --------------------
  if v_is_weekly_off then
    v_classification := 'WEEKLY_OFF';
  else
    -- Even if a leave was assigned, actually working makes this a normal day.
    v_classification := 'NORMAL_WORKING_DAY';
  end if;

  insert into attendance (
    employee_id, attendance_date, session_number, attendance_type, verification_method,
    additional_session_approval_id, check_in_at,
    schedule_id, scheduled_start, scheduled_end, required_minutes_snapshot, break_minutes_snapshot,
    day_classification, attendance_state, worked_on_weekly_off,
    check_in_wifi_verified, check_in_qr_token_id, wfh_request_id
  ) values (
    v_employee_id, v_today, v_session_number, p_attendance_type, v_verification,
    v_approval.id, v_now,
    v_schedule.id, v_schedule.start_time, v_schedule.end_time,
    coalesce(v_schedule.required_minutes, (select default_required_minutes from office_settings limit 1)),
    coalesce(v_schedule.break_minutes, (select default_break_minutes from office_settings limit 1)),
    v_classification, 'CHECKED_IN', v_is_weekly_off,
    p_wifi_verified, case when p_attendance_type = 'OFFICE' then
      (select id from office_qr_tokens where token = p_qr_token) else null end,
    case when p_attendance_type = 'WORK_FROM_HOME' then v_wfh.id else null end
  )
  returning * into v_row;

  -- Late calculation (only meaningful for a real scheduled start time)
  if v_schedule.id is not null and not v_is_weekly_off then
    declare
      v_scheduled_checkin timestamptz;
      v_late int;
    begin
      v_scheduled_checkin := (v_today::text || ' ' || v_schedule.start_time::text)::timestamp
                             at time zone (select office_timezone from office_settings limit 1);
      v_late := greatest(0, extract(epoch from (v_now - v_scheduled_checkin)) / 60)::int;
      update attendance
        set late_minutes = v_late, is_late = (v_late > 0)
        where id = v_row.id
        returning * into v_row;
    end;
  end if;

  -- If working on an assigned leave day, mark the leave as worked / not counted
  if v_leave.id is not null then
    update employee_leaves
      set worked_on_leave = true, leave_counted = false
      where id = v_leave.id;
  end if;

  return v_row;
end;
$$;

-- ============================================================================
-- CHECK-OUT
-- ============================================================================

create or replace function fn_check_out(
  p_attendance_id     uuid,
  p_wifi_verified     boolean,
  p_qr_token          text default null
)
returns attendance
language plpgsql
security definer
set search_path = public
as $$
declare
  v_employee_id     uuid := auth.uid();
  v_row             attendance;
  v_settings        office_settings;
  v_minutes_since_checkin numeric;
  v_total_minutes   int;
  v_break_minutes   int;
  v_working_minutes int;
  v_regular_minutes int;
  v_overtime_minutes int;
  v_qr_ok           boolean;
begin
  select * into v_settings from office_settings limit 1;

  select * into v_row from attendance
    where id = p_attendance_id and employee_id = v_employee_id
    for update;

  if not found then
    raise exception 'Attendance record not found';
  end if;

  if v_row.check_out_at is not null then
    raise exception 'This session is already checked out';
  end if;

  v_minutes_since_checkin := extract(epoch from (now() - v_row.check_in_at)) / 60;

  if v_minutes_since_checkin < v_settings.min_minutes_before_checkout then
    raise exception 'Check-out is locked for the first % minutes after check-in', v_settings.min_minutes_before_checkout;
  end if;

  if v_minutes_since_checkin > v_settings.max_session_minutes then
    -- The 12-hour window has already expired; this should have been caught
    -- earlier by fn_flag_expired_sessions, but guard here too.
    raise exception 'This session exceeded the maximum attendance window and requires admin correction';
  end if;

  if v_row.attendance_type = 'OFFICE' then
    if not p_wifi_verified then
      raise exception 'Office Wi-Fi verification failed';
    end if;
    if p_qr_token is null then
      raise exception 'QR code scan is required for office check-out';
    end if;
    v_qr_ok := fn_consume_qr_token(p_qr_token, v_employee_id);
    if not v_qr_ok then
      raise exception 'QR code is invalid, expired, or already used';
    end if;
  end if;

  v_total_minutes := round(extract(epoch from (now() - v_row.check_in_at)) / 60)::int;
  v_break_minutes := coalesce(v_row.break_minutes_snapshot, v_settings.default_break_minutes);
  v_working_minutes := greatest(0, v_total_minutes - v_break_minutes);

  if v_row.worked_on_weekly_off then
    v_regular_minutes := 0;
    v_overtime_minutes := v_working_minutes;
  else
    v_regular_minutes := least(v_working_minutes, coalesce(v_row.required_minutes_snapshot, v_settings.default_required_minutes));
    v_overtime_minutes := greatest(0, v_working_minutes - coalesce(v_row.required_minutes_snapshot, v_settings.default_required_minutes));
  end if;

  update attendance set
    check_out_at = now(),
    attendance_state = 'CHECKED_OUT',
    total_duration_minutes = v_total_minutes,
    working_minutes = v_working_minutes,
    regular_minutes = v_regular_minutes,
    overtime_minutes = v_overtime_minutes,
    check_out_wifi_verified = p_wifi_verified,
    check_out_qr_token_id = case when v_row.attendance_type = 'OFFICE' then
      (select id from office_qr_tokens where token = p_qr_token) else null end
  where id = p_attendance_id
  returning * into v_row;

  return v_row;
end;
$$;

-- ============================================================================
-- ADDITIONAL ATTENDANCE (LEVEL 2) REQUEST + APPROVAL
-- ============================================================================

-- Employee-facing: called when they've already completed a session today,
-- don't have LEVEL 3 (allow_multiple_sessions), and want to check in again.
create or replace function fn_request_additional_checkin(p_reason text)
returns additional_attendance_requests
language plpgsql
security definer
set search_path = public
as $$
declare
  v_employee_id uuid := auth.uid();
  v_today       date := fn_office_today();
  v_row         additional_attendance_requests;
begin
  if not exists (select 1 from employees where id = v_employee_id and is_active) then
    raise exception 'Only active employees may request additional attendance';
  end if;

  if not exists (select 1 from attendance where employee_id = v_employee_id and attendance_date = v_today) then
    raise exception 'No completed attendance session exists yet for today';
  end if;

  if exists (select 1 from attendance where employee_id = v_employee_id and check_out_at is null) then
    raise exception 'An attendance session is already active';
  end if;

  insert into additional_attendance_requests (employee_id, requested_date, reason, status)
  values (v_employee_id, v_today, p_reason, 'PENDING')
  returning * into v_row;

  return v_row;
exception
  when unique_violation then
    raise exception 'A request for today already exists (pending or approved-and-unused)';
end;
$$;

-- Admin-facing: approve or reject a pending additional attendance request.
create or replace function fn_admin_decide_additional_checkin(
  p_request_id  uuid,
  p_approve     boolean,
  p_admin_notes text default null
)
returns additional_attendance_requests
language plpgsql
security definer
set search_path = public
as $$
declare
  v_admin_id uuid := auth.uid();
  v_row      additional_attendance_requests;
begin
  if not fn_is_admin(v_admin_id) then
    raise exception 'Only admins may decide additional attendance requests';
  end if;

  select * into v_row from additional_attendance_requests where id = p_request_id for update;
  if not found then
    raise exception 'Request not found';
  end if;
  if v_row.status <> 'PENDING' then
    raise exception 'Request has already been decided';
  end if;

  update additional_attendance_requests
    set status = case when p_approve then 'APPROVED'::additional_attendance_status else 'REJECTED'::additional_attendance_status end,
        approved_by = v_admin_id,
        approved_at = now(),
        admin_notes = p_admin_notes
    where id = p_request_id
    returning * into v_row;

  return v_row;
end;
$$;

-- ============================================================================
-- SCHEDULED MAINTENANCE: expired sessions -> INCOMPLETE, then day close-out -> ABSENT
-- Intended to run via pg_cron, e.g. every 15 minutes and once daily respectively.
-- ============================================================================

create or replace function fn_flag_expired_sessions()
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count int;
begin
  update attendance
    set attendance_state = 'INCOMPLETE'
    where check_out_at is null
      and attendance_state = 'CHECKED_IN'
      and now() > check_in_at + make_interval(mins => (select max_session_minutes from office_settings limit 1));
  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

-- Synthesizes ABSENT rows for fully-elapsed past dates only (see docs §1 item 3).
-- Never called for "today" — only for a date once its scheduled end time has passed.
create or replace function fn_close_out_day(p_date date)
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count int := 0;
  v_emp record;
begin
  if p_date >= fn_office_today() then
    raise exception 'Cannot close out a day that has not fully elapsed';
  end if;

  for v_emp in
    select e.id as employee_id
    from employees e
    where e.is_active
      and e.joining_date <= p_date
      and not exists (select 1 from attendance a where a.employee_id = e.id and a.attendance_date = p_date)
  loop
    declare
      v_is_off boolean := fn_is_weekly_off(v_emp.employee_id, p_date);
      v_leave  employee_leaves;
      v_classification day_classification;
    begin
      select * into v_leave from employee_leaves
        where employee_id = v_emp.employee_id and leave_date = p_date;

      if v_is_off then
        v_classification := 'WEEKLY_OFF';
      elsif v_leave.id is not null and v_leave.leave_type = 'PAID' then
        v_classification := 'PAID_LEAVE';
      elsif v_leave.id is not null and v_leave.leave_type = 'UNPAID' then
        v_classification := 'UNPAID_LEAVE';
      else
        v_classification := 'ABSENT';
      end if;

      -- Only insert a placeholder row for classifications that need one for reporting.
      -- (WEEKLY_OFF/leave-without-work days can be derived from their source tables;
      -- we still record them here so attendance reports have one place to query.)
      insert into attendance (
        employee_id, attendance_date, attendance_type, check_in_at,
        day_classification, attendance_state
      ) values (
        v_emp.employee_id, p_date, 'OFFICE',
        (p_date::text || ' 00:00:00')::timestamptz, -- placeholder; no real check-in occurred
        v_classification, 'CHECKED_OUT'
      )
      on conflict (employee_id, attendance_date) do nothing;

      v_count := v_count + 1;
    end;
  end loop;

  return v_count;
end;
$$;

-- ============================================================================
-- TRIGGER: keep employee_leaves in sync if attendance is created/removed
-- for a day that already has a leave record (belt-and-suspenders alongside
-- the explicit update inside fn_check_in).
-- ============================================================================

create or replace function fn_sync_leave_on_attendance_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if TG_OP = 'INSERT' then
    update employee_leaves
      set worked_on_leave = true, leave_counted = false
      where employee_id = new.employee_id and leave_date = new.attendance_date;
  elsif TG_OP = 'DELETE' then
    -- Only revert if no other session remains for that employee/date
    -- (multiple sessions per day mean deleting one shouldn't un-mark the leave
    -- as worked if another session that day still exists).
    if not exists (
      select 1 from attendance
      where employee_id = old.employee_id and attendance_date = old.attendance_date
    ) then
      update employee_leaves
        set worked_on_leave = false, leave_counted = true
        where employee_id = old.employee_id and leave_date = old.attendance_date;
    end if;
  end if;
  return null;
end;
$$;

create trigger trg_sync_leave_on_attendance
  after insert or delete on attendance
  for each row execute function fn_sync_leave_on_attendance_change();

-- ============================================================================
-- ADMIN ATTENDANCE CORRECTIONS (always logged, never silent)
-- ============================================================================

create or replace function fn_admin_correct_attendance(
  p_attendance_id  uuid,
  p_field          text,      -- one of: 'check_in_at' | 'check_out_at' | 'attendance_state' | 'notes'
  p_new_value      text,
  p_reason         text
)
returns attendance
language plpgsql
security definer
set search_path = public
as $$
declare
  v_admin_id uuid := auth.uid();
  v_row      attendance;
  v_old      text;
  v_settings office_settings;
begin
  if not fn_is_admin(v_admin_id) then
    raise exception 'Only admins may correct attendance records';
  end if;
  if p_reason is null or length(trim(p_reason)) = 0 then
    raise exception 'A reason is required for every attendance correction';
  end if;

  select * into v_row from attendance where id = p_attendance_id for update;
  if not found then
    raise exception 'Attendance record not found';
  end if;
  select * into v_settings from office_settings limit 1;

  if p_field = 'check_in_at' then
    v_old := v_row.check_in_at::text;
    update attendance set check_in_at = p_new_value::timestamptz where id = p_attendance_id;
  elsif p_field = 'check_out_at' then
    v_old := coalesce(v_row.check_out_at::text, '(missing)');
    update attendance set
      check_out_at = p_new_value::timestamptz,
      attendance_state = 'CHECKED_OUT'
      where id = p_attendance_id;
  elsif p_field = 'attendance_state' then
    v_old := v_row.attendance_state::text;
    update attendance set attendance_state = p_new_value::attendance_state where id = p_attendance_id;
  elsif p_field = 'notes' then
    v_old := coalesce(v_row.notes, '');
    update attendance set notes = p_new_value where id = p_attendance_id;
  else
    raise exception 'Unsupported field for correction: %', p_field;
  end if;

  -- Recompute durations if both check_in_at and check_out_at are now present
  select * into v_row from attendance where id = p_attendance_id;
  if v_row.check_out_at is not null then
    declare
      v_total int := round(extract(epoch from (v_row.check_out_at - v_row.check_in_at)) / 60)::int;
      v_break int := coalesce(v_row.break_minutes_snapshot, v_settings.default_break_minutes);
      v_working int := greatest(0, v_total - v_break);
      v_regular int;
      v_ot int;
    begin
      if v_row.worked_on_weekly_off then
        v_regular := 0; v_ot := v_working;
      else
        v_regular := least(v_working, coalesce(v_row.required_minutes_snapshot, v_settings.default_required_minutes));
        v_ot := greatest(0, v_working - coalesce(v_row.required_minutes_snapshot, v_settings.default_required_minutes));
      end if;
      update attendance set
        total_duration_minutes = v_total, working_minutes = v_working,
        regular_minutes = v_regular, overtime_minutes = v_ot
        where id = p_attendance_id;
    end;
  end if;

  insert into attendance_edit_logs (attendance_id, field_name, old_value, new_value, edited_by, reason)
    values (p_attendance_id, p_field, v_old, p_new_value, v_admin_id, p_reason);

  select * into v_row from attendance where id = p_attendance_id;
  return v_row;
end;
$$;
