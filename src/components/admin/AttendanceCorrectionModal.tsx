"use client";

import { useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { Dialog } from "@/components/ui/Dialog";
import { Button } from "@/components/ui/Button";
import { Field, Input } from "@/components/ui/Field";
import { correctAttendance } from "@/app/admin/attendance/actions";
import { CorrectionActionState } from "@/types/actions/attendance";

const initialCorrectionActionState: CorrectionActionState = {
  error: null,
  success: false,
};

interface AttendanceCorrectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  attendanceId: string;
  currentValue: string;
  fieldName: string;
}

function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" isLoading={pending}>
      {label}
    </Button>
  );
}

export function AttendanceCorrectionModal({
  isOpen,
  onClose,
  attendanceId,
  currentValue,
  fieldName,
}: AttendanceCorrectionModalProps) {
  // We bind the attendanceId to the action
  const boundAction = correctAttendance.bind(null, attendanceId);
  const [state, formAction] = useFormState(boundAction, initialCorrectionActionState);

  if (state.success) {
    // In a real app, we might use a toast. Here we close the modal.
    // Since useFormState is async, we use a small timeout to let the user see success if we had a success UI,
    // but for now, we'll let the parent handle the close or just close it.
    setTimeout(onClose, 1500);
  }

  return (
    <Dialog isOpen={isOpen} onClose={onClose} title="Correct Attendance">
      <form action={formAction} className="flex flex-col gap-5">
        {state.error && (
          <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-sm text-status-late">
            {state.error}
          </p>
        )}
        {state.success && (
          <p role="alert" className="rounded-md bg-teal-50 px-3 py-2 text-sm text-teal-700">
            Correction saved successfully.
          </p>
        )}

        <div className="space-y-4">
          <Field label="Field to Correct" htmlFor="field">
            <select
              id="field"
              name="field"
              defaultValue={fieldName}
              className="flex h-10 w-full rounded-md border border-ink-200 bg-white px-3 py-2 text-sm ring-offset-white focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2"
            >
              <option value="check_in_at">Check-in Time</option>
              <option value="check_out_at">Check-out Time</option>
              <option value="attendance_state">Attendance State</option>
              <option value="day_classification">Day Classification</option>
              <option value="notes">Notes</option>
            </select>
          </Field>

          <Field label="New Value" htmlFor="value" required>
            <Input
              id="value"
              name="value"
              defaultValue={currentValue}
              placeholder="Enter new value"
              required
            />
          </Field>

          <Field label="Reason for Correction" htmlFor="reason" required>
            <Input
              id="reason"
              name="reason"
              placeholder="Mandatory reason for audit trail"
              required
            />
          </Field>
        </div>

        <div className="flex justify-end gap-3">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <SubmitButton label="Apply Correction" />
        </div>
      </form>
    </Dialog>
  );
}
