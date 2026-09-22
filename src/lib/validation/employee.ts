export interface EmployeeFormInput {
  fullName: string;
  email: string;
  phone: string;
  employeeCode: string;
  department: string;
  position: string;
  joiningDate: string;
  allowMultipleSessions: boolean;
  biometricRequired: boolean;
  baseSalary: string;
  avatarFile?: File;
}

export interface ScheduleInput {
  startTime: string;
  endTime: string;
  requiredMinutes: string;
  breakMinutes: string;
  effectiveFrom: string;
}

export interface WeeklyOffInput {
  dayOfWeek: string;
  effectiveFrom: string;
}

export interface LeaveInput {
  leaveDate: string;
  leaveType: "PAID" | "UNPAID";
  reason: string;
}

export type EmployeeFormErrors = Partial<Record<keyof EmployeeFormInput, string>>;
export type ScheduleErrors = Partial<Record<keyof ScheduleInput, string>>;
export type WeeklyOffErrors = Partial<Record<keyof WeeklyOffInput, string>>;
export type LeaveErrors = Partial<Record<keyof LeaveInput, string>>;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const EMPLOYEE_CODE_RE = /^[A-Za-z0-9_-]{2,32}$/; // mirrors chk_employee_code_format in the DB
const TIME_RE = /^([01]\d|2[0-3]):([0-5]\d)$/; // HH:MM

/**
 * Client- and server-side validation for the employee form. Runs on both
 * sides: once in the browser for fast feedback, and again inside the server
 * action, because the client is never trusted for anything that writes data.
 */
export function validateEmployeeForm(input: EmployeeFormInput): EmployeeFormErrors {
  const errors: EmployeeFormErrors = {};

  if (!input.fullName.trim()) {
    errors.fullName = "Full name is required.";
  }

  if (!EMAIL_RE.test(input.email.trim())) {
    errors.email = "Enter a valid email address.";
  }

  if (!EMPLOYEE_CODE_RE.test(input.employeeCode.trim())) {
    errors.employeeCode = "2–32 characters: letters, numbers, hyphens, or underscores.";
  }

  if (!input.department.trim()) {
    errors.department = "Department is required.";
  }

  if (!input.position.trim()) {
    errors.position = "Position is required.";
  }

  if (!input.joiningDate) {
    errors.joiningDate = "Joining date is required.";
  } else if (Number.isNaN(Date.parse(input.joiningDate))) {
    errors.joiningDate = "Enter a valid date.";
  }

  if (input.baseSalary && (isNaN(parseFloat(input.baseSalary)) || parseFloat(input.baseSalary) < 0)) {
    errors.baseSalary = "Base salary must be a positive number.";
  }

  return errors;
}

export function validateSchedule(input: ScheduleInput): ScheduleErrors {
  const errors: ScheduleErrors = {};

  if (!TIME_RE.test(input.startTime)) {
    errors.startTime = "Enter a valid start time (HH:MM).";
  }
  if (!TIME_RE.test(input.endTime)) {
    errors.endTime = "Enter a valid end time (HH:MM).";
  }
  if (!input.requiredMinutes || isNaN(parseInt(input.requiredMinutes)) || parseInt(input.requiredMinutes) < 0) {
    errors.requiredMinutes = "Required minutes must be a positive number.";
  }
  if (!input.breakMinutes || isNaN(parseInt(input.breakMinutes)) || parseInt(input.breakMinutes) < 0) {
    errors.breakMinutes = "Break minutes must be a positive number.";
  }
  if (!input.effectiveFrom || Number.isNaN(Date.parse(input.effectiveFrom))) {
    errors.effectiveFrom = "A valid effective date is required.";
  }

  return errors;
}

export function validateWeeklyOff(input: WeeklyOffInput): WeeklyOffErrors {
  const errors: WeeklyOffErrors = {};

  const day = parseInt(input.dayOfWeek);
  if (isNaN(day) || day < 0 || day > 6) {
    errors.dayOfWeek = "Select a valid day of the week.";
  }
  if (!input.effectiveFrom || Number.isNaN(Date.parse(input.effectiveFrom))) {
    errors.effectiveFrom = "A valid effective date is required.";
  }

  return errors;
}

export function validateLeave(input: LeaveInput): LeaveErrors {
  const errors: LeaveErrors = {};

  if (!input.leaveDate || Number.isNaN(Date.parse(input.leaveDate))) {
    errors.leaveDate = "A valid leave date is required.";
  }
  if (!input.leaveType) {
    errors.leaveType = "Leave type is required.";
  }
  if (!input.reason.trim()) {
    errors.reason = "Reason is required.";
  }

  return errors;
}

export function hasErrors(errors: Record<string, string>): boolean {
  return Object.keys(errors).length > 0;
}
