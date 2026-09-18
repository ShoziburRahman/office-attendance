"use client";

import { useEffect, useState, useTransition } from "react";
import { EmployeeProfileManager } from "@/components/employees/EmployeeProfileManager";
import { notFound } from "next/navigation";
import { calculateAttendanceSummaries } from "@/lib/attendance-utils";
import {
  updateEmployee,
  addEmployeeSchedule,
  addWeeklyOff,
  addEmployeeLeave
} from "@/app/admin/employees/actions";
import { getEmployeeProfileFilteredData, type PeriodFilterConfig } from "@/app/admin/employees/profile-actions";
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
  const [filter, setFilter] = useState<PeriodFilterConfig>({
    type: 'LIFETIME',
  });
  const [isPending, startTransition] = useTransition();
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
      // For Lifetime, we prioritize the initial data from the server to maintain original behavior
      if (filter.type === 'LIFETIME' && initialData) {
        setData({
          employee: initialData.employee,
          lifetimeSummary: initialData.lifetimeSummary,
          monthlySummaries: initialData.monthlySummaries || [],
          detailedAttendance: initialData.detailedAttendance || [],
          schedules: initialData.schedules || [],
          weeklyOffs: initialData.weeklyOffs || [],
          leaves: initialData.leaves || [],
        });
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      setError(null);
      try {
        const result = await getEmployeeProfileFilteredData(id, filter);
        if (!result) throw new Error("No data returned from server");

        const { lifetimeSummary, monthlySummaries } = calculateAttendanceSummaries(
          result.attendance || [],
          result.leaves || [],
          result.weeklyOffs || [],
          id,
          result.employee.joining_date,
          result.range?.start,
          result.range?.end
        );

        setData({
          employee: result.employee,
          lifetimeSummary: lifetimeSummary || {
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
          },
          monthlySummaries: monthlySummaries || [],
          detailedAttendance: result.attendance || [],
          schedules: result.schedules || [],
          weeklyOffs: result.weeklyOffs || [],
          leaves: result.leaves || [],
        });
      } catch (error: any) {
        console.error("Error loading employee profile:", error);
        setError(error.message || "An unexpected error occurred while loading the profile.");
      } finally {
        setIsLoading(false);
      }
    }

    loadData();
  }, [id, filter, initialData]);

  const handleFilterChange = (newFilter: PeriodFilterConfig) => {
    startTransition(() => {
      setFilter(newFilter);
    });
  };

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
      filter={filter}
      onFilterChange={handleFilterChange}
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
