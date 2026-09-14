"use client";

import { useFormState, useFormStatus } from "react-dom";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Field, Input } from "@/components/ui/Field";
import { Badge } from "@/components/ui/Badge";
import type { ScheduleActionState } from "@/app/admin/employees/state";
import type { EmployeeScheduleRow } from "@/types/database";

type ActionFn = (prevState: ScheduleActionState, formData: FormData) => Promise<ScheduleActionState>;

interface EmployeeScheduleSectionProps {
  action: ActionFn;
  initialState: ScheduleActionState;
  schedules: EmployeeScheduleRow[];
  employeeId: string;
  currentOfficeDate: string;
}

function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" isLoading={pending}>
      {label}
    </Button>
  );
}

export function EmployeeScheduleSection({ action, initialState, schedules, employeeId, currentOfficeDate }: EmployeeScheduleSectionProps) {
  const [state, formAction] = useFormState(action, initialState);
  const errors = state.fieldErrors ?? {};

  const getStatus = (s: EmployeeScheduleRow) => {
    if (currentOfficeDate < s.effective_from) return { label: "Future", tone: "neutral" as any };
    if (!s.effective_until || currentOfficeDate < s.effective_until) return { label: "Active", tone: "present" as any };
    return { label: "Expired", tone: "neutral" as any };
  };

  return (
    <Card className="mt-6">
      <CardHeader>
        <p className="text-sm font-medium text-ink-900">Work Schedule</p>
      </CardHeader>
      <CardBody>
        <div className="mb-8">
          <h4 className="text-xs font-semibold uppercase tracking-wider text-ink-400 mb-3">Active / History</h4>
          {schedules.length === 0 ? (
            <p className="text-sm text-ink-400 italic">No schedules defined.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="text-xs text-ink-400 uppercase bg-ink-50">
                  <tr>
                    <th className="px-3 py-2 font-medium">Period</th>
                    <th className="px-3 py-2 font-medium">Shift</th>
                    <th className="px-3 py-2 font-medium">Req. Min</th>
                    <th className="px-3 py-2 font-medium">Break</th>
                    <th className="px-3 py-2 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-ink-100">
                  {schedules.map((s) => (
                    <tr key={s.id}>
                      <td className="px-3 py-2 whitespace-nowrap">
                        {s.effective_from} {s.effective_until ? ` → ${s.effective_until}` : " → Present"}
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap">
                        {s.start_time} {s.end_time}
                      </td>
                      <td className="px-3 py-2">{s.required_minutes}m</td>
                      <td className="px-3 py-2">{s.break_minutes}m</td>
                      <td className="px-3 py-2">
                        {(() => {
                          const status = getStatus(s);
                          return <Badge tone={status.tone}>{status.label}</Badge>;
                        })()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="border-t border-ink-100 pt-6">
          <h4 className="text-xs font-semibold uppercase tracking-wider text-ink-400 mb-4">Add New Schedule</h4>
          <form action={formAction} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {state.error && (
              <p role="alert" className="col-span-full rounded-md bg-red-50 px-3 py-2 text-sm text-status-late">
                {state.error}
              </p>
            )}
            <Field label="Start Time" htmlFor="startTime" required error={errors.startTime}>
              <Input id="startTime" name="startTime" type="time" required />
            </Field>
            <Field label="End Time" htmlFor="endTime" required error={errors.endTime}>
              <Input id="endTime" name="endTime" type="time" required />
            </Field>
            <Field label="Required Minutes" htmlFor="requiredMinutes" required error={errors.requiredMinutes}>
              <Input id="requiredMinutes" name="requiredMinutes" type="number" required />
            </Field>
            <Field label="Break Minutes" htmlFor="breakMinutes" required error={errors.breakMinutes}>
              <Input id="breakMinutes" name="breakMinutes" type="number" required />
            </Field>
            <Field label="Effective From" htmlFor="effectiveFrom" required error={errors.effectiveFrom}>
              <Input id="effectiveFrom" name="effectiveFrom" type="date" required />
            </Field>
            <div className="flex items-end">
              <SubmitButton label="Save Schedule" />
            </div>
          </form>
        </div>
      </CardBody>
    </Card>
  );
}
