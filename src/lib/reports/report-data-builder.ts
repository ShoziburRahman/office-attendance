import { createClient } from "@/lib/supabase/server";
import { calculateDailyStatus } from "@/lib/attendance-utils";
import type { AttendanceRow, EmployeeLeaveRow, WeeklyOffScheduleRow } from "@/types/database";

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
    absentDays: number;
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
    .select("employee_code, position, department, joining_date, profiles(full_name)")
    .eq("id", employeeId)
    .single();

  if (!employee) throw new Error("Employee not found");
  const employeeData = employee as any;
  const joiningDate = employeeData.joining_date;

  // 2. Attendance Data
  const { data: attendance } = await supabase
    .from("attendance")
    .select("*")
    .eq("employee_id", employeeId)
    .gte("attendance_date", startDateStr)
    .lte("attendance_date", endDateStr)
    .order("attendance_date", { ascending: true });

  const attendanceData = (attendance as AttendanceRow[]) || [];

  // 3. Leave Data
  const { data: leaves } = await supabase
    .from("employee_leaves")
    .select("*")
    .eq("employee_id", employeeId)
    .gte("leave_date", startDateStr)
    .lte("leave_date", endDateStr);

  const leavesData = (leaves as EmployeeLeaveRow[]) || [];

  // 4. Weekly Offs
  const { data: weeklyOffs } = await supabase
    .from("weekly_off_schedules")
    .select("*")
    .eq("employee_id", employeeId)
    .lte("effective_from", endDateStr)
    .or(`effective_until.is.null,effective_until.gte.${startDateStr}`);

  const weeklyOffsData = (weeklyOffs as WeeklyOffScheduleRow[]) || [];

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
  let absentDays = 0;
  let paidLeaveDays = 0;
  let unpaidLeaveDays = 0;
  let weeklyOffCount = 0;
  let totalLateMinutes = 0;
  let totalOvertime = 0;
  let totalWorkingMinutes = 0;

  for (let d = 1; d <= endDate.getDate(); d++) {
    const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    const dateObj = new Date(dateStr);

    const statusData = calculateDailyStatus(
      dateStr,
      employeeId,
      attendanceData,
      leavesData,
      weeklyOffsData,
      joiningDate
    );

    const isWfh = wfhData.some(w => w.request_date === dateStr);

    let displayStatus = "";
    switch (statusData.status) {
      case 'PRESENT': displayStatus = "Present"; break;
      case 'MISSING_CHECK_OUT': displayStatus = "Active"; break;
      case 'PAID_LEAVE': displayStatus = "Paid Leave"; break;
      case 'UNPAID_LEAVE': displayStatus = "Unpaid Leave"; break;
      case 'WEEKLY_OFF': displayStatus = "Weekly Off"; break;
      case 'ABSENT':
        displayStatus = isWfh ? "WFH (Approved)" : "Absent";
        break;
    }

    const checkIn = statusData.checkIn ? new Date(statusData.checkIn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : null;
    const checkOut = statusData.checkOut ? new Date(statusData.checkOut).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : null;
    const duration = statusData.durationMinutes > 0 ? `${statusData.durationMinutes}m` : null;

    if (statusData.status === 'PRESENT' || statusData.status === 'MISSING_CHECK_OUT') {
      daysWorked++;
      presentDays++;
      totalLateMinutes += statusData.lateMinutes;
      totalOvertime += statusData.overtimeMinutes;
      totalWorkingMinutes += statusData.durationMinutes;
    } else if (statusData.status === 'PAID_LEAVE') {
      paidLeaveDays++;
    } else if (statusData.status === 'UNPAID_LEAVE') {
      unpaidLeaveDays++;
    } else if (statusData.status === 'WEEKLY_OFF') {
      weeklyOffCount++;
    } else if (statusData.status === 'ABSENT') {
      if (!isWfh) absentDays++;
    }

    if (!statusData.isWeeklyOff && statusData.status !== 'PAID_LEAVE') {
      totalWorkingDays++;
    }

    dailyDetails.push({
      date: dateStr,
      day: getDayName(dateStr),
      status: displayStatus,
      checkIn,
      checkOut,
      duration,
      lateMinutes: statusData.lateMinutes,
      isLate: statusData.isLate,
      overtime: statusData.overtimeMinutes,
      isWeeklyOff: statusData.isWeeklyOff,
      leaveType: statusData.status === 'PAID_LEAVE' ? 'PAID' : (statusData.status === 'UNPAID_LEAVE' ? 'UNPAID' : null),
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
      absentDays,
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
