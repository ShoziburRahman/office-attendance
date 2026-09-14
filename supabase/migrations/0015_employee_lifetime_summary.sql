CREATE OR REPLACE FUNCTION fn_get_employee_lifetime_summary(p_employee_id uuid)
RETURNS TABLE (
  total_days_worked int,
  total_hours_worked numeric,
  total_overtime numeric,
  total_present_days int,
  total_absent_days int,
  total_paid_leave int,
  total_unpaid_leave int,
  total_weekly_offs int,
  weekly_offs_worked int,
  total_late_arrivals int
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    (SELECT count(*) FROM attendance WHERE employee_id = p_employee_id AND attendance_state = 'CHECKED_OUT'),
    (SELECT coalesce(sum(working_minutes), 0) / 60.0 FROM attendance WHERE employee_id = p_employee_id AND attendance_state = 'CHECKED_OUT'),
    (SELECT coalesce(sum(overtime_minutes), 0) / 60.0 FROM attendance WHERE employee_id = p_employee_id AND attendance_state = 'CHECKED_OUT'),
    (SELECT count(*) FROM attendance WHERE employee_id = p_employee_id AND day_classification = 'NORMAL_WORKING_DAY' AND attendance_state = 'CHECKED_OUT'),
    (SELECT count(*) FROM attendance WHERE employee_id = p_employee_id AND day_classification = 'ABSENT'),
    (SELECT count(*) FROM employee_leaves WHERE employee_id = p_employee_id AND leave_type = 'PAID' AND leave_counted = true),
    (SELECT count(*) FROM employee_leaves WHERE employee_id = p_employee_id AND leave_type = 'UNPAID' AND leave_counted = true),
    (SELECT count(*) FROM attendance WHERE employee_id = p_employee_id AND day_classification = 'WEEKLY_OFF'),
    (SELECT count(*) FROM attendance WHERE employee_id = p_employee_id AND worked_on_weekly_off = true),
    (SELECT count(*) FROM attendance WHERE employee_id = p_employee_id AND is_late = true);
END;
$$;
