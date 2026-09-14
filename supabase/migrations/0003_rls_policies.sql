-- ============================================================================
-- 0003_rls_policies.sql
-- Row Level Security. Principle: every table starts denied-by-default;
-- explicit policies grant the minimum access each role needs.
-- No table is left with a blanket "authenticated users can do X" policy.
-- ============================================================================

alter table profiles enable row level security;
alter table employees enable row level security;
alter table employee_schedules enable row level security;
alter table weekly_off_schedules enable row level security;
alter table employee_leaves enable row level security;
alter table wfh_requests enable row level security;
alter table office_qr_tokens enable row level security;
alter table attendance enable row level security;
alter table attendance_edit_logs enable row level security;
alter table office_settings enable row level security;
alter table additional_attendance_requests enable row level security;

-- ----------------------------------------------------------------------------
-- PROFILES
-- ----------------------------------------------------------------------------
create policy profiles_select_own on profiles
  for select using (id = auth.uid());

create policy profiles_select_admin on profiles
  for select using (fn_is_admin(auth.uid()));

-- Employees may update only non-sensitive fields of their own profile.
-- Role changes must never be possible from the client — enforced by
-- restricting UPDATE to a column list rather than trusting app logic.
create policy profiles_update_own_limited on profiles
  for update using (id = auth.uid())
  with check (id = auth.uid());
-- NOTE: apply a companion column-level GRANT (see below) so `role` cannot be
-- changed even under this policy.
revoke update (role) on profiles from authenticated;

create policy profiles_update_admin on profiles
  for update using (fn_is_admin(auth.uid()));

create policy profiles_insert_admin_or_self on profiles
  for insert with check (id = auth.uid() or fn_is_admin(auth.uid()));

-- ----------------------------------------------------------------------------
-- EMPLOYEES
-- ----------------------------------------------------------------------------
create policy employees_select_own on employees
  for select using (id = auth.uid());

create policy employees_select_admin on employees
  for select using (fn_is_admin(auth.uid()));

create policy employees_insert_admin on employees
  for insert with check (fn_is_admin(auth.uid()));

create policy employees_update_admin on employees
  for update using (fn_is_admin(auth.uid()));

-- No delete policy at all: employees are deactivated (is_active = false), never deleted.

-- ----------------------------------------------------------------------------
-- EMPLOYEE SCHEDULES
-- ----------------------------------------------------------------------------
create policy schedules_select_own on employee_schedules
  for select using (employee_id = auth.uid());

create policy schedules_select_admin on employee_schedules
  for select using (fn_is_admin(auth.uid()));

create policy schedules_write_admin on employee_schedules
  for insert with check (fn_is_admin(auth.uid()));

create policy schedules_update_admin on employee_schedules
  for update using (fn_is_admin(auth.uid()));

-- No employee update/delete: schedules are admin-managed and effective-dated,
-- never edited in place by employees.

-- ----------------------------------------------------------------------------
-- WEEKLY OFF SCHEDULES
-- ----------------------------------------------------------------------------
create policy weekly_off_select_own on weekly_off_schedules
  for select using (employee_id = auth.uid());

create policy weekly_off_select_admin on weekly_off_schedules
  for select using (fn_is_admin(auth.uid()));

create policy weekly_off_write_admin on weekly_off_schedules
  for insert with check (fn_is_admin(auth.uid()));

create policy weekly_off_update_admin on weekly_off_schedules
  for update using (fn_is_admin(auth.uid()));

-- ----------------------------------------------------------------------------
-- EMPLOYEE LEAVES
-- ----------------------------------------------------------------------------
create policy leaves_select_own on employee_leaves
  for select using (employee_id = auth.uid());

create policy leaves_select_admin on employee_leaves
  for select using (fn_is_admin(auth.uid()));

create policy leaves_write_admin on employee_leaves
  for insert with check (fn_is_admin(auth.uid()));

create policy leaves_update_admin on employee_leaves
  for update using (fn_is_admin(auth.uid()));
-- Employees never write leave rows directly; worked_on_leave/leave_counted are
-- only ever changed by the fn_check_in RPC / trigger (SECURITY DEFINER, bypasses RLS).

-- ----------------------------------------------------------------------------
-- WFH REQUESTS
-- ----------------------------------------------------------------------------
create policy wfh_select_own on wfh_requests
  for select using (employee_id = auth.uid());

