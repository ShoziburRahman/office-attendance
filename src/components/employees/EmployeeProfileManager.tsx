"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Field, Input } from "@/components/ui/Field";
import { EmployeeProfileView } from "@/components/profile/EmployeeProfileView";
import { EmployeeForm } from "./EmployeeForm";
import { EmployeeScheduleSection } from "./EmployeeScheduleSection";
import { EmployeeWeeklyOffSection } from "./EmployeeWeeklyOffSection";
import { EmployeeLeaveSection } from "./EmployeeLeaveSection";
import { EmployeeDeviceSection } from "./EmployeeDeviceSection";
import { ReportDownloadModal } from "@/components/admin/ReportDownloadModal";
import type { PeriodFilterConfig } from "@/app/admin/employees/profile-actions";
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
  filter: PeriodFilterConfig;
  onFilterChange: (filter: PeriodFilterConfig) => void;
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
  filter,
  onFilterChange,
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
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white p-4 rounded-xl border border-ink-100 shadow-sm">
        <div className="flex items-center gap-2">
          <a href="/admin/employees" className="text-xs text-teal-600 hover:underline">
            ← Back to Employees
          </a>
        </div>
        <div className="flex flex-wrap items-end gap-4">
          <Field label="Record Period" htmlFor="periodFilter">
            <select
              id="periodFilter"
              value={filter.type}
              onChange={(e) => {
                const type = e.target.value as PeriodFilterConfig['type'];
                onFilterChange({ ...filter, type });
              }}
              className="flex h-10 w-40 rounded-md border border-ink-200 bg-white px-3 py-2 text-sm ring-offset-white focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2"
            >
              <option value="LIFETIME">Lifetime</option>
              <option value="MONTH">Month</option>
              <option value="CUSTOM">Custom Range</option>
            </select>
          </Field>

          {filter.type === 'MONTH' && (
            <>
              <Field label="Month" htmlFor="filterMonth">
                <select
                  id="filterMonth"
                  value={filter.month || new Date().getMonth() + 1}
                  onChange={(e) => onFilterChange({ ...filter, month: parseInt(e.target.value) })}
                  className="flex h-10 w-32 rounded-md border border-ink-200 bg-white px-3 py-2 text-sm ring-offset-white focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2"
                >
                  {Array.from({ length: 12 }, (_, i) => (
                    <option key={i + 1} value={i + 1}>
                      {new Intl.DateTimeFormat('en-US', { month: 'long' }).format(new Date(2000, i, 1))}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Year" htmlFor="filterYear">
                <Input
                  id="filterYear"
                  type="number"
                  value={filter.year || new Date().getFullYear()}
                  onChange={(e) => onFilterChange({ ...filter, year: parseInt(e.target.value) })}
                  className="h-10"
                />
              </Field>
            </>
          )}

          {filter.type === 'CUSTOM' && (
            <>
              <Field label="From" htmlFor="filterStart">
                <Input
                  id="filterStart"
                  type="date"
                  value={filter.startDate || ""}
                  onChange={(e) => onFilterChange({ ...filter, startDate: e.target.value })}
                  className="h-10"
                />
              </Field>
              <Field label="To" htmlFor="filterEnd">
                <Input
                  id="filterEnd"
                  type="date"
                  value={filter.endDate || ""}
                  onChange={(e) => onFilterChange({ ...filter, endDate: e.target.value })}
                  className="h-10"
                />
              </Field>
            </>
          )}

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
      </div>

      {view === "PROFILE" ? (
        <EmployeeProfileView
          employee={employee}
          lifetimeSummary={lifetimeSummary}
          monthlySummaries={monthlySummaries}
          detailedAttendance={detailedAttendance}
          leaves={leaves}
          weeklyOffs={weeklyOffs}
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
        employeeName={employee.profile?.full_name || employee.employee_code}
      />
    </div>
  );
}
