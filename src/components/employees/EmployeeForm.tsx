"use client";

import { useFormState, useFormStatus } from "react-dom";
import { Button } from "@/components/ui/Button";
import { Field, Input } from "@/components/ui/Field";
import type { EmployeeActionState } from "@/app/admin/employees/state";
import type { EmployeeWithProfile } from "@/types/database";

type ActionFn = (prevState: EmployeeActionState, formData: FormData) => Promise<EmployeeActionState>;

interface EmployeeFormProps {
  action: ActionFn;
  initialState: EmployeeActionState;
  employee?: EmployeeWithProfile;
  submitLabel: string;
}

function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" isLoading={pending}>
      {label}
    </Button>
  );
}

export function EmployeeForm({ action, initialState, employee, submitLabel }: EmployeeFormProps) {
  const [state, formAction] = useFormState(action, initialState);
  const errors = state.fieldErrors ?? {};

  return (
    <form action={formAction} className="flex flex-col gap-5">
      {state.error && (
        <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-sm text-status-late">
          {state.error}
        </p>
      )}

      {state.temporaryPassword && (
        <div className="rounded-md bg-teal-50 px-3 py-3 text-sm text-teal-700">
          <p className="font-medium">Employee created.</p>
          <p className="mt-1">
            Temporary password: <span className="font-mono font-semibold">{state.temporaryPassword}</span>
          </p>
          <p className="mt-1 text-teal-600">
            Share this with the employee directly — it won&apos;t be shown again. They should change it
            after their first sign-in.
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <Field label="Full name" htmlFor="fullName" required error={errors.fullName}>
          <Input id="fullName" name="fullName" defaultValue={employee?.profile.full_name} required />
        </Field>

        <Field
          label="Email"
          htmlFor="email"
          required
          error={errors.email}
          hint={employee ? "Email can't be changed here." : undefined}
        >
          <Input
            id="email"
            name="email"
            type="email"
            defaultValue={employee?.profile.email}
            readOnly={Boolean(employee)}
            required
          />
        </Field>

        <Field label="Phone number" htmlFor="phone" error={errors.phone}>
          <Input id="phone" name="phone" type="tel" defaultValue={employee?.profile.phone ?? ""} />
        </Field>

        <Field label="Profile Picture" htmlFor="avatarFile" error={errors.avatarFile}>
          <div className="flex items-center gap-4">
            {employee?.profile.avatar_url && (
              <img
                src={employee.profile.avatar_url}
                alt="Current"
                className="h-10 w-10 rounded-full object-cover border border-ink-200"
              />
            )}
            <Input
              id="avatarFile"
              name="avatarFile"
              type="file"
              accept="image/*"
              className="cursor-pointer file:mr-4 file:py-1 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-teal-50 file:text-teal-700 hover:file:bg-teal-100"
            />
          </div>
        </Field>

        <Field
          label="Employee ID"
          htmlFor="employeeCode"
          required
          error={errors.employeeCode}
          hint="Letters, numbers, hyphens or underscores. Must be unique."
        >
          <Input id="employeeCode" name="employeeCode" defaultValue={employee?.employee_code} required />
        </Field>

        <Field label="Department" htmlFor="department" required error={errors.department}>
          <Input id="department" name="department" defaultValue={employee?.department} required />
        </Field>

        <Field label="Position" htmlFor="position" required error={errors.position}>
          <Input id="position" name="position" defaultValue={employee?.position} required />
        </Field>

        <Field label="Joining date" htmlFor="joiningDate" required error={errors.joiningDate}>
          <Input
            id="joiningDate"
            name="joiningDate"
            type="date"
            defaultValue={employee?.joining_date}
            required
          />
        </Field>
      </div>

      <label className="flex items-start gap-2 text-sm text-ink-600">
        <input
          type="checkbox"
          name="allowMultipleSessions"
          defaultChecked={employee?.allow_multiple_sessions}
          className="mt-0.5 h-4 w-4 rounded border-ink-200 text-teal-500 focus:ring-teal-500"
        />
        <span>
          Allow multiple attendance sessions per day without admin approval each time.
          <br />
          <span className="text-xs text-ink-400">
            Default is off — by default, an additional check-in on a day this employee has already
            completed attendance requires a one-time admin approval.
          </span>
        </span>
      </label>

      <div>
        <SubmitButton label={submitLabel} />
      </div>
    </form>
  );
}