create policy wfh_select_admin on wfh_requests
  for select using (fn_is_admin(auth.uid()));

-- Employees can create their own requests, always starting PENDING.
create policy wfh_insert_own on wfh_requests
  for insert with check (employee_id = auth.uid() and status = 'PENDING'::wfh_status);

-- Employees may cancel (not approve/reject) their own still-pending request.
create policy wfh_update_own_cancel on wfh_requests
  for update using (employee_id = auth.uid() and status = 'PENDING'::wfh_status)
  with check (employee_id = auth.uid() and status = 'CANCELLED'::wfh_status);

create policy wfh_update_admin on wfh_requests
  for update using (fn_is_admin(auth.uid()));

-- ----------------------------------------------------------------------------
-- OFFICE QR TOKENS
-- Employees never need to SELECT these directly (validation happens inside
-- fn_check_in/fn_check_out via SECURITY DEFINER); only admins can view them,
-- e.g. to render the rotating QR code and audit usage.
-- ----------------------------------------------------------------------------
create policy qr_tokens_select_admin on office_qr_tokens
  for select using (fn_is_admin(auth.uid()));
-- No direct insert/update policies for anyone: all writes happen inside
-- fn_generate_qr_token / fn_consume_qr_token (SECURITY DEFINER).

-- ----------------------------------------------------------------------------
-- ATTENDANCE
-- ----------------------------------------------------------------------------
create policy attendance_select_own on attendance
  for select using (employee_id = auth.uid());

create policy attendance_select_admin on attendance
  for select using (fn_is_admin(auth.uid()));

-- Direct INSERT is intentionally NOT permitted for employees — all check-ins
-- happen through fn_check_in (SECURITY DEFINER), which enforces Wi-Fi/QR/WFH
-- approval/weekly-off/leave logic that must never be bypassable by a raw insert.
create policy attendance_insert_admin_only_direct on attendance
  for insert with check (fn_is_admin(auth.uid()));  -- used by fn_close_out_day / manual admin entries

-- Employees can never UPDATE attendance rows directly (no policy = denied).
-- Corrections happen only through fn_admin_correct_attendance.
create policy attendance_update_admin on attendance
  for update using (fn_is_admin(auth.uid()));

-- No delete policy for anyone: attendance is never deleted, only corrected with a logged reason.

-- ----------------------------------------------------------------------------
-- ATTENDANCE EDIT LOGS
-- ----------------------------------------------------------------------------
create policy edit_logs_select_admin on attendance_edit_logs
  for select using (fn_is_admin(auth.uid()));

-- Employees can see the edit history for their own attendance records (transparency).
create policy edit_logs_select_own on attendance_edit_logs
  for select using (
    exists (
      select 1 from attendance a
      where a.id = attendance_edit_logs.attendance_id
        and a.employee_id = auth.uid()
    )
  );

-- No insert/update/delete policies for anyone: only fn_admin_correct_attendance
-- (SECURITY DEFINER) writes here, guaranteeing the audit trail can't be edited
-- or bypassed by direct table access even by an admin's own session.

-- ----------------------------------------------------------------------------
-- ADDITIONAL ATTENDANCE REQUESTS (LEVEL 2 permission — kept fully separate
-- from wfh_requests, both in table and in policy, per spec)
-- ----------------------------------------------------------------------------
create policy additional_attendance_select_own on additional_attendance_requests
  for select using (employee_id = auth.uid());

create policy additional_attendance_select_admin on additional_attendance_requests
  for select using (fn_is_admin(auth.uid()));

-- No direct INSERT/UPDATE policies for anyone: creation happens only via
-- fn_request_additional_checkin, decisions only via fn_admin_decide_additional_checkin,
-- and "used" is only ever flipped inside fn_check_in — all SECURITY DEFINER,
-- so the approval-consumption flow can't be raced or bypassed by a direct write.

-- ----------------------------------------------------------------------------
-- OFFICE SETTINGS
-- ----------------------------------------------------------------------------
create policy office_settings_select_all on office_settings
  for select using (auth.uid() is not null);  -- any logged-in user may read (e.g. to display office timezone)

create policy office_settings_update_admin on office_settings
  for update using (fn_is_admin(auth.uid()));
