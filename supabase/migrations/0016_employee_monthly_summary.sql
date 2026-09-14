CREATE OR REPLACE FUNCTION fn_get_employee_monthly_summaries(p_employee_id uuid)
RETURNS TABLE (
  year int,
  month int,
  working_days int,
  present_days int,
  absent_days int,
  paid_leave int,
  unpaid_leave int,
  weekly_offs int,
  weekly_offs_worked int,
  total_hours numeric,
  overtime numeric,
  late_days int
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  WITH month_series AS (
    -- Generate a series of months where the employee has any record
    SELECT DISTINCT extract(year from attendance_date)::int as y, extract(month from attendance_date)::int as m
    FROM attendance WHERE employee_id = p_employee_id
    UNION
    SELECT DISTINCT extract(year from leave_date)::int, extract(month from leave_date)::int
    FROM employee_leaves WHERE employee_id = p_employee_id
  )
  SELECT 
    ms.y,
    ms.m,
    (SELECT count(*) FROM attendance WHERE employee_id = p_employee_id AND extract(year from attendance_date) = ms.y AND extract(month from attendance_date) = ms.m AND day_classification = 'NORMAL_WORKING_DAY'),
    (SELECT count(*) FROM attendance WHERE employee_id = p_employee_id AND extract(year from attendance_date) = ms.y AND extract(month from attendance_date) = ms.m AND attendance_state = 'CHECKED_OUT'),
    (SELECT count(*) FROM attendance WHERE employee_id = p_employee_id AND extract(year from attendance_date) = ms.y AND extract(month from attendance_date) = ms.m AND day_classification = 'ABSENT'),
    (SELECT count(*) FROM employee_leaves WHERE employee_id = p_employee_id AND extract(year from leave_date) = ms.y AND extract(month from leave_date) = ms.m AND leave_type = 'PAID' AND leave_counted = true),
    (SELECT count(*) FROM employee_leaves WHERE employee_id = p_employee_id AND extract(year from leave_date) = ms.y AND extract(month from leave_date) = ms.m AND leave_type = 'UNPAID' AND leave_counted = true),
    (SELECT count(*) FROM attendance WHERE employee_id = p_employee_id AND extract(year from attendance_date) = ms.y AND extract(month from attendance_date) = ms.m AND day_classification = 'WEEKLY_OFF'),
    (SELECT count(*) FROM attendance WHERE employee_id = p_employee_id AND extract(year from attendance_date) = ms.y AND extract(month from attendance_date) = ms.m AND worked_on_weekly_off = true),
    (SELECT coalesce(sum(working_minutes), 0) / 60.0 FROM attendance WHERE employee_id = p_employee_id AND extract(year from attendance_date) = ms.y AND extract(month from attendance_date) = ms.m AND attendance_state = 'CHECKED_OUT'),
    (SELECT coalesce(sum(overtime_minutes), 0) / 60.0 FROM attendance WHERE employee_id = p_employee_id AND extract(year from attendance_date) = ms.y AND extract(month from attendance_date) = ms.m AND attendance_state = 'CHECKED_OUT'),
    (SELECT count(*) FROM attendance WHERE employee_id = p_employee_id AND extract(year from attendance_date) = ms.y AND extract(month from attendance_date) = ms.m AND is_late = true)
  FROM month_series ms
  ORDER BY ms.y DESC, ms.m DESC;
END;
$$;
