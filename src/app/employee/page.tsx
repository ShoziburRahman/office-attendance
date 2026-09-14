import { getCurrentUser } from "@/lib/auth/session";
import { Card, CardBody } from "@/components/ui/Card";
import { formatDate } from "@/lib/utils/format";
import { AttendanceDashboard } from "@/components/employee/AttendanceDashboard";
import { createClient } from "@/lib/supabase/server";
import type { AttendanceRow as Attendance } from "@/types/database";
import { getBusinessDate } from "@/lib/date-utils";

export default async function EmployeeTodayPage() {
  const user = await getCurrentUser();

  if (!user) {
    return null; // Layout handles redirect
  }

  const today = getBusinessDate();

  const supabase = await createClient();

  const { data: sessions, error } = await supabase
    .from("attendance")
    .select("*")
    .eq("employee_id", user.authId)
    .eq("attendance_date", today)
    .order("session_number", { ascending: true });

  if (error) {
    console.error("Error fetching today's attendance:", error);
  }

  return (
    <div>
      <h1 className="text-lg font-semibold text-ink-900">
        Hi, {user.profile.full_name.split(" ")[0]}
      </h1>
      <p className="mt-1 text-sm text-ink-400">{formatDate(today)}</p>

      <AttendanceDashboard initialSessions={sessions || []} />

      <Card className="mt-6">
        <CardBody>
          <p className="text-sm text-ink-600">
            Your work schedule, leave totals, and overtime summary are available in your profile.
          </p>
        </CardBody>
      </Card>
    </div>
  );
}
