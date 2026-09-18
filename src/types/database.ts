// Hand-written to match supabase/migrations/0001_schema.sql through 0003.
// Once the project is linked, replace this file by running:
//   supabase gen types typescript --linked > src/types/database.ts
// Keep it in sync manually until then — every field here should have a
// matching column in the migrations.

export type UserRole = "ADMIN" | "EMPLOYEE";

export type AttendanceType = "OFFICE" | "WORK_FROM_HOME";

export type AttendanceState =
  | "CHECKED_IN"
  | "CHECKED_OUT"
  | "INCOMPLETE"
  | "MISSING_CHECK_OUT";

export type DayClassification =
  | "NORMAL_WORKING_DAY"
  | "WEEKLY_OFF"
  | "PAID_LEAVE"
  | "UNPAID_LEAVE"
  | "ABSENT";

export type LeaveType = "PAID" | "UNPAID";

export type WfhStatus = "PENDING" | "APPROVED" | "REJECTED" | "CANCELLED";

export type AdditionalAttendanceStatus = "PENDING" | "APPROVED" | "REJECTED";

export interface EmployeeDeviceRow {
  id: string;
  employee_id: string;
  public_key: string;
  device_name: string;
  device_model: string;
  app_version: string;
  status: "PENDING" | "APPROVED" | "REJECTED" | "REVOKED";
  registered_at: string;
  approved_at: string | null;
  revoked_at: string | null;
  last_authenticated_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface BiometricChallengeRow {
  id: string;
  employee_id: string;
  device_id: string;
  challenge: string;
  action: "CHECK_IN" | "CHECK_OUT";
  expires_at: string;
  consumed_at: string | null;
  created_at: string;
}

export type VerificationMethod =
  | "BIOMETRIC"
  | "WFH_APPROVAL"
  | "ADMIN_MANUAL_ENTRY";

export interface ProfileRow {
  id: string;
  role: UserRole;
  full_name: string;
  email: string;
  phone: string | null;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface EmployeeRow {
  id: string;
  employee_code: string;
  department: string;
  position: string;
  joining_date: string; // date (YYYY-MM-DD)
  is_active: boolean;
  deactivated_at: string | null;
  allow_multiple_sessions: boolean;
  base_salary: number | null;
  created_at: string;
  updated_at: string;
}

/** Joined shape used throughout the admin UI: one employee + their profile. */
export interface EmployeeWithProfile extends EmployeeRow {
  profile: ProfileRow;
}

export interface EmployeeScheduleRow {
  id: string;
  employee_id: string;
  start_time: string; // "HH:MM:SS"
  end_time: string;
  required_minutes: number;
  break_minutes: number;
  effective_from: string;
  effective_until: string | null;
  created_by: string;
  created_at: string;
}

export interface WeeklyOffScheduleRow {
  id: string;
  employee_id: string;
  day_of_week: number; // 0 = Sunday
  effective_from: string;
  effective_until: string | null;
  created_by: string;
  created_at: string;
}

export interface EmployeeLeaveRow {
  id: string;
  employee_id: string;
  leave_date: string;
  leave_type: LeaveType;
  reason: string | null;
  notes: string | null;
  worked_on_leave: boolean;
  leave_counted: boolean;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface AttendanceRow {
  id: string;
  employee_id: string;
  attendance_date: string;
  session_number: number;
  attendance_type: AttendanceType;
  verification_method: VerificationMethod;
  additional_session_approval_id: string | null;
  check_in_at: string;
  check_out_at: string | null;
  schedule_id: string | null;
  scheduled_start: string | null;
  scheduled_end: string | null;
  required_minutes_snapshot: number | null;
  break_minutes_snapshot: number | null;
  day_classification: DayClassification;
  attendance_state: AttendanceState;
  worked_on_weekly_off: boolean;
  total_duration_minutes: number | null;
  working_minutes: number | null;
  regular_minutes: number | null;
  overtime_minutes: number | null;
  late_minutes: number;
  is_late: boolean;
  check_in_wifi_verified: boolean;
  check_out_wifi_verified: boolean | null;
  wfh_request_id: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface AdditionalAttendanceRequestRow {
  id: string;
  employee_id: string;
  requested_date: string;
  reason: string | null;
  status: AdditionalAttendanceStatus;
  requested_at: string;
  approved_by: string | null;
  approved_at: string | null;
  admin_notes: string | null;
  allowed_session_number: number | null;
  used: boolean;
  used_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface OfficeSettingsRow {

  id: string;
  office_timezone: string;
  default_required_minutes: number;
  default_break_minutes: number;
  min_minutes_before_checkout: number;
  max_session_minutes: number;
  office_wifi_ssids: string[];
  office_wifi_bssids: string[];
  created_at: string;
  updated_at: string;
}

export interface WfhRequestRow {
  id: string;
  employee_id: string;
  request_date: string;
  status: WfhStatus;
  reason: string | null;
  admin_notes: string | null;
  approved_by: string | null;
  approved_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface SalaryCalculationRow {
  id: string;
  employee_id: string;
  month: number;
  year: number;
  basic_salary: number;
  overtime_hours: number;
  overtime_rate: number;
  overtime_amount: number;
  other_earnings: number;
  salary_days: number;
  working_days: number;
  present_days: number;
  paid_leave: number;
  unpaid_leave: number;
  unpaid_leave_deduction: number;
  penalty_amount: number;
  penalty_reason: string | null;
  other_deductions: number;
  gross_salary: number;
  total_deductions: number;
  net_salary: number;
  status: "Draft" | "Paid";
  created_at: string;
  updated_at: string;
  updated_by: string | null;
}

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: ProfileRow;
        Insert: Partial<ProfileRow> &
          Pick<ProfileRow, "id" | "full_name" | "email">;
        Update: Partial<ProfileRow>;
      };
      employees: {
        Row: EmployeeRow;
        Insert: Partial<EmployeeRow> &
          Pick<EmployeeRow, "id" | "employee_code" | "department" | "position" | "joining_date">;
        Update: Partial<EmployeeRow>;
      };
      employee_schedules: {
        Row: EmployeeScheduleRow;
        Insert: Partial<EmployeeScheduleRow> &
          Pick<EmployeeScheduleRow, "employee_id" | "start_time" | "end_time" | "effective_from" | "created_by">;
        Update: Partial<EmployeeScheduleRow>;
      };
      weekly_off_schedules: {
        Row: WeeklyOffScheduleRow;
        Insert: Partial<WeeklyOffScheduleRow> &
          Pick<WeeklyOffScheduleRow, "employee_id" | "day_of_week" | "effective_from" | "created_by">;
        Update: Partial<WeeklyOffScheduleRow>;
      };
      employee_leaves: {
        Row: EmployeeLeaveRow;
        Insert: Partial<EmployeeLeaveRow> &
          Pick<EmployeeLeaveRow, "employee_id" | "leave_date" | "leave_type" | "created_by">;
        Update: Partial<EmployeeLeaveRow>;
      };
      attendance: {
        Row: AttendanceRow;
        Insert: Partial<AttendanceRow>;
        Update: Partial<AttendanceRow>;
      };
      office_settings: {
        Row: OfficeSettingsRow;
        Insert: Partial<OfficeSettingsRow>;
        Update: Partial<OfficeSettingsRow>;
      };
      wfh_requests: {
        Row: WfhRequestRow;
        Insert: Partial<WfhRequestRow>;
        Update: Partial<WfhRequestRow>;
      },
      employee_devices: {
        Row: EmployeeDeviceRow;
        Insert: Partial<EmployeeDeviceRow>;
        Update: Partial<EmployeeDeviceRow>;
      },
      biometric_challenges: {
        Row: BiometricChallengeRow;
        Insert: Partial<BiometricChallengeRow>;
        Update: Partial<BiometricChallengeRow>;
      },
      salary_calculations: {
        Row: SalaryCalculationRow;
        Insert: Partial<SalaryCalculationRow>;
        Update: Partial<SalaryCalculationRow>;
      },
    };
    Functions: {


      fn_check_in: {
        Args: {
          p_attendance_type: AttendanceType;
          p_wifi_verified: boolean;
          p_qr_token: string | null;
        };
        Returns: AttendanceRow;
      };
      fn_check_out: {
        Args: {
          p_attendance_id: string;
          p_wifi_verified: boolean;
          p_qr_token: string | null;
        };
        Returns: AttendanceRow;
      };
      fn_request_additional_checkin: {
        Args: {
          p_reason: string;
        };
        Returns: any; // simplified
      };
      fn_admin_correct_attendance: {
        Args: {
          p_attendance_id: string;
          p_field: string;
          p_new_value: string;
          p_reason: string;
        };
        Returns: AttendanceRow;
      };
    };
  };
}
