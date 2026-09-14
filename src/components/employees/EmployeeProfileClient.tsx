"use client";

import { useEffect, useState } from "react";
import { EmployeeProfileManager } from "@/components/employees/EmployeeProfileManager";
import { notFound } from "next/navigation";
import { calculateAttendanceSummaries } from "@/lib/attendance-utils";
import {
  updateEmployee,
  addEmployeeSchedule,
  addWeeklyOff,
  addEmployeeLeave
} from "@/app/admin/employees/actions";
import {
  initialEmployeeActionState,
  initialScheduleActionState,
  initialWeeklyOffActionState,
  initialLeaveActionState
} from "@/app/admin/employees/state";
import { createClient } from "@/lib/supabase/client";
import { requireUser } from "@/lib/auth/client";
import { Button } from "@/components/ui/Button";

export function EmployeeProfileClient({ id, initialUser, initialData }: { id: string; initialUser: any; initialData?: any }) {
  const [data, setData] = useState<{
    employee: any;
    lifetimeSummary: any;
    monthlySummaries: any;
    detailedAttendance: any[];
    schedules: any[];
    weeklyOffs: any[];
    leaves: any[];
  } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadData() {
      setIsLoading(true);
      setError(null);
      try {
        // Use the user passed from the server if available
        let currentUser = initialUser;

        if (!currentUser) {
          const { data: { user } } = await createClient().auth.getUser();
          if (!user) {
            throw new Error("requireUser() called with no session. Please log in again.");
          }
          currentUser = user;
        }

        const supabase = createClient();

        const { data: employee, error: empError } = await supabase
          .from("employees")
          .select("*, profile:profiles!employees_id_fkey(*)")
          .eq("id", id)
          .single()
          .returns<any>();

        if (empError || !employee) {
          setError(empError?.message || "Employee not found");
          return;
        }

        const { data: rpcLifetime } = await (supabase as any).rpc("fn_get_employee_lifetime_summary", {
          p_employee_id: id,
        });

        const { data: rpcMonthly } = await (supabase as any).rpc("fn_get_employee_monthly_summaries", {
          p_employee_id: id,
        });

        const { data: detailedAttendance } = await supabase
          .from("attendance")
          .select("*")
          .eq("employee_id", id)
          .order("attendance_date", { ascending: false });

        const { data: schedules } = await supabase
          .from("employee_schedules")
          .select("*")
          .eq("employee_id", id)
          .order("effective_from", { ascending: false });

        const { data: weeklyOffs } = await supabase
          .from("weekly_off_schedules")
          .select("*")
          .eq("employee_id", id)
          .order("effective_from", { ascending: false });

        const { data: leaves } = await supabase
          .from("employee_leaves")
          .select("*")
          .eq("employee_id", id)
          .order("leave_date", { ascending: false });

        const { lifetimeSummary, monthlySummaries } = calculateAttendanceSummaries(
          detailedAttendance || [],
          leaves || [],
          weeklyOffs || []
        );

        setData({
          employee,
          lifetimeSummary,
          monthlySummaries,
          detailedAttendance: detailedAttendance || [],
          schedules: schedules || [],
          weeklyOffs: weeklyOffs || [],
          leaves: leaves || [],
        });
      } catch (error: any) {
        console.error("Error loading employee profile:", error);
        setError(error.message || "An unexpected error occurred while loading the profile.");
      } finally {
        setIsLoading(false);
      }
    }

    loadData();
  }, [id]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] p-6 text-center">
        <p className="text-status-late font-medium mb-4">Error loading profile</p>
        <p className="text-ink-600 text-sm mb-6">{error}</p>
        <Button onClick={() => window.location.reload()} variant="secondary">
          Try Again
        </Button>
      </div>
    );
  }

  if (!data) return null;

  return (
    <EmployeeProfileManager
      employee={data.employee}
      lifetimeSummary={data.lifetimeSummary}
      monthlySummaries={data.monthlySummaries}
      detailedAttendance={data.detailedAttendance}
      schedules={data.schedules}
      weeklyOffs={data.weeklyOffs}
      leaves={data.leaves}
      updateAction={(prevState, formData) => updateEmployee(id, prevState, formData)}
      addScheduleAction={(prevState, formData) => addEmployeeSchedule(id, prevState, formData)}
      addWeeklyOffAction={(prevState, formData) => addWeeklyOff(id, prevState, formData)}
      addLeaveAction={(prevState, formData) => addEmployeeLeave(id, prevState, formData)}
      initialEmployeeActionState={initialEmployeeActionState}
      initialScheduleActionState={initialScheduleActionState}
      initialWeeklyOffActionState={initialWeeklyOffActionState}
      initialLeaveActionState={initialLeaveActionState}
    />
  );
}
