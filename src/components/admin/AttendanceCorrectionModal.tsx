"use client";

import { useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { Dialog } from "@/components/ui/Dialog";
import { Button } from "@/components/ui/Button";
import { Field, Input } from "@/components/ui/Field";
import { upsertAttendance } from "@/app/admin/attendance/actions";
import { CorrectionActionState } from "@/types/actions/attendance";
import type { AttendanceRow } from "@/types/database";

const initialCorrectionActionState: CorrectionActionState = {
  error: null,
  success: false,
};

interface AttendanceCorrectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  attendance: AttendanceRow | null;
  employeeId: string;
  date: string;
  employeeName: string;
}

  const formatToDhakaTime = (dateStr: string) => {
    return new Intl.DateTimeFormat('en-GB', {
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'Asia/Dhaka',
      hour12: false,
    }).format(new Date(dateStr));
  };

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
  attendance,
  employeeId,
  date,
  employeeName,
}: AttendanceCorrectionModalProps) {
  // Bind the employeeId to the action
  const boundAction = upsertAttendance.bind(null, employeeId);
  const [state, formAction] = useFormState(boundAction, initialCorrectionActionState);

  if (state.success) {
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
            Attendance corrected successfully.
          </p>
        )}

        <div className="space-y-4">
          <div className="p-3 bg-ink-50 rounded-md border border-ink-100 mb-4">
            <p className="text-xs font-semibold text-ink-500 uppercase">Employee</p>
            <p className="text-sm font-medium text-ink-900">{employeeName}</p>
            <p className="text-xs text-ink-400">Date: {date}</p>
          </div>

          <input type="hidden" name="date" value={date} />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Check-in Time" htmlFor="checkIn">
              <Input
                id="checkIn"
                name="checkIn"
                type="time"
                defaultValue={attendance?.check_in_at ? formatToDhakaTime(attendance.check_in_at) : ""}
              />
            </Field>
            <Field label="Check-out Time" htmlFor="checkOut">
              <Input
                id="checkOut"
                name="checkOut"
                type="time"
                defaultValue={attendance?.check_out_at ? formatToDhakaTime(attendance.check_out_at) : ""}
              />
            </Field>
          </div>

          <Field label="Attendance Type" htmlFor="type">
            <select
              id="type"
              name="type"
              defaultValue={attendance?.attendance_type || "OFFICE"}
              className="flex h-10 w-full rounded-md border border-ink-200 bg-white px-3 py-2 text-sm ring-offset-white focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2"
            >
              <option value="OFFICE">Office</option>
              <option value="WORK_FROM_HOME">Work From Home</option>
            </select>
          </Field>

          <Field label="Reason for Correction" htmlFor="reason" required>
            <Input
              id="reason"
              name="reason"
              placeholder="Mandatory reason for audit trail"
              defaultValue={attendance?.notes || ""}
              required
            />
          </Field>
        </div>

        <div className="flex justify-end gap-3">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <SubmitButton label="Save Correction" />
        </div>
      </form>
    </Dialog>
  );
}
