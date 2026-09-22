import { EmployeeProfileClient } from "@/components/employees/EmployeeProfileClient";
import { createClient } from "@/lib/supabase/server";

export async function generateStaticParams() {
  return [{ id: "placeholder" }];
}

interface EmployeeProfilePageProps {
  params: Promise<{ id: string }>;
}

export default async function EmployeeProfilePage({ params }: EmployeeProfilePageProps) {
  const { id } = await params;
  const supabase = await createClient();

  // 1. Auth check
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return <div>Unauthorized. Please log in again.</div>;
  }

  // 2. Fetch Employee Data
  const { data: employee, error: empError } = await supabase
    .from("employees")
    .select("*, profile:profiles!employees_id_fkey(*)")
    .eq("id", id)
    .single();

  if (empError || !employee) {
    return <div>Employee not found.</div>;
  }

  // 3. Fetch summaries and records
  const [lifetimeRes, monthlyRes, attendanceRes, scheduleRes, weeklyOffRes, leaveRes] = await Promise.all([
    (supabase as any).rpc("fn_get_employee_lifetime_summary", { p_employee_id: id }),
    (supabase as any).rpc("fn_get_employee_monthly_summaries", { p_employee_id: id }),
    supabase.from("attendance").select("*").eq("employee_id", id).order("attendance_date", { ascending: false }),
    supabase.from("employee_schedules").select("*").eq("employee_id", id).order("effective_from", { ascending: false }),
    supabase.from("weekly_off_schedules").select("*").eq("employee_id", id).order("effective_from", { ascending: false }),
    supabase.from("employee_leaves").select("*").eq("employee_id", id).order("leave_date", { ascending: false }),
  ]);

  return (
    <EmployeeProfileClient
      id={id}
      initialUser={user}
      initialData={{
        employee,
        lifetimeSummary: Array.isArray(lifetimeRes.data) ? lifetimeRes.data[0] : lifetimeRes.data,
        monthlySummaries: monthlyRes.data || [],
        detailedAttendance: attendanceRes.data || [],
        schedules: scheduleRes.data || [],
        weeklyOffs: weeklyOffRes.data || [],
        leaves: leaveRes.data || [],
      }}
    />
  );
}
