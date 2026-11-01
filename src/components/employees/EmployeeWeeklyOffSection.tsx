"use client";

import { useFormState, useFormStatus } from "react-dom";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Field, Input } from "@/components/ui/Field";
import { Badge } from "@/components/ui/Badge";
import type { WeeklyOffActionState } from "@/app/admin/employees/state";
import type { WeeklyOffScheduleRow } from "@/types/database";
import { calculateNextWeeklyOff } from "@/lib/utils/weekly-off";
import { clearAllWeeklyOffs } from "@/app/admin/employees/actions";
import { toast } from "sonner";




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

  const handleClearAll = async () => {
    if (!confirm("Are you sure you want to delete all weekly off settings for this employee?")) {
      return;
    }
    try {
      await clearAllWeeklyOffs(employeeId);
      toast.success("All weekly off settings cleared.");
    } catch (e: any) {
      toast.error(e.message || "Failed to clear weekly off settings.");
    }
  };

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
      <CardHeader className="flex flex-row items-center justify-between">
        <p className="text-sm font-medium text-ink-900">Weekly Off</p>
        {weeklyOffs.length > 0 && (
          <Button
            variant="ghost"
            size="sm"
            className="text-status-late hover:text-status-late hover:bg-red-50 h-8 px-2 text-xs"
            onClick={handleClearAll}
          >
            Clear All
          </Button>
        )}
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
          <h4 className="text-xs font-semibold uppercase tracking-wider text-ink-400 mb-4">Assign Off-Days</h4>
          <form action={formAction} className="grid grid-cols-1 gap-4">
            {state.error && (
              <p role="alert" className="col-span-full rounded-md bg-red-50 px-3 py-2 text-sm text-status-late">
                {state.error}
              </p>
            )}
            <Field label="Days of Week" htmlFor="dayOfWeek" required error={errors.dayOfWeek}>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {DAYS.map(day => (
                  <label key={day.value} className="flex items-center gap-2 cursor-pointer group">
                    <input
                      type="checkbox"
                      name="dayOfWeek"
                      value={day.value}
                      className="h-4 w-4 rounded border-ink-200 text-teal-500 focus:ring-teal-500"
                    />
                    <span className="text-sm text-ink-900 group-hover:text-teal-600 transition-colors">
                      {day.label}
                    </span>
                  </label>
                ))}
              </div>
            </Field>
            <Field label="Effective From" htmlFor="effectiveFrom" required error={errors.effectiveFrom}>
              <Input id="effectiveFrom" name="effectiveFrom" type="date" required />
            </Field>
            <div className="flex items-end">
              <SubmitButton label="Assign Off-Days" />
            </div>
          </form>
        </div>
      </CardBody>
    </Card>
  );
}
