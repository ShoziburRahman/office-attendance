import { getCurrentUser } from "@/lib/auth/session";
import { Card, CardBody } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { formatDate, formatTime } from "@/lib/utils/format";
import { AttendanceDashboard } from "@/components/employee/AttendanceDashboard";
import { createClient } from "@/lib/supabase/server";
import type { AttendanceRow as Attendance } from "@/types/database";
import { getBusinessDate } from "@/lib/date-utils";
import { format } from "date-fns";

export default async function EmployeeTodayPage() {
  const user = await getCurrentUser();

  if (!user) {
    return null; // Layout handles redirect
  }

  const today = getBusinessDate();

  const supabase = await createClient();

  const [sessionsRes, scheduleRes, weeklyOffRes, employeeRes] = await Promise.all([
    supabase
      .from("attendance")
      .select("*")
      .eq("employee_id", user.authId)
      .eq("attendance_date", today)
      .order("session_number", { ascending: true }),
    supabase
      .from("employee_schedules")
      .select("*")
      .eq("employee_id", user.authId)
      .lte("effective_from", today)
      .or(`effective_until.is.null,effective_until.gte.${today}`)
      .maybeSingle(),
    supabase
      .from("weekly_off_schedules")
      .select("*")
      .eq("employee_id", user.authId)
      .lte("effective_from", today)
      .or(`effective_until.is.null,effective_until.gte.${today}`)
      .maybeSingle(),
    supabase
      .from("employees")
      .select("biometric_required")
      .eq("id", user.authId)
      .single(),
  ]);

  const sessions = sessionsRes.data || [];
  const schedule = scheduleRes.data as any;
  const weeklyOff = weeklyOffRes.data as any;
  const employee = employeeRes.data as any;

  // Calculate next weekly off date
  let nextWeeklyOffStr = null;
  if (weeklyOff) {
    const todayDate = new Date(today);
    const currentDay = todayDate.getDay();
    let daysUntil = (weeklyOff.day_of_week - currentDay + 7) % 7;

    // If today is the weekly off, we show today's date
    const targetDate = new Date(todayDate);
    targetDate.setDate(todayDate.getDate() + daysUntil);
    nextWeeklyOffStr = targetDate.toISOString().split("T")[0];
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-lg font-semibold text-ink-900">
          Hi, {user.profile.full_name.split(" ")[0]}
        </h1>
        <p className="mt-1 text-sm text-ink-400">{formatDate(today)}</p>
      </div>

      <AttendanceDashboard
        initialSessions={sessions}
        schedule={schedule}
        biometricRequired={employee?.biometric_required ?? true}
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Card>
          <CardBody className="p-4">
            <p className="text-xs uppercase tracking-wider text-ink-400 font-semibold mb-2">Current Schedule</p>
            {schedule ? (
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-ink-900">
                  {formatTime(schedule.start_time)} — {formatTime(schedule.end_time)}
                </p>
                <Badge tone="neutral" className="text-[10px] px-2 py-0">
                  {schedule.required_minutes}m Req.
                </Badge>
              </div>
            ) : (
              <p className="text-sm text-ink-400 italic">No active schedule assigned</p>
            )}
          </CardBody>
        </Card>

        <Card>
          <CardBody className="p-4">
            <p className="text-xs uppercase tracking-wider text-ink-400 font-semibold mb-2">Next Weekly Off</p>
            {nextWeeklyOffStr ? (
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-ink-900">
                  {format(new Date(nextWeeklyOffStr), "eeee, MMM do")}
                </p>
                <Badge tone="present" className="text-[10px] px-2 py-0">
                  {nextWeeklyOffStr === today ? "Today" : "Upcoming"}
                </Badge>
              </div>
            ) : (
              <p className="text-sm text-ink-400 italic">No weekly off configured</p>
            )}
          </CardBody>
        </Card>
      </div>

      <Card>
        <CardBody>
          <p className="text-sm text-ink-600">
            Your work schedule, leave totals, and overtime summary are available in your profile.
          </p>
        </CardBody>
      </Card>
    </div>
  );
}
