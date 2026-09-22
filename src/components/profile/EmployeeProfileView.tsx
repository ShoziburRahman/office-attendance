"use client";

import { useState } from "react";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { initials, formatTime } from "@/lib/utils/format";
import { format, eachDayOfInterval } from "date-fns";
import { calculateDailyStatus } from "@/lib/attendance-utils";
import type { AttendanceRow, EmployeeLeaveRow, WeeklyOffScheduleRow } from "@/types/database";

interface LifetimeSummary {
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

interface MonthlySummary {
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

interface EmployeeProfileViewProps {
  employee: any;
  activeSchedule?: any;
  lifetimeSummary: LifetimeSummary;
  monthlySummaries: MonthlySummary[];
  detailedAttendance: AttendanceRow[];
  leaves: EmployeeLeaveRow[];
  weeklyOffs: WeeklyOffScheduleRow[];
}

export function EmployeeProfileView({
  employee,
  activeSchedule,
  lifetimeSummary,
  monthlySummaries,
  detailedAttendance,
  leaves,
  weeklyOffs,
}: EmployeeProfileViewProps) {
  const [expandedMonth, setExpandedMonth] = useState<string | null>(null);
  const [imageError, setImageError] = useState(false);


  const getMonthName = (month: number) => {
    if (!month || isNaN(month)) return "Unknown Month";
    try {
      return format(new Date(2000, month - 1, 1), "MMMM");
    } catch (e) {
      return "Unknown Month";
    }
  };

  const toggleMonth = (yearMonth: string) => {
    setExpandedMonth(expandedMonth === yearMonth ? null : yearMonth);
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row gap-6 items-start">
        <div className="flex h-24 w-24 shrink-0 items-center justify-center rounded-full bg-teal-50 text-3xl font-bold text-teal-700 border-4 border-white shadow-sm overflow-hidden">
          {employee.profile.avatar_url && !imageError ? (
            <img
              src={employee.profile.avatar_url}
              alt={employee.profile.full_name}
              className="h-full w-full object-cover"
              onError={() => setImageError(true)}
            />
          ) : (
            initials(employee.profile.full_name)
          )}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-12 gap-y-2 flex-1">
          <div className="flex flex-col">
            <p className="text-xs uppercase tracking-wider text-ink-400 font-semibold">Full Name</p>
            <p className="text-sm font-medium text-ink-900">{employee.profile.full_name}</p>
          </div>
          <div className="flex flex-col">
            <p className="text-xs uppercase tracking-wider text-ink-400 font-semibold">Employee ID</p>
            <p className="text-sm font-medium text-ink-900">{employee.employee_code}</p>
          </div>
          <div className="flex flex-col">
            <p className="text-xs uppercase tracking-wider text-ink-400 font-semibold">Designation</p>
            <p className="text-sm font-medium text-ink-900">{employee.position}</p>
          </div>
          <div className="flex flex-col">
            <p className="text-xs uppercase tracking-wider text-ink-400 font-semibold">Joining Date</p>
            <p className="text-sm font-medium text-ink-900">{employee.joining_date}</p>
          </div>
          <div className="flex flex-col">
            <p className="text-xs uppercase tracking-wider text-ink-400 font-semibold">Department</p>
            <p className="text-sm font-medium text-ink-900">{employee.department}</p>
          </div>
          <div className="flex flex-col">
            <p className="text-xs uppercase tracking-wider text-ink-400 font-semibold">Status</p>
            <EmployeeStatusBadge isActive={employee.is_active} />
          </div>
          <div className="flex flex-col">
            <p className="text-xs uppercase tracking-wider text-ink-400 font-semibold">Biometrics</p>
            <span className={`text-sm font-medium ${employee.biometric_required ? 'text-ink-900' : 'text-ink-400 italic'}`}>
              {employee.biometric_required ? 'Required' : 'Disabled by Admin'}
            </span>
          </div>
        </div>
      </div>

      <section>
        <h2 className="text-sm font-semibold text-ink-900 mb-4 uppercase tracking-wider">Current Work Schedule</h2>
        {activeSchedule ? (
          <Card>
            <CardBody className="flex items-center justify-between p-4">
              <div className="flex items-center gap-4">
                <div className="p-2 rounded-lg bg-teal-50 text-teal-700">
                  <span className="text-xs font-bold uppercase">Shift</span>
                </div>
                <div>
                  <p className="text-sm font-medium text-ink-900">
                    {formatTime(activeSchedule.start_time)} — {formatTime(activeSchedule.end_time)}
                  </p>
                  <p className="text-xs text-ink-400">
                    Required: {activeSchedule.required_minutes}m • Break: {activeSchedule.break_minutes}m
                  </p>
                </div>
              </div>
              <Badge tone="present">Active</Badge>
            </CardBody>
          </Card>
        ) : (
          <Card>
            <CardBody className="p-4 text-sm text-ink-400 italic">
              No active work schedule assigned.
            </CardBody>
          </Card>
        )}
      </section>

      <section>
        <h2 className="text-sm font-semibold text-ink-900 mb-4 uppercase tracking-wider">Period Statistics</h2>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
          <SummaryCard label="Days Worked" value={lifetimeSummary?.total_present_days ?? 0} />
          <SummaryCard label="Total Hours" value={`${(lifetimeSummary?.total_hours_worked ?? 0).toFixed(1)}h`} />
          <SummaryCard label="Overtime" value={`${(lifetimeSummary?.total_overtime ?? 0).toFixed(1)}h`} />
          <SummaryCard label="Absent Days" value={lifetimeSummary?.total_absent_days ?? 0} tone="late" />
          <SummaryCard label="Paid Leave" value={lifetimeSummary?.total_paid_leave ?? 0} />
          <SummaryCard label="Unpaid Leave" value={lifetimeSummary?.total_unpaid_leave ?? 0} />
          <SummaryCard label="Weekly Offs" value={lifetimeSummary?.total_weekly_offs ?? 0} />
          <SummaryCard label="Offs Worked" value={lifetimeSummary?.weekly_offs_worked ?? 0} />
          <SummaryCard label="Late Arrivals" value={lifetimeSummary?.total_late_arrivals ?? 0} tone="late" />
          <SummaryCard label="Total Present" value={lifetimeSummary?.total_present_days ?? 0} />
        </div>
      </section>

      <section>
        <h2 className="text-sm font-semibold text-ink-900 mb-4 uppercase tracking-wider">Attendance History</h2>
        <div className="space-y-4">
          {(monthlySummaries || []).length === 0 ? (
            <p className="text-sm text-ink-400 italic">No attendance records found.</p>
          ) : (
            (monthlySummaries || []).reduce((acc: any[], curr) => {
              const year = curr.year;
              const monthIdx = acc.findIndex(item => item.year === year);
              if (monthIdx === -1) {
                acc.push({ year, months: [curr] });
              } else {
                acc[monthIdx].months.push(curr);
              }
              return acc;
            }, []).sort((a, b) => b.year - a.year).map((yearGroup) => (
              <div key={yearGroup.year} className="space-y-3">
                <h3 className="text-md font-bold text-ink-900 border-b border-ink-100 pb-1">{yearGroup.year}</h3>
                <div className="grid grid-cols-1 gap-3">
                  {yearGroup.months.map((m: MonthlySummary) => {
                    const yearMonth = `${m.year}-${m.month}`;
                    const isExpanded = expandedMonth === yearMonth;

                    return (
                      <div key={yearMonth} className="border border-ink-100 rounded-lg overflow-hidden bg-white">
                        <button
                          onClick={() => toggleMonth(yearMonth)}
                          className="w-full flex items-center justify-between p-4 hover:bg-ink-50 transition-colors text-left"
                        >
                          <span className="text-sm font-medium text-ink-900">{getMonthName(m.month)}</span>
                          <div className="flex items-center gap-4">
                            <div className="hidden sm:flex gap-3 text-xs text-ink-500">
                              <span>Present: <b className="text-ink-900">{m.present_days}</b></span>
                              <span>Absent: <b className="text-status-late">{m.absent_days}</b></span>
                              <span>Hours: <b className="text-ink-900">{m.total_hours.toFixed(1)}h</b></span>
                            </div>
                            <span className={`text-xs transition-transform ${isExpanded ? 'rotate-180' : ''}`}>▼</span>
                          </div>
                        </button>

                        {isExpanded && (
                          <div className="p-4 border-t border-ink-100 bg-ink-50/30">
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6 p-3 bg-white rounded-md border border-ink-100 shadow-sm">
                              <StatItem label="Working Days" value={m.working_days} />
                              <StatItem label="Present" value={m.present_days} />
                              <StatItem label="Absent" value={m.absent_days} tone="late" />
                              <StatItem label="Paid Leave" value={m.paid_leave} />
                              <StatItem label="Unpaid Leave" value={m.unpaid_leave} />
                              <StatItem label="Weekly Offs" value={m.weekly_offs} />
                              <StatItem label="Offs Worked" value={m.weekly_offs_worked} />
                              <StatItem label="Total Hours" value={`${m.total_hours.toFixed(1)}h`} />
                              <StatItem label="Overtime" value={`${m.overtime.toFixed(1)}h`} />
                              <StatItem label="Late Days" value={m.late_days} tone="late" />
                            </div>

                            <div className="overflow-x-auto">
                              <table className="w-full text-left text-xs">
                                <thead>
                                  <tr className="text-ink-400 border-b border-ink-100">
                                    <th className="pb-2 font-medium">Date</th>
                                    <th className="pb-2 font-medium">Check-in</th>
                                    <th className="pb-2 font-medium">Check-out</th>
                                    <th className="pb-2 font-medium">Duration</th>
                                    <th className="pb-2 font-medium">Status</th>
                                    <th className="pb-2 font-medium">Late</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-ink-50">
                                  {(() => {
                                    const startDate = new Date(m.year, m.month - 1, 1);
                                    const endDate = new Date(m.year, m.month, 0);
                                    const days = eachDayOfInterval({ start: startDate, end: endDate });

                                    return days.sort((a, b) => b.getTime() - a.getTime()).map((day) => {
                                      const dateStr = format(day, 'yyyy-MM-dd');
                                      const statusData = calculateDailyStatus(
                                        dateStr,
                                        employee.id,
                                        detailedAttendance,
                                        leaves,
                                        weeklyOffs,
                                        employee.joining_date
                                      );

                                      return (
                                        <tr key={dateStr} className="hover:bg-white transition-colors">
                                          <td className="py-3 text-ink-900 font-medium">{dateStr}</td>
                                          <td className="py-3 text-ink-600">{statusData.checkIn ? format(new Date(statusData.checkIn), "p") : '—'}</td>
                                          <td className="py-3 text-ink-600">{statusData.checkOut ? format(new Date(statusData.checkOut), "p") : '...'}</td>
                                          <td className="py-3 text-ink-600">{statusData.durationMinutes ? `${Math.floor(statusData.durationMinutes / 60)}h ${statusData.durationMinutes % 60}m` : '—'}</td>
                                          <td className="py-3">
                                            <Badge tone={getStatusTone(statusData.status)}>
                                              {statusData.status === 'PRESENT' ? 'Present' : statusData.status === 'MISSING_CHECK_OUT' ? 'Active' : statusData.status}
                                            </Badge>
                                          </td>
                                          <td className="py-3 text-ink-600">{statusData.lateMinutes}m</td>
                                        </tr>
                                      );
                                    });
                                  })()}
                                </tbody>
                                </table>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  );
}

function SummaryCard({ label, value, tone = "neutral" }: { label: string, value: any, tone?: "neutral" | "late" }) {
  return (
    <Card className="bg-white">
      <CardBody className="p-3 text-center">
        <p className="text-[10px] uppercase tracking-wider text-ink-400 font-semibold mb-1">{label}</p>
        <p className={`text-lg font-bold ${tone === 'late' ? 'text-status-late' : 'text-ink-900'}`}>{value}</p>
      </CardBody>
    </Card>
  );
}

function StatItem({ label, value, tone = "neutral" }: { label: string, value: any, tone?: "neutral" | "late" }) {
  return (
    <div className="flex flex-col">
      <span className="text-[10px] text-ink-400 uppercase">{label}</span>
      <span className={`text-sm font-semibold ${tone === 'late' ? 'text-status-late' : 'text-ink-900'}`}>{value}</span>
    </div>
  );
}

function getStatusTone(status: string) {
  if (status === 'ABSENT') return 'late';
  if (status === 'WEEKLY_OFF') return 'neutral';
  if (status === 'PAID_LEAVE') return 'present';
  if (status === 'UNPAID_LEAVE') return 'neutral';
  if (status === 'PRESENT' || status === 'MISSING_CHECKOUT') return 'present';
  return 'neutral';
}

function EmployeeStatusBadge({ isActive }: { isActive: boolean }) {
  return (
    <Badge tone={isActive ? "present" : "late"}>
      {isActive ? "Active" : "Inactive"}
    </Badge>
  );
}
