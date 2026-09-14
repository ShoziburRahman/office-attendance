"use client";

import { useFormState, useFormStatus } from "react-dom";
import { Dialog } from "@/components/ui/Dialog";
import { Button } from "@/components/ui/Button";
import { Field, Input } from "@/components/ui/Field";
import { forceCheckOut } from "@/app/admin/attendance/actions";
import { CorrectionActionState } from "@/types/actions/attendance";

const initialCorrectionActionState: CorrectionActionState = {
  error: null,
  success: false,
};

interface ForceCheckOutModalProps {
  isOpen: boolean;
  onClose: () => void;
  attendanceId: string;
  employeeName: string;
}

function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" isLoading={pending}>
      {label}
    </Button>
  );
}

export function ForceCheckOutModal({
  isOpen,
  onClose,
  attendanceId,
  employeeName,
}: ForceCheckOutModalProps) {
  const boundAction = forceCheckOut.bind(null, attendanceId);
  const [state, formAction] = useFormState(boundAction, initialCorrectionActionState);

  if (state.success) {
    setTimeout(onClose, 1500);
  }

  return (
    <Dialog isOpen={isOpen} onClose={onClose} title="Emergency Check-Out">
      <form action={formAction} className="flex flex-col gap-5">
        <p className="text-sm text-ink-600">
          Force a check-out for <strong>{employeeName}</strong>. This bypasses the minimum session duration lock.
        </p>
        {state.error && (
          <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-sm text-status-late">
            {state.error}
          </p>
        )}
        {state.success && (
          <p role="alert" className="rounded-md bg-teal-50 px-3 py-2 text-sm text-teal-700">
            Emergency check-out processed successfully.
          </p>
        )}

        <div className="space-y-4">
          <Field label="Reason for Emergency Check-Out" htmlFor="reason" required>
            <Input
              id="reason"
              name="reason"
              placeholder="Explain why this employee is leaving early"
              required
            />
          </Field>
        </div>

        <div className="flex justify-end gap-3">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <SubmitButton label="Force Check-Out" />
        </div>
      </form>
    </Dialog>
  );
}
