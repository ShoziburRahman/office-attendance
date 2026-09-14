import type { EmployeeFormInput, ScheduleInput, WeeklyOffInput, LeaveInput } from "@/lib/validation/employee";

export interface EmployeeActionState {
  error: string | null;
  fieldErrors?: Partial<Record<keyof EmployeeFormInput, string>>;
  /** Shown once after creation — the admin must relay this to the employee. */
  temporaryPassword?: string;
}

export interface ScheduleActionState {
  error: string | null;
  fieldErrors?: Partial<Record<keyof ScheduleInput, string>>;
}

export interface WeeklyOffActionState {
  error: string | null;
  fieldErrors?: Partial<Record<keyof WeeklyOffInput, string>>;
}

export interface LeaveActionState {
  error: string | null;
  fieldErrors?: Partial<Record<keyof LeaveInput, string>>;
}

export const initialEmployeeActionState: EmployeeActionState = { error: null };
export const initialScheduleActionState: ScheduleActionState = { error: null };
export const initialWeeklyOffActionState: WeeklyOffActionState = { error: null };
export const initialLeaveActionState: LeaveActionState = { error: null };
