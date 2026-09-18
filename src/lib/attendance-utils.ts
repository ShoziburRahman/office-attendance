import type { AttendanceRow, EmployeeLeaveRow, WeeklyOffScheduleRow } from "@/types/database";
import { format, eachDayOfInterval } from "date-fns";

export interface LifetimeSummary {
  total_days_worked: number;
  total_hours_worked: number;
  total_overtime: number;
  total_present_days: number;
  total_absent_days: number;
  total_paid_leave: number;
  total_unpaid_leave: number;
  total_weekly_offs: number;
  weekly_offs_worked: number;
  total_late_arrivals: number;
}

export interface MonthlySummary {
  year: number;
  month: number;
  working_days: number;
  present_days: number;
  absent_days: number;
  paid_leave: number;
  unpaid_leave: number;
  weekly_offs: number;
  weekly_offs_worked: number;
  total_hours: number;
  overtime: number;
  late_days: number;
}

export interface DailyStatus {
  date: string;
  status: 'PRESENT' | 'ABSENT' | 'PAID_LEAVE' | 'UNPAID_LEAVE' | 'WEEKLY_OFF' | 'MISSING_CHECK_OUT';
  checkIn: string | null;
  checkOut: string | null;
  durationMinutes: number;
  lateMinutes: number;
  overtimeMinutes: number;
  isLate: boolean;
  isWeeklyOff: boolean;
}

export function calculateDailyStatus(
  date: string,
  employeeId: string,
  attendance: AttendanceRow[],
  leaves: EmployeeLeaveRow[],
  weeklyOffs: WeeklyOffScheduleRow[],
  joiningDate: string
): DailyStatus {
  const d = new Date(date);
  const dayOfWeek = d.getDay(); // 0 = Sunday

  if (date < joiningDate) {
    return {
      date,
      status: 'ABSENT',
      checkIn: null, checkOut: null, durationMinutes: 0, lateMinutes: 0, overtimeMinutes: 0, isLate: false, isWeeklyOff: false
    };
  }

  const dayAttendance = attendance.find(a => a.attendance_date === date);
  const dayLeave = leaves.find(l => l.leave_date === date);
  const isWeeklyOff = weeklyOffs.some(wo =>
    wo.day_of_week === dayOfWeek &&
    date >= wo.effective_from &&
    (!wo.effective_until || date < wo.effective_until)
  );

  if (dayAttendance) {
    const isMissingCheckout = dayAttendance.attendance_state === 'MISSING_CHECK_OUT' || dayAttendance.check_out_at === null;
    return {
      date,
      status: isMissingCheckout ? 'MISSING_CHECK_OUT' : 'PRESENT',
      checkIn: dayAttendance.check_in_at,
      checkOut: dayAttendance.check_out_at,
      durationMinutes: dayAttendance.total_duration_minutes || 0,
      lateMinutes: dayAttendance.late_minutes || 0,
      overtimeMinutes: dayAttendance.overtime_minutes || 0,
      isLate: dayAttendance.is_late,
      isWeeklyOff: dayAttendance.worked_on_weekly_off
    };
  }

  if (dayLeave) {
    return {
      date,
      status: dayLeave.leave_type === 'PAID' ? 'PAID_LEAVE' : 'UNPAID_LEAVE',
      checkIn: null, checkOut: null, durationMinutes: 0, lateMinutes: 0, overtimeMinutes: 0, isLate: false, isWeeklyOff: false
    };
  }

  if (isWeeklyOff) {
    return {
      date,
      status: 'WEEKLY_OFF',
      checkIn: null, checkOut: null, durationMinutes: 0, lateMinutes: 0, overtimeMinutes: 0, isLate: false, isWeeklyOff: true
    };
  }

  return {
    date,
    status: 'ABSENT',
    checkIn: null, checkOut: null, durationMinutes: 0, lateMinutes: 0, overtimeMinutes: 0, isLate: false, isWeeklyOff: false
  };
}

export function calculateAttendanceSummaries(
  attendance: AttendanceRow[],
  leaves: EmployeeLeaveRow[] = [],
  weeklyOffs: WeeklyOffScheduleRow[] = [],
  employeeId: string,
  joiningDate: string,
  startDate?: string,
  endDate?: string
) {
  const lifetime: LifetimeSummary = {
    total_days_worked: 0,
    total_hours_worked: 0,
    total_overtime: 0,
    total_present_days: 0,
    total_absent_days: 0,
    total_paid_leave: 0,
    total_unpaid_leave: 0,
    total_weekly_offs: 0,
    weekly_offs_worked: 0,
    total_late_arrivals: 0,
  };

  const monthlyMap: Record<string, MonthlySummary> = {};

  const summaryStart = startDate ? new Date(startDate) : new Date(joiningDate);
  const summaryEnd = endDate ? new Date(endDate) : new Date();
  const days = eachDayOfInterval({ start: summaryStart, end: summaryEnd });

  days.forEach(day => {
    const dateStr = format(day, 'yyyy-MM-dd');
    const statusData = calculateDailyStatus(dateStr, employeeId, attendance, leaves, weeklyOffs, joiningDate);
    const year = day.getFullYear();
    const month = day.getMonth() + 1;
    const monthKey = `${year}-${month}`;

    if (!monthlyMap[monthKey]) {
      monthlyMap[monthKey] = {
        year, month, working_days: 0, present_days: 0, absent_days: 0,
        paid_leave: 0, unpaid_leave: 0, weekly_offs: 0, weekly_offs_worked: 0,
        total_hours: 0, overtime: 0, late_days: 0,
      };
    }

    const m = monthlyMap[monthKey];

    switch (statusData.status) {
      case 'PRESENT':
      case 'MISSING_CHECK_OUT':
        lifetime.total_present_days++;
        m.present_days++;
        lifetime.total_hours_worked += statusData.durationMinutes / 60;
        m.total_hours += statusData.durationMinutes / 60;
        lifetime.total_overtime += statusData.overtimeMinutes / 60;
        m.overtime += statusData.overtimeMinutes / 60;
        if (statusData.isLate) {
          lifetime.total_late_arrivals++;
          m.late_days++;
        }
        break;
      case 'ABSENT':
        lifetime.total_absent_days++;
        m.absent_days++;
        break;
      case 'PAID_LEAVE':
        lifetime.total_paid_leave++;
        m.paid_leave++;
        break;
      case 'UNPAID_LEAVE':
        lifetime.total_unpaid_leave++;
        m.unpaid_leave++;
        break;
      case 'WEEKLY_OFF':
        lifetime.total_weekly_offs++;
        m.weekly_offs++;
        break;
    }

    if (statusData.isWeeklyOff) {
      lifetime.weekly_offs_worked++;
      m.weekly_offs_worked++;
    }
  });

  lifetime.total_days_worked = lifetime.total_present_days;

  return {
    lifetimeSummary: lifetime,
    monthlySummaries: Object.values(monthlyMap).sort((a, b) => b.year - a.year || b.month - a.month),
  };
}
