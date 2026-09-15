"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { EmployeeProfileView } from "@/components/profile/EmployeeProfileView";
import { EmployeeForm } from "./EmployeeForm";
import { EmployeeScheduleSection } from "./EmployeeScheduleSection";
import { EmployeeWeeklyOffSection } from "./EmployeeWeeklyOffSection";
import { EmployeeLeaveSection } from "./EmployeeLeaveSection";
import { EmployeeDeviceSection } from "./EmployeeDeviceSection";
import { ReportDownloadModal } from "@/components/admin/ReportDownloadModal";
import type {
  EmployeeActionState,
  ScheduleActionState,
  WeeklyOffActionState,
  LeaveActionState
} from "@/app/admin/employees/state";
import type {
  EmployeeWithProfile,
  EmployeeScheduleRow,
  WeeklyOffScheduleRow,
  EmployeeLeaveRow
} from "@/types/database";

interface EmployeeProfileManagerProps {
  employee: EmployeeWithProfile;
  lifetimeSummary: any;
  monthlySummaries: any[];
  detailedAttendance: any[];
  schedules: EmployeeScheduleRow[];
  weeklyOffs: WeeklyOffScheduleRow[];
  leaves: EmployeeLeaveRow[];
  updateAction: (prevState: EmployeeActionState, formData: FormData) => Promise<EmployeeActionState>;
  addScheduleAction: (prevState: ScheduleActionState, formData: FormData) => Promise<ScheduleActionState>;
  addWeeklyOffAction: (prevState: WeeklyOffActionState, formData: FormData) => Promise<WeeklyOffActionState>;
  addLeaveAction: (prevState: LeaveActionState, formData: FormData) => Promise<LeaveActionState>;
  initialEmployeeActionState: EmployeeActionState;
  initialScheduleActionState: ScheduleActionState;
  initialWeeklyOffActionState: WeeklyOffActionState;
  initialLeaveActionState: LeaveActionState;
}

export function EmployeeProfileManager({
  employee,
  lifetimeSummary,
  monthlySummaries,
  detailedAttendance,
  schedules,
  weeklyOffs,
  leaves,
  updateAction,
  addScheduleAction,
  addWeeklyOffAction,
  addLeaveAction,
  initialEmployeeActionState,
  initialScheduleActionState,
  initialWeeklyOffActionState,
  initialLeaveActionState,
}: EmployeeProfileManagerProps) {
  const [view, setView] = useState<"PROFILE" | "EDIT">("PROFILE");
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);

  const today = new Date().toISOString().slice(0, 10);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <a href="/admin/employees" className="text-xs text-teal-600 hover:underline">
          ← Back to Employees
        </a>
        <div className="flex gap-2">
          {view === "PROFILE" && (
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setIsReportModalOpen(true)}
            >
              Download History
            </Button>
          )}
          <Button
            variant={view === "EDIT" ? "primary" : "secondary"}
            size="sm"
            onClick={() => setView(view === "PROFILE" ? "EDIT" : "PROFILE")}
          >
            {view === "PROFILE" ? "Edit Profile" : "View Profile"}
          </Button>
        </div>
      </div>

      {view === "PROFILE" ? (
        <EmployeeProfileView
          employee={employee}
          lifetimeSummary={lifetimeSummary}
          monthlySummaries={monthlySummaries}
          detailedAttendance={detailedAttendance}
        />
      ) : (
        <div className="space-y-8 max-w-4xl mx-auto">
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold text-ink-900">Edit Employee Profile</h2>
            <p className="text-sm text-ink-400">Manage personal details, work schedules, off-days, and leaves.</p>
          </div>

          <div className="grid grid-cols-1 gap-8">
            <div className="space-y-4">
              <h3 className="text-sm font-semibold uppercase tracking-wider text-ink-500 border-b border-ink-100 pb-2">Personal & Employment Details</h3>
              <EmployeeForm
                action={updateAction}
                initialState={initialEmployeeActionState}
                employee={employee}
                submitLabel="Update Profile"
              />
            </div>

            <EmployeeScheduleSection
              action={addScheduleAction}
              initialState={initialScheduleActionState}
              schedules={schedules}
              employeeId={employee.id}
              currentOfficeDate={today}
            />

            <EmployeeWeeklyOffSection
              action={addWeeklyOffAction}
              initialState={initialWeeklyOffActionState}
              weeklyOffs={weeklyOffs}
              employeeId={employee.id}
              currentOfficeDate={today}
            />

            <EmployeeLeaveSection
              action={addLeaveAction}
              initialState={initialLeaveActionState}
              leaves={leaves}
              employeeId={employee.id}
            />

            <EmployeeDeviceSection
              employeeId={employee.id}
            />
          </div>
        </div>
      )}

      <ReportDownloadModal
        isOpen={isReportModalOpen}
        onClose={() => setIsReportModalOpen(false)}
        employeeId={employee.id}
        employeeName={employee.profile.full_name}
      />
    </div>
  );
}
