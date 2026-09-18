"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth/session";
import type {
  AttendanceRow,
  EmployeeLeaveRow,
  WeeklyOffScheduleRow,
  EmployeeWithProfile
} from "@/types/database";

export interface PeriodFilterConfig {
  type: 'LIFETIME' | 'MONTH' | 'CUSTOM';
  month?: number;
  year?: number;
  startDate?: string;
  endDate?: string;
}

export interface FilteredProfileData {
  employee: EmployeeWithProfile;
  attendance: AttendanceRow[];
  leaves: EmployeeLeaveRow[];
  weeklyOffs: WeeklyOffScheduleRow[];
  schedules: any[];
}

export async function getEmployeeProfileFilteredData(
  employeeId: string,
  filter: PeriodFilterConfig
) {
  const currentUser = await requireUser();
  if (currentUser.profile.role !== "ADMIN") {
    throw new Error("Unauthorized: Admin access required");
  }

  const supabase = await createClient();

  // 1. Fetch Employee and Joining Date
  const { data: employee, error: empError } = await supabase
    .from("employees")
    .select("*, profile:profiles(*)")
    .eq("id", employeeId)
    .single();

  if (empError || !employee) {
    throw new Error("Employee not found");
  }

  const empWithProfile = employee as any as EmployeeWithProfile;
  const joiningDate = empWithProfile.joining_date;

  // 2. Determine Date Range
  const now = new Date();
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  let start: string = today;
  let end: string = today;

  if (filter.type === 'LIFETIME') {
    start = joiningDate;
    end = today;
  } else if (filter.type === 'MONTH') {
    const year = filter.year || now.getFullYear();
    const month = filter.month || (now.getMonth() + 1);

    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0);

    const fmt = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    start = fmt(startDate);
    end = fmt(endDate);
  } else {
    // CUSTOM
    start = filter.startDate || joiningDate;
    end = filter.endDate || today;
  }

  // Bound by joining date and today to prevent invalid synthesis
  const actualStart = start < joiningDate ? joiningDate : start;
  const actualEnd = end > today ? today : end;

  // 3. Fetch Data within range
  const [attendanceRes, leavesRes, weeklyOffsRes, schedulesRes] = await Promise.all([
    supabase
      .from("attendance")
      .select("*")
      .eq("employee_id", employeeId)
      .gte("attendance_date", actualStart)
      .lte("attendance_date", actualEnd)
      .order("attendance_date", { ascending: false }),

    supabase
      .from("employee_leaves")
      .select("*")
      .eq("employee_id", employeeId)
      .gte("leave_date", actualStart)
      .lte("leave_date", actualEnd),

    supabase
      .from("weekly_off_schedules")
      .select("*")
      .eq("employee_id", employeeId)
      .lte("effective_from", actualEnd)
      .or(`effective_until.is.null,effective_until.gte.${actualStart}`),

    supabase
      .from("employee_schedules")
      .select("*")
      .eq("employee_id", employeeId)
      .lte("effective_from", actualEnd)
      .or(`effective_until.is.null,effective_until.gte.${actualStart}`)
      .order("effective_from", { ascending: false }),
  ]);

  return {
    employee: empWithProfile,
    attendance: (attendanceRes.data || []) as AttendanceRow[],
    leaves: (leavesRes.data || []) as EmployeeLeaveRow[],
    weeklyOffs: (weeklyOffsRes.data || []) as WeeklyOffScheduleRow[],
    schedules: (schedulesRes.data || []) as any[],
    range: { start: actualStart, end: actualEnd }
  };
}
