import { createClient } from "@/lib/supabase/server";

export interface MonthlyReportData {
  employee: {
    full_name: string;
    employee_code: string;
    position: string;
    department: string;
  };
  period: {
    month: string;
    year: number;
  };
  summary: {
    totalWorkingDays: number;
    daysWorked: number;
    presentDays: number;
    paidLeaveDays: number;
    unpaidLeaveDays: number;
    weeklyOffs: number;
    totalLateMinutes: number;
    totalOvertimeMinutes: number;
    totalWorkingHours: number;
  };
  dailyDetails: Array<{
    date: string;
    day: string;
    status: string;
    checkIn: string | null;
    checkOut: string | null;
    duration: string | null;
    lateMinutes: number;
    isLate: boolean;
    overtime: number;
    isWeeklyOff: boolean;
    leaveType: string | null;
    isWfh: boolean;
  }>;
}

export async function buildMonthlyReportData(employeeId: string, month: number, year: number): Promise<MonthlyReportData> {
  const supabase = await createClient();

  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 0);
  const startDateStr = startDate.toISOString().split('T')[0];
  const endDateStr = endDate.toISOString().split('T')[0];

  // 1. Employee Info
  const { data: employee } = await supabase
    .from("employees")
    .select("employee_code, position, department, profiles(full_name)")
    .eq("id", employeeId)
    .single();

  if (!employee) throw new Error("Employee not found");
  const employeeData = employee as any;

  // 2. Attendance Data
  const { data: attendance } = await supabase
    .from("attendance")
    .select("*")
    .eq("employee_id", employeeId)
    .gte("attendance_date", startDateStr)
    .lte("attendance_date", endDateStr)
    .order("attendance_date", { ascending: true });

  const attendanceData = (attendance as any[]) || [];

  // 3. Leave Data
  const { data: leaves } = await supabase
    .from("employee_leaves")
    .select("*")
    .eq("employee_id", employeeId)
    .gte("leave_date", startDateStr)
    .lte("leave_date", endDateStr);

  const leavesData = (leaves as any[]) || [];

  // 4. Weekly Offs
  const { data: weeklyOffs } = await supabase
    .from("weekly_off_schedules")
    .select("*")
    .eq("employee_id", employeeId)
    .lte("effective_from", endDateStr)
    .or(`effective_until.is.null,effective_until.gte.${startDateStr}`);

  const weeklyOffsData = (weeklyOffs as any[]) || [];

  // 5. WFH Requests
  const { data: wfh } = await supabase
    .from("wfh_requests")
    .select("*")
    .eq("employee_id", employeeId)
    .eq("status", "APPROVED")
    .gte("request_date", startDateStr)
    .lte("request_date", endDateStr);

  const wfhData = (wfh as any[]) || [];

  // Helper to get day name
  const getDayName = (dateStr: string) => {
    return new Intl.DateTimeFormat('en-US', { weekday: 'long' }).format(new Date(dateStr));
  };

  // Generate details for every day of the month
  const dailyDetails: MonthlyReportData['dailyDetails'] = [];
  let totalWorkingDays = 0;
  let daysWorked = 0;
  let presentDays = 0;
  let paidLeaveDays = 0;
  let unpaidLeaveDays = 0;
  let weeklyOffCount = 0;
  let totalLateMinutes = 0;
  let totalOvertime = 0;
  let totalWorkingMinutes = 0;

  for (let d = 1; d <= endDate.getDate(); d++) {
    const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    const dateObj = new Date(dateStr);
    const dayOfWeek = dateObj.getDay(); // 0 = Sunday

    const dayAttendance = attendanceData.find(a => a.attendance_date === dateStr);
    const dayLeave = leavesData.find(l => l.leave_date === dateStr);
    const isWeeklyOff = weeklyOffsData.some(wo => wo.day_of_week === dayOfWeek);
    const isWfh = wfhData.some(w => w.request_date === dateStr);

    let status = "Absent";
    let checkIn: string | null = null;
    let checkOut: string | null = null;
    let duration: string | null = null;
    let late = 0;
    let isLate = false;
    let overtime = 0;

    if (dayAttendance) {
      status = dayAttendance.attendance_state === "CHECKED_IN" ? "Active" : "Present";
      checkIn = dayAttendance.check_in_at ? new Date(dayAttendance.check_in_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : null;
      checkOut = dayAttendance.check_out_at ? new Date(dayAttendance.check_out_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : null;
      duration = dayAttendance.working_minutes ? `${dayAttendance.working_minutes}m` : null;
      late = dayAttendance.late_minutes || 0;
      isLate = dayAttendance.is_late;
      overtime = dayAttendance.overtime_minutes || 0;

      daysWorked++;
      presentDays++;
      totalLateMinutes += late;
      totalOvertime += overtime;
      totalWorkingMinutes += (dayAttendance.working_minutes || 0);
    } else if (dayLeave) {
      status = dayLeave.leave_type === "PAID" ? "Paid Leave" : "Unpaid Leave";
      if (dayLeave.leave_type === "PAID") paidLeaveDays++; else unpaidLeaveDays++;
    } else if (isWeeklyOff) {
      status = "Weekly Off";
      weeklyOffCount++;
    } else if (isWfh) {
      status = "WFH (Approved)";
      // WFH usually counts as present if they actually check in, but if it's just a request:
      // We treat approved WFH without attendance as a special status.
    }

    if (!isWeeklyOff && dayLeave?.leave_type !== 'PAID') {
      totalWorkingDays++;
    }

    dailyDetails.push({
      date: dateStr,
      day: getDayName(dateStr),
      status,
      checkIn,
      checkOut,
      duration,
      lateMinutes: late,
      isLate,
      overtime,
      isWeeklyOff,
      leaveType: dayLeave?.leave_type || null,
      isWfh,
    });
  }

  return {
    employee: {
      full_name: employeeData.profiles.full_name,
      employee_code: employeeData.employee_code,
      position: employeeData.position,
      department: employeeData.department,
    },
    period: { month: String(month), year },
    summary: {
      totalWorkingDays,
      daysWorked,
      presentDays,
      paidLeaveDays,
      unpaidLeaveDays,
      weeklyOffs: weeklyOffCount,
      totalLateMinutes,
      totalOvertimeMinutes: totalOvertime,
      totalWorkingHours: Math.floor(totalWorkingMinutes / 60),
    },
    dailyDetails,
  };
}
