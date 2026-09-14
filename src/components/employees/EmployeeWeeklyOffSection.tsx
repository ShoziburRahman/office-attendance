"use client";

import { useFormState, useFormStatus } from "react-dom";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Field, Input } from "@/components/ui/Field";
import { Badge } from "@/components/ui/Badge";
import type { WeeklyOffActionState } from "@/app/admin/employees/state";
import type { WeeklyOffScheduleRow } from "@/types/database";
import { calculateNextWeeklyOff } from "@/lib/utils/weekly-off";

type ActionFn = (prevState: WeeklyOffActionState, formData: FormData) => Promise<WeeklyOffActionState>;

interface EmployeeWeeklyOffSectionProps {
  action: ActionFn;
  initialState: WeeklyOffActionState;
  weeklyOffs: WeeklyOffScheduleRow[];
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

const DAYS = [
  { value: "0", label: "Sunday" },
  { value: "1", label: "Monday" },
  { value: "2", label: "Tuesday" },
  { value: "3", label: "Wednesday" },
  { value: "4", label: "Thursday" },
  { value: "5", label: "Friday" },
  { value: "6", label: "Saturday" },
];

export function EmployeeWeeklyOffSection({ action, initialState, weeklyOffs, employeeId, currentOfficeDate }: EmployeeWeeklyOffSectionProps) {
  const [state, formAction] = useFormState(action, initialState);
  const errors = state.fieldErrors ?? {};

  // Calculate the next upcoming off-day using the new logic
  // We use the office date provided by the server to ensure consistency.
  const nextOff = calculateNextWeeklyOff(
    currentOfficeDate,
    weeklyOffs.map(off => ({
      id: off.id,
      day_of_week: off.day_of_week,
      effective_from: off.effective_from,
      effective_until: off.effective_until
    }))
  );

  return (
    <Card className="mt-6">
      <CardHeader>
        <p className="text-sm font-medium text-ink-900">Weekly Off</p>
      </CardHeader>
      <CardBody>
        <div className="mb-6">
          <h4 className="text-xs font-semibold uppercase tracking-wider text-ink-400 mb-3">Next Weekly Off</h4>
          {nextOff ? (
            <div className="flex items-center gap-3">
              <Badge tone="neutral" className="text-sm px-3 py-1">
                {nextOff.dayLabel}
              </Badge>
              <p className="text-sm text-ink-900 font-medium">
                {nextOff.dateFormatted}
              </p>
            </div>
          ) : (
            <p className="text-sm text-ink-400 italic">No off-days defined.</p>
          )}
        </div>

        <div className="border-t border-ink-100 pt-6">
          <h4 className="text-xs font-semibold uppercase tracking-wider text-ink-400 mb-4">Assign Off-Day</h4>
          <form action={formAction} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {state.error && (
              <p role="alert" className="col-span-full rounded-md bg-red-50 px-3 py-2 text-sm text-status-late">
                {state.error}
              </p>
            )}
            <Field label="Day of Week" htmlFor="dayOfWeek" required error={errors.dayOfWeek}>
              <select
                id="dayOfWeek"
                name="dayOfWeek"
                className="flex h-10 w-full rounded-md border border-ink-200 bg-white px-3 py-2 text-sm ring-offset-white focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2"
                required
              >
                <option value="">Select a day</option>
                {DAYS.map(day => (
                  <option key={day.value} value={day.value}>{day.label}</option>
                ))}
              </select>
            </Field>
            <Field label="Effective From" htmlFor="effectiveFrom" required error={errors.effectiveFrom}>
              <Input id="effectiveFrom" name="effectiveFrom" type="date" required />
            </Field>
            <div className="flex items-end">
              <SubmitButton label="Assign Off-Day" />
            </div>
          </form>
        </div>
      </CardBody>
    </Card>
  );
}
