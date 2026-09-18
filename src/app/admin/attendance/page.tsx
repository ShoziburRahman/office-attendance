import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Card, CardBody } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Field, Input } from "@/components/ui/Field";
import { Badge } from "@/components/ui/Badge";
import { initials } from "@/lib/utils/format";
import { CorrectionTrigger } from "@/components/admin/CorrectionTrigger";
import type { EmployeeWithProfile } from "@/types/database";
import { getBusinessDate } from "@/lib/date-utils";

export default async function AttendancePage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string; dept?: string; status?: string }>;
}) {
  const params = await searchParams;
  const date = params.date || getBusinessDate();
  const dept = params.dept || "";
  const status = params.status || "all";

  const supabase = await createClient();

  // 1. Fetch all attendance for the selected date
  const { data: records } = await supabase
    .from("attendance")
    .select(`
      *,
      employee:employees!attendance_employee_id_fkey(
        *,
        profile:profiles!employees_id_fkey(*)
      )
    `)
    .eq("attendance_date", date)
    .order("employee_id", { ascending: true })
    .order("session_number", { ascending: true })
    .returns<any[]>();

  // Also fetch all active employees to identify absentees
  const { data: allEmployees } = await supabase
    .from("employees")
    .select(`*, profile:profiles!employees_id_fkey(*)`)
    .eq("is_active", true)
    .returns<EmployeeWithProfile[]>();

  const attendanceMap = new Map<string, any[]>();
  (records || []).forEach(r => {
    const list = attendanceMap.get(r.employee_id) || [];
    list.push(r);
    attendanceMap.set(r.employee_id, list);
  });

  const processedData = (allEmployees || []).map(emp => {
    const sessions = attendanceMap.get(emp.id) || [];
    const isFutureDate = new Date(date) > new Date();

    return {
      employee: emp,
      sessions,
      status: isFutureDate
        ? 'upcoming'
        : (sessions.length > 0
            ? (sessions.some(s => s.attendance_state === 'CHECKED_IN' || s.attendance_state === 'CHECKED_OUT') ? 'present' : 'missing')
            : 'missing')
    };
  });

  // Filter by department and status
  const filteredData = processedData.filter(item => {
    const matchDept = !dept || item.employee.department === dept;
    const matchStatus = status === "all" || item.status === status;
    return matchDept && matchStatus;
  });

  // 2. Calculate Summary Stats
  const stats = {
    present: filteredData.filter(i => i.status === 'present').length,
    absent: filteredData.filter(i => i.status === 'missing').length,
    total: filteredData.length,
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-ink-900">Attendance Dashboard</h1>
          <p className="mt-1 text-sm text-ink-400">Office oversight and corrections</p>
        </div>
        <Link href="/admin/employees">
          <Button variant="secondary">Employees</Button>
        </Link>
      </div>

      {/* Date & Filter Bar */}
      <form className="flex flex-wrap items-end gap-3" action="/admin/attendance">
        <Field label="Date" htmlFor="date" required>
          <Input name="date" type="date" defaultValue={date} required />
        </Field>
        <Field label="Department" htmlFor="dept">
          <Input name="dept" placeholder="Filter by dept..." defaultValue={dept} />
        </Field>
        <Field label="Status" htmlFor="status">
          <select
            name="status"
            defaultValue={status}
            className="flex h-10 w-full rounded-md border border-ink-200 bg-white px-3 py-2 text-sm ring-offset-white focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2"
          >
            <option value="all">All Statuses</option>
            <option value="present">Present</option>
            <option value="missing">Absent</option>
            <option value="upcoming">Upcoming</option>
          </select>
        </Field>
        <Button type="submit" variant="secondary">Filter</Button>
      </form>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card>
          <CardBody className="flex flex-col items-center justify-center py-4">
            <p className="text-xs uppercase tracking-wider text-ink-400 font-semibold">Total Staff</p>
            <p className="text-2xl font-bold text-ink-900">{stats.total}</p>
          </CardBody>
        </Card>
        <Card>
          <CardBody className="flex flex-col items-center justify-center py-4">
            <p className="text-xs uppercase tracking-wider text-ink-400 font-semibold">Present</p>
            <p className="text-2xl font-bold text-teal-600">{stats.present}</p>
          </CardBody>
        </Card>
        <Card>
          <CardBody className="flex flex-col items-center justify-center py-4">
            <p className="text-xs uppercase tracking-wider text-ink-400 font-semibold">Absent</p>
            <p className="text-2xl font-bold text-status-late">{stats.absent}</p>
          </CardBody>
        </Card>
      </div>

      {/* Attendance List */}
      <Card>
        <CardBody className="p-0">
          <ul className="divide-y divide-ink-100">
            {filteredData.length === 0 ? (
              <li className="px-6 py-8 text-center text-sm text-ink-400">
                No records found for this date.
              </li>
            ) : (
              filteredData.map((item) => (
                <li key={item.employee.id} className="flex items-center justify-between px-6 py-4 hover:bg-ink-50 transition-colors">
                  <div className="flex items-center gap-4">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-teal-50 text-sm font-medium text-teal-700">
                      {initials(item.employee.profile.full_name)}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-ink-900">{item.employee.profile.full_name}</p>
                      <p className="text-xs text-ink-400">
                        {item.employee.department} • {item.employee.position}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-6">
                    <Badge tone={item.status === 'present' ? 'present' : (item.status === 'missing' ? 'late' : 'neutral')}>
                      {item.status === 'present' ? 'Present' : (item.status === 'missing' ? 'Absent' : 'Upcoming')}
                    </Badge>

                    <div className="flex flex-col items-end gap-2">
                      <div className="text-right">
                        <div className="flex flex-col gap-1">
                          {item.sessions.length > 0 ? (
                            item.sessions.map((s, idx) => (
                              <div key={s.id} className="flex items-center gap-3 text-xs">
                                <span className="text-ink-400">S{s.session_number}:</span>
                                <span className="text-ink-600">
                                  {s.check_in_at ? new Date(s.check_in_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : 'N/A'} → {s.check_out_at ? new Date(s.check_out_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : '...'}
                                </span>
                                <CorrectionTrigger
                                  attendance={s}
                                  employeeName={item.employee.profile.full_name}
                                  employeeId={item.employee.id}
                                  date={date}
                                />
                              </div>
                            ))
                          ) : (
                            <span className="text-xs text-ink-400">No record</span>
                          )}
                        </div>
                        {item.sessions.length > 0 && (
                          <p className="text-[10px] font-semibold text-ink-900 mt-1">
                            Total: {item.sessions.reduce((acc, s) => acc + (s.working_minutes || 0), 0)}m
                          </p>
                        )}
                      </div>
                      {item.sessions.length === 0 && (
                        <CorrectionTrigger
                          attendance={null}
                          employeeName={item.employee.profile.full_name}
                          employeeId={item.employee.id}
                          date={date}
                        />
                      )}
                    </div>
                  </div>
                </li>
              ))
            )}
          </ul>
        </CardBody>
      </Card>
    </div>
  );
}
