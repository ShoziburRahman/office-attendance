import type { AttendanceRow } from "@/types/database";

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

export function calculateAttendanceSummaries(
  attendance: AttendanceRow[],
  leaves: any[] = [],
  weeklyOffs: any[] = []
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

  // Process Attendance
  const dateGroups = new Map<string, AttendanceRow[]>();
  attendance.forEach(rec => {
    const date = rec.attendance_date;
    if (!dateGroups.has(date)) dateGroups.set(date, []);
    dateGroups.get(date)!.push(rec);
  });

  dateGroups.forEach((sessions, date) => {
    const d = new Date(date);
    const year = d.getFullYear();
    const month = d.getMonth() + 1;
    const monthKey = `${year}-${month}`;

    if (!monthlyMap[monthKey]) {
      monthlyMap[monthKey] = {
        year,
        month,
        working_days: 0,
        present_days: 0,
        absent_days: 0,
        paid_leave: 0,
        unpaid_leave: 0,
        weekly_offs: 0,
        weekly_offs_worked: 0,
        total_hours: 0,
        overtime: 0,
        late_days: 0,
      };
    }

    const m = monthlyMap[monthKey];
    const totalWorkingMin = sessions.reduce((acc, s) => acc + (s.working_minutes || 0), 0);
    const totalOvertimeMin = sessions.reduce((acc, s) => acc + (s.overtime_minutes || 0), 0);
    const isPresent = sessions.some(s => s.attendance_state === 'CHECKED_OUT');
    const isLate = sessions.some(s => s.is_late);
    const workedOff = sessions.some(s => s.worked_on_weekly_off);

    // Lifetime
    lifetime.total_hours_worked += totalWorkingMin / 60;
    lifetime.total_overtime += totalOvertimeMin / 60;
    if (isPresent) lifetime.total_present_days++;
    if (isLate) lifetime.total_late_arrivals++;
    if (workedOff) lifetime.weekly_offs_worked++;

    // Monthly
    m.total_hours += totalWorkingMin / 60;
    m.overtime += totalOvertimeMin / 60;
    if (isPresent) m.present_days++;
    if (isLate) m.late_days++;
    if (workedOff) m.weekly_offs_worked++;
  });

  // Process Leaves
  leaves.forEach(l => {
    const d = new Date(l.leave_date);
    const year = d.getFullYear();
    const month = d.getMonth() + 1;
    const monthKey = `${year}-${month}`;

    if (!monthlyMap[monthKey]) {
      monthlyMap[monthKey] = {
        year,
        month,
        working_days: 0,
        present_days: 0,
        absent_days: 0,
        paid_leave: 0,
        unpaid_leave: 0,
        weekly_offs: 0,
        weekly_offs_worked: 0,
        total_hours: 0,
        overtime: 0,
        late_days: 0,
      };
    }

    const m = monthlyMap[monthKey];
    if (l.leave_type === 'PAID') {
      lifetime.total_paid_leave++;
      m.paid_leave++;
    } else {
      lifetime.total_unpaid_leave++;
      m.unpaid_leave++;
    }
  });

  // Process Weekly Offs
  weeklyOffs.forEach(off => {
    const d = new Date(off.effective_from);
    const year = d.getFullYear();
    const month = d.getMonth() + 1;
    const monthKey = `${year}-${month}`;
    // Note: Weekly offs are usually recurring, but for summary we often count
    // total assigned off-days or similar. Given the existing RPC structure,
    // we'll just count the records for now.
    lifetime.total_weekly_offs++;
  });

  // Final adjustments for lifetime
  lifetime.total_days_worked = lifetime.total_present_days;

  return {
    lifetimeSummary: lifetime,
    monthlySummaries: Object.values(monthlyMap).sort((a, b) => b.year - a.year || b.month - a.month),
  };
}
