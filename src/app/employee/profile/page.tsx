import { requireUser } from "@/lib/auth/session";
import { EmployeeProfileView } from "@/components/profile/EmployeeProfileView";
import { EmployeeDeviceRegistration } from "@/components/employee/EmployeeDeviceRegistration";
import { calculateAttendanceSummaries } from "@/lib/attendance-utils";
import { createClient } from "@/lib/supabase/server";
import { getBusinessDate } from "@/lib/date-utils";

export default async function EmployeeProfilePage() {
  try {
    const user = await requireUser();
    const userId = user.authId;
    const supabase = await createClient();
    const today = getBusinessDate();

    const { data: employee, error: empError } = await supabase
      .from("employees")
      .select("*, profile:profiles!employees_id_fkey(*)")
      .eq("id", userId)
      .single()
      .returns<any>();

    if (empError || !employee) {
      return (
        <div className="p-6 text-center">
          <p className="text-sm text-ink-400">Employee profile not found.</p>
        </div>
      );
    }

    const { data: activeSchedule } = await supabase
      .from("employee_schedules")
      .select("*")
      .eq("employee_id", userId)
      .lte("effective_from", today)
      .or(`effective_until.is.null,effective_until.gte.${today}`)
      .maybeSingle();

    const { data: rpcLifetime } = await (supabase as any).rpc("fn_get_employee_lifetime_summary", {
      p_employee_id: userId,
    });

    const { data: rpcMonthly } = await (supabase as any).rpc("fn_get_employee_monthly_summaries", {
      p_employee_id: userId,
    });

    const { data: detailedAttendance } = await supabase
      .from("attendance")
      .select("*")
      .eq("employee_id", userId)
      .order("attendance_date", { ascending: false });

    const { lifetimeSummary, monthlySummaries } = calculateAttendanceSummaries(
      detailedAttendance || []
    );

    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-lg font-semibold text-ink-900">My Profile & Attendance</h1>
        </div>
        <EmployeeProfileView
          employee={employee}
          activeSchedule={activeSchedule}
          lifetimeSummary={lifetimeSummary}
          monthlySummaries={monthlySummaries}
          detailedAttendance={detailedAttendance || []}
        />
        <EmployeeDeviceRegistration />
      </div>
    );
  } catch (error) {
    return null; // Layout handles redirect
  }
}
